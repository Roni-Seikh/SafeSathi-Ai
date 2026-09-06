import { z } from 'zod';

const bboxObjectSchema = z.object({
  minLng: z.number().min(-180).max(180),
  minLat: z.number().min(-90).max(90),
  maxLng: z.number().min(-180).max(180),
  maxLat: z.number().min(-90).max(90),
});

/** GET /heatmap?bbox=minLng,minLat,maxLng,maxLat — per
 * docs/architecture/API_DESIGN.md §10's documented query format, parsed
 * from one comma-separated string rather than four separate params. */
export const bboxQuerySchema = z.object({
  bbox: z.string().transform((val, ctx) => {
    const parts = val.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox must be "minLng,minLat,maxLng,maxLat"' });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    return { minLng, minLat, maxLng, maxLat };
  }),
});

export const recalculateHeatmapSchema = z.object({
  bbox: bboxObjectSchema,
});

export type BBoxQuery = { bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number } };
export type RecalculateHeatmapBody = z.infer<typeof recalculateHeatmapSchema>;
