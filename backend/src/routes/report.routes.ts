import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import {
  createReportSchema,
  reportImageUploadSchema,
  confirmReportImageSchema,
} from '../validators/report.validator';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createReportSchema), reportController.createReport);
router.get('/me', validate(paginationQuerySchema, 'query'), reportController.getMyReports);
router.get('/:id', reportController.getReportById);
router.post('/:id/images', validate(reportImageUploadSchema), reportController.getReportImageUploadUrl);
router.patch('/:id/images', validate(confirmReportImageSchema), reportController.confirmReportImage);

export default router;
