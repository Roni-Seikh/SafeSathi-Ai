import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { adminUserService } from '../config/container';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as unknown as { page: number; limit: number; search?: string };
  const { items, total } = await adminUserService.list(page, limit, search);
  sendSuccess(res, { users: items }, 200, buildMeta(page, limit, total));
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const user = await adminUserService.setActiveStatus(req.params.id, isActive);
  sendSuccess(res, { user });
});
