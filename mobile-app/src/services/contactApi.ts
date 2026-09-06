import { apiClient } from './apiClient';
import { ApiSuccess, EmergencyContact } from '../types/api.types';

export interface ContactPayload {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  isPrimary?: boolean;
}

export async function listContacts(): Promise<EmergencyContact[]> {
  const { data } = await apiClient.get<ApiSuccess<{ contacts: EmergencyContact[] }>>('/contacts');
  return data.data.contacts;
}

export async function addContact(payload: ContactPayload): Promise<EmergencyContact> {
  const { data } = await apiClient.post<ApiSuccess<{ contact: EmergencyContact }>>('/contacts', payload);
  return data.data.contact;
}

export async function updateContact(id: string, payload: Partial<ContactPayload>): Promise<EmergencyContact> {
  const { data } = await apiClient.patch<ApiSuccess<{ contact: EmergencyContact }>>(`/contacts/${id}`, payload);
  return data.data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  await apiClient.delete(`/contacts/${id}`);
}
