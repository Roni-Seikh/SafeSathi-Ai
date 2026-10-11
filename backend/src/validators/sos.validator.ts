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
  /** Which detector raised this SOS. Defaults to 'manual'. */
  triggerType: z.enum(['manual', 'voice_keyword', 'tone', 'motion', 'shake']).default('manual'),
  /** On-device voice detection payload — logged as a VoiceLog so analytics stay complete. */
  detection: z
    .object({
      keyword: z.enum(['help', 'save_me', 'bachao', 'chere_din', 'stop', 'none']).default('none'),
      transcript: z.string().max(300).optional(),
      confidence: z.number().min(0).max(1).default(0.8),
      language: z.enum(['en', 'hi', 'bn']).default('en'),
      screamScore: z.number().min(0).max(1).optional(),
    })
    .optional(),
  duress: z.boolean().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TriggerSOSInput = z.infer<typeof triggerSOSSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
