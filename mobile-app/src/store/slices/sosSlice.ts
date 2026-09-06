import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as sosApi from '../../services/sosApi';
import { getCurrentGeoPoint, getBatteryLevelPercent } from '../../services/location';
import { SOSLog } from '../../types/api.types';

interface SOSState {
  active: SOSLog | null;
  status: 'idle' | 'triggering' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SOSState = {
  active: null,
  status: 'idle',
  error: null,
};

export const fetchActiveSOS = createAsyncThunk('sos/fetchActive', () => sosApi.getActiveSOS());

/** Captures a fresh location + battery reading and triggers SOS in one
 * step — this is what the Home screen's SOS button calls directly. */
export const triggerSOSThunk = createAsyncThunk('sos/trigger', async () => {
  const [location, batteryLevel] = await Promise.all([getCurrentGeoPoint(), getBatteryLevelPercent()]);
  return sosApi.triggerSOS({ location, batteryLevel, deviceInfo: 'mobile-app' });
});

export const resolveSOSThunk = createAsyncThunk('sos/resolve', (id: string) => sosApi.resolveSOS(id));

export const markFalseAlarmThunk = createAsyncThunk('sos/falseAlarm', (id: string) => sosApi.markFalseAlarm(id));

export const sendImSafeThunk = createAsyncThunk('sos/imSafe', async () => {
  await sosApi.sendImSafe();
});

const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSOS.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchActiveSOS.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.active = action.payload;
      })
      .addCase(fetchActiveSOS.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Could not check for an active SOS';
      })
      .addCase(triggerSOSThunk.pending, (state) => {
        state.status = 'triggering';
        state.error = null;
      })
      .addCase(triggerSOSThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.active = action.payload;
      })
      .addCase(triggerSOSThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Could not send SOS — please try again';
      })
      .addCase(resolveSOSThunk.fulfilled, (state, action) => {
        state.active = action.payload.status === 'active' ? action.payload : null;
      })
      .addCase(markFalseAlarmThunk.fulfilled, (state) => {
        state.active = null;
      })
      .addCase(sendImSafeThunk.fulfilled, (state) => {
        state.active = null;
      });
  },
});

export default sosSlice.reducer;
