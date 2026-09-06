import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

type RiskLevel = 'green' | 'yellow' | 'red';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
}

const LEVEL_CONFIG: Record<RiskLevel, { color: string; fill: string; defaultLabel: string }> = {
  green: { color: colors.safe, fill: colors.safeMuted, defaultLabel: 'Safe' },
  yellow: { color: colors.caution, fill: colors.cautionMuted, defaultLabel: 'Caution' },
  red: { color: colors.danger, fill: colors.dangerMuted, defaultLabel: 'High risk' },
};

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const config = LEVEL_CONFIG[level];
  return (
    <View style={[styles.badge, { backgroundColor: config.fill, borderColor: config.color }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{label ?? config.defaultLabel}</Text>
    </View>
  );
}

/** Maps a SafeScore (0-100, higher = safer) onto the same green/yellow/red
 * bands the backend's HeatmapService uses for riskScore (0-100, higher =
 * riskier) — inverted, since the two numbers point opposite directions. */
export function riskLevelFromSafeScore(safeScore: number): RiskLevel {
  if (safeScore >= 70) return 'green';
  if (safeScore >= 40) return 'yellow';
  return 'red';
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.caption,
  },
});
