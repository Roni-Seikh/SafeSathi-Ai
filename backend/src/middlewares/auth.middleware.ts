import { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../config/firebase';
import { userRepository } from '../repositories/user.repository';
import { IUser } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      firebaseUid?: string;
    }
  }
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or malformed Authorization header');
  }
  return header.slice('Bearer '.length);
}

/**
 * Verifies the Firebase ID token in the Authorization header and attaches
 * the resolved SafeSathi user document to req.user. Use on every
 * end-user-facing route except POST /auth/register and POST /auth/login,
 * which use requireFirebaseToken instead (see below) because the matching
 * User document may not exist yet.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired authentication token');
  }

  req.firebaseUid = decoded.uid;

  const user = await userRepository.findByFirebaseUid(decoded.uid);
  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'No active SafeSathi account for this token — register first');
  }

  req.user = user;
  next();
});

/**
 * Verifies the Firebase ID token but does NOT require a matching User
 * document to already exist — used by /auth/register (the User is about
 * to be created) and /auth/login (existence is checked, and reported as
 * a normal NOT_FOUND, inside the controller/service rather than here).
 */
export const requireFirebaseToken = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.firebaseUid = decoded.uid;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired authentication token');
  }
  next();
});
