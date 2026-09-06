import { apiClient } from './apiClient';
import { ApiSuccess, GeoPoint, SupportedLanguage } from '../types/api.types';

export interface VoiceLogRecord {
  _id: string;
  detectedKeyword: string;
  language: SupportedLanguage;
  keywordConfidence: number;
  toneAnalysis: {
    pitchHz?: number;
    loudnessDb?: number;
    screamProbability: number;
    fearProbability: number;
  };
  triggeredSOS: boolean;
  recordedAt: string;
}

export interface SubmitVoiceLogParams {
  fileUri: string;
  language: SupportedLanguage;
  location: GeoPoint;
  batteryLevel?: number;
}

/**
 * FormData upload from a local file URI — React Native's networking
 * layer streams the file from disk given {uri, name, type}, so the audio
 * never has to be fully loaded into JS memory first. Deliberately not
 * setting a Content-Type header: RN's XHR layer sets the correct
 * multipart boundary automatically when the body is a FormData instance,
 * and overriding it manually (without a boundary) breaks the upload —
 * a well-known RN/axios gotcha.
 */
export async function submitVoiceLog(
  params: SubmitVoiceLogParams
): Promise<{ voiceLog: VoiceLogRecord; sosTriggered: boolean }> {
  const form = new FormData();
  form.append('language', params.language);
  form.append('location', JSON.stringify(params.location));
  if (params.batteryLevel != null) {
    form.append('batteryLevel', String(params.batteryLevel));
  }
  // @ts-expect-error — React Native's FormData accepts {uri,name,type}
  // file descriptors; the DOM lib's FormData types (used for web) don't
  // know about this RN-specific shape.
  form.append('audio', { uri: params.fileUri, name: 'clip.m4a', type: 'audio/m4a' });

  const { data } = await apiClient.post<ApiSuccess<{ voiceLog: VoiceLogRecord; sosTriggered: boolean }>>(
    '/voice-logs',
    form
  );
  return data.data;
}
