import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { locationService } from '../config/container';
import { AppError } from '../utils/AppError';
import { RecordLocationInput } from '../validators/location.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const recordLocation = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { location, ...rest } = req.body as RecordLocationInput;
  const point = await locationService.recordLocation({ userId: String(user._id), coordinates: location, ...rest });
  sendSuccess(res, { location: point }, 201);
});

export const getLiveLocation = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const location = await locationService.getLiveLocation(req.params.userId, String(user._id));
  sendSuccess(res, { location });
});

export const startSharing = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { contactIds } = req.body as { contactIds?: string[] };
  const result = await locationService.startSharing(String(user._id), contactIds);
  sendSuccess(res, result);
});

export const stopSharing = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await locationService.stopSharing(String(user._id));
  sendSuccess(res, { stopped: true });
});

export const getLocationHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await locationService.getHistory(String(user._id), page, limit);
  sendSuccess(res, { locations: items }, 200, buildMeta(page, limit, total));
});
