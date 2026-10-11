import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { adminInsightsService, evidenceService } from '../config/container';

export const insightsQuerySchema = z.object({ days: z.coerce.number().int().min(7).max(180).default(30) });

export const getIntelligence = asyncHandler(async (req: Request, res: Response) => {
  const { days } = req.query as unknown as z.infer<typeof insightsQuerySchema>;
  sendSuccess(res, await adminInsightsService.intelligence(days));
});

/** Admin view of one SOS's evidence — list (signed URLs), integrity verification and the incident summary. */
export const getSOSEvidence = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const [chunks, verification, report] = await Promise.all([
    evidenceService.list(id, null),
    evidenceService.verify(id, null, req.query.deep === 'true'),
    evidenceService.buildReport(id, null),
  ]);
  sendSuccess(res, { chunks, verification, summary: report.text });
});
