import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async controller so a thrown/rejected error is forwarded to
 * Express's error-handling middleware instead of becoming an unhandled
 * promise rejection. Every controller in this codebase is wrapped in this. */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
