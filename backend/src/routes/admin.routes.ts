import { Router } from 'express';
import { z } from 'zod';
import * as adminAuthController from '../controllers/adminAuth.controller';
import * as adminAnalyticsController from '../controllers/adminAnalytics.controller';
import * as adminUsersController from '../controllers/adminUsers.controller';
import * as adminReportsController from '../controllers/adminReports.controller';
import * as adminSOSController from '../controllers/adminSOS.controller';
import * as adminHeatmapController from '../controllers/adminHeatmap.controller';
import * as adminExportController from '../controllers/adminExport.controller';
import { requireAdminAuth, requireAdminRole } from '../middlewares/adminAuth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import {
  adminUserListQuerySchema,
  adminUserStatusSchema,
  adminReportListQuerySchema,
  adminRejectReportSchema,
  adminSOSListQuerySchema,
  adminTrendQuerySchema,
  adminHeatmapListQuerySchema,
  adminHeatmapRecalculateSchema,
  adminExportQuerySchema,
  adminMonthlyReportQuerySchema,
} from '../validators/admin.validator';

const router = Router();

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/auth/login', validate(adminLoginSchema), adminAuthController.adminLogin);

// Everything below requires a valid admin session.
router.use(requireAdminAuth);

// Analytics — read-only, any admin role.
router.get('/analytics/overview', adminAnalyticsController.getOverview);
router.get('/analytics/sos-trend', validate(adminTrendQuerySchema, 'query'), adminAnalyticsController.getSOSTrend);
router.get(
  '/analytics/peak-timings',
  validate(adminTrendQuerySchema, 'query'),
  adminAnalyticsController.getPeakTimings
);

// Users — listing is read-only; deactivating an account is a
// super_admin/moderator action, not something an analyst role can do.
router.get('/users', validate(adminUserListQuerySchema, 'query'), adminUsersController.listUsers);
router.patch(
  '/users/:id/status',
  requireAdminRole('super_admin', 'moderator'),
  validate(adminUserStatusSchema),
  adminUsersController.setUserStatus
);

// Reports — listing is read-only; verify/reject are moderation actions.
router.get('/reports', validate(adminReportListQuerySchema, 'query'), adminReportsController.listReports);
router.patch(
  '/reports/:id/verify',
  requireAdminRole('super_admin', 'moderator'),
  adminReportsController.verifyReport
);
router.patch(
  '/reports/:id/reject',
  requireAdminRole('super_admin', 'moderator'),
  validate(adminRejectReportSchema),
  adminReportsController.rejectReport
);

// Live + historical SOS monitor — read-only.
router.get('/sos', validate(adminSOSListQuerySchema, 'query'), adminSOSController.listSOS);

// Heatmap management.
router.get('/heatmap', validate(adminHeatmapListQuerySchema, 'query'), adminHeatmapController.listAllZones);
router.post(
  '/heatmap/recalculate',
  requireAdminRole('super_admin', 'moderator'),
  validate(adminHeatmapRecalculateSchema),
  adminHeatmapController.recalculateZones
);

// Export — read-only, but still admin-only (raw user/report/SOS data).
router.get('/export/csv', validate(adminExportQuerySchema, 'query'), adminExportController.exportCSV);
router.get(
  '/export/monthly-report',
  validate(adminMonthlyReportQuerySchema, 'query'),
  adminExportController.getMonthlyReport
);

export default router;
