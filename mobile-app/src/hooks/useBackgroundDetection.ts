import { useCallback, useEffect } from 'react';
import { useMotionDetector, UseMotionDetectorResult } from './useMotionDetector';
import { useVoiceDetector, UseVoiceDetectorResult, VoiceTriggerEvent } from './useVoiceDetector';
import { usePanicShake } from './usePanicShake';
import { useLocalSettings } from './useLocalSettings';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchActiveSOS } from '../store/slices/sosSlice';
import { setMotionStatus, setVoiceStatus } from '../store/slices/detectionSlice';
import { navigate } from '../navigation/navigationRef';
import { fireDetectedSOS } from '../services/autoSOS';
import { flushPendingEvidence, useEvidenceRecorder } from './useEvidenceRecorder';
import { useLocationTracking } from './useLocationTracking';
import { duress, useDuress } from '../services/duress';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AUTO_SOS_COUNTDOWN_S, LOCALE_FOR_LANGUAGE } from '../constants/voice';

export interface BackgroundDetectionStatus {
  motion: UseMotionDetectorResult;
  voice: UseVoiceDetectorResult;
}

/**
 * The single place that decides whether the on-device detectors run. Mounted once in AppNavigator.
 *
 * Voice runs when  autoSOSEnabled && (voiceDetectionEnabled || toneDetectionEnabled)  — or while the Voice Test
 * screen is open (dry-run: matches are shown but never raise an SOS). Everything pauses during an active SOS
 * (the microphone is then needed by the Evidence Recorder).
 *
 * How a detection becomes an SOS:
 *  • strong phrase ("bachao", "help me" …) + "instant" setting → SOS immediately
 *  • everything else (a lone "help", a loud sound, panic-shake) → 8-second cancellable countdown, because a
 *    lone "help" is also ordinary speech and a false SOS that alerts your family is costly.
 */
export function useBackgroundDetection(): BackgroundDetectionStatus {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((s) => s.auth.user?.safetyPreferences);
  const language = useAppSelector((s) => s.auth.user?.preferredLanguage ?? 'en');
  const hasActiveSOS = useAppSelector((s) => !!s.sos.active);
  const activeSOSId = useAppSelector((s) => s.sos.active?._id);
  const inDuress = useDuress();
  const voiceTest = useAppSelector((s) => s.detection.voiceTest);
  const local = useLocalSettings();

  const handleMotionSOS = useCallback(() => {
    void dispatch(fetchActiveSOS());
    navigate('SOSActive', undefined);
  }, [dispatch]);

  const handleVoiceTrigger = useCallback(
    (e: VoiceTriggerEvent) => {
      const payload = { source: e.source, keyword: e.keyword, transcript: e.transcript, confidence: e.confidence, language: e.language, screamScore: e.screamScore } as const;
      if (e.source === 'voice_keyword' && e.strength === 'strong' && local.instantOnStrongPhrase) {
        void fireDetectedSOS(payload).catch(() => navigate('AutoSOSCountdown', { ...payload, seconds: 0 }));
      } else {
        navigate('AutoSOSCountdown', { ...payload, seconds: AUTO_SOS_COUNTDOWN_S });
      }
    },
    [local.instantOnStrongPhrase]
  );

  const handleShake = useCallback(() => {
    navigate('AutoSOSCountdown', { source: 'shake', seconds: AUTO_SOS_COUNTDOWN_S });
  }, []);

  const autoVoice = !!preferences?.autoSOSEnabled && (!!preferences?.voiceDetectionEnabled || !!preferences?.toneDetectionEnabled) && !hasActiveSOS;
  const voiceEnabled = autoVoice || voiceTest;
  const motionEnabled = !!preferences?.autoSOSEnabled && !!preferences?.motionDetectionEnabled && !hasActiveSOS;

  const motion = useMotionDetector(motionEnabled, handleMotionSOS);
  const locale = local.voiceLocale ?? LOCALE_FOR_LANGUAGE[language];
  const voice = useVoiceDetector(voiceEnabled, locale, handleVoiceTrigger, {
    customSafeWord: local.customSafeWord,
    screamByVolume: local.screamByVolume && !!preferences?.toneDetectionEnabled,
    dryRun: !autoVoice,
  });
  usePanicShake(local.panicShake && !!preferences?.autoSOSEnabled && !hasActiveSOS, handleShake);

  // Evidence + (duress-mode) location sharing live HERE, not on the SOS screen, so they keep running after a
  // duress-PIN fake-cancel when the UI has moved on. SOSActiveScreen runs its own tracker only while NOT in duress.
  useEvidenceRecorder(activeSOSId, hasActiveSOS && preferences?.silentEvidenceEnabled !== false);
  useLocationTracking(hasActiveSOS && inDuress);

  useEffect(() => {
    if (!hasActiveSOS) { duress.set(false); return undefined; }
    void activateKeepAwakeAsync('safesathi-sos'); // screen on = mic + GPS keep working
    return () => { deactivateKeepAwake('safesathi-sos'); };
  }, [hasActiveSOS]);

  // Evidence recorded before the app was killed/lost signal is still queued on disk — send it when we're back.
  useEffect(() => { void flushPendingEvidence(); }, []);

  useEffect(() => {
    dispatch(setMotionStatus({
      isMonitoring: motion.isMonitoring,
      lastEvent: motion.lastEvent ? { eventType: motion.lastEvent.eventType, confidence: motion.lastEvent.confidence, at: motion.lastEvent.at.toISOString() } : null,
    }));
  }, [motion.isMonitoring, motion.lastEvent, dispatch]);

  useEffect(() => {
    dispatch(setVoiceStatus({
      isListening: voice.isListening,
      lastEvent: voice.lastEvent ? { keyword: voice.lastEvent.keyword, screamProbability: voice.lastEvent.screamProbability, at: voice.lastEvent.at.toISOString() } : null,
      error: voice.error,
    }));
  }, [voice.isListening, voice.lastEvent, voice.error, dispatch]);

  return { motion, voice };
}
