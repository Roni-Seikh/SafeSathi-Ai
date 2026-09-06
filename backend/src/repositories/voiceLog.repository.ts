import VoiceLog, { IVoiceLog } from '../models/VoiceLog.model';
import { PaginatedResult } from '../types/common.types';

export interface IVoiceLogRepository {
  create(data: Partial<IVoiceLog>): Promise<IVoiceLog>;
  findHistoryForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<IVoiceLog>>;
  linkToSOS(id: string, sosLogId: string): Promise<void>;
}

class MongoVoiceLogRepository implements IVoiceLogRepository {
  async create(data: Partial<IVoiceLog>) {
    return VoiceLog.create(data);
  }

  async findHistoryForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      VoiceLog.find({ userId })
        .sort({ recordedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      VoiceLog.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async linkToSOS(id: string, sosLogId: string) {
    await VoiceLog.findByIdAndUpdate(id, { triggeredSOS: true, sosLogId });
  }
}

export const voiceLogRepository: IVoiceLogRepository = new MongoVoiceLogRepository();
