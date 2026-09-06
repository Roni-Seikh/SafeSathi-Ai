import { IHeatmap, RiskLevel } from '../models/Heatmap.model';
import { IHeatmapRepository } from '../repositories/heatmap.repository';
import { IReportRepository } from '../repositories/report.repository';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { aiServiceClient, BatchSafeScoreItem } from './aiServiceClient';
import { reportsScoreFromCounts } from './geoRiskFactor.service';
import { gridCellKey, gridCellCenter, GRID_RESOLUTION_METERS_APPROX } from '../utils/grid';
import { AppError } from '../utils/AppError';

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

const RECALCULATE_LOOKBACK_DAYS = 30;
const RISK_LEVEL_RED_THRESHOLD = 60;
const RISK_LEVEL_YELLOW_THRESHOLD = 30;
const MAX_BBOX_SPAN_DEG = 0.2; // ~20km — keeps a regular user's recalculate call bounded
const ADMIN_MAX_BBOX_SPAN_DEG = 1.5; // ~150km — enough for a metro area, still bounded

interface CellAccumulator {
  reportCount: number;
  sosCount: number;
}

/**
 * riskScore/riskLevel here are the *inverse* of SafeScore (higher =
 * more dangerous) — matching Heatmap.model.ts's own field comment
 * ("higher = more dangerous"). The sub-factor fields (reportDensityScore,
 * sosDensityScore, timeOfDayRiskScore) follow that same "higher = riskier"
 * convention for a coherent read on the admin heatmap view, which is a
 * deliberate interpretation of the model's originally-ambiguous factor
 * fields, documented here since this is where it's first made concrete.
 * crimeDatasetScore stays 0 — no real crime dataset is wired into this
 * build (see docs/architecture/SAFESCORE_ALGORITHM.md).
 */
export class HeatmapService {
  constructor(
    private readonly heatmapRepository: IHeatmapRepository,
    private readonly reportRepository: IReportRepository,
    private readonly sosLogRepository: ISOSLogRepository
  ) {}

  async recalculate(bbox: BoundingBox, options: { isAdmin?: boolean } = {}): Promise<IHeatmap[]> {
    this.assertReasonableBBox(bbox, options.isAdmin);

    const [reports, sosLogs] = await Promise.all([
      this.reportRepository.findWithinBBox(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, RECALCULATE_LOOKBACK_DAYS),
      this.sosLogRepository.findWithinBBox(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, RECALCULATE_LOOKBACK_DAYS),
    ]);

    const cells = new Map<string, CellAccumulator>();
    const bump = (coordinates: [number, number], kind: keyof CellAccumulator) => {
      const key = gridCellKey(coordinates[1], coordinates[0]);
      const cell = cells.get(key) ?? { reportCount: 0, sosCount: 0 };
      cell[kind] += 1;
      cells.set(key, cell);
    };
    reports.forEach((report) => bump(report.location.coordinates, 'reportCount'));
    sosLogs.forEach((sosLog) => bump(sosLog.location.coordinates, 'sosCount'));

    if (cells.size === 0) return [];

    const cellKeys = Array.from(cells.keys());
    const scoreItems: BatchSafeScoreItem[] = cellKeys.map((key) => {
      const cell = cells.get(key)!;
      return {
        id: key,
        // A zone's SafeScore isn't about any one device, so battery/motion
        // are neutralized (full battery, no anomaly) — only the factors
        // that describe the *place* should move the number here.
        battery_level: 100,
        motion_anomaly_confidence: 0,
        reports_score: reportsScoreFromCounts(cell.reportCount, cell.sosCount),
      };
    });

    const results = await aiServiceClient.batchComputeSafeScore(scoreItems);
    const resultById = new Map(results.map((r) => [r.id, r]));

    const upserted = await Promise.all(
      cellKeys.map(async (key) => {
        const cell = cells.get(key)!;
        const result = resultById.get(key);
        const safeScore = result?.safe_score ?? 50;
        const riskScore = 100 - safeScore;
        const center = gridCellCenter(key);

        return this.heatmapRepository.upsertByZoneId(key, {
          zoneId: key,
          center: { type: 'Point', coordinates: center },
          radiusMeters: GRID_RESOLUTION_METERS_APPROX,
          riskLevel: this.riskLevelFor(riskScore),
          riskScore,
          factors: {
            crimeDatasetScore: 0,
            reportDensityScore: Math.min(100, cell.reportCount * 8),
            sosDensityScore: Math.min(100, cell.sosCount * 8),
            timeOfDayRiskScore: result ? 100 - result.factors.time : 50,
          },
          dataSource: 'hybrid',
          reportCount: cell.reportCount,
          sosCount: cell.sosCount,
          lastCalculatedAt: new Date(),
        });
      })
    );

    return upserted;
  }

  async getWithinBBox(bbox: BoundingBox): Promise<IHeatmap[]> {
    this.assertReasonableBBox(bbox);
    return this.heatmapRepository.findWithinBBox(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat);
  }

  /** Admin-only — every zone ever calculated, riskiest first, no
   * bounding box required (the admin dashboard's heatmap management
   * view isn't tied to "what's currently on my screen" the way the
   * mobile Risk Zones screen is). */
  async listAllZones(page: number, limit: number) {
    return this.heatmapRepository.listAll(page, limit);
  }

  private riskLevelFor(riskScore: number): RiskLevel {
    if (riskScore >= RISK_LEVEL_RED_THRESHOLD) return 'red';
    if (riskScore >= RISK_LEVEL_YELLOW_THRESHOLD) return 'yellow';
    return 'green';
  }

  private assertReasonableBBox(bbox: BoundingBox, isAdmin = false): void {
    const lngSpan = bbox.maxLng - bbox.minLng;
    const latSpan = bbox.maxLat - bbox.minLat;
    const maxSpan = isAdmin ? ADMIN_MAX_BBOX_SPAN_DEG : MAX_BBOX_SPAN_DEG;
    if (lngSpan <= 0 || latSpan <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid bounding box — max must exceed min on both axes');
    }
    if (lngSpan > maxSpan || latSpan > maxSpan) {
      throw new AppError('VALIDATION_ERROR', `Bounding box too large — each side must be under ${maxSpan}°`);
    }
  }
}
