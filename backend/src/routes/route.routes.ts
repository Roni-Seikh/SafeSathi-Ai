import { Router } from 'express';
import * as routeController from '../controllers/route.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { safeRouteRequestSchema } from '../validators/route.validator';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

router.post('/safe-route', validate(safeRouteRequestSchema), routeController.getSafeRoute);
router.get('/history', validate(paginationQuerySchema, 'query'), routeController.getRouteHistory);

export default router;
