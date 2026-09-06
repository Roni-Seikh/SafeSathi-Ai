import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { sosService } from '../config/container';
import { AppError } from '../utils/AppError';
import { IGeoPoint } from '../types/common.types';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const triggerSOS = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { location, batteryLevel, deviceInfo, safeScoreAtTrigger } = req.body as {
    location: IGeoPoint;
    batteryLevel?: number;
    deviceInfo?: string;
    safeScoreAtTrigger?: number;
  };

  const sosLog = await sosService.trigger({
    userId: String(user._id),
    triggerType: 'manual',
    location,
    batteryLevel,
    deviceInfo,
    safeScoreAtTrigger,
  });

  sendSuccess(res, { sosLog }, 201);
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
