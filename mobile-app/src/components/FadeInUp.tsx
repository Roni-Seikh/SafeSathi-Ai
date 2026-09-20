import React, { useEffect, useRef, ReactNode } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

interface FadeInUpProps {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle;
}

/** Staggered entrance for a list of form fields — pass an increasing
 * `delay` per field (e.g. index * 60) so a form animates in as a cascade
 * rather than everything popping in at once. Pure React Native Animated,
 * no extra dependency (reanimated/moti aren't installed). */
export function FadeInUp({ children, delay = 0, style }: FadeInUpProps) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return <Animated.View style={[{ opacity: value, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
