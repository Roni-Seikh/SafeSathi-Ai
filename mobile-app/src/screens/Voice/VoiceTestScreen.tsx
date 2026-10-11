import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Pressable, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ExpoSpeechRecognitionModule, SPEECH_AVAILABLE, NEEDS_DEV_BUILD_MESSAGE } from '../../services/speechModule';
import { CheckCircle2, XCircle, CircleDashed, Moon } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Waveform } from '../../components/Waveform';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVoiceTest } from '../../store/slices/detectionSlice';
import { updateSafetyPreferencesThunk } from '../../store/slices/authSlice';
import { voiceBus, VoiceSnapshot } from '../../services/voiceBus';
import { updateLocalSettings } from '../../services/localSettings';
import { useLocalSettings } from '../../hooks/useLocalSettings';
import { LOCALE_FOR_LANGUAGE, LOCALE_LABEL, VoiceLocale } from '../../constants/voice';

type Check = 'ok' | 'bad' | 'wait';

export function VoiceTestScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const prefs = user?.safetyPreferences;
  const local = useLocalSettings();
  const [snap, setSnap] = useState<VoiceSnapshot>(voiceBus.get());
  const [permOk, setPermOk] = useState<boolean | null>(null);
  const [pocket, setPocket] = useState(false);
  const [safeWord, setSafeWord] = useState('');

  useEffect(() => { dispatch(setVoiceTest(true)); return () => { dispatch(setVoiceTest(false)); }; }, [dispatch]);
  useEffect(() => voiceBus.subscribe(setSnap), []);
  useEffect(() => { setSafeWord(local.customSafeWord); }, [local.customSafeWord]);
  useEffect(() => {
    if (!SPEECH_AVAILABLE) { setPermOk(false); return; }
    void ExpoSpeechRecognitionModule.getPermissionsAsync().then((p) => setPermOk(p.granted)).catch(() => setPermOk(false));
  }, [snap.engine]);

  useEffect(() => {
    if (!pocket) return undefined;
    void activateKeepAwakeAsync('pocket');
    return () => { deactivateKeepAwake('pocket'); };
  }, [pocket]);

  const armed = !!prefs?.autoSOSEnabled && (!!prefs?.voiceDetectionEnabled || !!prefs?.toneDetectionEnabled);
  const activeLocale: VoiceLocale = local.voiceLocale ?? LOCALE_FOR_LANGUAGE[user?.preferredLanguage ?? 'en'];

  const checks: { label: string; state: Check; fix?: string }[] = [
    { label: 'Microphone & speech permission', state: permOk === null ? 'wait' : permOk ? 'ok' : 'bad', fix: 'Phone Settings → Apps → SafeSathi → Permissions → allow Microphone.' },
    { label: 'Voice engine running', state: snap.engine === 'listening' ? 'ok' : snap.engine === 'error' || snap.engine === 'unavailable' ? 'bad' : 'wait', fix: snap.error ?? undefined },
    { label: 'Guardian Mode armed (Auto-SOS + Voice)', state: armed ? 'ok' : 'bad', fix: 'Tap "Arm Guardian Mode" below — voice only triggers SOS when this is on.' },
  ];

  const m = snap.lastMatch;
  const heardRecently = m && Date.now() - m.at < 15000;

  if (pocket) {
    return (
      <Pressable style={styles.pocket} onLongPress={() => setPocket(false)} delayLongPress={900}>
        <Moon size={28} color="#555" />
        <Text style={styles.pocketText}>Guardian is listening</Text>
        <Text style={styles.pocketSub}>Screen stays on so the microphone keeps working.{'\n'}Slip the phone in a pocket or bag.{'\n'}Press and hold anywhere to exit.</Text>
      </Pressable>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.lead}>Say <Text style={styles.em}>“bachao”</Text>, <Text style={styles.em}>“help me”</Text> or <Text style={styles.em}>“save me”</Text>. Nothing is sent from this screen — it only shows what the phone hears.</Text>

      {!SPEECH_AVAILABLE ? (
        <GlassCard style={{ ...styles.card, borderColor: colors.caution }}>
          <Text style={styles.verdict}>Development build needed</Text>
          <Text style={styles.verdictSub}>{NEEDS_DEV_BUILD_MESSAGE}</Text>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.card}>
        <Text style={styles.kicker}>MICROPHONE LEVEL · {LOCALE_LABEL[snap.locale as VoiceLocale] ?? snap.locale}{snap.onDevice ? ' · offline' : ''}</Text>
        <Waveform height={64} active={snap.engine === 'listening'} />
        <Text style={styles.heardLabel}>What I hear</Text>
        <Text style={styles.transcript}>{snap.transcript || (snap.engine === 'listening' ? 'Listening… speak now' : '—')}</Text>
      </GlassCard>

      <GlassCard style={{ ...styles.card, ...(heardRecently ? { borderColor: colors.safe, backgroundColor: colors.safeMuted } : {}) }}>
        {heardRecently && m ? (
          <>
            <Text style={[styles.verdict, { color: colors.safe }]}>✓ Detected “{m.matched}”</Text>
            <Text style={styles.verdictSub}>
              {m.strength === 'strong' ? (local.instantOnStrongPhrase ? 'Strong phrase → would send an SOS immediately.' : 'Strong phrase → would start the 8-second countdown.') : 'Weak word → would start the 8-second cancel countdown (a lone "help" is also normal speech).'}
            </Text>
          </>
        ) : (
          <Text style={styles.verdictSub}>No trigger phrase heard yet.</Text>
        )}
      </GlassCard>

      <Text style={styles.section}>Checklist</Text>
      {checks.map((c) => (
        <View key={c.label} style={styles.checkRow}>
          {c.state === 'ok' ? <CheckCircle2 size={20} color={colors.safe} /> : c.state === 'bad' ? <XCircle size={20} color={colors.danger} /> : <CircleDashed size={20} color={colors.textTertiary} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.checkLabel}>{c.label}</Text>
            {c.state === 'bad' && c.fix ? <Text style={styles.checkFix}>{c.fix}</Text> : null}
          </View>
        </View>
      ))}
      {!armed ? (
        <Button label="Arm Guardian Mode" onPress={() => void dispatch(updateSafetyPreferencesThunk({ autoSOSEnabled: true, voiceDetectionEnabled: true, motionDetectionEnabled: true, silentEvidenceEnabled: true }))} style={{ marginTop: spacing.md }} />
      ) : null}

      <Text style={styles.section}>Language I should listen for</Text>
      <View style={styles.pills}>
        {(['en-IN', 'hi-IN', 'bn-IN'] as VoiceLocale[]).map((l) => (
          <Pressable key={l} onPress={() => void updateLocalSettings({ voiceLocale: l })} style={[styles.pill, activeLocale === l && styles.pillOn]}>
            <Text style={[styles.pillText, activeLocale === l && { color: colors.textOnPrimary }]}>{LOCALE_LABEL[l]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>The recogniser listens in one language at a time. Hindi/Bengali phrases like “bachao” are also caught in English mode, but picking your own language is the most reliable.</Text>

      <Text style={styles.section}>Options</Text>
      <Row label="Send SOS instantly on strong phrases" sub="Off = always show the 8-second cancel countdown first" value={local.instantOnStrongPhrase} onChange={(v) => void updateLocalSettings({ instantOnStrongPhrase: v })} />
      <Row label="Panic-shake (3 hard shakes)" sub="Starts the countdown — no speech needed" value={local.panicShake} onChange={(v) => void updateLocalSettings({ panicShake: v })} />
      <Row label="Treat a sustained loud sound as a scream" sub="Experimental · needs Tone detection on in Safety Preferences" value={local.screamByVolume} onChange={(v) => void updateLocalSettings({ screamByVolume: v })} />

      <Text style={styles.section}>Your secret safe-word</Text>
      <TextInput value={safeWord} onChangeText={setSafeWord} onEndEditing={() => void updateLocalSettings({ customSafeWord: safeWord.trim() })} placeholder="e.g. “pineapple” — an ordinary word only you know" placeholderTextColor={colors.textTertiary} style={styles.input} autoCapitalize="none" />
      <Text style={styles.hint}>Saying it anywhere in a sentence counts as a strong phrase — useful when shouting “help” would make an attacker react.</Text>

      <Text style={styles.section}>Keep it listening all day</Text>
      <Text style={styles.hint}>{Platform.OS === 'android' ? 'Android only lets an app use the microphone while it is on screen. ' : 'iOS only lets an app use the microphone while it is on screen. '}Use Pocket Mode: the screen stays on but black, the phone can sit in a pocket or bag, and Guardian keeps listening.</Text>
      <Button label="Start Pocket Mode" variant="secondary" onPress={() => setPocket(true)} style={{ marginTop: spacing.sm }} />
      <View style={{ height: spacing.xxl }} />
    </ScreenContainer>
  );
}

function Row({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.optRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.checkLabel}>{label}</Text>
        <Text style={styles.checkFix}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.safe, false: colors.glassBorder }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.base },
  em: { color: colors.textPrimary, fontWeight: '700' },
  card: { marginBottom: spacing.base },
  kicker: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1, marginBottom: spacing.sm },
  heardLabel: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },
  transcript: { ...typography.h3, color: colors.textPrimary, marginTop: 2, minHeight: 28 },
  verdict: { ...typography.h2 },
  verdictSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  section: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.sm },
  checkLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  checkFix: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.bodyMedium, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  input: { ...typography.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.glassFill },
  pocket: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  pocketText: { ...typography.h2, color: '#555', marginTop: spacing.md },
  pocketSub: { ...typography.caption, color: '#444', textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
