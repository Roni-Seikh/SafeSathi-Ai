import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

/**
 * Email/password auth — chosen over Firebase Phone Auth because phone
 * sign-in requires the Blaze (pay-as-you-go) billing plan as of September
 * 2024 (Firebase no longer allows any SMS, even free-tier, on Spark).
 * Email/password sign-in has no such requirement and is free at any scale.
 * See docs/architecture/ARCHITECTURE.md §4 for the historical phone-auth
 * approach this replaced.
 */
export async function registerWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists with this email — try logging in instead.',
  'auth/invalid-email': 'That email address doesn\u2019t look right.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with this email — check for typos or create an account.',
  'auth/wrong-password': 'Incorrect password — please try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

/** Firebase throws errors shaped like { code: 'auth/xyz', message: '...' }.
 * Backend/Redux errors (from createAsyncThunk's .unwrap()) are plain
 * serialized objects — NOT real Error instances — so `instanceof Error`
 * misses them. Check for a usable .message on anything, not just real
 * Error objects, or backend failures silently fall back to a useless
 * generic message. */
export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && FRIENDLY_MESSAGES[code]) return FRIENDLY_MESSAGES[code];

  const message = (err as { message?: unknown })?.message;
  if (typeof message === 'string' && message.trim().length > 0) return message;

  return 'Something went wrong. Please try again.';
}
