import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { adminReportService } from '../config/container';
import { AppError } from '../utils/AppError';
import { ReportStatus } from '../models/Report.model';

function requireAdmin(req: Request) {
  if (!req.admin) throw new AppError('UNAUTHORIZED', 'Admin authentication required');
  return req.admin;
}

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  requireAdmin(req);
  const { page, limit, status } = req.query as unknown as { page: number; limit: number; status?: ReportStatus };
  const { items, total } = await adminReportService.list(page, limit, status);
  sendSuccess(res, { reports: items }, 200, buildMeta(page, limit, total));
});

export const verifyReport = asyncHandler(async (req: Request, res: Response) => {
  const admin = requireAdmin(req);
  const report = await adminReportService.verify(req.params.id, String(admin._id));
  sendSuccess(res, { report });
});

export const rejectReport = asyncHandler(async (req: Request, res: Response) => {
  const admin = requireAdmin(req);
  const { reason } = req.body as { reason: string };
  const report = await adminReportService.reject(req.params.id, String(admin._id), reason);
  sendSuccess(res, { report });
});
