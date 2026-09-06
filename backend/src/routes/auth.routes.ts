import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth, requireFirebaseToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { registerSchema, logoutSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', requireFirebaseToken, validate(registerSchema), authController.register);
router.post('/login', requireFirebaseToken, authController.login);
router.post('/refresh-profile', requireAuth, authController.refreshProfile);
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout);
router.delete('/account', requireAuth, authController.deleteAccount);

export default router;
