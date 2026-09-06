import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { heatmapService } from '../config/container';

export const listAllZones = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await heatmapService.listAllZones(page, limit);
  sendSuccess(res, { zones: items }, 200, buildMeta(page, limit, total));
});

export const recalculateZones = asyncHandler(async (req: Request, res: Response) => {
  const { bbox } = req.body as { bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number } };
  const zones = await heatmapService.recalculate(bbox, { isAdmin: true });
  sendSuccess(res, { zones });
});
