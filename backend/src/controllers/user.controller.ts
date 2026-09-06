import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { userService } from '../config/container';
import { AppError } from '../utils/AppError';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const updated = await userService.updateProfile(String(user._id), req.body);
  sendSuccess(res, { user: updated });
});

export const updateMedicalInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const updated = await userService.updateMedicalInfo(String(user._id), req.body);
  sendSuccess(res, { user: updated });
});

export const updateSafetyPreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const updated = await userService.updateSafetyPreferences(String(user._id), req.body);
  sendSuccess(res, { user: updated });
});

export const getAvatarUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { contentType } = req.body as { contentType: string };
  const result = await userService.getAvatarUploadUrl(String(user._id), contentType);
  sendSuccess(res, result);
});

export const registerFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { token } = req.body as { token: string };
  await userService.registerFcmToken(String(user._id), token);
  sendSuccess(res, { registered: true });
});
