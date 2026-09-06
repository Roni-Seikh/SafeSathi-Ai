import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { adminRepository } from '../repositories/admin.repository';
import { IAdmin } from '../models/Admin.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export interface AdminJwtPayload {
  adminId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}

/** Verifies the admin session JWT (issued by POST /admin/auth/login) and
 * attaches the resolved Admin document to req.admin. This is entirely
 * separate from requireAuth — admins are never Firebase users. */
export const requireAdminAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length);

  let payload: AdminJwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired admin session');
  }

  const admin = await adminRepository.findById(payload.adminId);
  if (!admin || !admin.isActive) {
    throw new AppError('UNAUTHORIZED', 'Admin account is inactive or no longer exists');
  }

  req.admin = admin;
  next();
});

/** Restricts a route to specific admin roles — chain after requireAdminAuth. */
export function requireAdminRole(...roles: IAdmin['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      throw new AppError('FORBIDDEN', 'You do not have permission to perform this action');
    }
    next();
  };
}
