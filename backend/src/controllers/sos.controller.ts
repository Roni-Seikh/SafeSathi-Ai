import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { sosService } from '../config/container';
import { AppError } from '../utils/AppError';
import { IGeoPoint } from '../types/common.types';
import SOSLog from '../models/SOSLog.model';
import VoiceLog from '../models/VoiceLog.model';
import { TriggerSOSInput } from '../validators/sos.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const triggerSOS = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { location, batteryLevel, deviceInfo, safeScoreAtTrigger, triggerType, detection, duress } = req.body as TriggerSOSInput & { location: IGeoPoint };

  const sosLog = await sosService.trigger({
    userId: String(user._id),
    triggerType,
    location,
    batteryLevel,
    deviceInfo,
    safeScoreAtTrigger,
  });

  // On-device voice/tone detections never go through POST /voice-logs, so record them here.
  if (detection && (triggerType === 'voice_keyword' || triggerType === 'tone')) {
    try {
      const vl = await VoiceLog.create({
        userId: user._id,
        detectedKeyword: detection.keyword,
        language: detection.language,
        keywordConfidence: detection.confidence,
        toneAnalysis: { screamProbability: detection.screamScore ?? 0, fearProbability: 0 },
        triggeredSOS: true,
        sosLogId: sosLog._id,
        recordedAt: new Date(),
      });
      await SOSLog.findByIdAndUpdate(sosLog._id, { voiceLogId: vl._id, ...(detection.transcript ? { notes: `Heard: "${detection.transcript}"` } : {}) });
    } catch {
      /* analytics only — never block an SOS */
    }
  }
  if (duress) await SOSLog.findByIdAndUpdate(sosLog._id, { duress: true });

  sendSuccess(res, { sosLog }, 201);
});

/** Duress PIN: the app shows a normal "SOS cancelled" screen, but the event stays ACTIVE and flagged. */
export const markDuress = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const sosLog = await SOSLog.findById(req.params.id);
  if (!sosLog || sosLog.userId.toString() !== String(user._id)) throw new AppError('NOT_FOUND', 'SOS event not found');
  sosLog.duress = true;
  sosLog.notes = [sosLog.notes, 'DURESS PIN used — user may be under coercion; do NOT treat as cancelled.'].filter(Boolean).join(' | ');
  await sosLog.save();
  sendSuccess(res, { ok: true });
});

export const getActiveSOS = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const sosLog = await sosService.getActive(String(user._id));
  sendSuccess(res, { sosLog });
});

export const getSOSHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await sosService.getHistory(String(user._id), page, limit);
  sendSuccess(res, { sosLogs: items }, 200, buildMeta(page, limit, total));
});

export const resolveSOS = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const sosLog = await sosService.resolve(String(user._id), req.params.id);
  sendSuccess(res, { sosLog });
});

export const markFalseAlarm = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const sosLog = await sosService.markFalseAlarm(String(user._id), req.params.id);
  sendSuccess(res, { sosLog });
});

export const imSafe = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await sosService.sendImSafe(String(user._id));
  sendSuccess(res, { sent: true });
});
