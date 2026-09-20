import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  useWindowDimensions,
  ViewToken,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { colors, spacing, typography, radii } from '../../constants/theme';
import { Button } from '../../components/Button';
import { ONBOARDING_SEEN_KEY } from '../../constants/config';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type FeatherIconName = keyof typeof Feather.glyphMap;

interface Slide {
  icon: FeatherIconName;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'radio',
    title: "Danger doesn't wait for a button press",
    body: 'SafeSathi listens for a spoken keyword, a scream, or a struggle in the background — and acts before you have to reach for your phone.',
  },
  {
    icon: 'navigation',
    title: 'Evidence and location, sent automatically',
    body: 'The moment something looks wrong, your live location and recorded evidence start reaching your emergency contacts.',
  },
  {
    icon: 'users',
    title: 'Up to 5 people, always in the loop',
    body: 'Add the people you trust most. They can watch your live location the moment an SOS starts.',
  },
  {
    icon: 'map',
    title: 'See risk before you walk into it',
    body: 'Every report from the community builds a live safety map — so you can choose a safer route before trouble finds you.',
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

/** Floating icon badge — same visual language as AuthHeader (glass circle
 * + soft primary glow) so onboarding and the auth screens that follow it
 * feel like one continuous, designed entrance rather than separate parts
 * of the app. Floats gently rather than pulsing, so four in a row (one per
 * slide) doesn't feel repetitive. */
function SlideIllustration({ icon }: { icon: FeatherIconName }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.glow}>
        <LinearGradient
          colors={[colors.primaryMuted, 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <Animated.View style={[styles.illustration, { transform: [{ translateY }] }]}>
        <Feather name={icon} size={56} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

export function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
  }).current;

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.navigate('Register');
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      void finishOnboarding();
    }
  }

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item: Slide) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }: { item: Slide }) => (
          <View style={[styles.slide, { width }]}>
            <SlideIllustration icon={item.icon} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={slide.title}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button label="Skip" variant="ghost" onPress={() => void finishOnboarding()} />
          <Button
            label={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            onPress={next}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
}

const ILLUSTRATION_SIZE = 220;
const BADGE_SIZE = 128;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    alignItems: 'center',
  },
  illustrationWrap: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    borderRadius: ILLUSTRATION_SIZE / 2,
  },
  illustration: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radii.xl,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextButton: {
    minWidth: 160,
  },
});
