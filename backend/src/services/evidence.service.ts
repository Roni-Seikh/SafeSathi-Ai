import crypto from 'crypto';
import { Types } from 'mongoose';
import Evidence, { IEvidence } from '../models/Evidence.model';
import SOSLog from '../models/SOSLog.model';
import User from '../models/User.model';
import { firebaseBucket } from '../config/firebase';
import { env } from '../config/env';
import { aiServiceClient } from './aiServiceClient';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const sha256 = (data: Buffer | string): string => crypto.createHash('sha256').update(data).digest('hex');

export const genesisHash = (sosId: string, userId: string): string => sha256(`SAFESATHI-GENESIS|${sosId}|${userId}`);

export function computeChainHash(prev: string, fileSha: string, seq: number, recordedAt: Date, lng: number, lat: number): string {
  return sha256([prev, fileSha, seq, recordedAt.toISOString(), lng.toFixed(6), lat.toFixed(6)].join('|'));
}

export interface AddChunkInput {
  userId: string;
  sosId: string;
  buffer: Buffer;
  seq: number;
  durationMs: number;
  mimeType: string;
  recordedAt: Date;
  lng?: number;
  lat?: number;
}

export interface ChainVerification {
  valid: boolean;
  chunkCount: number;
  firstBrokenSeq: number | null;
  gaps: number[];
  deepChecked: boolean;
  headHash: string | null;
  checkedAt: string;
  problems: string[];
}

export class EvidenceService {
  private async assertAccess(sosId: string, userId: string | null) {
    if (!Types.ObjectId.isValid(sosId)) throw new AppError('NOT_FOUND', 'SOS event not found');
    const sos = await SOSLog.findById(sosId);
    if (!sos || (userId && sos.userId.toString() !== userId)) throw new AppError('NOT_FOUND', 'SOS event not found');
    return sos;
  }

  async addChunk(input: AddChunkInput): Promise<IEvidence> {
    const sos = await this.assertAccess(input.sosId, input.userId);

    // Idempotent: the phone retries uploads from an offline queue.
    const existing = await Evidence.findOne({ sosLogId: sos._id, seq: input.seq });
    if (existing) return existing;

    const prev = await Evidence.findOne({ sosLogId: sos._id, seq: { $lt: input.seq } }).sort({ seq: -1 });
    const prevHash = prev?.chainHash ?? genesisHash(input.sosId, input.userId);
    const fileSha = sha256(input.buffer);
    const lng = input.lng ?? 0;
    const lat = input.lat ?? 0;
    const chainHash = computeChainHash(prevHash, fileSha, input.seq, input.recordedAt, lng, lat);

    const ext = input.mimeType.includes('wav') ? 'wav' : input.mimeType.includes('3gp') ? '3gp' : 'm4a';
    const storagePath = `evidence/${input.userId}/${input.sosId}/${String(input.seq).padStart(4, '0')}-${fileSha.slice(0, 12)}.${ext}`;
    await firebaseBucket.file(storagePath).save(input.buffer, {
      contentType: input.mimeType,
      resumable: false,
      metadata: { metadata: { sha256: fileSha, seq: String(input.seq), sosId: input.sosId } },
    });

    let doc: IEvidence;
    try {
      doc = await Evidence.create({
        sosLogId: sos._id,
        userId: sos.userId,
        seq: input.seq,
        mimeType: input.mimeType,
        storagePath,
        sizeBytes: input.buffer.length,
        durationMs: input.durationMs,
        sha256: fileSha,
        prevHash,
        chainHash,
        recordedAt: input.recordedAt,
        location: input.lng !== undefined && input.lat !== undefined ? { type: 'Point', coordinates: [input.lng, input.lat] } : undefined,
      });
    } catch (err) {
      // Lost a race with a retry of the same seq.
      const again = await Evidence.findOne({ sosLogId: sos._id, seq: input.seq });
      if (again) return again;
      throw err;
    }

    if (env.EVIDENCE_AI_ANALYSIS) void this.annotate(String(doc._id), input.buffer);
    return doc;
  }

