import { useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { submitSensorLog, MotionSummaryPayload } from '../services/sensorLogApi';
import { getCurrentGeoPoint, getBatteryLevelPercent } from '../services/location';

const SAMPLE_INTERVAL_MS = 100; // 10Hz
const WINDOW_MS = 2000;

// On-device pre-filter — deliberately looser than any real "danger"
// threshold. This only gates whether a window is worth asking the AI
// service's trained classifier about; the actual decision (and the
// auto-SOS threshold) lives entirely server-side. Keeping this loose
// means false negatives here cost nothing but a slightly bigger, still
// cheap, request — false positives here just mean an extra classify
// call, not a false SOS.
const ACCEL_PEAK_PREFILTER_MS2 = 16; // normal walking peaks ~11-13 m/s^2
const GYRO_PEAK_PREFILTER_RADS = 1.0;

// expo-sensors reports acceleration in units of g (1g ≈ device at rest);
// SensorLog.model.ts and the AI service's training data both use m/s^2
// (see ai-services/scripts/train_motion_classifier.py), so every sample
// is converted at the point of capture, not left as an implicit unit
// mismatch between the two codebases.
const G_TO_MS2 = 9.80665;

interface XYZ {
  x: number;
  y: number;
  z: number;
}

function magnitude(sample: XYZ): number {
  return Math.sqrt(sample.x * sample.x + sample.y * sample.y + sample.z * sample.z);
}

function summarize(samples: number[], windowMs: number): MotionSummaryPayload {
  if (samples.length === 0) {
    return { meanMagnitude: 0, peakMagnitude: 0, variance: 0, sampleCount: 0, windowMs };
  }
  const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
  const peak = Math.max(...samples);
  const variance = samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / samples.length;
  return { meanMagnitude: mean, peakMagnitude: peak, variance, sampleCount: samples.length, windowMs };
}

export interface MotionDetectorEvent {
  eventType: string;
  confidence: number;
  at: Date;
}

export interface UseMotionDetectorResult {
  isMonitoring: boolean;
  lastEvent: MotionDetectorEvent | null;
}

/**
 * Foreground-only, like useLocationTracking — true background motion
 * sensing needs expo-task-manager wired to a native background task,
 * which is a bigger, separately-testable piece of work (see
 * mobile-app/README.md). This still runs continuously while the app is
 * open, which is the majority of a "walking somewhere, phone in hand or
 * pocket, screen might be off but app is foregrounded" scenario.
 */
export function useMotionDetector(enabled: boolean, onSOSTriggered: () => void): UseMotionDetectorResult {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastEvent, setLastEvent] = useState<MotionDetectorEvent | null>(null);
  const onSOSTriggeredRef = useRef(onSOSTriggered);

  useEffect(() => {
    onSOSTriggeredRef.current = onSOSTriggered;
  }, [onSOSTriggered]);

  useEffect(() => {
    if (!enabled) {
      setIsMonitoring(false);
      return undefined;
    }

    const accelBuffer: number[] = [];
    const gyroBuffer: number[] = [];
    let submitting = false;

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SAMPLE_INTERVAL_MS);

    const accelSubscription = Accelerometer.addListener((data: XYZ) => {
      accelBuffer.push(magnitude(data) * G_TO_MS2);
    });
    const gyroSubscription = Gyroscope.addListener((data: XYZ) => {
      gyroBuffer.push(magnitude(data));
    });

    setIsMonitoring(true);

    async function evaluateWindow() {
      const accelSamples = accelBuffer.splice(0, accelBuffer.length);
      const gyroSamples = gyroBuffer.splice(0, gyroBuffer.length);

      if (submitting || accelSamples.length === 0) return;

      const accelerometer = summarize(accelSamples, WINDOW_MS);
      const gyroscope = summarize(gyroSamples, WINDOW_MS);

      const looksNotable =
        accelerometer.peakMagnitude > ACCEL_PEAK_PREFILTER_MS2 || gyroscope.peakMagnitude > GYRO_PEAK_PREFILTER_RADS;
      if (!looksNotable) return;

      submitting = true;
      try {
        const [location, batteryLevel] = await Promise.all([getCurrentGeoPoint(), getBatteryLevelPercent()]);
        const { sensorLog, sosTriggered } = await submitSensorLog({
          accelerometer,
          gyroscope,
          location,
          batteryLevel,
        });
        setLastEvent({ eventType: sensorLog.eventType, confidence: sensorLog.confidenceScore, at: new Date() });
        if (sosTriggered) onSOSTriggeredRef.current();
      } catch {
        // A dropped window isn't fatal — the next window tries again.
      } finally {
        submitting = false;
      }
    }

    const intervalId = setInterval(() => void evaluateWindow(), WINDOW_MS);

    return () => {
      accelSubscription.remove();
      gyroSubscription.remove();
      clearInterval(intervalId);
      setIsMonitoring(false);
    };
  }, [enabled]);

  return { isMonitoring, lastEvent };
}
