import { apiClient } from './apiClient';
import type { ApiSuccess, PageMeta, AdminSOSLog, SOSStatus } from '@/types';

export interface ListSOSParams {
  page: number;
  limit: number;
  status?: SOSStatus;
}

export async function listSOS(
  params: ListSOSParams
): Promise<{ sosLogs: AdminSOSLog[]; meta: PageMeta }> {
  const { data } = await apiClient.get<ApiSuccess<{ sosLogs: AdminSOSLog[] }>>('/admin/sos', {
    params,
  });
  return { sosLogs: data.data.sosLogs, meta: data.meta! };
}
