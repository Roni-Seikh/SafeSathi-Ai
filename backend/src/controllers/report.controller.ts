import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildMeta } from '../utils/apiResponse';
import { reportService } from '../config/container';
import { AppError } from '../utils/AppError';
import { CreateReportBody } from '../validators/report.validator';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const report = await reportService.create(String(user._id), req.body as CreateReportBody);
  sendSuccess(res, { report }, 201);
});

export const getMyReports = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total } = await reportService.listForUser(String(user._id), page, limit);
  sendSuccess(res, { reports: items }, 200, buildMeta(page, limit, total));
});

export const getReportById = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const report = await reportService.getById(req.params.id);
  sendSuccess(res, { report });
});

export const getReportImageUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const { contentType } = req.body as { contentType: string };
  const result = await reportService.getImageUploadUrl(req.params.id, contentType);
  sendSuccess(res, result);
});

export const confirmReportImage = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  const { imagePath } = req.body as { imagePath: string };
  const report = await reportService.confirmImage(req.params.id, imagePath);
  sendSuccess(res, { report });
});
