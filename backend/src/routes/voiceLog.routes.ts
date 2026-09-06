import { Router } from 'express';
import * as voiceLogController from '../controllers/voiceLog.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { memoryUpload } from '../middlewares/upload.middleware';
import { criticalRouteRateLimiter } from '../middlewares/rateLimiter.middleware';
import { paginationQuerySchema } from '../validators/sos.validator';

const router = Router();

router.use(requireAuth);

// A voice event may be the only signal before an SOS — never throttled
// by the default limiter.
router.post('/', criticalRouteRateLimiter, memoryUpload.single('audio'), voiceLogController.submitVoiceLog);
router.get('/', validate(paginationQuerySchema, 'query'), voiceLogController.getVoiceLogHistory);

export default router;
