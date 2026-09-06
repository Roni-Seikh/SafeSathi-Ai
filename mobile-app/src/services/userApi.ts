import { apiClient } from './apiClient';
import { ApiSuccess, User, MedicalInfo, SafetyPreferences, Address, Gender, SupportedLanguage } from '../types/api.types';

export interface UpdateProfilePayload {
  name?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: Partial<Address>;
  preferredLanguage?: SupportedLanguage;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<ApiSuccess<{ user: User }>>('/users/me', payload);
  return data.data.user;
}

export async function updateMedicalInfo(payload: Partial<MedicalInfo>): Promise<User> {
  const { data } = await apiClient.patch<ApiSuccess<{ user: User }>>('/users/me/medical-info', payload);
  return data.data.user;
}

export async function updateSafetyPreferences(payload: Partial<SafetyPreferences>): Promise<User> {
  const { data } = await apiClient.patch<ApiSuccess<{ user: User }>>('/users/me/safety-preferences', payload);
  return data.data.user;
}

export async function getAvatarUploadUrl(
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<{ uploadUrl: string; publicPath: string }> {
  const { data } = await apiClient.post<ApiSuccess<{ uploadUrl: string; publicPath: string }>>('/users/me/avatar', {
    contentType,
  });
  return data.data;
}

export async function registerFcmToken(token: string): Promise<void> {
  await apiClient.post('/users/me/fcm-token', { token });
}
