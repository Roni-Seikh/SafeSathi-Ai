import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { VoiceLocale } from '../constants/voice';

const KEY = 'safesathi.local.v2';
const PIN_KEY = 'safesathi.pin';
const DURESS_KEY = 'safesathi.duress';

export interface LocalSettings {
  /** null → follow profile.preferredLanguage */
  voiceLocale: VoiceLocale | null;
  customSafeWord: string;
  /** Fire instantly on strong phrases (no countdown). Weak phrases always get the countdown. */
  instantOnStrongPhrase: boolean;
  /** Treat sustained very-loud sound as a possible scream (experimental). */
  screamByVolume: boolean;
  /** Triple-shake the phone to start the SOS countdown. */
  panicShake: boolean;
  homeLabel: string;
  homeLat: number | null;
  homeLng: number | null;
  fakeCallerName: string;
  lastSOSId: string | null;
}

export const DEFAULT_LOCAL: LocalSettings = {
  voiceLocale: null, customSafeWord: '', instantOnStrongPhrase: true, screamByVolume: false, panicShake: true,
  homeLabel: 'Home', homeLat: null, homeLng: null, fakeCallerName: 'Mom', lastSOSId: null,
};

let cache: LocalSettings | null = null;
const subs = new Set<(s: LocalSettings) => void>();

export async function loadLocalSettings(): Promise<LocalSettings> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = { ...DEFAULT_LOCAL, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cache = { ...DEFAULT_LOCAL };
  }
  return cache as LocalSettings;
}

export async function updateLocalSettings(patch: Partial<LocalSettings>): Promise<LocalSettings> {
  const next = { ...(await loadLocalSettings()), ...patch };
  cache = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  subs.forEach((s) => s(next));
  return next;
}

export function subscribeLocalSettings(cb: (s: LocalSettings) => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

// ---- PINs (SecureStore = Keychain / Android Keystore) ----------------------------
export async function setPins(pin: string, duress: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(DURESS_KEY, duress);
}
export async function clearPins(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(DURESS_KEY).catch(() => undefined);
}
export async function hasPin(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(PIN_KEY).catch(() => null));
}
/** 'ok' = real cancel · 'duress' = look cancelled but keep SOS · 'wrong' = try again */
export async function checkPin(entered: string): Promise<'ok' | 'duress' | 'wrong'> {
  const [pin, duress] = await Promise.all([SecureStore.getItemAsync(PIN_KEY), SecureStore.getItemAsync(DURESS_KEY)]);
  if (duress && entered === duress) return 'duress';
  if (pin && entered === pin) return 'ok';
  return 'wrong';
}
