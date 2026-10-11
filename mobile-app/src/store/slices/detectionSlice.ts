import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MotionStatus {
  isMonitoring: boolean;
  lastEvent: { eventType: string; confidence: number; at: string } | null;
}

interface VoiceStatus {
  isListening: boolean;
  lastEvent: { keyword: string; screamProbability: number; at: string } | null;
  error: string | null;
}

interface DetectionState {
  motion: MotionStatus;
  voice: VoiceStatus;
  /** True while the Voice Test screen is open: starts the recogniser in dry-run mode even if Auto-SOS is off. */
  voiceTest: boolean;
}

const initialState: DetectionState = {
  motion: { isMonitoring: false, lastEvent: null },
  voice: { isListening: false, lastEvent: null, error: null },
  voiceTest: false,
};

/**
 * A one-way mirror, not the source of truth — useMotionDetector and useVoiceDetector own the real state.
 * useBackgroundDetection (mounted once, in AppNavigator) pushes their coarse status here so other screens
 * can read it without mounting a duplicate detector. High-frequency data (mic level, live transcript) lives in
 * services/voiceBus.ts instead, to avoid re-rendering the whole app six times a second.
 */
const detectionSlice = createSlice({
  name: 'detection',
  initialState,
  reducers: {
    setMotionStatus(state, action: PayloadAction<MotionStatus>) { state.motion = action.payload; },
    setVoiceStatus(state, action: PayloadAction<VoiceStatus>) { state.voice = action.payload; },
    setVoiceTest(state, action: PayloadAction<boolean>) { state.voiceTest = action.payload; },
  },
});

export const { setMotionStatus, setVoiceStatus, setVoiceTest } = detectionSlice.actions;
export default detectionSlice.reducer;
