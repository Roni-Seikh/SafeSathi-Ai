import { apiClient } from './apiClient';
import type { ApiSuccess, PageMeta, AdminUser } from '@/types';

export interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
}

export async function listUsers(
  params: ListUsersParams
): Promise<{ users: AdminUser[]; meta: PageMeta }> {
  const { data } = await apiClient.get<ApiSuccess<{ users: AdminUser[] }>>('/admin/users', {
    params,
  });
  return { users: data.data.users, meta: data.meta! };
}

export async function setUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
  const { data } = await apiClient.patch<ApiSuccess<{ user: AdminUser }>>(
    `/admin/users/${id}/status`,
    { isActive }
  );
  return data.data.user;
}
