import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { notificationService } from '../config/container';
import { AppError } from '../utils/AppError';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await notificationService.listForUser(String(user._id), page, limit);
  sendSuccess(res, { notifications: items }, 200, buildMeta(page, limit, total));
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await notificationService.markRead(String(user._id), req.params.id);
  sendSuccess(res, { read: true });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await notificationService.markAllRead(String(user._id));
  sendSuccess(res, { read: true });
});
