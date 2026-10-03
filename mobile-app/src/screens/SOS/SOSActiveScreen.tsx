import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Navigation } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { Button } from '../../components/Button';
import { PulseDot } from '../../components/PulseDot';
import { colors, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchActiveSOS, markFalseAlarmThunk, sendImSafeThunk } from '../../store/slices/sosSlice';
import { useLocationTracking } from '../../hooks/useLocationTracking';

type Props = NativeStackScreenProps<AppStackParamList, 'SOSActive'>;

export function SOSActiveScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const active = useAppSelector((state) => state.sos.active);
  const [busy, setBusy] = React.useState<'im_safe' | 'false_alarm' | null>(null);

  const entrance = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      dispatch(fetchActiveSOS());
    }
  }, [active, dispatch]);

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(200),
      ])
    ).start();
  }, [entrance, ringPulse]);

  // The backend already auto-started sharing with linked contacts the
  // moment SOS was triggered (see SOSService.trigger); this is the sender
  // side of that — stream this device's position while the alert is live.
  const { isTracking, lastSentAt, error: trackingError } = useLocationTracking(!!active);

  async function handleImSafe() {
    setBusy('im_safe');
    try {
      await dispatch(sendImSafeThunk()).unwrap();
      navigation.replace('Home');
    } finally {
      setBusy(null);
    }
  }

  async function handleFalseAlarm() {
    if (!active) return;
    setBusy('false_alarm');
    try {
      await dispatch(markFalseAlarmThunk(active._id)).unwrap();
      navigation.replace('Home');
    } finally {
      setBusy(null);
    }
  }

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.danger} />

      <Animated.View style={{ opacity: entrance }}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <View style={styles.iconBadge}>
              <AlertTriangle size={36} color={colors.textOnDanger} />
            </View>
          </View>
          <Text style={styles.title}>SOS ACTIVE</Text>
          <Text style={styles.subtitle}>Your emergency contacts have been notified.</Text>
        </View>

        <View style={styles.trackingPanel}>
          <Navigation size={22} color={colors.textOnDanger} />
          <View style={styles.trackingTitleRow}>
            {isTracking ? <PulseDot color={colors.textOnDanger} size={7} /> : null}
            <Text style={styles.trackingTitle}>
              {isTracking ? 'Sharing your live location' : 'Starting location sharing…'}
            </Text>
          </View>
          <Text style={styles.trackingBody}>
            {lastSentAt
              ? `Last update sent ${lastSentAt.toLocaleTimeString()}`
              : 'Your contacts can open your live location from the alert they received.'}
          </Text>
          {trackingError ? <Text style={styles.trackingError}>{trackingError}</Text> : null}
        </View>

        {active ? (
          <Text style={styles.meta}>
            Triggered {new Date(active.triggeredAt).toLocaleTimeString()} · {active.triggerType.replace('_', ' ')}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View style={[styles.actions, { opacity: entrance }]}>
        <Button label="I'm Safe Now" onPress={() => void handleImSafe()} loading={busy === 'im_safe'} disabled={busy !== null} />
        <Button
          label="False Alarm"
          variant="secondary"
          onPress={() => void handleFalseAlarm()}
          loading={busy === 'false_alarm'}
          disabled={busy !== null}
          style={styles.secondaryAction}
        />
      </Animated.View>
    </View>
  );
}

const ICON_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ring: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  iconBadge: {
    width: ICON_SIZE * 0.78,
    height: ICON_SIZE * 0.78,
    borderRadius: (ICON_SIZE * 0.78) / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.displayLarge,
    color: colors.textOnDanger,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  subtitle: {
    ...typography.body,
    color: colors.textOnDanger,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.9,
  },
  trackingPanel: {
    marginVertical: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  trackingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trackingTitle: {
    ...typography.h3,
    color: colors.textOnDanger,
    textAlign: 'center',
  },
  trackingBody: {
    ...typography.bodySmall,
    color: colors.textOnDanger,
    textAlign: 'center',
    opacity: 0.85,
  },
  trackingError: {
    ...typography.caption,
    color: colors.textOnDanger,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.7,
  },
  meta: {
    ...typography.caption,
    color: colors.textOnDanger,
    textAlign: 'center',
    marginBottom: spacing.md,
    opacity: 0.85,
  },
  actions: {
    gap: spacing.md,
  },
  secondaryAction: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
