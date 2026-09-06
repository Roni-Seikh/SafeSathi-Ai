import { z } from 'zod';
import { geoPointInputSchema } from './sos.validator';

export const recordLocationSchema = z.object({
  location: geoPointInputSchema,
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  altitude: z.number().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

export const startSharingSchema = z.object({
  contactIds: z.array(z.string()).optional(),
});

export type RecordLocationInput = z.infer<typeof recordLocationSchema>;
