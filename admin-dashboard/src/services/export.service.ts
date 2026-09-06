import { apiClient } from './apiClient';
import type { ApiSuccess, ExportType, MonthlyReportSummary } from '@/types';

/** Streams the CSV as a blob and triggers a browser download — the
 * endpoint itself returns raw text/csv, not the { success, data } envelope. */
export async function downloadCSV(type: ExportType): Promise<void> {
  const response = await apiClient.get('/admin/export/csv', {
    params: { type },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `safesathi-${type}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getMonthlyReport(month: number, year: number): Promise<MonthlyReportSummary> {
  const { data } = await apiClient.get<ApiSuccess<MonthlyReportSummary>>(
    '/admin/export/monthly-report',
    { params: { month, year } }
  );
  return data.data;
}
