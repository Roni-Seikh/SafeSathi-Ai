import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../constants/theme';

interface LoadingSkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({ height = 16, width = '100%', radius = radii.sm, style }: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.base, { height, width, borderRadius: radius, opacity }, style]}
    />
  );
}

/** A few skeleton rows stacked, standing in for a card while its data loads. */
export function LoadingSkeletonCard() {
  return (
    <View style={styles.card}>
      <LoadingSkeleton height={20} width="60%" style={styles.gap} />
      <LoadingSkeleton height={14} width="90%" style={styles.gap} />
      <LoadingSkeleton height={14} width="75%" />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glassFillStrong,
  },
  card: {
    padding: 16,
  },
  gap: {
    marginBottom: 10,
  },
});
