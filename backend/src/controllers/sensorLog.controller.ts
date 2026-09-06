import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { sensorLogService } from '../config/container';
import { AppError } from '../utils/AppError';
import { SubmitSensorLogBody } from '../validators/sensorLog.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const submitSensorLog = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { accelerometer, gyroscope, location, batteryLevel } = req.body as SubmitSensorLogBody;

  const { sensorLog, sosTriggered } = await sensorLogService.submit({
    userId: String(user._id),
    accelerometer,
    gyroscope,
    location,
    batteryLevel,
  });

  sendSuccess(res, { sensorLog, sosTriggered }, 201);
});

export const getSensorLogHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await sensorLogService.getHistory(String(user._id), page, limit);
  sendSuccess(res, { sensorLogs: items }, 200, buildMeta(page, limit, total));
});
