import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export function OTPInput({ length = 6, value, onChange }: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  return (
    <View style={styles.row}>
      {/* A single hidden input drives all boxes — far more reliable on RN
       * than N separate auto-advancing inputs, especially with SMS
       * autofill, which fills the whole code at once. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        style={styles.hiddenInput}
        autoFocus
      />
      {digits.map((digit, index) => (
        <View key={index} style={[styles.box, index === value.length && styles.boxActive]}>
          <View>{digit.trim() ? <BoxDigit digit={digit} /> : null}</View>
        </View>
      ))}
    </View>
  );
}

function BoxDigit({ digit }: { digit: string }) {
  return <TextInput editable={false} value={digit} style={styles.digitText} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 56,
    width: '100%',
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.primary,
  },
  digitText: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    padding: 0,
  },
});
