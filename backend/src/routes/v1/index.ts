import { Router } from 'express';
import authRoutes from '../auth.routes';
import userRoutes from '../user.routes';
import contactRoutes from '../contact.routes';
import sosRoutes from '../sos.routes';
import notificationRoutes from '../notification.routes';
import locationRoutes from '../location.routes';
import voiceLogRoutes from '../voiceLog.routes';
import sensorLogRoutes from '../sensorLog.routes';
import reportRoutes from '../report.routes';
import communityRoutes from '../community.routes';
import routeRoutes from '../route.routes';
import heatmapRoutes from '../heatmap.routes';
import adminRoutes from '../admin.routes';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', (_req, res) => {
  sendSuccess(res, {
    name: 'SafeSathi API',
    version: 'v1',
    status: 'operational',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/sos', sosRoutes);
router.use('/location', locationRoutes);
router.use('/voice-logs', voiceLogRoutes);
router.use('/sensor-logs', sensorLogRoutes);
router.use('/reports', reportRoutes);
router.use('/community', communityRoutes);
router.use('/routes', routeRoutes);
router.use('/heatmap', heatmapRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
