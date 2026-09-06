import { z } from 'zod';
import { geoPointInputSchema } from './sos.validator';

export const createReportSchema = z.object({
  type: z.enum(['harassment', 'stalking', 'unsafe_area', 'assault', 'suspicious_activity', 'other']),
  description: z.string().min(1).max(2000),
  location: geoPointInputSchema,
  address: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  isAnonymous: z.boolean().optional(),
});

export const reportImageUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const confirmReportImageSchema = z.object({
  imagePath: z.string().min(1),
});

export const nearbyAlertsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(1).max(5000).optional(),
});

export const alertSubscriptionSchema = z.object({
  enabled: z.boolean(),
});

export type CreateReportBody = z.infer<typeof createReportSchema>;
