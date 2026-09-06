import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { recordLocation } from '../services/locationApi';
import { getBatteryLevelPercent, ensureLocationPermission } from '../services/location';

const TRACKING_INTERVAL_MS = 8000;
const TRACKING_DISTANCE_METERS = 15;

interface UseLocationTrackingResult {
  isTracking: boolean;
  lastSentAt: Date | null;
  error: string | null;
}

/**
 * Starts a foreground GPS watch and posts each point to the backend
 * (which then fans it out over the socket to anyone watching) whenever
 * `active` is true. This is foreground-only — background tracking needs
 * expo-task-manager wired to a native background location task, which is
 * Phase 5 territory alongside the other always-on background detectors,
 * not duplicated here for just the tracking piece.
 */
export function useLocationTracking(active: boolean): UseLocationTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        await ensureLocationPermission();
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: TRACKING_INTERVAL_MS,
            distanceInterval: TRACKING_DISTANCE_METERS,
          },
          async (position) => {
            if (cancelled) return;
            try {
              const batteryLevel = await getBatteryLevelPercent();
              await recordLocation({
                location: { type: 'Point', coordinates: [position.coords.longitude, position.coords.latitude] },
                accuracy: position.coords.accuracy ?? undefined,
                speed: position.coords.speed ?? undefined,
                heading: position.coords.heading ?? undefined,
                altitude: position.coords.altitude ?? undefined,
                batteryLevel,
              });
              if (!cancelled) setLastSentAt(new Date());
            } catch {
              // A single dropped point isn't fatal — the next tick retries.
              // Only surface an error if the whole watch fails to start.
            }
          }
        );
        if (cancelled) {
          subscription.remove();
          return;
        }
        subscriptionRef.current = subscription;
        setIsTracking(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start location tracking');
        }
      }
    }

    if (active) {
      void start();
    }

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      setIsTracking(false);
    };
  }, [active]);

  return { isTracking, lastSentAt, error };
}
