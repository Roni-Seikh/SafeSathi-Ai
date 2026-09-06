import { Types } from 'mongoose';
import { IVoiceLog } from '../models/VoiceLog.model';
import { IVoiceLogRepository } from '../repositories/voiceLog.repository';
import { IUserRepository } from '../repositories/user.repository';
import { SOSService } from './sos.service';
import { aiServiceClient } from './aiServiceClient';
import { AppError } from '../utils/AppError';
import { PaginatedResult, IGeoPoint, SupportedLanguage } from '../types/common.types';
import { VOICE_KEYWORD_CONFIDENCE_THRESHOLD, SCREAM_PROBABILITY_THRESHOLD } from '../utils/constants';

export interface SubmitVoiceLogInput {
  userId: string;
  language: SupportedLanguage;
  audioBuffer: Buffer;
  location: IGeoPoint;
  batteryLevel?: number;
}

export interface SubmitVoiceLogResult {
  voiceLog: IVoiceLog;
  sosTriggered: boolean;
}

export class VoiceLogService {
  constructor(
    private readonly voiceLogRepository: IVoiceLogRepository,
    private readonly userRepository: IUserRepository,
    private readonly sosService: SOSService
  ) {}

  async submit(input: SubmitVoiceLogInput): Promise<SubmitVoiceLogResult> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');

    // AI_SERVICE_UNAVAILABLE propagates as a clean 502 (see AppError) if
    // the AI service is unreachable — there's no on-device fallback for
    // this specific analysis to degrade to (see ai-services/README.md §5
    // on why keyword+tone analysis is server-side, not on-device, for
    // this build), so a failed call here means "try again," not silence.
    const analysis = await aiServiceClient.analyzeVoice(input.audioBuffer, input.language);

    const keywordMatch =
      user.safetyPreferences.voiceDetectionEnabled &&
      analysis.detected_keyword !== 'none' &&
      analysis.keyword_confidence >= VOICE_KEYWORD_CONFIDENCE_THRESHOLD;

    const screamMatch =
      user.safetyPreferences.toneDetectionEnabled &&
      analysis.tone_analysis.scream_probability >= SCREAM_PROBABILITY_THRESHOLD;

    const shouldTrigger = user.safetyPreferences.autoSOSEnabled && (keywordMatch || screamMatch);

    const voiceLog = await this.voiceLogRepository.create({
      userId: new Types.ObjectId(input.userId),
      detectedKeyword: analysis.detected_keyword,
      language: input.language,
      keywordConfidence: analysis.keyword_confidence,
      toneAnalysis: {
        pitchHz: analysis.tone_analysis.pitch_hz ?? undefined,
        loudnessDb: analysis.tone_analysis.loudness_db ?? undefined,
        screamProbability: analysis.tone_analysis.scream_probability,
        fearProbability: analysis.tone_analysis.fear_probability,
      },
      triggeredSOS: false,
      recordedAt: new Date(),
    });

    let sosTriggered = false;
    if (shouldTrigger) {
      const sosLog = await this.sosService.trigger({
        userId: input.userId,
        triggerType: keywordMatch ? 'voice_keyword' : 'tone',
        location: input.location,
        batteryLevel: input.batteryLevel,
        voiceLogId: String(voiceLog._id),
      });
      await this.voiceLogRepository.linkToSOS(String(voiceLog._id), String(sosLog._id));
      sosTriggered = true;
    }

    return { voiceLog, sosTriggered };
  }

  async getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<IVoiceLog>> {
    return this.voiceLogRepository.findHistoryForUser(userId, page, limit);
  }
}
