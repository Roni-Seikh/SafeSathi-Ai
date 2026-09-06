import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import contactsReducer from './slices/contactsSlice';
import sosReducer from './slices/sosSlice';
import locationReducer from './slices/locationSlice';
import detectionReducer from './slices/detectionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    sos: sosReducer,
    location: locationReducer,
    detection: detectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
