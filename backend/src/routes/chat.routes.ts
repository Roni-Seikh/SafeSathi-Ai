import { Router } from 'express';
import * as c from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';

const router = Router();
router.use(requireAuth);
router.post('/', validate(c.chatSchema), c.send);
router.get('/history', c.history);
export default router;
