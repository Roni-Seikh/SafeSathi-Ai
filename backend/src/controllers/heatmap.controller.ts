import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { heatmapService } from '../config/container';
import { AppError } from '../utils/AppError';
import { BBoxQuery, RecalculateHeatmapBody } from '../validators/heatmap.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const getHeatmap = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const { bbox } = req.query as unknown as BBoxQuery;
  const zones = await heatmapService.getWithinBBox(bbox);
  sendSuccess(res, { zones });
});

/** A regular authenticated user can refresh the heatmap for their own
 * visible map area — distinct from the broader admin-triggered
 * recalculation in Phase 7's admin API, the same way any map app lets you
 * "refresh" your current view. See heatmap.service.ts's bbox-size guard,
 * which keeps this from being used to recompute an unreasonably large area. */
export const recalculateHeatmap = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const { bbox } = req.body as RecalculateHeatmapBody;
  const zones = await heatmapService.recalculate(bbox);
  sendSuccess(res, { zones });
});
