import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Safe Haven finder — real places from OpenStreetMap via the public Overpass API (no API key, no backend).
 * Police stations, hospitals, and pharmacies / fuel stations tagged open 24/7 are the places a person can
 * actually walk into for help at night.
 */
export type HavenKind = 'police' | 'hospital' | 'pharmacy' | 'fuel';
export interface Haven { id: string; kind: HavenKind; name: string; lat: number; lng: number; distanceM: number; phone?: string; open247: boolean }

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CACHE_KEY = 'safesathi.havens.v1';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function findHavens(lat: number, lng: number, radiusM = 3000): Promise<{ havens: Haven[]; fromCache: boolean }> {
  const around = `(around:${radiusM},${lat},${lng})`;
  const query = `[out:json][timeout:20];(
    nwr["amenity"="police"]${around};
    nwr["amenity"="hospital"]${around};
    nwr["amenity"="pharmacy"]["opening_hours"="24/7"]${around};
    nwr["amenity"="fuel"]["opening_hours"="24/7"]${around};
  );out center 80;`;

  let lastErr: unknown;
  for (const url of ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json();
      const havens: Haven[] = [];
      for (const el of json.elements ?? []) {
        const la = el.lat ?? el.center?.lat, lo = el.lon ?? el.center?.lon;
        if (la === undefined || lo === undefined) continue;
        const tags = el.tags ?? {};
        const kind = tags.amenity as HavenKind;
        havens.push({
          id: `${el.type}/${el.id}`, kind, lat: la, lng: lo,
          name: tags.name || tags['name:en'] || ({ police: 'Police station', hospital: 'Hospital', pharmacy: '24x7 pharmacy', fuel: '24x7 petrol pump' } as const)[kind],
          distanceM: Math.round(haversine(lat, lng, la, lo)), phone: tags.phone || tags['contact:phone'], open247: tags.opening_hours === '24/7' || kind === 'police' || kind === 'hospital',
        });
      }
      havens.sort((a, b) => a.distanceM - b.distanceM);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, havens })).catch(() => undefined);
      return { havens, fromCache: false };
    } catch (e) {
      lastErr = e;
    }
  }
  const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  if (cached) {
    const c = JSON.parse(cached) as { lat: number; lng: number; havens: Haven[] };
    return { havens: c.havens.map((h) => ({ ...h, distanceM: Math.round(haversine(lat, lng, h.lat, h.lng)) })).sort((a, b) => a.distanceM - b.distanceM), fromCache: true };
  }
  throw lastErr instanceof Error ? lastErr : new Error('Could not load nearby places');
}

export interface PlaceResult { name: string; subtitle: string; lat: number; lng: number }

/** Destination search with Photon (OSM data, key-free, location-biased). */
export async function searchPlaces(q: string, nearLat?: number, nearLng?: number): Promise<PlaceResult[]> {
  const bias = nearLat !== undefined && nearLng !== undefined ? `&lat=${nearLat}&lon=${nearLng}` : '';
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${bias}`);
  if (!res.ok) throw new Error('Search unavailable');
  const json = await res.json();
  return (json.features ?? []).map((f: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }) => ({
    name: f.properties.name || f.properties.street || 'Unnamed place',
    subtitle: [f.properties.street, f.properties.district, f.properties.city, f.properties.state].filter(Boolean).join(', '),
    lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
  }));
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number { return haversine(lat1, lng1, lat2, lng2); }
