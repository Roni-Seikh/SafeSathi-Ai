import { Types } from 'mongoose';
import { ISensorLog, IMotionSummary, SensorEventType } from '../models/SensorLog.model';
import { ISensorLogRepository } from '../repositories/sensorLog.repository';
import { IUserRepository } from '../repositories/user.repository';
import { SOSService } from './sos.service';
import { aiServiceClient } from './aiServiceClient';
import { AppError } from '../utils/AppError';
import { PaginatedResult, IGeoPoint } from '../types/common.types';
import { SENSOR_EVENT_CONFIDENCE_THRESHOLD } from '../utils/constants';

const DANGER_EVENT_TYPES: SensorEventType[] = ['phone_snatch', 'violent_movement', 'sudden_fall'];

export interface SubmitSensorLogInput {
  userId: string;
  accelerometer: IMotionSummary;
  gyroscope: IMotionSummary;
  location: IGeoPoint;
  batteryLevel?: number;
}

export interface SubmitSensorLogResult {
  sensorLog: ISensorLog;
  sosTriggered: boolean;
}

export class SensorLogService {
  constructor(
    private readonly sensorLogRepository: ISensorLogRepository,
    private readonly userRepository: IUserRepository,
    private readonly sosService: SOSService
  ) {}

  async submit(input: SubmitSensorLogInput): Promise<SubmitSensorLogResult> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');

    const classification = await aiServiceClient.classifyMotion(input.accelerometer, input.gyroscope);

    const isDangerSignature = DANGER_EVENT_TYPES.includes(classification.event_type);
    const shouldTrigger =
      user.safetyPreferences.autoSOSEnabled &&
      user.safetyPreferences.motionDetectionEnabled &&
      isDangerSignature &&
      classification.confidence >= SENSOR_EVENT_CONFIDENCE_THRESHOLD;

    const sensorLog = await this.sensorLogRepository.create({
      userId: new Types.ObjectId(input.userId),
      eventType: classification.event_type,
      accelerometer: input.accelerometer,
      gyroscope: input.gyroscope,
      confidenceScore: classification.confidence,
      triggeredSOS: false,
      recordedAt: new Date(),
    });

    let sosTriggered = false;
    if (shouldTrigger) {
      const sosLog = await this.sosService.trigger({
        userId: input.userId,
        triggerType: 'motion',
        location: input.location,
        batteryLevel: input.batteryLevel,
        sensorLogId: String(sensorLog._id),
      });
      await this.sensorLogRepository.linkToSOS(String(sensorLog._id), String(sosLog._id));
      sosTriggered = true;
    }

    return { sensorLog, sosTriggered };
  }

  async getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<ISensorLog>> {
    return this.sensorLogRepository.findHistoryForUser(userId, page, limit);
  }
}
