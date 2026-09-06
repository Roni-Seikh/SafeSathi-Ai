import { IUserRepository } from '../repositories/user.repository';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { IReportRepository } from '../repositories/report.repository';

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  sosLast24h: number;
  activeSOSNow: number;
  pendingReports: number;
  totalReports: number;
}

export interface SOSTrendPoint {
  date: string;
  count: number;
}

export interface PeakTimingPoint {
  hour: number;
  sosCount: number;
  reportCount: number;
}

export class AdminAnalyticsService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sosLogRepository: ISOSLogRepository,
    private readonly reportRepository: IReportRepository
  ) {}

  async getOverview(): Promise<AdminOverview> {
    const [totalUsers, activeUsers, sosLast24h, activeSOSNow, pendingReports, verified, rejected, resolved] =
      await Promise.all([
        this.userRepository.countTotal(),
        this.userRepository.countActive(),
        this.sosLogRepository.countTriggeredSince(24),
        this.sosLogRepository.countByStatus('active'),
        this.reportRepository.countByStatus('pending'),
        this.reportRepository.countByStatus('verified'),
        this.reportRepository.countByStatus('rejected'),
        this.reportRepository.countByStatus('resolved'),
      ]);

    return {
      totalUsers,
      activeUsers,
      sosLast24h,
      activeSOSNow,
      pendingReports,
      totalReports: pendingReports + verified + rejected + resolved,
    };
  }

  async getSOSTrend(days: number): Promise<SOSTrendPoint[]> {
    return this.sosLogRepository.countPerDay(days);
  }

  async getPeakTimings(days: number): Promise<PeakTimingPoint[]> {
    const [sosHours, reportHours] = await Promise.all([
      this.sosLogRepository.countByHourOfDay(days),
      this.reportRepository.countByHourOfDay(days),
    ]);

    const sosByHour = new Map(sosHours.map((h) => [h.hour, h.count]));
    const reportByHour = new Map(reportHours.map((h) => [h.hour, h.count]));

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sosCount: sosByHour.get(hour) ?? 0,
      reportCount: reportByHour.get(hour) ?? 0,
    }));
  }
}
