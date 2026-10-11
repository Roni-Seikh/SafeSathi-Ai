import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ExpoSpeechRecognitionModule, addSpeechRecognitionListener, SPEECH_AVAILABLE, NEEDS_DEV_BUILD_MESSAGE } from '../services/speechModule';
import { CONTEXTUAL_HINTS, KeywordId, KeywordMatch, matchKeywords, Strength } from '../services/voiceKeywords';
import { voiceBus } from '../services/voiceBus';
import { LANGUAGE_FOR_LOCALE, VoiceLocale } from '../constants/voice';
import { SupportedLanguage } from '../types/api.types';

/**
 * Voice Guardian — ON-DEVICE speech recognition.
 *
 * Why this replaced the old record→upload→Vosk pipeline: that chain needed (1) loud-enough audio to pass a
 * dBFS gate, (2) the Render backend awake, (3) the AI service awake, (4) Vosk models downloaded on the server,
 * (5) ffmpeg decoding the phone's m4a correctly — five separate things that had to ALL work for one word to
 * be heard. Here the phone's own recogniser (Google / Apple) does the listening: no network hop to the AI
 * service, no models to deploy, no recording gaps, and the work is matched locally in microseconds.
 */
export interface VoiceTriggerEvent {
  keyword: KeywordId;
  strength: Strength;
  transcript: string;
  language: SupportedLanguage;
  confidence: number;
  source: 'voice_keyword' | 'tone';
  screamScore?: number;
}

export interface UseVoiceDetectorResult {
  isListening: boolean;
  lastEvent: { keyword: string; screamProbability: number; at: Date } | null;
  error: string | null;
}

interface Options {
  customSafeWord: string;
  screamByVolume: boolean;
  /** Match and display, but never call onTrigger (used by the Voice Test screen). */
  dryRun: boolean;
}

const TRIGGER_COOLDOWN_MS = 12000;
const SCREAM_COOLDOWN_MS = 60000;
const SCREAM_LEVEL = 0.92; // ≈ recogniser volume 9/10
const SCREAM_HOLD_MS = 1500;
const STALL_MS = 45000;

