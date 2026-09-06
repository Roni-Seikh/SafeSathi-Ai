import { z } from 'zod';

export const geoPointInputSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});

export const triggerSOSSchema = z.object({
  location: geoPointInputSchema,
  batteryLevel: z.number().min(0).max(100).optional(),
  deviceInfo: z.string().optional(),
  safeScoreAtTrigger: z.number().min(0).max(100).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TriggerSOSInput = z.infer<typeof triggerSOSSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
