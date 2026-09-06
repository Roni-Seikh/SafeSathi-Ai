import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as authApi from '../../services/authApi';
import * as userApi from '../../services/userApi';
import { User } from '../../types/api.types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

/** Called once Firebase confirms a signed-in user — completes registration
 * with the backend (idempotent, see AuthService.register on the backend). */
export const registerWithBackend = createAsyncThunk(
  'auth/registerWithBackend',
  async (payload: authApi.RegisterPayload) => {
    const { user } = await authApi.registerUser(payload);
    return user;
  }
);

/** Called for a returning user — syncs the backend profile for an
 * already-registered Firebase identity. */
export const loginWithBackend = createAsyncThunk('auth/loginWithBackend', async () => {
  const { user } = await authApi.loginUser();
  return user;
});

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (payload: userApi.UpdateProfilePayload) => userApi.updateProfile(payload)
);

export const updateMedicalInfoThunk = createAsyncThunk(
  'auth/updateMedicalInfo',
  async (payload: Partial<User['medicalInfo']>) => userApi.updateMedicalInfo(payload)
);

export const updateSafetyPreferencesThunk = createAsyncThunk(
  'auth/updateSafetyPreferences',
  async (payload: Partial<User['safetyPreferences']>) => userApi.updateSafetyPreferences(payload)
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUnauthenticated(state) {
      state.user = null;
      state.status = 'unauthenticated';
      state.error = null;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerWithBackend.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerWithBackend.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(registerWithBackend.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Registration failed';
      })
      .addCase(loginWithBackend.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginWithBackend.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(loginWithBackend.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Sign-in failed';
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateMedicalInfoThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateSafetyPreferencesThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setUnauthenticated, setUser } = authSlice.actions;
export default authSlice.reducer;
