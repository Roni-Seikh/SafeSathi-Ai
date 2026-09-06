import SensorLog, { ISensorLog } from '../models/SensorLog.model';
import { PaginatedResult } from '../types/common.types';

export interface ISensorLogRepository {
  create(data: Partial<ISensorLog>): Promise<ISensorLog>;
  findHistoryForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<ISensorLog>>;
  linkToSOS(id: string, sosLogId: string): Promise<void>;
}

class MongoSensorLogRepository implements ISensorLogRepository {
  async create(data: Partial<ISensorLog>) {
    return SensorLog.create(data);
  }

  async findHistoryForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      SensorLog.find({ userId })
        .sort({ recordedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SensorLog.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async linkToSOS(id: string, sosLogId: string) {
    await SensorLog.findByIdAndUpdate(id, { triggeredSOS: true, sosLogId });
  }
}

export const sensorLogRepository: ISensorLogRepository = new MongoSensorLogRepository();
