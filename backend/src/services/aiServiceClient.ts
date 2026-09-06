import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { SupportedLanguage } from '../types/common.types';
import { DetectedKeyword } from '../models/VoiceLog.model';
import { SensorEventType, IMotionSummary } from '../models/SensorLog.model';

const aiServiceHttp = axios.create({
  baseURL: env.AI_SERVICE_BASE_URL,
  timeout: 8000,
});

/** Field names below are snake_case on purpose — they're the AI
 * service's actual JSON response shape (Pydantic's default), not a
 * TypeScript convention. Mapped to the backend's camelCase Mongoose
 * fields at the call site (see VoiceLogService / SensorLogService),
 * not here — this client is a thin, faithful wire-format wrapper. */
export interface VoiceAnalysisResult {
  detected_keyword: DetectedKeyword;
  keyword_confidence: number;
  language: SupportedLanguage;
  tone_analysis: {
    pitch_hz: number | null;
    loudness_db: number | null;
    scream_probability: number;
    fear_probability: number;
  };
  keyword_engine_available: boolean;
}

export interface MotionClassifyResult {
  event_type: SensorEventType;
  confidence: number;
  class_probabilities: Record<string, number>;
}

export interface SafeScoreResult {
  safe_score: number;
  factors: Record<string, number>;
}

export interface SafeScoreRequestPayload {
  battery_level: number;
  motion_anomaly_confidence?: number;
  hour_of_day?: number;
  crime_score?: number;
  light_score?: number;
  reports_score?: number;
  trust_score?: number;
}

export interface BatchSafeScoreItem {
  id: string;
  battery_level: number;
  motion_anomaly_confidence?: number;
  hour_of_day?: number;
  crime_score?: number;
  light_score?: number;
  reports_score?: number;
  trust_score?: number;
}

export interface BatchSafeScoreResultItem {
  id: string;
  safe_score: number;
  factors: Record<string, number>;
}

class AiServiceClient {
  async analyzeVoice(audioBuffer: Buffer, language: SupportedLanguage): Promise<VoiceAnalysisResult> {
    try {
      const form = new FormData();
      form.append('language', language);
      form.append('audio', audioBuffer, { filename: 'clip.wav', contentType: 'audio/wav' });

      const { data } = await aiServiceHttp.post<VoiceAnalysisResult>('/internal/voice/analyze', form, {
        headers: form.getHeaders(),
      });
      return data;
    } catch (error) {
      logger.error('AI service voice analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('AI_SERVICE_UNAVAILABLE', 'Voice analysis is temporarily unavailable');
    }
  }

  async classifyMotion(accelerometer: IMotionSummary, gyroscope: IMotionSummary): Promise<MotionClassifyResult> {
    try {
      const { data } = await aiServiceHttp.post<MotionClassifyResult>('/internal/motion/classify', {
        accelerometer: {
          mean_magnitude: accelerometer.meanMagnitude,
          peak_magnitude: accelerometer.peakMagnitude,
          variance: accelerometer.variance,
        },
        gyroscope: {
          mean_magnitude: gyroscope.meanMagnitude,
          peak_magnitude: gyroscope.peakMagnitude,
          variance: gyroscope.variance,
        },
      });
      return data;
    } catch (error) {
      logger.error('AI service motion classification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('AI_SERVICE_UNAVAILABLE', 'Motion classification is temporarily unavailable');
    }
  }

  async computeSafeScore(payload: SafeScoreRequestPayload): Promise<SafeScoreResult> {
    try {
      const { data } = await aiServiceHttp.post<SafeScoreResult>('/internal/safescore', payload);
      return data;
    } catch (error) {
      logger.error('AI service SafeScore computation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('AI_SERVICE_UNAVAILABLE', 'SafeScore computation is temporarily unavailable');
    }
  }

  /** Used by RouteService (scoring samples along candidate routes) and
   * HeatmapService (scoring grid cells) — see
   * ai-services/app/api/safescore.py for why this single batch endpoint
   * covers both rather than two near-identical specialized ones. */
  async batchComputeSafeScore(items: BatchSafeScoreItem[]): Promise<BatchSafeScoreResultItem[]> {
    try {
      const { data } = await aiServiceHttp.post<{ results: BatchSafeScoreResultItem[] }>('/internal/safescore/batch', {
        items,
      });
      return data.results;
    } catch (error) {
      logger.error('AI service batch SafeScore computation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('AI_SERVICE_UNAVAILABLE', 'Route/heatmap scoring is temporarily unavailable');
    }
  }
}

export const aiServiceClient = new AiServiceClient();
