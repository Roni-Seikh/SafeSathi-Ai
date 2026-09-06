import { apiClient } from './apiClient';
import { ApiSuccess, AppNotification } from '../types/api.types';

export async function listNotifications(
  page = 1,
  limit = 20
): Promise<{ notifications: AppNotification[]; total: number }> {
  const { data } = await apiClient.get<ApiSuccess<{ notifications: AppNotification[] }>>('/notifications', {
    params: { page, limit },
  });
  return { notifications: data.data.notifications, total: data.meta?.total ?? data.data.notifications.length };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
