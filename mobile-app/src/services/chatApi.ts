import { apiClient } from './apiClient';
import { ApiSuccess } from '../types/api.types';

export type ChatAction =
  | { type: 'sos' } | { type: 'call'; number: string; label: string } | { type: 'fake_call' } | { type: 'safe_haven' }
  | { type: 'journey' } | { type: 'share_location' } | { type: 'link'; url: string; label: string };
export interface ChatReply { reply: string; intent: string; actions: ChatAction[]; followUps: string[]; engine: 'knowledge_base' | 'llm'; emergency: boolean }

export async function sendChat(message: string, sessionId: string, language: 'en' | 'hi' | 'bn'): Promise<ChatReply> {
  const { data } = await apiClient.post<ApiSuccess<ChatReply>>('/chat', { message, sessionId, language }, { timeout: 25000 });
  return data.data;
}
