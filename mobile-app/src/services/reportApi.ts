import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint, Report, ReportSeverity, ReportType } from '../types/api.types';

export interface CreateReportPayload {
  type: ReportType;
  description: string;
  location: GeoPoint;
  address?: string;
  severity?: ReportSeverity;
  isAnonymous?: boolean;
}

export async function createReport(payload: CreateReportPayload): Promise<Report> {
  const { data } = await apiClient.post<ApiSuccess<{ report: Report }>>('/reports', payload);
  return data.data.report;
}

export async function getMyReports(page = 1, limit = 20): Promise<{ reports: Report[]; total: number }> {
  const { data } = await apiClient.get<ApiSuccess<{ reports: Report[] }>>('/reports/me', { params: { page, limit } });
  return { reports: data.data.reports, total: data.meta?.total ?? data.data.reports.length };
}

export async function getReportImageUploadUrl(
  reportId: string,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<{ uploadUrl: string; publicPath: string }> {
  const { data } = await apiClient.post<ApiSuccess<{ uploadUrl: string; publicPath: string }>>(
    `/reports/${reportId}/images`,
    { contentType }
  );
  return data.data;
}

export async function confirmReportImage(reportId: string, imagePath: string): Promise<Report> {
  const { data } = await apiClient.patch<ApiSuccess<{ report: Report }>>(`/reports/${reportId}/images`, {
    imagePath,
  });
  return data.data.report;
}
