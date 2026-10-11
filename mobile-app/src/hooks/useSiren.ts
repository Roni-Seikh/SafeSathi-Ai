import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

/** Deterrent siren (looped wail, bundled asset — works offline). Loudest on Android; on iPhone the audio
 * session shared with evidence recording may route it quietly. */
export function useSiren() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    setPlaying(false);
    if (s) { await s.stopAsync().catch(() => undefined); await s.unloadAsync().catch(() => undefined); }
  }, []);

  const start = useCallback(async () => {
    if (soundRef.current) return;
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: false, staysActiveInBackground: true, allowsRecordingIOS: true });
    const { sound } = await Audio.Sound.createAsync(require('../assets/siren.wav'), { isLooping: true, volume: 1.0, shouldPlay: true });
    soundRef.current = sound;
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => (soundRef.current ? stop() : start()), [start, stop]);
  useEffect(() => () => { void stop(); }, [stop]);
  return { playing, toggle, stop };
}
