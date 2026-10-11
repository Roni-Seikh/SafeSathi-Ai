import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { voiceBus } from '../services/voiceBus';
import { colors } from '../constants/theme';

/** Live mic-level bars driven by the voice engine. Silent flat line = the engine is not hearing anything. */
export function Waveform({ bars = 28, height = 56, active = true }: { bars?: number; height?: number; active?: boolean }) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0));
  useEffect(() => {
    let last = 0;
    const unsub = voiceBus.subscribe((s) => {
      const now = Date.now();
      if (now - last < 90) return;
      last = now;
      setLevels((prev) => [...prev.slice(1), active ? s.level : 0]);
    });
    return unsub;
  }, [active, bars]);

  return (
    <View style={[styles.row, { height }]}>
      {levels.map((l, i) => (
        <View key={i} style={[styles.bar, { height: Math.max(3, l * height), backgroundColor: l > 0.85 ? colors.danger : l > 0.5 ? colors.caution : colors.safe, opacity: 0.35 + 0.65 * (i / bars) }]} />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 5, borderRadius: 3 },
});
