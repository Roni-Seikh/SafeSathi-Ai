import Route, { IRoute } from '../models/Route.model';
import { PaginatedResult } from '../types/common.types';

export interface IRouteRepository {
  create(data: Partial<IRoute>): Promise<IRoute>;
  findHistoryForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<IRoute>>;
}

class MongoRouteRepository implements IRouteRepository {
  async create(data: Partial<IRoute>) {
    return Route.create(data);
  }

  async findHistoryForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      Route.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Route.countDocuments({ userId }),
    ]);
    return { items, total };
  }
}

export const routeRepository: IRouteRepository = new MongoRouteRepository();
