import { Router } from 'express';
import * as locationController from '../controllers/location.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';
import { recordLocationSchema, startSharingSchema } from '../validators/location.validator';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

// Location updates are frequent by nature (a tracking interval, not a
// user action) and must never be dropped by the default limiter,
// especially mid-SOS.
router.post('/', criticalRouteRateLimiter, validate(recordLocationSchema), locationController.recordLocation);
router.get('/live/:userId', locationController.getLiveLocation);
router.post('/sharing/start', validate(startSharingSchema), locationController.startSharing);
router.post('/sharing/stop', locationController.stopSharing);
router.get('/history', validate(paginationQuerySchema, 'query'), locationController.getLocationHistory);

export default router;
