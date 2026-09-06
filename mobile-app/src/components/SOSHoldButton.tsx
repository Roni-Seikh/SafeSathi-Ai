import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, shadow, typography } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 176;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HOLD_DURATION_MS = 1100;

interface SOSHoldButtonProps {
  onTrigger: () => void;
  disabled?: boolean;
}

/**
 * Hold-to-confirm rather than a single tap — the delay itself is the
 * confirmation, so there's no separate "are you sure?" dialog standing
 * between a real emergency and actually sending the alert. Releasing
 * early cancels cleanly; this is the one place in the app that gets a
 * glow (see theme.ts shadow.flare) — everything else stays quiet so this
 * reads as the genuine emergency control it is.
 */
export function SOSHoldButton({ onTrigger, disabled }: SOSHoldButtonProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

  function handlePressIn() {
    if (disabled) return;
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onTrigger();
    });
  }

  function handlePressOut() {
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.button, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Hold to send SOS"
      >
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.dangerMuted}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.dangerBright}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            fill="none"
            rotation={-90}
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        </Svg>
        <Text style={styles.label}>SOS</Text>
        <Text style={styles.hint}>{holding ? 'Keep holding…' : 'Hold to send'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.flare,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.displayLarge,
    color: colors.textOnDanger,
  },
  hint: {
    ...typography.caption,
    color: colors.textOnDanger,
    marginTop: 4,
  },
});
