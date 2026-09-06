import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { adminSOSService } from '../config/container';
import { SOSStatus } from '../models/SOSLog.model';

export const listSOS = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query as unknown as { page: number; limit: number; status?: SOSStatus };
  const { items, total } = await adminSOSService.list(page, limit, status);
  sendSuccess(res, { sosLogs: items }, 200, buildMeta(page, limit, total));
});
