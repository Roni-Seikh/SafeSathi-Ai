import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { submitVoiceLog } from '../services/voiceLogApi';
import { getCurrentGeoPoint, getBatteryLevelPercent } from '../services/location';
import { SupportedLanguage } from '../types/api.types';

const SEGMENT_DURATION_MS = 4000;
// Louder than this peak (dBFS, 0 = loudest) somewhere in a segment is
// worth uploading for analysis — a coarse local gate, not a detection
// decision. The real decision is the AI service's Vosk keyword match /
// scream-probability threshold (ai-services/README.md); this just avoids
// uploading four seconds of near-silence every four seconds.
const METERING_TRIGGER_DBFS = -20;

/**
 * m4a/AAC, mono, 16kHz — matches what ai-services/app/utils/audio.py was
 * actually verified against (see its docstring). Deliberately not using
 * Audio.RecordingOptionsPresets.HIGH_QUALITY directly, to control the
 * exact output format rather than depend on preset defaults that may
 * differ between iOS/Android in ways this integration wasn't tested
 * against.
 *
 * VERIFICATION NOTE: this options object is written against expo-av's
 * documented RecordingOptions shape, but — unlike every backend and
 * ai-services file in this project — it has NOT been exercised against a
 * real device or simulator; there isn't one available in this build
 * environment. Smoke-test recording + metering on an actual device
 * before relying on this in the field.
 */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export interface VoiceDetectorEvent {
  keyword: string;
  screamProbability: number;
  at: Date;
}

export interface UseVoiceDetectorResult {
  isListening: boolean;
  lastEvent: VoiceDetectorEvent | null;
  error: string | null;
}

/**
 * Records in rolling ~4s segments rather than one continuous stream:
 * expo-av's JS API gives you a finished file once a Recording is
 * stopped, not a way to pull "the last few seconds" out of an ongoing
 * one, so segmenting is how continuous-feeling monitoring is achieved
 * with this API. Each segment's peak metering decides locally whether to
 * upload it at all — most segments are silence/ambient noise and never
 * leave the device.
 *
 * Foreground-only, same caveat as useMotionDetector — true background
 * audio needs a foreground service (Android) / background audio session
 * handling (iOS) beyond what this build wires up. See
 * mobile-app/README.md.
 */
export function useVoiceDetector(
  enabled: boolean,
  language: SupportedLanguage,
  onSOSTriggered: () => void
): UseVoiceDetectorResult {
  const [isListening, setIsListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<VoiceDetectorEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onSOSTriggeredRef = useRef(onSOSTriggered);

  useEffect(() => {
    onSOSTriggeredRef.current = onSOSTriggered;
  }, [onSOSTriggered]);

  useEffect(() => {
    if (!enabled) {
      setIsListening(false);
      return undefined;
    }

    let cancelled = false;
    let activeRecording: Audio.Recording | null = null;

    async function requestPermissionAndMode(): Promise<void> {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission is required for voice detection.');
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    }

    async function recordOneSegment(): Promise<{ uri: string | null; peakDbfs: number }> {
      let peakDbfs = -160;
      const recording = new Audio.Recording();
      activeRecording = recording;

      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      recording.setOnRecordingStatusUpdate((status) => {
        if (typeof status.metering === 'number' && status.metering > peakDbfs) {
          peakDbfs = status.metering;
        }
      });
      await recording.startAsync();
      await new Promise((resolve) => setTimeout(resolve, SEGMENT_DURATION_MS));

      if (cancelled) {
        return { uri: null, peakDbfs };
      }
      await recording.stopAndUnloadAsync();
      activeRecording = null;
      return { uri: recording.getURI(), peakDbfs };
    }

    async function loop(): Promise<void> {
      try {
        await requestPermissionAndMode();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not start voice detection');
        return;
      }

      setIsListening(true);
      setError(null);

      while (!cancelled) {
        let uri: string | null = null;
        let peakDbfs = -160;
        try {
          ({ uri, peakDbfs } = await recordOneSegment());
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        if (cancelled || !uri) continue;

        if (peakDbfs < METERING_TRIGGER_DBFS) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          continue;
        }

        try {
          const [location, batteryLevel] = await Promise.all([getCurrentGeoPoint(), getBatteryLevelPercent()]);
          const { voiceLog, sosTriggered } = await submitVoiceLog({ fileUri: uri, language, location, batteryLevel });
          setLastEvent({
            keyword: voiceLog.detectedKeyword,
            screamProbability: voiceLog.toneAnalysis.screamProbability,
            at: new Date(),
          });
          if (sosTriggered) onSOSTriggeredRef.current();
        } catch {
          // Upload failure isn't fatal — the next segment tries again.
        } finally {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }
    }

    void loop();

    return () => {
      cancelled = true;
      if (activeRecording) {
        activeRecording.stopAndUnloadAsync().catch(() => undefined);
      }
      setIsListening(false);
    };
  }, [enabled, language]);

  return { isListening, lastEvent, error };
}
