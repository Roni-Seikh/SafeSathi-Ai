import React, { useRef, ReactNode } from 'react';
import { Pressable, Animated, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
  scaleTo?: number;
}

/** A tactile press-scale wrapper — everything in the app that's tappable
 * should compress slightly on press, the way a physical button would.
 * Kept deliberately subtle (scaleTo defaults to 0.97) so it reads as
 * responsiveness, not a bounce animation competing for attention.
 *
 * `style` is applied to the outer Pressable (not an inner wrapper), so
 * layout-relevant styles — flexBasis, width, margin — work exactly as
 * they would on a plain Pressable when this sits inside a flexWrap grid.
 * Only the scale transform lives on the inner Animated.View. */
export function AnimatedPressable({
  children,
  onPress,
  style,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  scaleTo = 0.97,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[style, disabled ? { opacity: 0.5 } : null]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
