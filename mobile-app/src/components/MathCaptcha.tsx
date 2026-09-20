import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../constants/theme';

interface MathCaptchaProps {
  /** Called whenever the solved/unsolved state changes, so the parent
   * screen can gate its submit button on it. */
  onValidChange: (valid: boolean) => void;
  /** Change this value (e.g. a failed-submit counter) to force a fresh
   * equation — standard captcha behaviour after a rejected attempt. */
  regenerateOn?: unknown;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generates a small addition/subtraction problem with a non-negative
 * result, e.g. "9 + 4" or "12 - 5" — simple enough to solve at a glance,
 * enough to stop trivial scripted form-fills without needing a paid
 * reCAPTCHA/Firebase App Check setup. */
function generateProblem(): { a: number; b: number; op: '+' | '-'; answer: number } {
  const op: '+' | '-' = Math.random() > 0.5 ? '+' : '-';
  if (op === '+') {
    const a = randomInt(2, 20);
    const b = randomInt(2, 20);
    return { a, b, op, answer: a + b };
  }
  const a = randomInt(10, 25);
  const b = randomInt(2, a); // keep result non-negative
  return { a, b, op, answer: a - b };
}

export function MathCaptcha({ onValidChange, regenerateOn }: MathCaptchaProps) {
  const [problem, setProblem] = useState(generateProblem);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const isCorrect = touched && Number(value) === problem.answer && value.trim().length > 0;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onValidChange(isCorrect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCorrect]);

  const regenerate = useCallback(() => {
    setProblem(generateProblem());
    setValue('');
    setTouched(false);
  }, []);

  // Parent can force a fresh problem (e.g. after a rejected login) by
  // changing `regenerateOn`.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerateOn]);

  function handleChange(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 3);
    setValue(digitsOnly);
    setTouched(true);
    if (digitsOnly.trim().length > 0 && Number(digitsOnly) !== problem.answer) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  const showFeedback = touched && value.trim().length > 0;

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Quick check — you're human, right?</Text>
        <Pressable onPress={regenerate} hitSlop={10} accessibilityLabel="Get a new question">
          <Feather name="refresh-cw" size={15} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
        <View style={styles.equationPill}>
          <Text style={styles.equationText}>
            {problem.a} <Text style={styles.operator}>{problem.op}</Text> {problem.b} =
          </Text>
        </View>

        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="?"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.answerInput,
            showFeedback && (isCorrect ? styles.answerCorrect : styles.answerIncorrect),
          ]}
          accessibilityLabel="Your answer"
        />

        {showFeedback ? (
          <Feather
            name={isCorrect ? 'check-circle' : 'x-circle'}
            size={20}
            color={isCorrect ? colors.safe : colors.danger}
          />
        ) : (
          <View style={{ width: 20 }} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  equationPill: {
    backgroundColor: colors.glassFillStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  equationText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  operator: {
    color: colors.primary,
  },
  answerInput: {
    ...typography.h3,
    color: colors.textPrimary,
    backgroundColor: colors.glassFillStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.sm,
    height: 44,
    width: 64,
    textAlign: 'center',
  },
  answerCorrect: {
    borderColor: colors.safe,
  },
  answerIncorrect: {
    borderColor: colors.danger,
  },
});
