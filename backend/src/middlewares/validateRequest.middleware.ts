import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates (and coerces/defaults) req[part] against a Zod schema before
 * the request reaches a controller — controllers never re-validate.
 * Reassigning req.query/req.params is intentionally cast through `any`:
 * Express types req.query as ParsedQs, which is narrower than what a
 * parsed-and-defaulted Zod object legitimately looks like once
 * `.coerce`/`.default()` have run.
 */
export function validate(schema: AnyZodObject, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      (req as unknown as Record<RequestPart, unknown>)[part] = schema.parse(req[part]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError('VALIDATION_ERROR', 'Request validation failed', error.flatten().fieldErrors);
      }
      throw error;
    }
  };
}
