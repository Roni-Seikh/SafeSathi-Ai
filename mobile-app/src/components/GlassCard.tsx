import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { glassCardStyle, spacing, shadow } from '../constants/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...glassCardStyle,
    ...shadow.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
