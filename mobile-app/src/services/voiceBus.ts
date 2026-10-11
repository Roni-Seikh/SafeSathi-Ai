import { KeywordMatch } from './voiceKeywords';

/**
 * High-frequency voice telemetry (mic level 6×/s, interim transcripts). Kept OUT of Redux on purpose:
 * dispatching that often would re-render every connected screen. Screens that want it subscribe here.
 */
export type EngineState = 'off' | 'starting' | 'listening' | 'restarting' | 'error' | 'unavailable';

export interface VoiceSnapshot {
  engine: EngineState;
  locale: string;
  level: number; // 0..1 (normalised mic level)
  transcript: string;
  lastMatch: (KeywordMatch & { at: number; transcript: string }) | null;
  restarts: number;
  error: string | null;
  onDevice: boolean;
  dryRun: boolean;
  updatedAt: number;
}

let snapshot: VoiceSnapshot = {
  engine: 'off', locale: 'en-IN', level: 0, transcript: '', lastMatch: null, restarts: 0, error: null, onDevice: false, dryRun: false, updatedAt: 0,
};
const listeners = new Set<(s: VoiceSnapshot) => void>();

export const voiceBus = {
  get: () => snapshot,
  set(patch: Partial<VoiceSnapshot>) {
    snapshot = { ...snapshot, ...patch, updatedAt: Date.now() };
    listeners.forEach((l) => l(snapshot));
  },
  subscribe(l: (s: VoiceSnapshot) => void) {
    listeners.add(l);
    l(snapshot);
    return () => { listeners.delete(l); };
  },
};
