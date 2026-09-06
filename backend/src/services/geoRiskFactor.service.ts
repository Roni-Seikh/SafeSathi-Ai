import { IReportRepository } from '../repositories/report.repository';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { IGeoPoint } from '../types/common.types';

/** Tunable decay constant — see docs/architecture/SAFESCORE_ALGORITHM.md
 * §4: "f_reports = 100 - min(100, activeReportsWithinRadius * k2)".
 * k2 = 8 means 13 nearby incidents already floors the score at 0; that's
 * a deliberately aggressive decay for a safety app — a handful of real,
 * recent, nearby incidents should dominate the score fast. */
const REPORTS_SCORE_DECAY_K = 8;
const REPORTS_LOOKBACK_HOURS = 24;
export const DEFAULT_NEARBY_RADIUS_METERS = 300;

export function reportsScoreFromCounts(reportCount: number, sosCount: number): number {
  const combinedCount = reportCount + sosCount;
  return Math.max(0, 100 - Math.min(100, combinedCount * REPORTS_SCORE_DECAY_K));
}

export class GeoRiskFactorService {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly sosLogRepository: ISOSLogRepository
  ) {}

  /**
   * SAFESCORE_ALGORITHM.md's reports_score factor — combines nearby
   * recent Reports AND SOSLogs (documented as combined, not reports
   * alone: a street with three SOS triggers and zero filed reports isn't
   * "clean data," it's under-reported). This is the one SafeScore factor
   * this build computes from real data end to end — crime_score and
   * light_score still use the documented neutral defaults, pending a
   * real crime dataset and OSM road-tag integration respectively (see
   * docs/architecture/SAFESCORE_ALGORITHM.md and ai-services/README.md).
   */
  async computeReportsScore(point: IGeoPoint, radiusMeters: number = DEFAULT_NEARBY_RADIUS_METERS): Promise<number> {
    const [reportCount, sosCount] = await Promise.all([
      this.reportRepository.countNear(point, radiusMeters, REPORTS_LOOKBACK_HOURS),
      this.sosLogRepository.countNear(point, radiusMeters, REPORTS_LOOKBACK_HOURS),
    ]);
    return reportsScoreFromCounts(reportCount, sosCount);
  }
}
