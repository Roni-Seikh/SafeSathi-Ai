import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

/**
 * One recorded audio chunk of an SOS "evidence session".
 *
 * Tamper-evidence: every chunk stores the SHA-256 of its bytes AND a chain
 * hash = SHA-256(prevChainHash | fileSha256 | seq | recordedAt | lng | lat).
 * Altering, deleting or re-ordering any chunk after the fact breaks every
 * later chainHash — verifiable at GET /evidence/:sosId/verify without
 * trusting the uploader.
 */
export interface IEvidence extends Document {
  sosLogId: Types.ObjectId;
  userId: Types.ObjectId;
  seq: number;
  kind: 'audio';
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  durationMs: number;
  sha256: string;
  prevHash: string;
  chainHash: string;
  recordedAt: Date;
  location?: IGeoPoint;
  /** Best-effort AI annotations (filled asynchronously; may stay empty). */
  screamProbability?: number;
  detectedKeyword?: string;
  createdAt: Date;
}

const evidenceSchema = new Schema<IEvidence>(
  {
    sosLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seq: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['audio'], default: 'audio' },
    mimeType: { type: String, default: 'audio/mp4' },
    storagePath: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    durationMs: { type: Number, default: 0 },
    sha256: { type: String, required: true },
    prevHash: { type: String, required: true },
    chainHash: { type: String, required: true },
    recordedAt: { type: Date, required: true },
    location: { type: geoPointSchema },
    screamProbability: { type: Number, min: 0, max: 1 },
    detectedKeyword: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
evidenceSchema.index({ sosLogId: 1, seq: 1 }, { unique: true });

export default model<IEvidence>('Evidence', evidenceSchema);
