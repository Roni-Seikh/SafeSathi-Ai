import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { GeoPoint } from '../types/api.types';

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super('Location permission is required to send an accurate SOS.');
    this.name = 'LocationPermissionDeniedError';
  }
}

/** Requests foreground location permission if not already granted.
 * Background permission (needed for always-on detection) is requested
 * separately in Phase 5, only once the on-device detectors that need it
 * actually exist. */
export async function ensureLocationPermission(): Promise<void> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return;

  const request = await Location.requestForegroundPermissionsAsync();
  if (request.status !== 'granted') {
    throw new LocationPermissionDeniedError();
  }
}

export async function getCurrentGeoPoint(): Promise<GeoPoint> {
  await ensureLocationPermission();
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    type: 'Point',
    coordinates: [position.coords.longitude, position.coords.latitude],
  };
}

export async function getBatteryLevelPercent(): Promise<number | undefined> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level < 0) return undefined; // simulators report -1
    return Math.round(level * 100);
  } catch {
    return undefined;
  }
}
