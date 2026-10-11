import { apiClient } from './apiClient';
import { ApiSuccess } from '../types/api.types';

export interface EvidenceChunk {
  _id: string;
  seq: number;
  durationMs: number;
  sizeBytes: number;
  sha256: string;
  chainHash: string;
  prevHash: string;
  recordedAt: string;
  screamProbability?: number;
  detectedKeyword?: string;
  url?: string;
}
export interface ChainVerification {
  valid: boolean; chunkCount: number; firstBrokenSeq: number | null; gaps: number[]; headHash: string | null; checkedAt: string; problems: string[];
}

export interface UploadChunkArgs {
  sosId: string; uri: string; seq: number; durationMs: number; recordedAt: string; lat?: number; lng?: number; mimeType?: string;
}

export async function uploadEvidenceChunk(a: UploadChunkArgs): Promise<void> {
  const form = new FormData();
  // React Native's FormData accepts { uri, name, type } for files.
  form.append('audio', { uri: a.uri, name: `chunk-${a.seq}.m4a`, type: a.mimeType ?? 'audio/mp4' } as unknown as Blob);
  form.append('seq', String(a.seq));
  form.append('durationMs', String(a.durationMs));
  form.append('recordedAt', a.recordedAt);
  if (a.lat !== undefined && a.lng !== undefined) { form.append('lat', String(a.lat)); form.append('lng', String(a.lng)); }
  await apiClient.post(`/evidence/${a.sosId}/chunks`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000, transformRequest: (d) => d });
}

export async function listEvidence(sosId: string): Promise<EvidenceChunk[]> {
  const { data } = await apiClient.get<ApiSuccess<{ chunks: EvidenceChunk[] }>>(`/evidence/${sosId}`);
  return data.data.chunks;
}
export async function verifyEvidence(sosId: string, deep = false): Promise<ChainVerification> {
  const { data } = await apiClient.get<ApiSuccess<{ verification: ChainVerification }>>(`/evidence/${sosId}/verify`, { params: { deep } });
  return data.data.verification;
}
export async function getEvidenceReport(sosId: string): Promise<{ text: string; chunkCount: number; flaggedChunks: number[]; verification: ChainVerification }> {
  const { data } = await apiClient.get<ApiSuccess<{ report: { text: string; chunkCount: number; flaggedChunks: number[]; verification: ChainVerification } }>>(`/evidence/${sosId}/report`);
  return data.data.report;
}
