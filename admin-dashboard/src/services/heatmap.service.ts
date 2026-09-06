import { apiClient } from './apiClient';
import type { ApiSuccess, PageMeta, HeatmapZone } from '@/types';

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export async function listZones(
  page: number,
  limit: number
): Promise<{ zones: HeatmapZone[]; meta: PageMeta }> {
  const { data } = await apiClient.get<ApiSuccess<{ zones: HeatmapZone[] }>>('/admin/heatmap', {
    params: { page, limit },
  });
  return { zones: data.data.zones, meta: data.meta! };
}

export async function recalculateZones(bbox: Bbox): Promise<HeatmapZone[]> {
  const { data } = await apiClient.post<ApiSuccess<{ zones: HeatmapZone[] }>>(
    '/admin/heatmap/recalculate',
    { bbox }
  );
  return data.data.zones;
}
