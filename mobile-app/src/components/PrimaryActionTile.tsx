import React, { ReactNode } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, glassCardStyle } from '../constants/theme';
import { AnimatedPressable } from './AnimatedPressable';

interface PrimaryActionTileProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

export function PrimaryActionTile({ label, icon, onPress }: PrimaryActionTileProps) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.tile} accessibilityRole="button" accessibilityLabel={label}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    ...glassCardStyle,
    flexBasis: '48%',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
