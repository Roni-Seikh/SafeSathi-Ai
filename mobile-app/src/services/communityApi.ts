import { apiClient } from './apiClient';
import { ApiSuccess, Report } from '../types/api.types';

export async function getNearbyAlerts(lat: number, lng: number, radiusMeters?: number): Promise<Report[]> {
  const { data } = await apiClient.get<ApiSuccess<{ reports: Report[] }>>('/community/alerts', {
    params: { lat, lng, radiusMeters },
  });
  return data.data.reports;
}

export async function updateAlertSubscription(enabled: boolean): Promise<void> {
  await apiClient.post('/community/alerts/subscribe', { enabled });
}
