import { Router } from 'express';
import * as c from '../controllers/safety.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';

const router = Router();
router.use(requireAuth);
router.get('/score', validate(c.scoreQuerySchema, 'query'), c.liveScore);
export default router;
