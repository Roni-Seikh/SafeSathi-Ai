import { z } from 'zod';

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const adminUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const adminReportListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'verified', 'rejected', 'resolved']).optional(),
});

export const adminRejectReportSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const adminSOSListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'resolved', 'false_alarm', 'cancelled']).optional(),
});

export const adminTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export const adminHeatmapListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const bboxObjectSchema = z.object({
  minLng: z.number().min(-180).max(180),
  minLat: z.number().min(-90).max(90),
  maxLng: z.number().min(-180).max(180),
  maxLat: z.number().min(-90).max(90),
});

export const adminHeatmapRecalculateSchema = z.object({
  bbox: bboxObjectSchema,
});

export const adminExportQuerySchema = z.object({
  type: z.enum(['users', 'reports', 'sos']),
});

export const adminMonthlyReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});
