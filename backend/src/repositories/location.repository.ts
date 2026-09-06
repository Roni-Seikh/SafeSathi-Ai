import Location, { ILocation } from '../models/Location.model';
import { PaginatedResult } from '../types/common.types';

export interface ILocationRepository {
  create(data: Partial<ILocation>): Promise<ILocation>;
  findLatestForUser(userId: string): Promise<ILocation | null>;
  findHistoryForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<ILocation>>;
}

class MongoLocationRepository implements ILocationRepository {
  async create(data: Partial<ILocation>) {
    return Location.create(data);
  }

  async findLatestForUser(userId: string) {
    return Location.findOne({ userId }).sort({ recordedAt: -1 });
  }

  async findHistoryForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      Location.find({ userId })
        .sort({ recordedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Location.countDocuments({ userId }),
    ]);
    return { items, total };
  }
}

export const locationRepository: ILocationRepository = new MongoLocationRepository();
