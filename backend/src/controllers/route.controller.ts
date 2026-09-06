import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { routeService } from '../config/container';
import { AppError } from '../utils/AppError';
import { SafeRouteRequestBody } from '../validators/route.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const getSafeRoute = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { origin, destination, batteryLevel } = req.body as SafeRouteRequestBody;
  const routes = await routeService.getSafeRoutes({
    userId: String(user._id),
    origin,
    destination,
    batteryLevel: batteryLevel ?? 100,
  });
  sendSuccess(res, { routes });
});

export const getRouteHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await routeService.getHistory(String(user._id), page, limit);
  sendSuccess(res, { routes: items }, 200, buildMeta(page, limit, total));
});
