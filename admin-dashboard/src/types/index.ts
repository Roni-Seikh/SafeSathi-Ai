// Mirrors backend/src/utils/apiResponse.ts response envelope.
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details: unknown };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type AdminRole = 'super_admin' | 'moderator' | 'analyst';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  sosLast24h: number;
  activeSOSNow: number;
  pendingReports: number;
  totalReports: number;
}

export interface SOSTrendPoint {
  date: string;
  count: number;
}

export interface PeakTimingPoint {
  hour: number;
  sosCount: number;
  reportCount: number;
}

export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say';
export type SupportedLanguage = 'en' | 'hi' | 'bn';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender?: Gender;
  preferredLanguage: SupportedLanguage;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export type ReportType =
  | 'harassment'
  | 'stalking'
  | 'unsafe_area'
  | 'assault'
  | 'suspicious_activity'
  | 'other';
export type ReportStatus = 'pending' | 'verified' | 'rejected' | 'resolved';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface AdminReport {
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
  contributesToHeatmap: boolean;
  rejectionReason?: string;
  createdAt: string;
}

export type SOSTriggerType = 'manual' | 'voice_keyword' | 'motion' | 'tone' | 'admin';
export type SOSStatus = 'active' | 'resolved' | 'false_alarm' | 'cancelled';

export interface AdminSOSLog {
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

export interface MonthlyReportSummary {
  month: number;
  year: number;
  totalSOSEvents: number;
  totalReports: number;
  sosTrend: SOSTrendPoint[];
  peakTimings: PeakTimingPoint[];
}

export type ExportType = 'users' | 'reports' | 'sos';
