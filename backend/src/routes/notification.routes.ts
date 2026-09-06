import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

router.get('/', validate(paginationQuerySchema, 'query'), notificationController.listNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);
router.patch('/read-all', notificationController.markAllNotificationsRead);

export default router;
