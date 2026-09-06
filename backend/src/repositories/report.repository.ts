import Report, { IReport, ReportStatus } from '../models/Report.model';
import { PaginatedResult, IGeoPoint } from '../types/common.types';

export interface IReportRepository {
  create(data: Partial<IReport>): Promise<IReport>;
  findById(id: string): Promise<IReport | null>;
  findForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<IReport>>;
  findNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number): Promise<IReport[]>;
  /** Used by HeatmapService/RouteService — just the count, not the
   * documents, since that's all the SafeScore reports_score factor needs. */
  countNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number): Promise<number>;
  findWithinBBox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
    sinceDays: number
  ): Promise<IReport[]>;
  addImage(id: string, imagePath: string): Promise<void>;
  /** Admin-only — every report regardless of who filed it. */
  listAll(page: number, limit: number, status?: ReportStatus): Promise<PaginatedResult<IReport>>;
  countByStatus(status: ReportStatus): Promise<number>;
  verify(id: string, adminId: string): Promise<IReport | null>;
  reject(id: string, adminId: string, reason: string): Promise<IReport | null>;
  /** One row per hour-of-day (0-23) — combined with
   * ISOSLogRepository.countByHourOfDay for the admin peak-timings chart. */
  countByHourOfDay(days: number): Promise<{ hour: number; count: number }[]>;
  /** Used by AdminExportService's monthly report. */
  countInDateRange(start: Date, end: Date): Promise<number>;
}

class MongoReportRepository implements IReportRepository {
  async create(data: Partial<IReport>) {
    return Report.create(data);
  }

  async findById(id: string) {
    return Report.findById(id);
  }

  async findForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      Report.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async findNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number) {
    return Report.find({
      location: { $near: { $geometry: point, $maxDistance: radiusMeters } },
      status: { $ne: 'rejected' },
      ...(sinceHours ? { createdAt: { $gte: new Date(Date.now() - sinceHours * 3600 * 1000) } } : {}),
    });
  }

  async countNear(point: IGeoPoint, radiusMeters: number, sinceHours?: number) {
    return Report.countDocuments({
      location: { $near: { $geometry: point, $maxDistance: radiusMeters } },
      status: { $ne: 'rejected' },
      ...(sinceHours ? { createdAt: { $gte: new Date(Date.now() - sinceHours * 3600 * 1000) } } : {}),
    });
  }

  async findWithinBBox(minLng: number, minLat: number, maxLng: number, maxLat: number, sinceDays: number) {
    return Report.find({
      location: {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      },
      status: { $ne: 'rejected' },
      createdAt: { $gte: new Date(Date.now() - sinceDays * 24 * 3600 * 1000) },
    });
  }

  async addImage(id: string, imagePath: string) {
    await Report.findByIdAndUpdate(id, { $push: { images: imagePath } });
  }

  async listAll(page: number, limit: number, status?: ReportStatus) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    return { items, total };
  }

  async countByStatus(status: ReportStatus) {
    return Report.countDocuments({ status });
  }

  async verify(id: string, adminId: string) {
    return Report.findByIdAndUpdate(
      id,
      { status: 'verified', verifiedBy: adminId, verifiedAt: new Date(), rejectionReason: undefined },
      { new: true }
    );
  }

  async reject(id: string, adminId: string, reason: string) {
    return Report.findByIdAndUpdate(
      id,
      { status: 'rejected', verifiedBy: adminId, verifiedAt: new Date(), rejectionReason: reason },
      { new: true }
    );
  }

  async countByHourOfDay(days: number) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const results = await Report.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return results.map((r) => ({ hour: r._id as number, count: r.count as number }));
  }

  async countInDateRange(start: Date, end: Date) {
    return Report.countDocuments({ createdAt: { $gte: start, $lt: end } });
  }
}

export const reportRepository: IReportRepository = new MongoReportRepository();
