import { SupportedLanguage } from '../types/api.types';

export type VoiceLocale = 'en-IN' | 'hi-IN' | 'bn-IN';

export const LOCALE_FOR_LANGUAGE: Record<SupportedLanguage, VoiceLocale> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN' };
export const LANGUAGE_FOR_LOCALE: Record<VoiceLocale, SupportedLanguage> = { 'en-IN': 'en', 'hi-IN': 'hi', 'bn-IN': 'bn' };
export const LOCALE_LABEL: Record<VoiceLocale, string> = { 'en-IN': 'English (India)', 'hi-IN': 'हिन्दी', 'bn-IN': 'বাংলা' };

/** Seconds the user gets to cancel an auto-detected SOS before it is sent. */
export const AUTO_SOS_COUNTDOWN_S = 8;
/** Length of each evidence audio chunk. Short chunks = less lost if the phone is taken/destroyed. */
export const EVIDENCE_CHUNK_MS = 20000;
