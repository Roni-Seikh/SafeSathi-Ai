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
}

const initialState: DetectionState = {
  motion: { isMonitoring: false, lastEvent: null },
  voice: { isListening: false, lastEvent: null, error: null },
};

/**
 * A one-way mirror, not the source of truth — useMotionDetector and
 * useVoiceDetector own the real state (their subscriptions, buffers,
 * in-flight requests). useBackgroundDetection (mounted once, in
 * AppNavigator) pushes their status here on change purely so other
 * screens — Home's "listening/monitoring" badges — can read it without
 * mounting a second, duplicate instance of either detector.
 */
const detectionSlice = createSlice({
  name: 'detection',
  initialState,
  reducers: {
    setMotionStatus(state, action: PayloadAction<MotionStatus>) {
      state.motion = action.payload;
    },
    setVoiceStatus(state, action: PayloadAction<VoiceStatus>) {
      state.voice = action.payload;
    },
  },
});

export const { setMotionStatus, setVoiceStatus } = detectionSlice.actions;
export default detectionSlice.reducer;
