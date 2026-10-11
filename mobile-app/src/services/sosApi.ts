import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint, SOSLog } from '../types/api.types';

export interface TriggerSOSPayload {
  location: GeoPoint;
  batteryLevel?: number;
  deviceInfo?: string;
  safeScoreAtTrigger?: number;
  /** Which detector raised this SOS (defaults to 'manual' on the server). */
  triggerType?: 'manual' | 'voice_keyword' | 'tone' | 'motion' | 'shake';
  /** On-device voice detection details, stored as a VoiceLog for analytics. */
  detection?: {
    keyword: 'help' | 'save_me' | 'bachao' | 'chere_din' | 'stop' | 'none';
    transcript?: string;
    confidence?: number;
    language?: 'en' | 'hi' | 'bn';
    screamScore?: number;
  };
  duress?: boolean;
}

export async function triggerSOS(payload: TriggerSOSPayload): Promise<SOSLog> {
  const { data } = await apiClient.post<ApiSuccess<{ sosLog: SOSLog }>>('/sos/trigger', payload);
  return data.data.sosLog;
}

export async function getActiveSOS(): Promise<SOSLog | null> {
  const { data } = await apiClient.get<ApiSuccess<{ sosLog: SOSLog | null }>>('/sos/active');
  return data.data.sosLog;
}

export async function getSOSHistory(page = 1, limit = 20): Promise<{ sosLogs: SOSLog[]; total: number }> {
  const { data } = await apiClient.get<ApiSuccess<{ sosLogs: SOSLog[] }>>('/sos/history', { params: { page, limit } });
  return { sosLogs: data.data.sosLogs, total: data.meta?.total ?? data.data.sosLogs.length };
}

export async function resolveSOS(id: string): Promise<SOSLog> {
  const { data } = await apiClient.patch<ApiSuccess<{ sosLog: SOSLog }>>(`/sos/${id}/resolve`);
  return data.data.sosLog;
}

export async function markFalseAlarm(id: string): Promise<SOSLog> {
  const { data } = await apiClient.patch<ApiSuccess<{ sosLog: SOSLog }>>(`/sos/${id}/false-alarm`);
  return data.data.sosLog;
}

export async function sendImSafe(): Promise<void> {
  await apiClient.post('/sos/im-safe');
}

/** Duress PIN: SOS stays active server-side while the phone shows a normal "cancelled" screen. */
export async function markDuress(id: string): Promise<void> {
  await apiClient.post(`/sos/${id}/duress`);
}
