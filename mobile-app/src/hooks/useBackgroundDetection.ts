import { useCallback, useEffect } from 'react';
import { useMotionDetector, UseMotionDetectorResult } from './useMotionDetector';
import { useVoiceDetector, UseVoiceDetectorResult } from './useVoiceDetector';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchActiveSOS } from '../store/slices/sosSlice';
import { setMotionStatus, setVoiceStatus } from '../store/slices/detectionSlice';
import { navigate } from '../navigation/navigationRef';

export interface BackgroundDetectionStatus {
  motion: UseMotionDetectorResult;
  voice: UseVoiceDetectorResult;
}

/**
 * The single place that decides whether either on-device detector should
 * actually be running: both respect the user's own Settings toggles
 * (safetyPreferences), and both pause while an SOS is already active —
 * there's nothing to gain from classifying more windows/segments once
 * the pipeline they'd feed into has already fired, and it only adds
 * battery/bandwidth cost during the exact moment the phone might most
 * need to conserve both.
 *
 * Mounted once, inside AppNavigator (i.e. only while authenticated) —
 * see AppNavigator.tsx.
 */
export function useBackgroundDetection(): BackgroundDetectionStatus {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.auth.user?.safetyPreferences);
  const language = useAppSelector((state) => state.auth.user?.preferredLanguage ?? 'en');
  const hasActiveSOS = useAppSelector((state) => !!state.sos.active);

  const handleSOSTriggered = useCallback(() => {
    void dispatch(fetchActiveSOS());
    navigate('SOSActive', undefined);
  }, [dispatch]);

  const motionEnabled = !!preferences?.autoSOSEnabled && !!preferences?.motionDetectionEnabled && !hasActiveSOS;
  const voiceEnabled =
    !!preferences?.autoSOSEnabled &&
    (!!preferences?.voiceDetectionEnabled || !!preferences?.toneDetectionEnabled) &&
    !hasActiveSOS;

  const motion = useMotionDetector(motionEnabled, handleSOSTriggered);
  const voice = useVoiceDetector(voiceEnabled, language, handleSOSTriggered);

  useEffect(() => {
    dispatch(
      setMotionStatus({
        isMonitoring: motion.isMonitoring,
        lastEvent: motion.lastEvent
          ? { eventType: motion.lastEvent.eventType, confidence: motion.lastEvent.confidence, at: motion.lastEvent.at.toISOString() }
          : null,
      })
    );
  }, [motion.isMonitoring, motion.lastEvent, dispatch]);

  useEffect(() => {
    dispatch(
      setVoiceStatus({
        isListening: voice.isListening,
        lastEvent: voice.lastEvent
          ? { keyword: voice.lastEvent.keyword, screamProbability: voice.lastEvent.screamProbability, at: voice.lastEvent.at.toISOString() }
          : null,
        error: voice.error,
      })
    );
  }, [voice.isListening, voice.lastEvent, voice.error, dispatch]);

  return { motion, voice };
}
