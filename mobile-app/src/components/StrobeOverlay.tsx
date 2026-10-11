import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

/** Full-screen flashing white/red strobe — a visual deterrent and a beacon for bystanders. */
export function StrobeOverlay({ active }: { active: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { v.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 110, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 110, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  if (!active) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.92] }), zIndex: 50 }]} />;
}
