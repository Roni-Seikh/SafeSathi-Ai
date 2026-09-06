import { apiClient } from './apiClient';
import type { ApiSuccess, PageMeta, AdminReport, ReportStatus } from '@/types';

export interface ListReportsParams {
  page: number;
  limit: number;
  status?: ReportStatus;
}

export async function listReports(
  params: ListReportsParams
): Promise<{ reports: AdminReport[]; meta: PageMeta }> {
  const { data } = await apiClient.get<ApiSuccess<{ reports: AdminReport[] }>>('/admin/reports', {
    params,
  });
  return { reports: data.data.reports, meta: data.meta! };
}

export async function verifyReport(id: string): Promise<AdminReport> {
  const { data } = await apiClient.patch<ApiSuccess<{ report: AdminReport }>>(
    `/admin/reports/${id}/verify`
  );
  return data.data.report;
}

export async function rejectReport(id: string, reason: string): Promise<AdminReport> {
  const { data } = await apiClient.patch<ApiSuccess<{ report: AdminReport }>>(
    `/admin/reports/${id}/reject`,
    { reason }
  );
  return data.data.report;
}
