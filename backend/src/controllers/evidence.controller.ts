import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { evidenceService } from '../config/container';
import { AppError } from '../utils/AppError';

const user = (req: Request) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return String(req.user._id);
};

export const uploadChunk = asyncHandler(async (req: Request, res: Response) => {
  const userId = user(req);
  if (!req.file) throw new AppError('VALIDATION_ERROR', 'audio file is required');
  const b = req.body as Record<string, string>;
  const seq = Number(b.seq);
  if (!Number.isInteger(seq) || seq < 0) throw new AppError('VALIDATION_ERROR', 'seq must be a non-negative integer');
  const lng = b.lng !== undefined ? Number(b.lng) : undefined;
  const lat = b.lat !== undefined ? Number(b.lat) : undefined;
  const chunk = await evidenceService.addChunk({
    userId,
    sosId: req.params.sosId,
    buffer: req.file.buffer,
    seq,
    durationMs: Number(b.durationMs) || 0,
    mimeType: req.file.mimetype || b.mimeType || 'audio/mp4',
    recordedAt: b.recordedAt ? new Date(b.recordedAt) : new Date(),
    lng: lng !== undefined && Number.isFinite(lng) ? lng : undefined,
    lat: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
  });
  sendSuccess(res, { chunk: { seq: chunk.seq, sha256: chunk.sha256, chainHash: chunk.chainHash, sizeBytes: chunk.sizeBytes } }, 201);
});

export const listChunks = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { chunks: await evidenceService.list(req.params.sosId, user(req)) });
});

export const verifyChain = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { verification: await evidenceService.verify(req.params.sosId, user(req), req.query.deep === 'true') });
});

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { report: await evidenceService.buildReport(req.params.sosId, user(req)) });
});
