import { Router } from 'express';
import * as communityController from '../controllers/community.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { nearbyAlertsQuerySchema, alertSubscriptionSchema } from '../validators/report.validator';

const router = Router();

router.use(requireAuth);

router.get('/alerts', validate(nearbyAlertsQuerySchema, 'query'), communityController.getNearbyAlerts);
router.post('/alerts/subscribe', validate(alertSubscriptionSchema), communityController.updateAlertSubscription);

export default router;
