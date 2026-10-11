import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, RefreshControl, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import {
  Users, Settings as SettingsIcon, ShieldCheck, Navigation, Mic, Activity, FileWarning, Bell, Map as MapIcon,
  MapPin, PhoneCall, Volume2, Lock, Route, Archive, Sparkles, ChevronRight, Radio,
} from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { GlassCard } from '../../components/GlassCard';
import { SOSHoldButton } from '../../components/SOSHoldButton';
import { SafeScoreGauge } from '../../components/SafeScoreGauge';
import { QuickTile } from '../../components/QuickTile';
import { FadeInUp } from '../../components/FadeInUp';
import { PulseDot } from '../../components/PulseDot';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Waveform } from '../../components/Waveform';
import { StrobeOverlay } from '../../components/StrobeOverlay';
import { useSiren } from '../../hooks/useSiren';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchActiveSOS, triggerSOSThunk } from '../../store/slices/sosSlice';
import { updateSafetyPreferencesThunk } from '../../store/slices/authSlice';
import { getLiveSafeScore, LiveSafeScore } from '../../services/safetyApi';
import { getBatteryLevelPercent } from '../../services/location';
import { voiceBus, VoiceSnapshot } from '../../services/voiceBus';
import { duress } from '../../services/duress';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const greetingFor = (h: number) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night');

