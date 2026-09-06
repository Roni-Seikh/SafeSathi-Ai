import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { adminExportService } from '../config/container';
import { ExportType } from '../services/adminExport.service';

export const exportCSV = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query as unknown as { type: ExportType };
  const csv = await adminExportService.exportCSV(type);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="safesathi-${type}-${Date.now()}.csv"`);
  res.status(200).send(csv);
});

export const getMonthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = req.query as unknown as { month: number; year: number };
  const summary = await adminExportService.generateMonthlyReportSummary(month, year);
  sendSuccess(res, summary);
});
