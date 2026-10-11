import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint } from '../types/api.types';

export type JourneyMode = 'walk' | 'cab' | 'transit';
export interface Journey {
  _id: string; mode: JourneyMode; status: 'active' | 'prompted' | 'arrived' | 'cancelled' | 'escalated';
  destinationName: string; destination: GeoPoint; startedAt: string; etaAt: string; graceMinutes: number;
  vehicleNumber?: string; driverName?: string; remainingMeters?: number; promptedAt?: string; lastLocationAt?: string;
}
export interface StartJourneyArgs {
  mode: JourneyMode; destinationName: string; destination: GeoPoint; start: GeoPoint; etaMinutes: number; vehicleNumber?: string; driverName?: string;
}
const wrap = async (p: Promise<{ data: ApiSuccess<{ journey: Journey | null }> }>) => (await p).data.data.journey;

export const journeyApi = {
  start: (a: StartJourneyArgs) => wrap(apiClient.post('/journeys', a)) as Promise<Journey>,
  active: () => wrap(apiClient.get('/journeys/active')),
  ping: (id: string, location: GeoPoint) => wrap(apiClient.post(`/journeys/${id}/location`, { location })),
  imOk: (id: string, minutes = 10) => wrap(apiClient.post(`/journeys/${id}/ok`, { minutes })),
  extend: (id: string, minutes: number) => wrap(apiClient.post(`/journeys/${id}/extend`, { minutes })),
  arrive: (id: string) => wrap(apiClient.post(`/journeys/${id}/arrive`)),
  cancel: (id: string, duress = false) => wrap(apiClient.post(`/journeys/${id}/cancel`, { duress })),
};