export function useVoiceDetector(
  enabled: boolean,
  locale: VoiceLocale,
  onTrigger: (e: VoiceTriggerEvent) => void,
  options: Options
): UseVoiceDetectorResult {
  const [isListening, setIsListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<UseVoiceDetectorResult['lastEvent']>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerRef = useRef(onTrigger);
  const optRef = useRef(options);
  useEffect(() => { triggerRef.current = onTrigger; optRef.current = options; });

  useEffect(() => {
    if (!enabled) {
      voiceBus.set({ engine: 'off', level: 0, error: null, dryRun: false });
      setIsListening(false);
      return undefined;
    }

    let cancelled = false;
    let currentLocale: VoiceLocale = locale;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    let lastActivity = Date.now();
    let lastFire = 0;
    let lastScream = 0;
    let loudSince = 0;
    let restarts = 0;
    let errorsInRow = 0;
    let fatal = false;
    const subs: { remove: () => void }[] = [];

    const publishError = (msg: string | null, engine?: 'error' | 'unavailable') => {
      setError(msg);
      voiceBus.set({ error: msg, ...(engine ? { engine } : {}) });
    };

    const fire = (match: KeywordMatch | null, transcript: string, extra: Partial<VoiceTriggerEvent> = {}) => {
      const now = Date.now();
      if (match) voiceBus.set({ lastMatch: { ...match, at: now, transcript } });
      const isScream = extra.source === 'tone';
      if (now - lastFire < TRIGGER_COOLDOWN_MS) return;
      if (isScream && now - lastScream < SCREAM_COOLDOWN_MS) return;
      lastFire = now;
      if (isScream) lastScream = now;
      setLastEvent({ keyword: match?.keyword ?? 'none', screamProbability: extra.screamScore ?? 0, at: new Date(now) });
      if (optRef.current.dryRun) return;
      triggerRef.current({
        keyword: match?.keyword ?? 'none',
        strength: match?.strength ?? 'weak',
        transcript,
        language: LANGUAGE_FOR_LOCALE[currentLocale],
        confidence: match ? (match.strength === 'strong' ? 0.9 : 0.6) : 0.6,
        source: 'voice_keyword',
        ...extra,
      });
    };

    const scheduleRestart = (delayMs: number) => {
      if (cancelled || fatal) return;
      if (restartTimer) clearTimeout(restartTimer);
      voiceBus.set({ engine: 'restarting' });
      setIsListening(false);
      restartTimer = setTimeout(() => void start(), delayMs);
    };

    const start = async () => {
      if (cancelled || fatal) return;
      if (!SPEECH_AVAILABLE) {
        fatal = true;
        publishError(NEEDS_DEV_BUILD_MESSAGE, 'unavailable');
        return;
      }
      if (AppState.currentState !== 'active') {
        // Phones don't let apps use the mic in the background without a foreground service; resume on return.
        voiceBus.set({ engine: 'restarting' });
        return;
      }
      try {
        voiceBus.set({ engine: 'starting', locale: currentLocale, dryRun: optRef.current.dryRun });
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          fatal = true;
          publishError('Microphone / speech permission is off. Enable it in phone Settings → Apps → SafeSathi → Permissions.', 'error');
          return;
        }
        if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
          fatal = true;
          publishError('This phone has no speech-recognition service. Install or enable "Speech Services by Google" (Android) and try again.', 'unavailable');
          return;
        }
        let onDevice = false;
        try {
          if (ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
            const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
            onDevice = installedLocales.some((l) => l.toLowerCase() === currentLocale.toLowerCase());
          }
        } catch { onDevice = false; }
        voiceBus.set({ onDevice });

        ExpoSpeechRecognitionModule.start({
          lang: currentLocale,
          interimResults: true,
          continuous: true,
          maxAlternatives: 3,
          contextualStrings: CONTEXTUAL_HINTS,
          requiresOnDeviceRecognition: onDevice,
          volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
        });
      } catch (e) {
        errorsInRow += 1;
        publishError(`Could not start listening: ${e instanceof Error ? e.message : String(e)}`);
        scheduleRestart(Math.min(10000, 1000 * errorsInRow));
      }
    };

    subs.push(
      addSpeechRecognitionListener('start', () => {
        lastActivity = Date.now();
        setIsListening(true);
        publishError(null);
        voiceBus.set({ engine: 'listening' });
        setTimeout(() => { if (!cancelled) errorsInRow = 0; }, 4000);
      }),
      addSpeechRecognitionListener('end', () => {
        lastActivity = Date.now();
        restarts += 1;
        voiceBus.set({ restarts });
        scheduleRestart(errorsInRow > 0 ? Math.min(8000, 800 * errorsInRow) : 250);
      }),
      addSpeechRecognitionListener('error', (ev) => {
        lastActivity = Date.now();
        const code = String(ev.error);
        if (code === 'no-speech' || code === 'speech-timeout' || code === 'aborted') return; // normal; 'end' restarts
        errorsInRow += 1;
        if (code === 'not-allowed') {
          fatal = true;
          publishError('Microphone / speech permission was denied. Enable it in phone Settings → Apps → SafeSathi → Permissions.', 'error');
        } else if (code === 'service-not-allowed') {
          fatal = true;
          publishError('The phone blocked speech recognition. Check that "Speech Services by Google" is enabled and not restricted.', 'unavailable');
        } else if (code === 'language-not-supported') {
          if (currentLocale !== 'en-IN') {
            currentLocale = 'en-IN';
            publishError('Your language pack is not installed — listening in English instead.');
          } else {
            fatal = true;
            publishError('English speech recognition is not available on this phone.', 'unavailable');
          }
        } else if (code === 'network') {
          publishError('Speech recognition needs internet (or an offline language pack). Retrying…');
        } else if (code !== 'busy') {
          publishError(`Voice engine error: ${code}${ev.message ? ` — ${ev.message}` : ''}`);
        }
      }),
      addSpeechRecognitionListener('result', (ev) => {
        lastActivity = Date.now();
        const alts = ev.results?.length ? ev.results : [];
        if (alts[0]) voiceBus.set({ transcript: alts[0].transcript });
        for (const alt of alts) {
          const m = matchKeywords(alt.transcript, optRef.current.customSafeWord);
          if (m) { fire(m, alt.transcript); break; }
        }
      }),
      addSpeechRecognitionListener('volumechange', (ev) => {
        lastActivity = Date.now();
        const level = Math.max(0, Math.min(1, (ev.value + 2) / 12));
        voiceBus.set({ level });
        const now = Date.now();
        if (level >= SCREAM_LEVEL) {
          if (!loudSince) loudSince = now;
          if (optRef.current.screamByVolume && now - loudSince >= SCREAM_HOLD_MS) {
            loudSince = 0;
            fire(null, 'loud sustained sound', { source: 'tone', screamScore: 0.6 });
          }
        } else loudSince = 0;
      })
    );

    // Watchdog: if the recogniser goes quiet (no start/result/volume events) it has silently stalled.
    const watchdog = setInterval(() => {
      if (cancelled || fatal || AppState.currentState !== 'active') return;
      if (Date.now() - lastActivity > STALL_MS) {
        lastActivity = Date.now();
        try { ExpoSpeechRecognitionModule.abort(); } catch { /* ignore */ }
        scheduleRestart(500);
      }
    }, 10000);

    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !fatal) {
        lastActivity = Date.now();
        scheduleRestart(300);
      } else if (s !== 'active') {
        setIsListening(false);
        voiceBus.set({ engine: 'restarting' });
      }
    });

    void start();

    return () => {
      cancelled = true;
      if (restartTimer) clearTimeout(restartTimer);
      clearInterval(watchdog);
      appSub.remove();
      subs.forEach((s) => s.remove());
      try { ExpoSpeechRecognitionModule.abort(); } catch { /* ignore */ }
      voiceBus.set({ engine: 'off', level: 0, dryRun: false });
      setIsListening(false);
    };
  }, [enabled, locale, options.dryRun]);

  return { isListening, lastEvent, error };
}
