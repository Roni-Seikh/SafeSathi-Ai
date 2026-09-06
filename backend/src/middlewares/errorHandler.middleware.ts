import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error(err.message, { code: err.code, path: req.path, details: err.details });
    }
    sendError(res, err.code, err.message, err.httpStatus, err.details);
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  logger.error(message, { path: req.path, stack: err instanceof Error ? err.stack : undefined });
  sendError(res, 'INTERNAL_ERROR', 'Something went wrong. Please try again.', 500);
}

export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`, 404);
}
