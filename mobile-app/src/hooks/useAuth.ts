import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { firebaseAuth } from '../services/firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginWithBackend, setUnauthenticated } from '../store/slices/authSlice';
import { ApiRequestError } from '../services/apiClient';

interface UseAuthResult {
  firebaseUser: FirebaseUser | null;
  isInitializing: boolean;
}

/**
 * Subscribes to Firebase's auth state once, for the lifetime of the app
 * (mounted at the root in App.tsx). When a Firebase session appears, it
 * asks the backend to sync/return the matching SafeSathi profile.
 *
 * A NOT_FOUND response means this Firebase identity has verified an OTP
 * but never finished POST /auth/register — RootNavigator treats that as
 * "still mid-registration" rather than "logged in", by leaving the Redux
 * auth status at its default until OTPVerifyScreen completes registration.
 */
export function useAuth(): UseAuthResult {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        dispatch(setUnauthenticated());
        setIsInitializing(false);
        return;
      }

      // Already synced this session (e.g. just completed registration in
      // OTPVerifyScreen) — avoid an extra round trip.
      if (authStatus === 'authenticated') {
        setIsInitializing(false);
        return;
      }

      try {
        await dispatch(loginWithBackend()).unwrap();
      } catch (error) {
        // NOT_FOUND is expected mid-registration (OTP verified, backend
        // profile not created yet) — anything else, fall back to signed-out.
        if (!(error instanceof ApiRequestError && error.code === 'NOT_FOUND')) {
          dispatch(setUnauthenticated());
        }
      } finally {
        setIsInitializing(false);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { firebaseUser, isInitializing };
}
