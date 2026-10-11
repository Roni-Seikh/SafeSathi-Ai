import { Router } from 'express';
import * as c from '../controllers/journey.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();
router.use(requireAuth);

router.post('/', validate(c.startJourneySchema), c.start);
router.get('/active', c.active);
router.get('/history', c.history);
router.post('/:id/location', criticalRouteRateLimiter, validate(c.pingSchema), c.ping);
router.post('/:id/ok', criticalRouteRateLimiter, validate(c.minutesSchema), c.imOk);
router.post('/:id/extend', validate(c.minutesSchema), c.extend);
router.post('/:id/arrive', c.arrive);
router.post('/:id/cancel', criticalRouteRateLimiter, validate(c.cancelSchema), c.cancel);

export default router;
