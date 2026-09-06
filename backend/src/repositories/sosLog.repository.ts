import SOSLog, { ISOSLog, INotifiedContact, SOSStatus } from '../models/SOSLog.model';
import { PaginatedResult, IGeoPoint } from '../types/common.types';

export interface ISOSLogRepository {
  create(data: Partial<ISOSLog>): Promise<ISOSLog>;
  findById(id: string): Promise<ISOSLog | null>;
  findActiveForUser(userId: string): Promise<ISOSLog | null>;
  findHistoryForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<ISOSLog>>;
  updateStatus(id: string, status: SOSStatus, resolvedBy: ISOSLog['resolvedBy']): Promise<ISOSLog | null>;
  addNotifiedContact(id: string, entry: INotifiedContact): Promise<void>;
  /** Used by HeatmapService/RouteService alongside
   * IReportRepository.countNear — SAFESCORE_ALGORITHM.md's reports_score
   * factor is documented as reports AND SOS logs combined, not reports
   * alone (a street with three SOS triggers and zero filed reports is
   * not "clean data," it's under-reported). */
  countNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number): Promise<number>;
  findWithinBBox(minLng: number, minLat: number, maxLng: number, maxLat: number, sinceDays: number): Promise<ISOSLog[]>;
  /** Admin-only — every user's SOS events, not scoped to one user. */
  listAll(page: number, limit: number, status?: SOSStatus): Promise<PaginatedResult<ISOSLog>>;
  countByStatus(status: SOSStatus): Promise<number>;
  countTriggeredSince(hoursAgo: number): Promise<number>;
  /** One row per day for the last `days` days — backs the admin
   * SOS-per-day trend chart. */
  countPerDay(days: number): Promise<{ date: string; count: number }[]>;
  /** One row per hour-of-day (0-23), aggregated over the last `days`
   * days — backs the admin peak-timings chart. */
  countByHourOfDay(days: number): Promise<{ hour: number; count: number }[]>;
  /** Used by AdminExportService's monthly report — a plain count of
   * events triggered within an arbitrary [start, end) window. */
  countInDateRange(start: Date, end: Date): Promise<number>;
}

class MongoSOSLogRepository implements ISOSLogRepository {
  async create(data: Partial<ISOSLog>) {
    return SOSLog.create(data);
  }

  async findById(id: string) {
    return SOSLog.findById(id);
  }

  async findActiveForUser(userId: string) {
    return SOSLog.findOne({ userId, status: 'active' }).sort({ triggeredAt: -1 });
  }

  async findHistoryForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      SOSLog.find({ userId })
        .sort({ triggeredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SOSLog.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, status: SOSStatus, resolvedBy: ISOSLog['resolvedBy']) {
    return SOSLog.findByIdAndUpdate(id, { status, resolvedAt: new Date(), resolvedBy }, { new: true });
  }

  async addNotifiedContact(id: string, entry: INotifiedContact) {
    await SOSLog.findByIdAndUpdate(id, { $push: { notifiedContacts: entry } });
  }

  async countNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number) {
    return SOSLog.countDocuments({
      location: { $near: { $geometry: point, $maxDistance: radiusMeters } },
      ...(sinceHours ? { triggeredAt: { $gte: new Date(Date.now() - sinceHours * 3600 * 1000) } } : {}),
    });
  }

  async findWithinBBox(minLng: number, minLat: number, maxLng: number, maxLat: number, sinceDays: number) {
    return SOSLog.find({
      location: {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      },
      triggeredAt: { $gte: new Date(Date.now() - sinceDays * 24 * 3600 * 1000) },
    });
  }

  async listAll(page: number, limit: number, status?: SOSStatus) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      SOSLog.find(filter)
        .sort({ triggeredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SOSLog.countDocuments(filter),
    ]);
    return { items, total };
  }

  async countByStatus(status: SOSStatus) {
    return SOSLog.countDocuments({ status });
  }

  async countTriggeredSince(hoursAgo: number) {
    return SOSLog.countDocuments({ triggeredAt: { $gte: new Date(Date.now() - hoursAgo * 3600 * 1000) } });
  }

  async countPerDay(days: number) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const results = await SOSLog.aggregate([
      { $match: { triggeredAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$triggeredAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return results.map((r) => ({ date: r._id as string, count: r.count as number }));
  }

  async countByHourOfDay(days: number) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const results = await SOSLog.aggregate([
      { $match: { triggeredAt: { $gte: since } } },
      { $group: { _id: { $hour: '$triggeredAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return results.map((r) => ({ hour: r._id as number, count: r.count as number }));
  }

  async countInDateRange(start: Date, end: Date) {
    return SOSLog.countDocuments({ triggeredAt: { $gte: start, $lt: end } });
  }
}

export const sosLogRepository: ISOSLogRepository = new MongoSOSLogRepository();
