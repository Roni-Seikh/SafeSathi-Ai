import { Router } from 'express';
import * as c from '../controllers/evidence.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { evidenceUpload } from '../middlewares/upload.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();
router.use(requireAuth);

// Evidence must never be throttled away mid-incident.
router.post('/:sosId/chunks', criticalRouteRateLimiter, evidenceUpload.single('audio'), c.uploadChunk);
router.get('/:sosId', c.listChunks);
router.get('/:sosId/verify', c.verifyChain);
router.get('/:sosId/report', c.getReport);

export default router;
