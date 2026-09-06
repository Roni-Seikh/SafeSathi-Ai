/** Error code vocabulary — see docs/architecture/API_DESIGN.md §18. Extend
 * this union (and STATUS_BY_CODE below) rather than throwing a raw Error
 * whenever a new failure mode needs its own code. */
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SOS_CONTACT_LIMIT_EXCEEDED'
  | 'RATE_LIMITED'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SOS_CONTACT_LIMIT_EXCEEDED: 400,
  RATE_LIMITED: 429,
  AI_SERVICE_UNAVAILABLE: 502,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = STATUS_BY_CODE[code];
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
