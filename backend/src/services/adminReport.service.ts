import { IReport, ReportStatus } from '../models/Report.model';
import { IReportRepository } from '../repositories/report.repository';
import { AppError } from '../utils/AppError';
import { PaginatedResult } from '../types/common.types';

export class AdminReportService {
  constructor(private readonly reportRepository: IReportRepository) {}

  async list(page: number, limit: number, status?: ReportStatus): Promise<PaginatedResult<IReport>> {
    return this.reportRepository.listAll(page, limit, status);
  }

  async verify(reportId: string, adminId: string): Promise<IReport> {
    const report = await this.assertPending(reportId);
    const updated = await this.reportRepository.verify(String(report._id), adminId);
    if (!updated) throw new AppError('NOT_FOUND', 'Report not found');
    return updated;
  }

  async reject(reportId: string, adminId: string, reason: string): Promise<IReport> {
    const report = await this.assertPending(reportId);
    const updated = await this.reportRepository.reject(String(report._id), adminId, reason);
    if (!updated) throw new AppError('NOT_FOUND', 'Report not found');
    return updated;
  }

  private async assertPending(reportId: string): Promise<IReport> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) throw new AppError('NOT_FOUND', 'Report not found');
    if (report.status !== 'pending') {
      throw new AppError('CONFLICT', `This report has already been ${report.status}`);
    }
    return report;
  }
}
