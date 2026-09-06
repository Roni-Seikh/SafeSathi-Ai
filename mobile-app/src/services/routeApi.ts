import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint, RouteCandidate } from '../types/api.types';

export interface SafeRouteRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  batteryLevel?: number;
}

export async function getSafeRoute(payload: SafeRouteRequest): Promise<RouteCandidate[]> {
  const { data } = await apiClient.post<ApiSuccess<{ routes: RouteCandidate[] }>>('/routes/safe-route', payload);
  return data.data.routes;
}
