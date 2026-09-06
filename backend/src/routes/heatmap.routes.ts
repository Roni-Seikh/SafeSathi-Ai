import { Router } from 'express';
import * as heatmapController from '../controllers/heatmap.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { bboxQuerySchema, recalculateHeatmapSchema } from '../validators/heatmap.validator';

const router = Router();

router.use(requireAuth);

router.get('/', validate(bboxQuerySchema, 'query'), heatmapController.getHeatmap);
router.post('/recalculate', validate(recalculateHeatmapSchema), heatmapController.recalculateHeatmap);

export default router;
