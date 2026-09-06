import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { reportService, userService } from '../config/container';
import { AppError } from '../utils/AppError';
import { COMMUNITY_ALERT_RADIUS_METERS } from '../utils/constants';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const getNearbyAlerts = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const { lat, lng, radiusMeters } = req.query as unknown as { lat: number; lng: number; radiusMeters?: number };
  const reports = await reportService.listNearby(
    { type: 'Point', coordinates: [lng, lat] },
    radiusMeters ?? COMMUNITY_ALERT_RADIUS_METERS
  );
  sendSuccess(res, { reports });
});

export const updateAlertSubscription = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { enabled } = req.body as { enabled: boolean };
  await userService.updateSafetyPreferences(String(user._id), { communityAlertsEnabled: enabled });
  sendSuccess(res, { communityAlertsEnabled: enabled });
});
