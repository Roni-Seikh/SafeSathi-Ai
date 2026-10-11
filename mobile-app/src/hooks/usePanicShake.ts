import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

/**
 * Panic Shake — a deliberate, hands-free trigger that needs no speech and no ML: three hard shakes within
 * ~2.5 s. ("a phone-snatch/struggle model needs data nobody has published; a deliberate gesture does not.")
 * Triggers the cancellable countdown, never an instant SOS, so a bumpy bus ride can't alert your family.
 */
const SHAKE_G = 2.2;          // |a| in g — above walking/running peaks
const MIN_GAP_MS = 150;       // ignore the same shake counted twice
const WINDOW_MS = 2500;
const SHAKES_NEEDED = 3;
const COOLDOWN_MS = 20000;

export function usePanicShake(enabled: boolean, onShake: () => void): void {
  const cb = useRef(onShake);
  useEffect(() => { cb.current = onShake; });

  useEffect(() => {
    if (!enabled) return undefined;
    let hits: number[] = [];
    let lastCount = 0;
    let lastFire = 0;
    // NOTE: deliberately NOT calling Accelerometer.setUpdateInterval — it is global to expo-sensors and the motion
    // detector's ML model assumes exactly 10 Hz. We simply listen at whatever rate is already set (default 100 ms).
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (g < SHAKE_G || now - lastCount < MIN_GAP_MS) return;
      lastCount = now;
      hits = [...hits.filter((t) => now - t < WINDOW_MS), now];
      if (hits.length >= SHAKES_NEEDED && now - lastFire > COOLDOWN_MS) {
        lastFire = now;
        hits = [];
        cb.current();
      }
    });
    return () => sub.remove();
  }, [enabled]);
}
