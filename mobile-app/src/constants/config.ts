import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
  socketUrl?: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

/** Falls back to localhost for local development against `npm run dev`
 * in ../backend — override via app.config.ts `extra` or EAS env vars for
 * staging/production builds. */
export const API_BASE_URL = extra.apiBaseUrl ?? 'http://localhost:5000/api/v1';
export const SOCKET_URL = extra.socketUrl ?? 'http://localhost:5000';

export const FIREBASE_CONFIG = {
  apiKey: extra.firebaseApiKey ?? '',
  authDomain: extra.firebaseAuthDomain ?? '',
  projectId: extra.firebaseProjectId ?? '',
  storageBucket: extra.firebaseStorageBucket ?? '',
  messagingSenderId: extra.firebaseMessagingSenderId ?? '',
  appId: extra.firebaseAppId ?? '',
};

/** Mirrors backend/src/models/VoiceLog.model.ts DetectedKeyword — kept in
 * sync manually since the mobile app and backend are separate packages;
 * see docs/architecture/API_DESIGN.md for the shared contract. */
export const VOICE_KEYWORDS_BY_LANGUAGE: Record<'en' | 'hi' | 'bn', string[]> = {
  en: ['help', 'save me', 'stop'],
  hi: ['bachao'],
  bn: ['chere din'],
};

export const ONBOARDING_SEEN_KEY = 'safesathi:onboardingSeen';

export const PAGINATION_DEFAULT_LIMIT = 20;

/** Mirrors backend/src/utils/constants.ts MAX_EMERGENCY_CONTACTS. */
export const MAX_EMERGENCY_CONTACTS = 5;
