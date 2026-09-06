/**
 * A fixed-degree grid, not a proper equal-area projection — at Indian
 * latitudes (~15-30°N) a 0.0025° cell is roughly 250-270m tall and
 * 250-280m wide, close enough for a city-scale risk heatmap. This is a
 * documented simplification, not an oversight: a real deployment
 * covering a wide latitude range would want a proper geohash or S2-cell
 * scheme instead, where cell size stays consistent regardless of
 * latitude.
 */
export const GRID_RESOLUTION_DEG = 0.0025;
export const GRID_RESOLUTION_METERS_APPROX = 270;

export function gridCellKey(lat: number, lng: number): string {
  const latCell = Math.floor(lat / GRID_RESOLUTION_DEG);
  const lngCell = Math.floor(lng / GRID_RESOLUTION_DEG);
  return `grid:${latCell}:${lngCell}`;
}

export function gridCellCenter(key: string): [number, number] {
  const [, latCellStr, lngCellStr] = key.split(':');
  const latCell = Number(latCellStr);
  const lngCell = Number(lngCellStr);
  const lat = (latCell + 0.5) * GRID_RESOLUTION_DEG;
  const lng = (lngCell + 0.5) * GRID_RESOLUTION_DEG;
  return [lng, lat]; // [lng, lat] to match GeoJSON coordinate order
}
