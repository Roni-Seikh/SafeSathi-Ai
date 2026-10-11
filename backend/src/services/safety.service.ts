import { GeoRiskFactorService } from './geoRiskFactor.service';
import { aiServiceClient } from './aiServiceClient';
import { IGeoPoint } from '../types/common.types';
import { logger } from '../utils/logger';

export interface LiveSafeScore {
  score: number;
  level: 'safe' | 'caution' | 'risk';
  factors: Record<string, number>;
  advice: string[];
  source: 'ai_service' | 'local_fallback';
  computedAt: string;
}

export class SafetyService {
  constructor(private readonly geoRisk: GeoRiskFactorService) {}

  async liveScore(point: IGeoPoint, battery = 100, hourOverride?: number): Promise<LiveSafeScore> {
    const hour = hourOverride ?? (new Date().getUTCHours() + 5 + (new Date().getUTCMinutes() >= 30 ? 1 : 0)) % 24; // IST
    let reportsScore = 100;
    try {
      reportsScore = await this.geoRisk.computeReportsScore(point);
    } catch (e) {
      logger.warn('reports_score failed, assuming neutral', { error: e instanceof Error ? e.message : String(e) });
      reportsScore = 70;
    }

    let score: number;
    let factors: Record<string, number>;
    let source: LiveSafeScore['source'] = 'ai_service';
    try {
      const r = await aiServiceClient.computeSafeScore({ battery_level: battery, hour_of_day: hour, reports_score: reportsScore });
      score = r.safe_score;
      factors = r.factors;
    } catch {
      // The AI service may be cold-starting; the app must still show a sensible number.
      source = 'local_fallback';
      const timeFactor = hour >= 6 && hour < 19 ? 90 : hour >= 19 && hour < 22 ? 65 : 40;
      const batteryFactor = battery >= 30 ? 100 : Math.max(20, battery * 3);
      score = 0.5 * reportsScore + 0.3 * timeFactor + 0.2 * batteryFactor;
      factors = { reports_score: reportsScore, time_score: timeFactor, battery_score: batteryFactor };
    }
    score = Math.round(Math.max(0, Math.min(100, score)));

    const advice: string[] = [];
    if (reportsScore < 70) advice.push('Recent incidents were reported near you — stay on busy, well-lit roads.');
    if (hour >= 22 || hour < 5) advice.push('Late-night hours carry more risk — consider starting a Guardian Journey.');
    if (battery < 25) advice.push('Battery is low — charge soon so SOS and tracking keep working.');
    if (!advice.length) advice.push('Conditions look good. Guardian Mode keeps watching in the background of your day.');

    return { score, level: score >= 70 ? 'safe' : score >= 45 ? 'caution' : 'risk', factors, advice, source, computedAt: new Date().toISOString() };
  }
}