export function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const prefs = user?.safetyPreferences;
  const sosStatus = useAppSelector((s) => s.sos.status);
  const sosError = useAppSelector((s) => s.sos.error);
  const motionStatus = useAppSelector((s) => s.detection.motion);
  const voiceStatus = useAppSelector((s) => s.detection.voice);

  const [score, setScore] = useState<LiveSafeScore | null>(null);
  const [scoreErr, setScoreErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingGuardian, setToggling] = useState(false);
  const [voice, setVoice] = useState<VoiceSnapshot>(voiceBus.get());
  const siren = useSiren();

  useEffect(() => voiceBus.subscribe(setVoice), []);

  useEffect(() => {
    // If the user force-closed the app mid-SOS, land them back on the active-SOS screen.
    dispatch(fetchActiveSOS()).unwrap().then((active) => { if (active && !duress.get()) navigation.replace('SOSActive'); }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadScore = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setScoreErr(true); return; }
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const battery = await getBatteryLevelPercent();
      setScore(await getLiveSafeScore(pos.coords.latitude, pos.coords.longitude, battery));
      setScoreErr(false);
    } catch { setScoreErr(true); }
  }, []);

  useFocusEffect(useCallback(() => { void loadScore(); }, [loadScore]));

  async function handleTrigger() {
    const result = await dispatch(triggerSOSThunk());
    if (triggerSOSThunk.fulfilled.match(result)) navigation.replace('SOSActive');
  }

  const guardianOn = !!prefs?.autoSOSEnabled && (!!prefs?.voiceDetectionEnabled || !!prefs?.motionDetectionEnabled);

  async function toggleGuardian(next: boolean) {
    setToggling(true);
    await dispatch(updateSafetyPreferencesThunk(
      next
        ? { autoSOSEnabled: true, voiceDetectionEnabled: true, motionDetectionEnabled: true, silentEvidenceEnabled: true }
        : { autoSOSEnabled: false }
    ));
    setToggling(false);
    if (next) navigation.navigate('VoiceTest');
  }

  const engineLabel = voice.engine === 'listening' ? 'Listening for "help" / "bachao"' : voice.engine === 'starting' || voice.engine === 'restarting' ? 'Starting voice engine…' : voice.engine === 'error' || voice.engine === 'unavailable' ? 'Voice engine needs attention' : 'Voice Guardian is off';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StrobeOverlay active={siren.playing} />
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await loadScore(); setRefreshing(false); }} />}
      >
        <FadeInUp>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingSmall}>{greetingFor(new Date().getHours())}</Text>
              <Text style={styles.greeting}>{user ? user.name.split(' ')[0] : 'there'} <Text style={{ color: colors.safe }}>●</Text></Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Profile')} style={styles.avatar} accessibilityLabel="Profile">
              <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
            </Pressable>
          </View>
        </FadeInUp>

        {/* ---- Live SafeScore ---- */}
        <FadeInUp delay={50}>
          <GlassCard style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              {score ? <SafeScoreGauge score={score.score} size={104} /> : <View style={styles.scorePlaceholder}><Text style={styles.scorePlaceholderText}>{scoreErr ? '—' : '…'}</Text></View>}
              <View style={{ flex: 1, marginLeft: spacing.base }}>
                <Text style={styles.cardKicker}>LIVE SAFESCORE · HERE & NOW</Text>
                <Text style={styles.scoreHeadline}>{score ? (score.level === 'safe' ? 'You are in a safe zone' : score.level === 'caution' ? 'Stay alert around you' : 'Higher-risk area') : scoreErr ? 'Score unavailable' : 'Reading your surroundings…'}</Text>
                <Text style={styles.scoreAdvice} numberOfLines={3}>{score ? score.advice[0] : scoreErr ? 'Allow location and check your connection, then pull down to refresh.' : ' '}</Text>
              </View>
            </View>
          </GlassCard>
        </FadeInUp>

        {/* ---- Guardian Mode hero ---- */}
        <FadeInUp delay={100}>
          <LinearGradient colors={guardianOn ? ['rgba(51,214,176,0.22)', 'rgba(108,123,255,0.14)'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.guardian}>
            <View style={styles.guardianTop}>
              <View style={[styles.guardianIcon, guardianOn && { backgroundColor: colors.safeMuted, borderColor: colors.safe }]}>
                <ShieldCheck size={22} color={guardianOn ? colors.safe : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guardianTitle}>Guardian Mode</Text>
                <Text style={styles.guardianSub}>{guardianOn ? 'Voice, motion & evidence recording armed' : 'One switch arms voice, motion and evidence'}</Text>
              </View>
              <Switch value={guardianOn} disabled={togglingGuardian} onValueChange={(v) => void toggleGuardian(v)} trackColor={{ true: colors.safe, false: colors.glassBorder }} thumbColor="#fff" />
            </View>

            {guardianOn ? (
              <View style={{ marginTop: spacing.base }}>
                <Waveform active={voice.engine === 'listening'} />
                <View style={styles.statusRow}>
                  <StatusChip active={voiceStatus.isListening} label={voiceStatus.isListening ? 'Listening' : 'Voice idle'} icon={<Mic size={12} color={voiceStatus.isListening ? colors.safe : colors.textTertiary} />} />
                  <StatusChip active={motionStatus.isMonitoring} label={motionStatus.isMonitoring ? 'Motion on' : 'Motion off'} icon={<Activity size={12} color={motionStatus.isMonitoring ? colors.safe : colors.textTertiary} />} />
                  <StatusChip active={!!prefs?.silentEvidenceEnabled} label="Evidence" icon={<Archive size={12} color={prefs?.silentEvidenceEnabled ? colors.safe : colors.textTertiary} />} />
                </View>
                <Text style={[styles.engineLine, (voice.engine === 'error' || voice.engine === 'unavailable') && { color: colors.danger }]}>{voice.error ?? engineLabel}</Text>
                <View style={styles.guardianActions}>
                  <MiniButton icon={<Radio size={14} color={colors.textPrimary} />} label="Test voice" onPress={() => navigation.navigate('VoiceTest')} />
                </View>
              </View>
            ) : (
              <Text style={styles.guardianHint}>Tip: after switching on, say "bachao" in the test screen to confirm it hears you.</Text>
            )}
          </LinearGradient>
        </FadeInUp>

        <FadeInUp delay={150}>
          <View style={styles.sosSection}>
            <SOSHoldButton onTrigger={() => void handleTrigger()} disabled={sosStatus === 'triggering'} />
            {sosError ? <Text style={styles.sosError}>{sosError}</Text> : null}
          </View>
        </FadeInUp>

        {/* ---- Sathi AI banner ---- */}
        <FadeInUp delay={200}>
          <AnimatedPressable onPress={() => navigation.navigate('SathiChat')} style={{ marginBottom: spacing.lg }}>
            <LinearGradient colors={['rgba(108,123,255,0.30)', 'rgba(51,214,176,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBanner}>
              <View style={styles.aiIcon}><Sparkles size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>Ask Sathi AI</Text>
                <Text style={styles.aiSub}>Your rights, how to file an FIR, self-defence, "I'm being followed"…</Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </LinearGradient>
          </AnimatedPressable>
        </FadeInUp>

        <FadeInUp delay={240}>
          <Text style={styles.sectionLabel}>Get home safe</Text>
          <View style={styles.grid}>
            <QuickTile icon={<Route size={20} color={colors.safe} />} tint={colors.safe} label="Guardian Journey" caption="Auto-alert if you don't arrive" onPress={() => navigation.navigate('GuardianJourney')} />
            <QuickTile icon={<MapPin size={20} color={colors.caution} />} tint={colors.caution} label="Safe Haven" caption="Nearest open police / hospital" onPress={() => navigation.navigate('SafeHaven')} />
            <QuickTile icon={<MapIcon size={20} color={colors.primary} />} label="Safe Route" caption="Safer path, not just shortest" onPress={() => navigation.navigate('SafeRoute')} />
            <QuickTile icon={<Navigation size={20} color={colors.primary} />} label="Share Location" caption="Let a contact watch you" onPress={() => navigation.navigate('ShareLocation')} />
          </View>
        </FadeInUp>

        <FadeInUp delay={280}>
          <Text style={styles.sectionLabel}>In the moment</Text>
          <View style={styles.grid}>
            <QuickTile icon={<PhoneCall size={20} color={colors.primary} />} label="Fake Call" caption="Realistic voice call to exit" onPress={() => navigation.navigate('FakeCall')} />
            <QuickTile icon={<Volume2 size={20} color={colors.danger} />} tint={colors.danger} label={siren.playing ? 'Stop siren' : 'Siren + strobe'} caption={siren.playing ? 'Tap to silence' : 'Loud alarm to deter & attract help'} onPress={() => void siren.toggle()} />
            <QuickTile icon={<Archive size={20} color={colors.primary} />} label="Evidence Vault" caption="Tamper-proof recordings" onPress={() => navigation.navigate('EvidenceVault')} />
            <QuickTile icon={<Lock size={20} color={colors.primary} />} label="Secret PINs" caption="Duress PIN & safe word" onPress={() => navigation.navigate('SecurityPins')} />
          </View>
        </FadeInUp>

        <FadeInUp delay={320}>
          <Text style={styles.sectionLabel}>Community & you</Text>
          <View style={styles.grid}>
            <QuickTile icon={<Users size={20} color={colors.primary} />} label="Contacts" caption="Who gets alerted" onPress={() => navigation.navigate('Contacts')} />
            <QuickTile icon={<Bell size={20} color={colors.primary} />} label="Community Alerts" onPress={() => navigation.navigate('CommunityAlerts')} />
            <QuickTile icon={<FileWarning size={20} color={colors.primary} />} label="Report Incident" caption="Build the risk map" onPress={() => navigation.navigate('ReportIncident')} />
            <QuickTile icon={<SettingsIcon size={20} color={colors.primary} />} label="Settings" onPress={() => navigation.navigate('Settings')} />
          </View>
        </FadeInUp>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusChip({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <View style={[styles.chip, active && styles.chipOn]}>
      {active ? <PulseDot size={6} /> : icon}
      <Text style={[styles.chipText, active && { color: colors.safe }]}>{label}</Text>
    </View>
  );
}

function MiniButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.mini}>{icon}<Text style={styles.miniText}>{label}</Text></Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  greetingSmall: { ...typography.bodySmall, color: colors.textSecondary },
  greeting: { ...typography.h1, color: colors.textPrimary },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h3, color: colors.primary },
  scoreCard: { marginBottom: spacing.base },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scorePlaceholder: { width: 104, height: 104, borderRadius: 52, borderWidth: 10, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  scorePlaceholderText: { ...typography.h1, color: colors.textTertiary },
  cardKicker: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1 },
  scoreHeadline: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  scoreAdvice: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
  guardian: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.base, marginBottom: spacing.lg },
  guardianTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guardianIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  guardianTitle: { ...typography.h3, color: colors.textPrimary },
  guardianSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  guardianHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  chipOn: { borderColor: colors.safe, backgroundColor: colors.safeMuted },
  chipText: { ...typography.caption, color: colors.textTertiary },
  engineLine: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  guardianActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.glassFillStrong },
  miniText: { ...typography.caption, color: colors.textPrimary },
  sosSection: { alignItems: 'center', marginBottom: spacing.lg },
  sosError: { ...typography.bodySmall, color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.base },
  aiIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { ...typography.h3, color: colors.textPrimary },
  aiSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionLabel: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.md, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});