  /** Best-effort: never blocks or fails the upload. */
  private async annotate(evidenceId: string, buffer: Buffer): Promise<void> {
    try {
      const res = await aiServiceClient.analyzeVoice(buffer, 'en');
      await Evidence.findByIdAndUpdate(evidenceId, {
        screamProbability: res.tone_analysis.scream_probability,
        detectedKeyword: res.detected_keyword !== 'none' ? res.detected_keyword : undefined,
      });
    } catch (err) {
      logger.debug('Evidence AI annotation skipped', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  async list(sosId: string, userId: string | null) {
    await this.assertAccess(sosId, userId);
    const chunks = await Evidence.find({ sosLogId: sosId }).sort({ seq: 1 });
    const out = [];
    for (const c of chunks) {
      let url: string | undefined;
      try {
        [url] = await firebaseBucket.file(c.storagePath).getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 30 * 60 * 1000 });
      } catch {
        url = undefined;
      }
      out.push({ ...c.toObject(), url });
    }
    return out;
  }

  async verify(sosId: string, userId: string | null, deep = false): Promise<ChainVerification> {
    const sos = await this.assertAccess(sosId, userId);
    const chunks = await Evidence.find({ sosLogId: sosId }).sort({ seq: 1 });
    const problems: string[] = [];
    const gaps: number[] = [];
    let prev = genesisHash(sosId, sos.userId.toString());
    let firstBroken: number | null = null;
    let expectedSeq = 0;

    for (const c of chunks) {
      while (expectedSeq < c.seq) gaps.push(expectedSeq++);
      expectedSeq = c.seq + 1;
      const [lng, lat] = c.location?.coordinates ?? [0, 0];
      const expected = computeChainHash(prev, c.sha256, c.seq, c.recordedAt, lng, lat);
      if (c.prevHash !== prev || c.chainHash !== expected) {
        problems.push(`chunk #${c.seq}: chain hash mismatch`);
        if (firstBroken === null) firstBroken = c.seq;
      }
      if (deep) {
        try {
          const [bytes] = await firebaseBucket.file(c.storagePath).download();
          if (sha256(bytes) !== c.sha256) {
            problems.push(`chunk #${c.seq}: stored file no longer matches its hash`);
            if (firstBroken === null) firstBroken = c.seq;
          }
        } catch {
          problems.push(`chunk #${c.seq}: file missing from storage`);
          if (firstBroken === null) firstBroken = c.seq;
        }
      }
      prev = c.chainHash;
    }
    if (gaps.length) problems.push(`missing sequence numbers: ${gaps.join(', ')} (upload may still be pending)`);

    return {
      valid: firstBroken === null,
      chunkCount: chunks.length,
      firstBrokenSeq: firstBroken,
      gaps,
      deepChecked: deep,
      headHash: chunks.length ? chunks[chunks.length - 1].chainHash : null,
      checkedAt: new Date().toISOString(),
      problems,
    };
  }

  /** Structured + plain-text incident summary the user can hand to the police. */
  async buildReport(sosId: string, userId: string | null) {
    const sos = await this.assertAccess(sosId, userId);
    const [user, chunks, verification] = await Promise.all([
      User.findById(sos.userId),
      Evidence.find({ sosLogId: sosId }).sort({ seq: 1 }),
      this.verify(sosId, userId, false),
    ]);
    const [lng, lat] = sos.location.coordinates;
    const totalMs = chunks.reduce((s, c) => s + (c.durationMs || 0), 0);
    const flagged = chunks.filter((c) => (c.screamProbability ?? 0) >= 0.7 || c.detectedKeyword);
    const fmt = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

    const lines = [
      'SAFESATHI — INCIDENT EVIDENCE SUMMARY',
      '='.repeat(40),
      `Reference            : ${sos._id}`,
      `Person               : ${user?.name ?? 'N/A'}  (${user?.phone ?? 'phone N/A'})`,
      `SOS raised at (IST)  : ${fmt(sos.triggeredAt)}`,
      `Trigger              : ${sos.triggerType}${sos.duress ? ' (silent duress PIN)' : ''}`,
      `Status               : ${sos.status}`,
      `Location             : https://maps.google.com/?q=${lat},${lng}${sos.address ? `  (${sos.address})` : ''}`,
      `Contacts alerted     : ${sos.notifiedContacts.length}`,
      '',
      `AUDIO EVIDENCE       : ${chunks.length} chunk(s), ${(totalMs / 1000).toFixed(0)} s total`,
      ...chunks.map(
        (c) =>
          `  #${c.seq} ${fmt(c.recordedAt)}  ${(c.durationMs / 1000).toFixed(0)}s  sha256:${c.sha256.slice(0, 16)}…` +
          (c.screamProbability !== undefined ? `  scream:${Math.round(c.screamProbability * 100)}%` : '') +
          (c.detectedKeyword ? `  keyword:${c.detectedKeyword}` : '')
      ),
      '',
      `INTEGRITY CHAIN      : ${verification.valid ? 'INTACT' : 'BROKEN'}  (head ${verification.headHash?.slice(0, 24) ?? 'n/a'}…)`,
      ...(verification.problems.length ? verification.problems.map((p) => `  ! ${p}`) : []),
      '',
      'NOTE: Hashes prove the files were not altered after upload to SafeSathi.',
      'Electronic records are usually produced with a certificate under Section 63 of the',
      'Bharatiya Sakshya Adhiniyam, 2023 — ask the investigating officer / your lawyer.',
      'You can file a Zero FIR at ANY police station (BNSS Section 173) or online (e-FIR).',
    ];

    return {
      sosLogId: String(sos._id),
      generatedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      totalDurationMs: totalMs,
      flaggedChunks: flagged.map((c) => c.seq),
      verification,
      text: lines.join('\n'),
    };
  }
}
