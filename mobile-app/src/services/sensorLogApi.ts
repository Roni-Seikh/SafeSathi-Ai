import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint } from '../types/api.types';

export interface MotionSummaryPayload {
  meanMagnitude: number;
  peakMagnitude: number;
  variance: number;
  sampleCount: number;
  windowMs: number;
}

export interface SubmitSensorLogParams {
  accelerometer: MotionSummaryPayload;
  gyroscope: MotionSummaryPayload;
  location: GeoPoint;
  batteryLevel?: number;
}

export interface SensorLogRecord {
  _id: string;
  eventType: string;
  confidenceScore: number;
  triggeredSOS: boolean;
  recordedAt: string;
}

export async function submitSensorLog(
  params: SubmitSensorLogParams
): Promise<{ sensorLog: SensorLogRecord; sosTriggered: boolean }> {
  const { data } = await apiClient.post<ApiSuccess<{ sensorLog: SensorLogRecord; sosTriggered: boolean }>>(
    '/sensor-logs',
    params
  );
  return data.data;
}
