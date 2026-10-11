import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from './AnimatedPressable';
import { colors, radii, spacing, typography } from '../constants/theme';

interface QuickTileProps {
  icon: React.ReactNode;
  label: string;
  caption?: string;
  tint?: string;
  onPress: () => void;
}

/** Feature tile for Home's grid: soft tinted gradient, icon chip, label. */
export function QuickTile({ icon, label, caption, tint = colors.primary, onPress }: QuickTileProps) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.outer}>
      <LinearGradient colors={[`${tint}2E`, 'rgba(255,255,255,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <View style={[styles.iconChip, { backgroundColor: `${tint}26`, borderColor: `${tint}55` }]}>{icon}</View>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {caption ? <Text style={styles.caption} numberOfLines={2}>{caption}</Text> : null}
      </LinearGradient>
    </AnimatedPressable>
  );
}
const styles = StyleSheet.create({
  outer: { width: '48%', marginBottom: spacing.md },
  tile: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.base, minHeight: 112 },
  iconChip: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: spacing.sm },
  label: { ...typography.h3, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
