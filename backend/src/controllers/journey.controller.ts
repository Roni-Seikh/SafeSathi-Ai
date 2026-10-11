import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { journeyService } from '../config/container';
import { AppError } from '../utils/AppError';
import { geoPointInputSchema } from '../validators/sos.validator';

export const startJourneySchema = z.object({
  mode: z.enum(['walk', 'cab', 'transit']).default('walk'),
  destinationName: z.string().min(1).max(120),
  destination: geoPointInputSchema,
  start: geoPointInputSchema,
  etaMinutes: z.number().int().min(2).max(360),
  graceMinutes: z.number().int().min(1).max(30).optional(),
  vehicleNumber: z.string().max(20).optional(),
  driverName: z.string().max(60).optional(),
});
export const pingSchema = z.object({ location: geoPointInputSchema });
export const minutesSchema = z.object({ minutes: z.number().int().min(1).max(120).default(10) });
export const cancelSchema = z.object({ duress: z.boolean().optional() });

const uid = (req: Request) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return String(req.user._id);
};

export const start = asyncHandler(async (req: Request, res: Response) => {
  const journey = await journeyService.start({ userId: uid(req), ...(req.body as z.infer<typeof startJourneySchema>) } as never);
  sendSuccess(res, { journey }, 201);
});
export const active = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { journey: await journeyService.getActive(uid(req)) }));
export const history = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { journeys: await journeyService.history(uid(req)) }));
export const ping = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, { journey: await journeyService.ping(uid(req), req.params.id, (req.body as z.infer<typeof pingSchema>).location as never) }));
export const imOk = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, { journey: await journeyService.confirmOk(uid(req), req.params.id, (req.body as z.infer<typeof minutesSchema>).minutes) }));
export const extend = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, { journey: await journeyService.extend(uid(req), req.params.id, (req.body as z.infer<typeof minutesSchema>).minutes) }));
export const arrive = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { journey: await journeyService.arrive(uid(req), req.params.id) }));
export const cancel = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, { journey: await journeyService.cancel(uid(req), req.params.id, Boolean((req.body as z.infer<typeof cancelSchema>).duress)) }));
