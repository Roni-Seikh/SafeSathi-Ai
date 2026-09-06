import { Router } from 'express';
import * as sosController from '../controllers/sos.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';
import { triggerSOSSchema, paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

// SOS trigger and "I'm Safe" must never be throttled by the default limiter.
router.post('/trigger', criticalRouteRateLimiter, validate(triggerSOSSchema), sosController.triggerSOS);
router.get('/active', sosController.getActiveSOS);
router.get('/history', validate(paginationQuerySchema, 'query'), sosController.getSOSHistory);
router.patch('/:id/resolve', sosController.resolveSOS);
router.patch('/:id/false-alarm', sosController.markFalseAlarm);
router.post('/im-safe', criticalRouteRateLimiter, sosController.imSafe);

export default router;
