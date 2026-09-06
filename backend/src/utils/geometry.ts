type LngLat = [number, number];

/** Straight-line (great-circle-adjacent, not geodesically exact) distance
 * — accurate enough for urban-scale routes; not meant for long-haul
 * navigation distances. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function totalPathDistanceMeters(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return Math.round(total);
}

export function interpolate(start: LngLat, end: LngLat, numSegments: number): LngLat[] {
  const points: LngLat[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    points.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
  }
  return points;
}

/** A point offset perpendicular to the start→end line, `fraction` of the
 * total length away from the midpoint — used to generate a second
 * candidate "route" that isn't identical to the direct line. */
export function perpendicularOffsetMidpoint(start: LngLat, end: LngLat, fraction: number): LngLat {
  const mid: LngLat = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  const perp: LngLat = [-dy / length, dx / length];
  const offset = length * fraction;
  return [mid[0] + perp[0] * offset, mid[1] + perp[1] * offset];
}
