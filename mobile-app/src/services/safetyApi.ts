import { apiClient } from './apiClient';
import { ApiSuccess } from '../types/api.types';

export interface LiveSafeScore { score: number; level: 'safe' | 'caution' | 'risk'; factors: Record<string, number>; advice: string[]; source: string; computedAt: string }

export async function getLiveSafeScore(lat: number, lng: number, battery?: number): Promise<LiveSafeScore> {
  const { data } = await apiClient.get<ApiSuccess<LiveSafeScore>>('/safety/score', { params: { lat, lng, battery } });
  return data.data;
}
