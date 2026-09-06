import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { adminAnalyticsService } from '../config/container';

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await adminAnalyticsService.getOverview();
  sendSuccess(res, overview);
});

export const getSOSTrend = asyncHandler(async (req: Request, res: Response) => {
  const { days } = req.query as unknown as { days: number };
  const trend = await adminAnalyticsService.getSOSTrend(days);
  sendSuccess(res, { trend });
});

export const getPeakTimings = asyncHandler(async (req: Request, res: Response) => {
  const { days } = req.query as unknown as { days: number };
  const timings = await adminAnalyticsService.getPeakTimings(days);
  sendSuccess(res, { timings });
});
