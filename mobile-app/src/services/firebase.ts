import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-expect-error — getReactNativePersistence exists at runtime in the
  // firebase JS SDK's React Native build but isn't in the published .d.ts
  // for this version; this is the documented workaround (Firebase RN docs).
  getReactNativePersistence,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '../constants/config';

const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  // initializeAuth throws if it's already been called once (e.g. fast
  // refresh during development) — fall back to the existing instance.
  auth = getAuth(app);
}

export const firebaseAuth = auth;
export const firebaseStorage = getStorage(app);
export default app;
