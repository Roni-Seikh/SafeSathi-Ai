import { apiClient } from './apiClient';
import { ApiSuccess, User } from '../types/api.types';

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
}

export async function registerUser(payload: RegisterPayload): Promise<{ user: User; isNewUser: boolean }> {
  const { data } = await apiClient.post<ApiSuccess<{ user: User; isNewUser: boolean }>>('/auth/register', payload);
  return data.data;
}

export async function loginUser(): Promise<{ user: User }> {
  const { data } = await apiClient.post<ApiSuccess<{ user: User }>>('/auth/login');
  return data.data;
}

export async function refreshProfile(): Promise<{ user: User }> {
  const { data } = await apiClient.post<ApiSuccess<{ user: User }>>('/auth/refresh-profile');
  return data.data;
}

export async function logoutUser(fcmToken?: string): Promise<void> {
  await apiClient.post('/auth/logout', { fcmToken });
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete('/auth/account');
}
