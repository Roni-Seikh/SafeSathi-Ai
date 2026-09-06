import { apiClient } from './apiClient';
import type { ApiSuccess, AdminSession } from '@/types';

export interface LoginResult {
  token: string;
  admin: AdminSession;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<ApiSuccess<LoginResult>>('/admin/auth/login', {
    email,
    password,
  });
  return data.data;
}
