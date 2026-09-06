import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TOKEN_STORAGE_KEY, ADMIN_STORAGE_KEY } from '@/constants';
import type { AdminSession } from '@/types';

interface AuthState {
  token: string | null;
  admin: AdminSession | null;
}

function loadStoredAdmin(): AdminSession | null {
  const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  admin: loadStoredAdmin(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ token: string; admin: AdminSession }>) {
      state.token = action.payload.token;
      state.admin = action.payload.admin;
      localStorage.setItem(TOKEN_STORAGE_KEY, action.payload.token);
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(action.payload.admin));
    },
    clearSession(state) {
      state.token = null;
      state.admin = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
