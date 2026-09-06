import { z } from 'zod';
import { geoPointInputSchema } from './sos.validator';

export const safeRouteRequestSchema = z.object({
  origin: geoPointInputSchema,
  destination: geoPointInputSchema,
  batteryLevel: z.number().min(0).max(100).optional(),
});

export type SafeRouteRequestBody = z.infer<typeof safeRouteRequestSchema>;
