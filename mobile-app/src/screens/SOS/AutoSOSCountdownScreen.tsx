import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Vibration, Linking, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle } from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { Button } from '../../components/Button';
import { PinPad } from '../../components/PinPad';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { fireDetectedSOS } from '../../services/autoSOS';
import { checkPin, hasPin } from '../../services/localSettings';
import { duress } from '../../services/duress';

type Props = NativeStackScreenProps<AppStackParamList, 'AutoSOSCountdown'>;

const REASON: Record<string, string> = {
  voice_keyword: 'We heard a call for help',
  tone: 'We heard a loud, distressed sound',
  shake: 'Panic-shake detected',
};

/**
 * "Are you safe?" — every auto-detected alarm (a lone "help", a loud sound, a panic-shake) gets this
 * cancellable countdown, so a false trigger doesn't alert your family. If nobody cancels, the SOS is sent.
 * With a PIN set, cancelling needs it; the duress PIN looks like a cancel but sends the SOS silently.
 */
export function AutoSOSCountdownScreen({ route, navigation }: Props) {
  const p = route.params;
  const [left, setLeft] = useState(p.seconds);
  const [error, setError] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [sending, setSending] = useState(false);
  const sentRef = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const send = useCallback(async (opts: { duress?: boolean; silent?: boolean } = {}) => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSending(true);
    try {
      await fireDetectedSOS({ source: p.source, keyword: p.keyword, transcript: p.transcript, confidence: p.confidence, language: p.language, screamScore: p.screamScore }, opts);
      if (opts.silent) navigation.replace('Home');
    } catch (e) {
      sentRef.current = false;
      setSending(false);
      setError('Could not reach the server. Call 112 now, or try again.');
    }
  }, [p, navigation]);

  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    if (p.seconds === 0) void send();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (p.seconds === 0 || needPin || sentRef.current) return undefined;
    if (left <= 0) { void send(); return undefined; }
    Vibration.vibrate(left <= 3 ? [0, 400] : 150);
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, needPin, p.seconds, send]);

  async function cancel() {
    if (await hasPin()) setNeedPin(true);
    else navigation.goBack();
  }

  async function onPin(pin: string): Promise<string | void> {
    const r = await checkPin(pin);
    if (r === 'wrong') return 'Wrong PIN';
    if (r === 'ok') { navigation.goBack(); return; }
    duress.set(true);
    setNeedPin(false);
    await send({ duress: true, silent: true }); // looks cancelled, SOS goes out
  }

  if (needPin) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <StatusBar style="light" />
        <View style={styles.pinCard}>
          <PinPad title="Enter PIN to cancel" onSubmit={onPin} onCancel={() => setNeedPin(false)} cancelLabel="Back" />
        </View>
      </View>
    );
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.danger} />
      <View style={styles.center}>
        <Text style={styles.reason}>{REASON[p.source] ?? 'Possible emergency'}</Text>
        {p.transcript ? <Text style={styles.heard}>“{p.transcript}”</Text> : null}
        <View style={styles.bubbleWrap}>
          <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />
          <View style={styles.bubble}>
            {sending ? <AlertTriangle size={64} color="#fff" /> : <Text style={styles.count}>{left}</Text>}
          </View>
        </View>
        <Text style={styles.title}>{sending ? 'Sending SOS…' : 'Sending SOS in…'}</Text>
        <Text style={styles.sub}>Are you safe? Tap below to cancel. Otherwise your contacts will be alerted with your location.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Button label="I'M SAFE — CANCEL" onPress={() => void cancel()} variant="secondary" disabled={sending} style={styles.cancelBtn} />
        <Button label="SEND SOS NOW" onPress={() => void send()} variant="ghost" disabled={sending} />
        {error ? <Button label="Call 112" onPress={() => void Linking.openURL('tel:112')} variant="ghost" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinCard: { backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing.lg },
  reason: { ...typography.h3, color: '#fff', opacity: 0.95, textAlign: 'center' },
  heard: { ...typography.bodySmall, color: '#fff', opacity: 0.8, marginTop: spacing.xs, textAlign: 'center' },
  bubbleWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl },
  ring: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.5)' },
  bubble: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  count: { fontSize: 76, fontWeight: '800', color: '#fff' },
  title: { ...typography.h1, color: '#fff' },
  sub: { ...typography.body, color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 },
  error: { ...typography.bodySmall, color: '#fff', marginTop: spacing.md, textAlign: 'center', fontWeight: '700' },
  actions: { gap: spacing.md },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)' },
});
