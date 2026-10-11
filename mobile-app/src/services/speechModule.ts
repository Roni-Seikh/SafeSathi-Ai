/**
 * Safe loader for the native `expo-speech-recognition` module.
 *
 * Expo Go does not contain this native module, and merely importing the package throws there. Loading it lazily
 * inside try/catch lets the rest of the app run in Expo Go; voice detection then reports "unavailable"
 * until the app is run as a development build (npx expo run:android / eas build --profile development).
 */
type SpeechPkg = typeof import('expo-speech-recognition');

let pkg: SpeechPkg | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  pkg = require('expo-speech-recognition') as SpeechPkg;
} catch {
  pkg = null;
}

/** False in Expo Go (native module missing). */
export const SPEECH_AVAILABLE = pkg !== null;
export const NEEDS_DEV_BUILD_MESSAGE =
  'Voice detection needs a development build — it cannot run inside Expo Go. Build once with "npx expo run:android" (or EAS) and open that app instead.';

// Only touch these when SPEECH_AVAILABLE is true.
export const ExpoSpeechRecognitionModule = (pkg?.ExpoSpeechRecognitionModule ?? null) as unknown as SpeechPkg['ExpoSpeechRecognitionModule'];
export const addSpeechRecognitionListener = (pkg?.addSpeechRecognitionListener ?? (() => ({ remove: () => undefined }))) as SpeechPkg['addSpeechRecognitionListener'];
