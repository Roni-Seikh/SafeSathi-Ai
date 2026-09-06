import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { voiceLogService } from '../config/container';
import { AppError } from '../utils/AppError';
import { geoPointInputSchema } from '../validators/sos.validator';
import { SupportedLanguage } from '../types/common.types';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'bn'];

export const submitVoiceLog = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);

  if (!req.file) {
    throw new AppError('VALIDATION_ERROR', 'An "audio" file (WAV or m4a/AAC) is required');
  }

  const language = req.body.language as SupportedLanguage;
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new AppError('VALIDATION_ERROR', 'language must be one of en, hi, bn');
  }

  // multipart/form-data carries every field as a string — "location" is
  // sent as a JSON-encoded string, not a nested object, unlike the JSON
  // routes elsewhere in this API.
  let location;
  try {
    location = geoPointInputSchema.parse(JSON.parse(req.body.location));
  } catch {
    throw new AppError('VALIDATION_ERROR', 'A valid "location" (JSON-encoded GeoJSON Point) is required');
  }

  const batteryLevel = req.body.batteryLevel !== undefined ? Number(req.body.batteryLevel) : undefined;

  const { voiceLog, sosTriggered } = await voiceLogService.submit({
    userId: String(user._id),
    language,
    audioBuffer: req.file.buffer,
    location,
    batteryLevel,
  });

  sendSuccess(res, { voiceLog, sosTriggered }, 201);
});

export const getVoiceLogHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await voiceLogService.getHistory(String(user._id), page, limit);
  sendSuccess(res, { voiceLogs: items }, 200, buildMeta(page, limit, total));
});
