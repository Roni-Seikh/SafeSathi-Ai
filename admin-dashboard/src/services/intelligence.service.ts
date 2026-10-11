import { apiClient } from './apiClient';
import type { ApiSuccess } from '@/types';
import type { Intelligence, SOSEvidence } from '@/types/intelligence';

export async function getIntelligence(days: number): Promise<Intelligence> {
  const { data } = await apiClient.get<ApiSuccess<Intelligence>>('/admin/analytics/intelligence', { params: { days } });
  return data.data;
}
export async function getSOSEvidence(id: string, deep = false): Promise<SOSEvidence> {
  const { data } = await apiClient.get<ApiSuccess<SOSEvidence>>(`/admin/sos/${id}/evidence`, { params: { deep } });
  return data.data;
}
