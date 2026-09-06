import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint } from '../types/api.types';

export interface LocationPoint {
  _id: string;
  userId: string;
  coordinates: GeoPoint;
  accuracy?: number;
  speed?: number;
  batteryLevel?: number;
  recordedAt: string;
}

export interface RecordLocationPayload {
  location: GeoPoint;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  batteryLevel?: number;
}

export async function recordLocation(payload: RecordLocationPayload): Promise<LocationPoint> {
  const { data } = await apiClient.post<ApiSuccess<{ location: LocationPoint }>>('/location', payload);
  return data.data.location;
}

export async function getLiveLocation(userId: string): Promise<LocationPoint> {
  const { data } = await apiClient.get<ApiSuccess<{ location: LocationPoint }>>(`/location/live/${userId}`);
  return data.data.location;
}

export async function startSharing(contactIds?: string[]): Promise<{ sharedWithUserIds: string[] }> {
  const { data } = await apiClient.post<ApiSuccess<{ sharedWithUserIds: string[] }>>('/location/sharing/start', {
    contactIds,
  });
  return data.data;
}

export async function stopSharing(): Promise<void> {
  await apiClient.post('/location/sharing/stop');
}
