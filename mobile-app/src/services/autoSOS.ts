import * as Location from 'expo-location';
import * as sosApi from './sosApi';
import { getBatteryLevelPercent } from './location';
import { store } from '../store/store';
import { fetchActiveSOS } from '../store/slices/sosSlice';
import { navigate } from '../navigation/navigationRef';
import { GeoPoint } from '../types/api.types';

export interface DetectionPayload {
  source: 'voice_keyword' | 'tone' | 'shake';
  keyword?: 'help' | 'save_me' | 'bachao' | 'chere_din' | 'stop' | 'none';
  transcript?: string;
  confidence?: number;
  language?: 'en' | 'hi' | 'bn';
  screamScore?: number;
}

/** An SOS must never wait for a perfect GPS fix: race a fresh fix against the last known one. */
export async function bestEffortLocation(timeoutMs = 4000): Promise<GeoPoint> {
  const toPoint = (p: Location.LocationObject): GeoPoint => ({ type: 'Point', coordinates: [p.coords.longitude, p.coords.latitude] });
  const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(toPoint);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
  const first = await Promise.race([fresh.catch(() => null), timeout]);
  if (first) return first;
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last) return toPoint(last);
  return fresh; // nothing cached — wait for the fix
}

/** Sends the SOS to the server with the detector details, then shows the active-SOS screen. */
export async function fireDetectedSOS(d: DetectionPayload, opts: { duress?: boolean; silent?: boolean } = {}): Promise<void> {
  if (store.getState().sos.active) return; // one SOS at a time
  const [location, batteryLevel] = await Promise.all([bestEffortLocation(), getBatteryLevelPercent()]);
  await sosApi.triggerSOS({
    location,
    batteryLevel,
    deviceInfo: 'mobile-app',
    triggerType: d.source,
    duress: opts.duress,
    detection: d.source === 'shake' ? undefined : {
      keyword: d.keyword ?? 'none', transcript: d.transcript?.slice(0, 280), confidence: d.confidence ?? 0.8, language: d.language ?? 'en', screamScore: d.screamScore,
    },
  });
  await store.dispatch(fetchActiveSOS());
  if (!opts.silent) navigate('SOSActive', undefined);
}
