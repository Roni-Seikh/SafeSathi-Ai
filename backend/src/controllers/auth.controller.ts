import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { authService, userService } from '../config/container';
import { AppError } from '../utils/AppError';
import { RegisterInput } from '../validators/auth.validator';

export const register = asyncHandler(async (req: Request, res: Response) => {
  if (!req.firebaseUid) throw new AppError('UNAUTHORIZED', 'Missing Firebase identity');
  const input = req.body as RegisterInput;

  const { user, isNewUser } = await authService.register({ firebaseUid: req.firebaseUid, ...input });
  sendSuccess(res, { user, isNewUser }, isNewUser ? 201 : 200);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  if (!req.firebaseUid) throw new AppError('UNAUTHORIZED', 'Missing Firebase identity');
  const user = await authService.login(req.firebaseUid);
  sendSuccess(res, { user });
});

export const refreshProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  const user = await userService.getProfile(String(req.user._id));
  sendSuccess(res, { user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  const { fcmToken } = req.body as { fcmToken?: string };
  await authService.logout(String(req.user._id), fcmToken);
  sendSuccess(res, { loggedOut: true });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  await userService.deactivateAccount(String(req.user._id));
  sendSuccess(res, { deactivated: true });
});
