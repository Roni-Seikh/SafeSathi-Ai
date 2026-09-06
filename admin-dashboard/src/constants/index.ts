export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const TOKEN_STORAGE_KEY = 'safesathi_admin_token';
export const ADMIN_STORAGE_KEY = 'safesathi_admin_profile';

export const REPORT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
  resolved: 'Resolved',
};

export const REPORT_TYPE_LABEL: Record<string, string> = {
  harassment: 'Harassment',
  stalking: 'Stalking',
  unsafe_area: 'Unsafe area',
  assault: 'Assault',
  suspicious_activity: 'Suspicious activity',
  other: 'Other',
};

export const SOS_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  resolved: 'Resolved',
  false_alarm: 'False alarm',
  cancelled: 'Cancelled',
};

export const SOS_TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual button',
  voice_keyword: 'Voice keyword',
  motion: 'Motion sensor',
  tone: 'Tone detection',
  admin: 'Admin-initiated',
};

export const RISK_LEVEL_LABEL: Record<string, string> = {
  green: 'Low risk',
  yellow: 'Moderate risk',
  red: 'High risk',
};

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  moderator: 'Moderator',
  analyst: 'Analyst',
};
