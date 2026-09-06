import { userRepository } from '../repositories/user.repository';
import { emergencyContactRepository } from '../repositories/emergencyContact.repository';
import { sosLogRepository } from '../repositories/sosLog.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { adminRepository } from '../repositories/admin.repository';
import { locationRepository } from '../repositories/location.repository';
import { voiceLogRepository } from '../repositories/voiceLog.repository';
import { sensorLogRepository } from '../repositories/sensorLog.repository';
import { reportRepository } from '../repositories/report.repository';
import { routeRepository } from '../repositories/route.repository';
import { heatmapRepository } from '../repositories/heatmap.repository';

import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { EmergencyContactService } from '../services/emergencyContact.service';
import { NotificationService } from '../services/notification.service';
import { SOSService } from '../services/sos.service';
import { AdminAuthService } from '../services/adminAuth.service';
import { LocationService } from '../services/location.service';
import { VoiceLogService } from '../services/voiceLog.service';
import { SensorLogService } from '../services/sensorLog.service';
import { GeoRiskFactorService } from '../services/geoRiskFactor.service';
import { ReportService } from '../services/report.service';
import { RouteService } from '../services/route.service';
import { HeatmapService } from '../services/heatmap.service';
import { AdminAnalyticsService } from '../services/adminAnalytics.service';
import { AdminUserService } from '../services/adminUser.service';
import { AdminReportService } from '../services/adminReport.service';
import { AdminSOSService } from '../services/adminSOS.service';
import { AdminExportService } from '../services/adminExport.service';

/**
 * Composition root: every service is constructed exactly once here, with
 * its repository dependencies passed in through the constructor. Nothing
 * outside this file wires a service to a concrete repository — controllers
 * and routes only ever import the finished singletons below, and unit
 * tests (Phase 8) construct a service directly with a mock repository
 * instead of importing anything from here.
 */
export const userService = new UserService(userRepository);
export const authService = new AuthService(userRepository);
export const emergencyContactService = new EmergencyContactService(emergencyContactRepository, userRepository);
export const notificationService = new NotificationService(notificationRepository, userRepository);
export const locationService = new LocationService(locationRepository, emergencyContactRepository, userRepository, notificationService);
export const sosService = new SOSService(
  sosLogRepository,
  emergencyContactRepository,
  userRepository,
  notificationService,
  locationService
);
export const voiceLogService = new VoiceLogService(voiceLogRepository, userRepository, sosService);
export const sensorLogService = new SensorLogService(sensorLogRepository, userRepository, sosService);
export const adminAuthService = new AdminAuthService(adminRepository);

export const geoRiskFactorService = new GeoRiskFactorService(reportRepository, sosLogRepository);
export const reportService = new ReportService(reportRepository, userRepository, notificationService);
export const routeService = new RouteService(routeRepository, geoRiskFactorService);
export const heatmapService = new HeatmapService(heatmapRepository, reportRepository, sosLogRepository);

export const adminAnalyticsService = new AdminAnalyticsService(userRepository, sosLogRepository, reportRepository);
export const adminUserService = new AdminUserService(userRepository);
export const adminReportService = new AdminReportService(reportRepository);
export const adminSOSService = new AdminSOSService(sosLogRepository);
export const adminExportService = new AdminExportService(userRepository, reportRepository, sosLogRepository);
