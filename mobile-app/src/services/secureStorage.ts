import * as SecureStore from 'expo-secure-store';

/** Reserved for genuinely sensitive values. Non-sensitive flags (like
 * "has the user seen onboarding") belong in AsyncStorage instead — see
 * ONBOARDING_SEEN_KEY usage in OnboardingScreen. Currently unused directly
 * since Firebase Auth persistence handles the session token itself (see
 * services/firebase.ts), but kept as the designated place for anything
 * that needs it later (e.g. a cached admin JWT, if the mobile app ever
 * needs one). */
export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
