import React, { ReactNode } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography, glassCardStyle } from '../constants/theme';

interface PrimaryActionTileProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

export function PrimaryActionTile({ label, icon, onPress }: PrimaryActionTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {icon}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
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
  pressed: {
    backgroundColor: colors.glassFillStrong,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
