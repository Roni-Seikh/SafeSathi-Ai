import { Types } from 'mongoose';
import { IReport, ReportType, ReportSeverity } from '../models/Report.model';
import { IReportRepository } from '../repositories/report.repository';
import { IUserRepository } from '../repositories/user.repository';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { firebaseBucket } from '../config/firebase';
import { PaginatedResult, IGeoPoint } from '../types/common.types';
import { COMMUNITY_ALERT_RADIUS_METERS } from '../utils/constants';

export interface CreateReportInput {
  type: ReportType;
  description: string;
  location: IGeoPoint;
  address?: string;
  severity?: ReportSeverity;
  isAnonymous?: boolean;
}

export class ReportService {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService
  ) {}

  async create(userId: string, input: CreateReportInput): Promise<IReport> {
    const report = await this.reportRepository.create({
      userId: input.isAnonymous ? undefined : new Types.ObjectId(userId),
      type: input.type,
      description: input.description,
      location: input.location,
      address: input.address,
      severity: input.severity ?? 'medium',
      isAnonymous: !!input.isAnonymous,
      status: 'pending',
    });

    // Fire-and-forget from the caller's perspective would risk losing
    // the notification if the process restarts mid-request; awaiting it
    // keeps this simple and correct at the (small, bounded) cost of a
    // few extra notification sends before the response returns. Alerting
    // nearby users happens regardless of isAnonymous — that flag hides
    // the *reporter's* identity, not the safety signal itself.
    await this.notifyNearbyUsers(userId, report);

    return report;
  }

  private async notifyNearbyUsers(reporterId: string, report: IReport): Promise<void> {
    const nearbyUsers = await this.userRepository.findNearbyOptedIn(
      report.location,
      COMMUNITY_ALERT_RADIUS_METERS,
      reporterId
    );
    if (nearbyUsers.length === 0) return;

    const title = 'Incident reported nearby';
    const body = `A ${report.type.replace(/_/g, ' ')} incident was just reported near you.`;

    await Promise.all(
      nearbyUsers.map((user) =>
        this.notificationService.sendToUser({
          userId: String(user._id),
          type: 'community_alert',
          title,
          body,
          data: { reportId: String(report._id) },
        })
      )
    );
  }

  async getImageUploadUrl(reportId: string, contentType: string): Promise<{ uploadUrl: string; publicPath: string }> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) throw new AppError('NOT_FOUND', 'Report not found');

    const path = `reports/${reportId}/image-${Date.now()}`;
    const file = firebaseBucket.file(path);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    return { uploadUrl, publicPath: path };
  }

  async confirmImage(reportId: string, imagePath: string): Promise<IReport> {
    await this.reportRepository.addImage(reportId, imagePath);
    return this.getById(reportId);
  }

  async listForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<IReport>> {
    return this.reportRepository.findForUser(userId, page, limit);
  }

  async getById(reportId: string): Promise<IReport> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) throw new AppError('NOT_FOUND', 'Report not found');
    return report;
  }

  async listNearby(point: IGeoPoint, radiusMeters: number = COMMUNITY_ALERT_RADIUS_METERS): Promise<IReport[]> {
    return this.reportRepository.findNear(point, radiusMeters, 24);
  }
}
