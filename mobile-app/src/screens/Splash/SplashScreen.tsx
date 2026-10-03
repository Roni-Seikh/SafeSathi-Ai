import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing, typography, radii } from '../../constants/theme';

export function SplashScreen() {
  const entrance = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [entrance, breathe]);

  const badgeScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const textTranslateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badge, { opacity: entrance, transform: [{ scale: Animated.multiply(badgeScale, breatheScale) }] }]}>
        <ShieldMark size={56} />
      </Animated.View>
      <Animated.View style={{ opacity: entrance, transform: [{ translateY: textTranslateY }] }}>
        <Text style={styles.title}>SafeSathi</Text>
        <Text style={styles.tagline}>Proactive Safety, Not Just an SOS Button.</Text>
      </Animated.View>
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
    borderRadius: radii.xl,
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
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
