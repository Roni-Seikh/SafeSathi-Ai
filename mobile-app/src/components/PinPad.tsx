import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Vibration } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

interface PinPadProps {
  title: string;
  subtitle?: string;
  length?: number;
  /** Return a string to show as an error and clear the dots. */
  onSubmit: (pin: string) => Promise<string | void> | string | void;
  onCancel?: () => void;
  cancelLabel?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ title, subtitle, length = 4, onSubmit, onCancel, cancelLabel = 'Back' }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const press = async (k: string) => {
    if (k === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (!k) return;
    const next = (pin + k).slice(0, length);
    setPin(next);
    setError(null);
    if (next.length === length) {
      const res = await onSubmit(next);
      if (typeof res === 'string') { setError(res); Vibration.vibrate(200); }
      setPin('');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </View>
      <Text style={styles.error}>{error ?? ' '}</Text>
      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <Pressable key={i} onPress={() => void press(k)} disabled={!k} style={({ pressed }) => [styles.key, !k && styles.keyEmpty, pressed && styles.keyPressed]} accessibilityLabel={k === '⌫' ? 'Delete' : k || undefined}>
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
      {onCancel ? (
        <Pressable onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>{cancelLabel}</Text></Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 280 },
  dots: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.lg },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.glassBorder },
  dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { ...typography.bodySmall, color: colors.danger, marginTop: spacing.sm, height: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'space-between', marginTop: spacing.base },
  key: { width: 80, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassFill, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyPressed: { backgroundColor: colors.glassFillStrong },
  keyText: { ...typography.h1, color: colors.textPrimary },
  cancel: { marginTop: spacing.base, padding: spacing.md },
  cancelText: { ...typography.bodyMedium, color: colors.textSecondary },
});
