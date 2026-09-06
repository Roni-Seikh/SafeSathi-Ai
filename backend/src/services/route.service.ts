import { Types } from 'mongoose';
import { IRoute } from '../models/Route.model';
import { IRouteRepository } from '../repositories/route.repository';
import { GeoRiskFactorService } from './geoRiskFactor.service';
import { aiServiceClient, BatchSafeScoreItem } from './aiServiceClient';
import { IGeoPoint, IGeoLineString, PaginatedResult } from '../types/common.types';
import { interpolate, perpendicularOffsetMidpoint, totalPathDistanceMeters } from '../utils/geometry';

const SAMPLE_SEGMENTS = 6; // sample points per candidate route
const DETOUR_OFFSET_FRACTION = 0.15; // how far the "alternate street" candidate bows out
const AVERAGE_WALKING_SPEED_MPS = 1.3;

export interface SafeRouteRequestInput {
  userId: string;
  origin: IGeoPoint;
  destination: IGeoPoint;
  batteryLevel: number;
}

export interface RankedRouteCandidate {
  routeGeometry: IGeoLineString;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  safeScore: number;
}

/**
 * IMPORTANT SCOPE NOTE — read before assuming this does real turn-by-turn
 * routing: it does not. There's no road-network routing engine (OSRM,
 * GraphHopper, Valhalla) or dataset wired into this build — that's real
 * infrastructure this environment doesn't have, not something to fake
 * with an invented API key or a hardcoded "route." Candidate paths here
 * are straight-line interpolations (a direct line, and one bowed-out
 * "alternate street" candidate), not road-snapped geometry.
 *
 * What IS real: the SAFETY SCORING along whichever geometry it's given.
 * Each candidate is sampled at SAMPLE_SEGMENTS points, and each sample's
 * reports_score comes from an actual MongoDB geo query against real
 * Report/SOSLog data (GeoRiskFactorService) — not a placeholder. A
 * route's overall score is the minimum across its samples, per
 * docs/architecture/SAFESCORE_ALGORITHM.md §6 ("a route is only as safe
 * as its most dangerous stretch").
 *
 * To make this production-real: swap generateCandidateGeometries() for a
 * call to a self-hosted OSRM/GraphHopper instance (or a routing API) that
 * returns real road-snapped alternatives, and sample along those instead
 * — everything downstream of "here are some candidate point lists"
 * already works correctly and wouldn't need to change.
 */
export class RouteService {
  constructor(
    private readonly routeRepository: IRouteRepository,
    private readonly geoRiskFactorService: GeoRiskFactorService
  ) {}

  async getSafeRoutes(input: SafeRouteRequestInput): Promise<RankedRouteCandidate[]> {
    const origin = input.origin.coordinates;
    const destination = input.destination.coordinates;
    const candidateGeometries = this.generateCandidateGeometries(origin, destination);

    const scoredCandidates: RankedRouteCandidate[] = [];
    for (const geometry of candidateGeometries) {
      const scoreItems: BatchSafeScoreItem[] = await Promise.all(
        geometry.map(async (point, index) => ({
          id: `sample-${index}`,
          battery_level: input.batteryLevel,
          reports_score: await this.geoRiskFactorService.computeReportsScore({ type: 'Point', coordinates: point }),
        }))
      );
      const results = await aiServiceClient.batchComputeSafeScore(scoreItems);
      const safeScore = Math.min(...results.map((r) => r.safe_score));
      const distanceMeters = totalPathDistanceMeters(geometry);

      scoredCandidates.push({
        routeGeometry: { type: 'LineString', coordinates: geometry },
        distanceMeters,
        estimatedDurationSeconds: Math.round(distanceMeters / AVERAGE_WALKING_SPEED_MPS),
        safeScore,
      });
    }

    scoredCandidates.sort((a, b) => b.safeScore - a.safeScore);

    // Best-effort persistence for route history — a failure here
    // shouldn't fail the request, the person still gets their routes.
    try {
      await Promise.all(
        scoredCandidates.map((candidate, index) =>
          this.routeRepository.create({
            userId: new Types.ObjectId(input.userId),
            origin: input.origin,
            destination: input.destination,
            routeGeometry: candidate.routeGeometry,
            distanceMeters: candidate.distanceMeters,
            estimatedDurationSeconds: candidate.estimatedDurationSeconds,
            safeScore: candidate.safeScore,
            wasSelected: index === 0,
          })
        )
      );
    } catch {
      // Non-fatal — see comment above.
    }

    return scoredCandidates;
  }

  async getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<IRoute>> {
    return this.routeRepository.findHistoryForUser(userId, page, limit);
  }

  private generateCandidateGeometries(origin: [number, number], destination: [number, number]): [number, number][][] {
    const direct = interpolate(origin, destination, SAMPLE_SEGMENTS);

    const detourPoint = perpendicularOffsetMidpoint(origin, destination, DETOUR_OFFSET_FRACTION);
    const halfSegments = Math.max(1, Math.ceil(SAMPLE_SEGMENTS / 2));
    const viaDetour = [
      ...interpolate(origin, detourPoint, halfSegments),
      ...interpolate(detourPoint, destination, halfSegments).slice(1),
    ];

    return [direct, viaDetour];
  }
}
