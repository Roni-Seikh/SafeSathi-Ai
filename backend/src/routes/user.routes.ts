import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import {
  updateProfileSchema,
  updateMedicalInfoSchema,
  updateSafetyPreferencesSchema,
  registerFcmTokenSchema,
  avatarUploadSchema,
} from '../validators/user.validator';

const router = Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.patch('/me/medical-info', validate(updateMedicalInfoSchema), userController.updateMedicalInfo);
router.patch(
  '/me/safety-preferences',
  validate(updateSafetyPreferencesSchema),
  userController.updateSafetyPreferences
);
router.post('/me/avatar', validate(avatarUploadSchema), userController.getAvatarUploadUrl);
router.post('/me/fcm-token', validate(registerFcmTokenSchema), userController.registerFcmToken);

export default router;
