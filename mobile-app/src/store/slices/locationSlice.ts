import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as locationApi from '../../services/locationApi';
import { LocationUpdatePayload } from '../../services/socket';

interface LiveView {
  sharerUserId: string;
  coordinates: [number, number];
  accuracy?: number;
  batteryLevel?: number;
  recordedAt: string;
  isStale: boolean; // true once a "sharing-stopped" event has arrived
}

interface LocationState {
  isSharing: boolean;
  sharedWithUserIds: string[];
  liveView: LiveView | null;
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
}

const initialState: LocationState = {
  isSharing: false,
  sharedWithUserIds: [],
  liveView: null,
  status: 'idle',
  error: null,
};

export const startSharingThunk = createAsyncThunk('location/startSharing', (contactIds?: string[]) =>
  locationApi.startSharing(contactIds)
);

export const stopSharingThunk = createAsyncThunk('location/stopSharing', async () => {
  await locationApi.stopSharing();
});

export const fetchLiveLocationThunk = createAsyncThunk('location/fetchLive', (sharerUserId: string) =>
  locationApi.getLiveLocation(sharerUserId)
);

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    liveLocationUpdated(state, action: PayloadAction<LocationUpdatePayload>) {
      state.liveView = { ...action.payload, isStale: false };
    },
    liveSharingStopped(state) {
      if (state.liveView) state.liveView.isStale = true;
    },
    clearLiveView(state) {
      state.liveView = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startSharingThunk.fulfilled, (state, action) => {
        state.isSharing = true;
        state.sharedWithUserIds = action.payload.sharedWithUserIds;
      })
      .addCase(stopSharingThunk.fulfilled, (state) => {
        state.isSharing = false;
        state.sharedWithUserIds = [];
      })
      .addCase(fetchLiveLocationThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLiveLocationThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.liveView = {
          sharerUserId: action.payload.userId,
          coordinates: action.payload.coordinates.coordinates,
          batteryLevel: action.payload.batteryLevel,
          recordedAt: action.payload.recordedAt,
          isStale: false,
        };
      })
      .addCase(fetchLiveLocationThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'This person is not currently sharing their location with you.';
      });
  },
});

export const { liveLocationUpdated, liveSharingStopped, clearLiveView } = locationSlice.actions;
export default locationSlice.reducer;
