import { z } from 'zod';
import { geoPointInputSchema } from './sos.validator';

const motionSummarySchema = z.object({
  meanMagnitude: z.number().min(0),
  peakMagnitude: z.number().min(0),
  variance: z.number().min(0),
  sampleCount: z.number().int().min(1),
  windowMs: z.number().min(1),
});

export const submitSensorLogSchema = z.object({
  accelerometer: motionSummarySchema,
  gyroscope: motionSummarySchema,
  location: geoPointInputSchema,
  batteryLevel: z.number().min(0).max(100).optional(),
});

export type SubmitSensorLogBody = z.infer<typeof submitSensorLogSchema>;
