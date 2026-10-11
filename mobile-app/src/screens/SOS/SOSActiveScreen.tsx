import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Navigation, Mic, Volume2, Zap, Archive, PhoneCall } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { Button } from '../../components/Button';
import { PulseDot } from '../../components/PulseDot';
import { PinPad } from '../../components/PinPad';
import { StrobeOverlay } from '../../components/StrobeOverlay';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchActiveSOS, markFalseAlarmThunk, sendImSafeThunk } from '../../store/slices/sosSlice';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useEvidenceStatus } from '../../hooks/useEvidenceRecorder';
import { useSiren } from '../../hooks/useSiren';
import { checkPin, hasPin } from '../../services/localSettings';
import { markDuress } from '../../services/sosApi';
import { duress } from '../../services/duress';

type Props = NativeStackScreenProps<AppStackParamList, 'SOSActive'>;
type PendingAction = 'im_safe' | 'false_alarm';

const ICON_SIZE = 96;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function SOSActiveScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.sos.active);
  const evidence = useEvidenceStatus();
  const siren = useSiren();
  const [strobe, setStrobe] = useState(false);
  const [busy, setBusy] = useState<PendingAction | null>(null);
  const [pinFor, setPinFor] = useState<PendingAction | null>(null);

  const entrance = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => { void dispatch(fetchActiveSOS()); }, [dispatch]);
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(Animated.timing(ringPulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
  }, [entrance, ringPulse]);

  // Backend already shared the live link with contacts at trigger time; this streams this device's position.
  const { isTracking, lastSentAt, error: trackingError } = useLocationTracking(!!active);

  async function run(kind: PendingAction) {
    setBusy(kind);
    try {
      if (kind === 'im_safe') await dispatch(sendImSafeThunk()).unwrap();
      else if (active) await dispatch(markFalseAlarmThunk(active._id)).unwrap();
      await siren.stop();
      navigation.replace('Home');
    } finally {
      setBusy(null);
    }
  }

  /** If the user set a PIN, ending an SOS needs it. The DURESS PIN looks identical to success but the SOS stays live. */
  async function request(kind: PendingAction) {
    if (await hasPin()) setPinFor(kind);
    else void run(kind);
  }

  async function onPin(pin: string): Promise<string | void> {
    const result = await checkPin(pin);
    if (result === 'wrong') return 'Wrong PIN';
    const kind = pinFor as PendingAction;
    setPinFor(null);
    if (result === 'ok') { void run(kind); return; }
    // duress: pretend everything is fine
    if (active) await markDuress(active._id).catch(() => undefined);
    duress.set(true);
    await siren.stop();
    setStrobe(false);
    navigation.replace('Home');
  }

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  if (pinFor) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <StatusBar style="light" backgroundColor={colors.danger} />
        <View style={styles.pinCard}>
          <PinPad title="Enter your PIN" subtitle={pinFor === 'im_safe' ? 'to confirm you are safe' : 'to cancel this alert'} onSubmit={onPin} onCancel={() => setPinFor(null)} cancelLabel="Keep SOS active" />
        </View>
      </View>
    );
  }

  const recLabel = evidence.state === 'recording' ? `Recording evidence · ${fmt(evidence.seconds)}` : evidence.state === 'starting' ? 'Starting microphone…' : evidence.state === 'error' ? 'Recording problem' : 'Evidence recorder idle';

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.danger} />
      <StrobeOverlay active={strobe} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: entrance }}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
              <View style={styles.iconBadge}><AlertTriangle size={36} color={colors.textOnDanger} /></View>
            </View>
            <Text style={styles.title}>SOS ACTIVE</Text>
            <Text style={styles.subtitle}>Your emergency contacts have been notified.</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.row}>
              <Navigation size={18} color={colors.textOnDanger} />
              {isTracking ? <PulseDot color={colors.textOnDanger} size={7} /> : null}
              <Text style={styles.panelTitle}>{isTracking ? 'Sharing your live location' : 'Starting location sharing…'}</Text>
            </View>
            <Text style={styles.panelBody}>{lastSentAt ? `Last update ${lastSentAt.toLocaleTimeString()}` : 'Contacts can open your live location from their alert.'}</Text>
            {trackingError ? <Text style={styles.panelError}>{trackingError}</Text> : null}
          </View>

          <View style={styles.panel}>
            <View style={styles.row}>
              <Mic size={18} color={colors.textOnDanger} />
              {evidence.state === 'recording' ? <PulseDot color={colors.textOnDanger} size={7} /> : null}
              <Text style={styles.panelTitle}>{recLabel}</Text>
            </View>
            <Text style={styles.panelBody}>
              {evidence.chunksRecorded} clip{evidence.chunksRecorded === 1 ? '' : 's'} saved · {evidence.pendingUpload === 0 ? 'all uploaded & hash-sealed' : `${evidence.pendingUpload} waiting for signal`}
            </Text>
            {evidence.error ? <Text style={styles.panelError}>{evidence.error}</Text> : null}
            <Pressable onPress={() => navigation.navigate('EvidenceVault', { sosId: active?._id })} style={styles.linkRow}>
              <Archive size={14} color={colors.textOnDanger} /><Text style={styles.linkText}>Open Evidence Vault</Text>
            </Pressable>
          </View>

          <View style={styles.toolRow}>
            <ToolButton active={siren.playing} icon={<Volume2 size={20} color={colors.textOnDanger} />} label={siren.playing ? 'Siren ON' : 'Siren'} onPress={() => void siren.toggle()} />
            <ToolButton active={strobe} icon={<Zap size={20} color={colors.textOnDanger} />} label={strobe ? 'Strobe ON' : 'Strobe'} onPress={() => setStrobe((v) => !v)} />
            <ToolButton icon={<PhoneCall size={20} color={colors.textOnDanger} />} label="Call 112" onPress={() => void Linking.openURL('tel:112')} />
          </View>
          {siren.playing ? <Text style={styles.note}>The siren drowns out audio evidence — switch it off once help is near.</Text> : null}

          <Text style={styles.meta}>{active ? `Started ${new Date(active.triggeredAt).toLocaleTimeString()}` : ''}</Text>
          <View style={styles.actions}>
            <Button label="I'm Safe Now" onPress={() => void request('im_safe')} loading={busy === 'im_safe'} disabled={busy !== null} variant="secondary" style={styles.secondaryAction} />
            <Button label="False Alarm" onPress={() => void request('false_alarm')} loading={busy === 'false_alarm'} disabled={busy !== null || !active} variant="ghost" />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ToolButton({ icon, label, onPress, active }: { icon: React.ReactNode; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.tool, active && styles.toolOn]}>
      {icon}<Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.danger },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  pinCard: { marginHorizontal: spacing.lg, backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing.lg },
  header: { alignItems: 'center' },
  iconWrap: { width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  ring: { position: 'absolute', width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  iconBadge: { width: ICON_SIZE * 0.78, height: ICON_SIZE * 0.78, borderRadius: (ICON_SIZE * 0.78) / 2, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.displayLarge, color: colors.textOnDanger, marginTop: spacing.sm, letterSpacing: 1 },
  subtitle: { ...typography.body, color: colors.textOnDanger, textAlign: 'center', marginTop: spacing.xs, opacity: 0.9 },
  panel: { marginTop: spacing.base, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.08)', padding: spacing.base, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelTitle: { ...typography.h3, color: colors.textOnDanger, flexShrink: 1 },
  panelBody: { ...typography.bodySmall, color: colors.textOnDanger, opacity: 0.85 },
  panelError: { ...typography.caption, color: colors.textOnDanger, opacity: 0.8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  linkText: { ...typography.caption, color: colors.textOnDanger, textDecorationLine: 'underline' },
  toolRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
  tool: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  toolOn: { backgroundColor: 'rgba(0,0,0,0.35)' },
  toolText: { ...typography.caption, color: colors.textOnDanger },
  note: { ...typography.caption, color: colors.textOnDanger, opacity: 0.85, marginTop: spacing.sm, textAlign: 'center' },
  meta: { ...typography.caption, color: colors.textOnDanger, textAlign: 'center', marginVertical: spacing.md, opacity: 0.85 },
  actions: { gap: spacing.md },
  secondaryAction: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' },
});
