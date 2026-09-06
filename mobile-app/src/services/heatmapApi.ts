import { apiClient } from './apiClient';
import { ApiSuccess, HeatmapZone } from '../types/api.types';

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

function bboxParam(bbox: BBox): string {
  return `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
}

export async function getHeatmap(bbox: BBox): Promise<HeatmapZone[]> {
  const { data } = await apiClient.get<ApiSuccess<{ zones: HeatmapZone[] }>>('/heatmap', {
    params: { bbox: bboxParam(bbox) },
  });
  return data.data.zones;
}

export async function recalculateHeatmap(bbox: BBox): Promise<HeatmapZone[]> {
  const { data } = await apiClient.post<ApiSuccess<{ zones: HeatmapZone[] }>>('/heatmap/recalculate', { bbox });
  return data.data.zones;
}

/** A simple square box centered on a point — good enough for "recompute
 * my visible area." `degreesForRadiusMeters` is a rough conversion (not
 * latitude-corrected for longitude, same simplification documented in
 * backend/src/utils/grid.ts) which is fine at city scale. */
export function bboxAroundPoint(lat: number, lng: number, radiusMeters: number): BBox {
  const degrees = radiusMeters / 111000;
  return {
    minLng: lng - degrees,
    minLat: lat - degrees,
    maxLng: lng + degrees,
    maxLat: lat + degrees,
  };
}
