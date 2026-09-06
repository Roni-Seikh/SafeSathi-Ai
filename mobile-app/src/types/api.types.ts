/**
 * Mirrors backend/src/models/*.model.ts + docs/architecture/API_DESIGN.md.
 * Kept manually in sync since the mobile app and backend are separate
 * packages — this is the single file to update on either side when a
 * DTO shape changes.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details: unknown };
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type SupportedLanguage = 'en' | 'hi' | 'bn';

export interface MedicalInfo {
  bloodGroup?: BloodGroup;
  allergies: string[];
  conditions: string[];
  medications: string[];
  organDonor: boolean;
}

export interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
}

export interface SafetyPreferences {
  voiceDetectionEnabled: boolean;
  motionDetectionEnabled: boolean;
  toneDetectionEnabled: boolean;
  autoSOSEnabled: boolean;
  silentEvidenceEnabled: boolean;
  fakeCallVoiceUrl?: string;
}

export interface User {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: Gender;
  profilePhotoUrl?: string;
  medicalInfo: MedicalInfo;
  address: Address;
  preferredLanguage: SupportedLanguage;
  safetyPreferences: SafetyPreferences;
  lastKnownLocation?: GeoPoint;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  _id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  isPrimary: boolean;
  notifyOnSOS: boolean;
  notifyOnImSafe: boolean;
  notifyOnLowSafeScore: boolean;
  linkedUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type SOSTriggerType = 'manual' | 'voice_keyword' | 'motion' | 'tone' | 'admin';
export type SOSStatus = 'active' | 'resolved' | 'false_alarm' | 'cancelled';

export interface SOSLog {
  _id: string;
  userId: string;
  triggerType: SOSTriggerType;
  status: SOSStatus;
  location: GeoPoint;
  address?: string;
  batteryLevel?: number;
  safeScoreAtTrigger?: number;
  triggeredAt: string;
  resolvedAt?: string;
  resolvedBy?: 'user' | 'contact' | 'admin' | 'auto_timeout';
}

export type NotificationType =
  | 'sos_alert'
  | 'im_safe'
  | 'community_alert'
  | 'report_status_update'
  | 'low_safe_score'
  | 'location_share_started'
  | 'system';

export interface AppNotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export type ReportType = 'harassment' | 'stalking' | 'unsafe_area' | 'assault' | 'suspicious_activity' | 'other';
export type ReportStatus = 'pending' | 'verified' | 'rejected' | 'resolved';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  _id: string;
  userId?: string;
  type: ReportType;
  description: string;
  images: string[];
  location: GeoPoint;
  address?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  isAnonymous: boolean;
  createdAt: string;
}

export type RiskLevel = 'green' | 'yellow' | 'red';

export interface HeatmapZone {
  _id: string;
  zoneId: string;
  center: GeoPoint;
  radiusMeters: number;
  riskLevel: RiskLevel;
  riskScore: number;
  reportCount: number;
  sosCount: number;
  lastCalculatedAt: string;
}

export interface RouteCandidate {
  routeGeometry: { type: 'LineString'; coordinates: [number, number][] };
  distanceMeters: number;
  estimatedDurationSeconds: number;
  safeScore: number;
}
