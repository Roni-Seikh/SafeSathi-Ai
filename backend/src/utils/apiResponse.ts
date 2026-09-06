import { Response } from 'express';

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

/** Every successful response — see docs/architecture/API_DESIGN.md §1. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: ResponseMeta): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

/** Every error response. Prefer throwing AppError and letting the central
 * error-handling middleware call this, rather than calling it directly
 * from a controller. */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message, details: details ?? null },
  });
}

export function buildMeta(page: number, limit: number, total: number): ResponseMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
