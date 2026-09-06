import { PhoneAuthProvider, signInWithCredential, UserCredential } from 'firebase/auth';
import type { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseAuth } from './firebase';

/**
 * The firebase JS SDK (used here instead of @react-native-firebase — see
 * docs/architecture/ARCHITECTURE.md §4 for why) has no native reCAPTCHA on
 * React Native, so phone auth needs an invisible reCAPTCHA challenge
 * rendered through a WebView. expo-firebase-recaptcha provides exactly
 * that modal; every screen that starts a phone sign-in renders one and
 * passes its ref in here.
 */
export async function sendOtp(
  phoneNumber: string,
  recaptchaVerifier: React.RefObject<FirebaseRecaptchaVerifierModal>
): Promise<string> {
  if (!recaptchaVerifier.current) {
    throw new Error('reCAPTCHA verifier is not ready yet');
  }
  const provider = new PhoneAuthProvider(firebaseAuth);
  return provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier.current);
}

export async function confirmOtp(verificationId: string, code: string): Promise<UserCredential> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  return signInWithCredential(firebaseAuth, credential);
}
