import { Router } from 'express';
import * as sensorLogController from '../controllers/sensorLog.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';
import { submitSensorLogSchema } from '../validators/sensorLog.validator';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

router.post('/', criticalRouteRateLimiter, validate(submitSensorLogSchema), sensorLogController.submitSensorLog);
router.get('/', validate(paginationQuerySchema, 'query'), sensorLogController.getSensorLogHistory);

export default router;
