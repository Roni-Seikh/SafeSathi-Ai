import { apiClient } from './apiClient';
import type { ApiSuccess, AdminOverview, SOSTrendPoint, PeakTimingPoint } from '@/types';

export async function getOverview(): Promise<AdminOverview> {
  const { data } = await apiClient.get<ApiSuccess<AdminOverview>>('/admin/analytics/overview');
  return data.data;
}

export async function getSOSTrend(days: number): Promise<SOSTrendPoint[]> {
  const { data } = await apiClient.get<ApiSuccess<{ trend: SOSTrendPoint[] }>>(
    '/admin/analytics/sos-trend',
    { params: { days } }
  );
  return data.data.trend;
}

export async function getPeakTimings(days: number): Promise<PeakTimingPoint[]> {
  const { data } = await apiClient.get<ApiSuccess<{ timings: PeakTimingPoint[] }>>(
    '/admin/analytics/peak-timings',
    { params: { days } }
  );
  return data.data.timings;
}
