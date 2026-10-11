import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { safetyService } from '../config/container';

export const scoreQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  battery: z.coerce.number().min(0).max(100).default(100),
});

export const liveScore = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, battery } = req.query as unknown as z.infer<typeof scoreQuerySchema>;
  sendSuccess(res, await safetyService.liveScore({ type: 'Point', coordinates: [lng, lat] }, battery));
});
