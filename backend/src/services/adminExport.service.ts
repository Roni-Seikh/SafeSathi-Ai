import { IUserRepository } from '../repositories/user.repository';
import { IReportRepository } from '../repositories/report.repository';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { toCSV } from '../utils/csv';
import { AppError } from '../utils/AppError';

export type ExportType = 'users' | 'reports' | 'sos';

const EXPORT_ROW_LIMIT = 10000;

export interface MonthlyReportSummary {
  month: number;
  year: number;
  totalSOSEvents: number;
  totalReports: number;
  sosTrend: { date: string; count: number }[];
  peakTimings: { hour: number; sosCount: number; reportCount: number }[];
}

export class AdminExportService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly reportRepository: IReportRepository,
    private readonly sosLogRepository: ISOSLogRepository
  ) {}

  async exportCSV(type: ExportType): Promise<string> {
    switch (type) {
      case 'users':
        return this.exportUsersCSV();
      case 'reports':
        return this.exportReportsCSV();
      case 'sos':
        return this.exportSOSCSV();
      default:
        throw new AppError('VALIDATION_ERROR', 'Unknown export type — must be users, reports, or sos');
    }
  }

  private async exportUsersCSV(): Promise<string> {
    const { items } = await this.userRepository.listAll(1, EXPORT_ROW_LIMIT);
    return toCSV(
      items.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      }))
    );
  }

  private async exportReportsCSV(): Promise<string> {
    const { items } = await this.reportRepository.listAll(1, EXPORT_ROW_LIMIT);
    return toCSV(
      items.map((report) => ({
        id: String(report._id),
        type: report.type,
        status: report.status,
        severity: report.severity,
        isAnonymous: report.isAnonymous,
        description: report.description,
        lat: report.location.coordinates[1],
        lng: report.location.coordinates[0],
        createdAt: report.createdAt,
      }))
    );
  }

  private async exportSOSCSV(): Promise<string> {
    const { items } = await this.sosLogRepository.listAll(1, EXPORT_ROW_LIMIT);
    return toCSV(
      items.map((sosLog) => ({
        id: String(sosLog._id),
        userId: String(sosLog.userId),
        triggerType: sosLog.triggerType,
        status: sosLog.status,
        lat: sosLog.location.coordinates[1],
        lng: sosLog.location.coordinates[0],
        batteryLevel: sosLog.batteryLevel,
        triggeredAt: sosLog.triggeredAt,
        resolvedAt: sosLog.resolvedAt,
      }))
    );
  }

  /**
   * A structured JSON summary, not a formatted PDF/document — this
   * backend has no PDF-generation dependency, and adding one for a
   * single admin feature wasn't worth it. The admin dashboard renders
   * this into a printable page (browsers already handle "print to PDF"
   * well), which is where a polished monthly report belongs anyway.
   */
  async generateMonthlyReportSummary(month: number, year: number): Promise<MonthlyReportSummary> {
    if (month < 1 || month > 12) {
      throw new AppError('VALIDATION_ERROR', 'month must be between 1 and 12');
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000));

    const [totalSOSEvents, totalReports, sosTrend, sosHours, reportHours] = await Promise.all([
      this.sosLogRepository.countInDateRange(start, end),
      this.reportRepository.countInDateRange(start, end),
      this.sosLogRepository.countPerDay(daysInMonth),
      this.sosLogRepository.countByHourOfDay(daysInMonth),
      this.reportRepository.countByHourOfDay(daysInMonth),
    ]);

    const sosByHour = new Map(sosHours.map((h) => [h.hour, h.count]));
    const reportByHour = new Map(reportHours.map((h) => [h.hour, h.count]));
    const peakTimings = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sosCount: sosByHour.get(hour) ?? 0,
      reportCount: reportByHour.get(hour) ?? 0,
    }));

    const startKey = start.toISOString().slice(0, 10);
    const endKey = end.toISOString().slice(0, 10);

    return {
      month,
      year,
      totalSOSEvents,
      totalReports,
      sosTrend: sosTrend.filter((point) => point.date >= startKey && point.date < endKey),
      peakTimings,
    };
  }
}
