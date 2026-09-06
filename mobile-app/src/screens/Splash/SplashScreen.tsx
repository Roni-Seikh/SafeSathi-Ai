import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../constants/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <ShieldMark size={56} />
      </View>
      <Text style={styles.title}>SafeSathi</Text>
      <Text style={styles.tagline}>Proactive Safety, Not Just an SOS Button.</Text>
    </View>
  );
}

function ShieldMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 L20 5.5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5.5 Z"
        stroke={colors.primary}
        strokeWidth={1.5}
        fill={colors.primaryMuted}
      />
      <Circle cx="12" cy="12" r="3" fill={colors.primary} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displayLarge,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
