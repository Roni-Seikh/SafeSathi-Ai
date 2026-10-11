import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, TextInput, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import { Phone, PhoneOff, User } from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { Button } from '../../components/Button';
import { useAppSelector } from '../../store/hooks';
import { updateLocalSettings } from '../../services/localSettings';
import { useLocalSettings } from '../../hooks/useLocalSettings';

type Props = NativeStackScreenProps<AppStackParamList, 'FakeCall'>;
type Phase = 'setup' | 'waiting' | 'ringing' | 'incall';

const SCRIPTS: Record<'en' | 'hi', { lang: string; lines: string[] }> = {
  en: { lang: 'en-IN', lines: [
    'Hello? Where are you? I have been waiting for you.',
    'Okay, I am standing right outside the gate. Are you close?',
    'Good. Stay on the line with me, I will walk towards you.',
    'Yes, I can see the road. Just two more minutes, okay?',
    'Perfect, I can see you now. Do not hang up until you reach me.'] },
  hi: { lang: 'hi-IN', lines: [
    'हैलो? तुम कहाँ हो? मैं कब से तुम्हारा इंतज़ार कर रही हूँ।',
    'ठीक है, मैं गेट के बाहर ही खड़ी हूँ। तुम पास में हो ना?',
    'अच्छा, फ़ोन मत काटना। मैं तुम्हारी तरफ़ आ रही हूँ।',
    'हाँ, मुझे सड़क दिख रही है। बस दो मिनट और।',
    'बढ़िया, अब मुझे तुम दिख रही हो। मुझसे मिलने तक फ़ोन चालू रखना।'] },
};
const DELAYS = [{ s: 0, l: 'Now' }, { s: 10, l: '10 s' }, { s: 30, l: '30 s' }, { s: 60, l: '1 min' }];

export function FakeCallScreen({ navigation }: Props) {
  const local = useLocalSettings();
  const language = useAppSelector((s) => s.auth.user?.preferredLanguage ?? 'en');
  const [phase, setPhase] = useState<Phase>('setup');
  const [name, setName] = useState('');
  const [delay, setDelay] = useState(10);
  const [secs, setSecs] = useState(0);
  const alive = useRef(true);
  const script = SCRIPTS[language === 'hi' ? 'hi' : 'en'];

  useEffect(() => { setName(local.fakeCallerName); }, [local.fakeCallerName]);
  useEffect(() => () => { alive.current = false; Vibration.cancel(); Speech.stop(); }, []);

  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const t = setTimeout(() => setPhase('ringing'), delay * 1000);
    return () => clearTimeout(t);
  }, [phase, delay]);

  useEffect(() => {
    if (phase !== 'ringing') return undefined;
    Vibration.vibrate([0, 900, 700], true);
    return () => Vibration.cancel();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'incall') return undefined;
    const clock = setInterval(() => setSecs((s) => s + 1), 1000);
    let i = 0;
    const speakNext = () => {
      if (!alive.current || i >= script.lines.length) return;
      Speech.speak(script.lines[i++], { language: script.lang, rate: 0.95, onDone: () => { setTimeout(speakNext, 3500 + Math.random() * 1500); }, onError: () => undefined });
    };
    const first = setTimeout(speakNext, 800);
    return () => { clearInterval(clock); clearTimeout(first); Speech.stop(); };
  }, [phase, script]);

  const end = () => { Vibration.cancel(); Speech.stop(); navigation.goBack(); };
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  if (phase === 'setup') {
    return (
      <View style={styles.setup}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.h1}>Fake Call</Text>
        <Text style={styles.sub}>A convincing incoming call — with a voice that talks to you — so you can politely leave an uncomfortable situation.</Text>
        <Text style={styles.label}>Who is calling?</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Mom" placeholderTextColor={colors.textTertiary} style={styles.input} />
        <Text style={styles.label}>Ring in</Text>
        <View style={styles.pills}>
          {DELAYS.map((d) => (<Pressable key={d.s} onPress={() => setDelay(d.s)} style={[styles.pill, delay === d.s && styles.pillOn]}><Text style={[styles.pillText, delay === d.s && { color: colors.textOnPrimary }]}>{d.l}</Text></Pressable>))}
        </View>
        <Button label="Start" onPress={() => { void updateLocalSettings({ fakeCallerName: name.trim() || 'Mom' }); setPhase(delay === 0 ? 'ringing' : 'waiting'); }} style={{ marginTop: spacing.xl }} />
        <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }
  if (phase === 'waiting') {
    return (
      <Pressable style={styles.black} onLongPress={end} delayLongPress={1200}>
        <Text style={styles.waitText}>Call arrives in {delay}s</Text>
        <Text style={styles.waitSub}>You can lock the screen. Press and hold to cancel.</Text>
      </Pressable>
    );
  }

  const caller = local.fakeCallerName || name || 'Mom';
  return (
    <View style={styles.call}>
      <StatusBar barStyle="light-content" />
      <View style={styles.top}>
        <Text style={styles.state}>{phase === 'ringing' ? 'Incoming call' : mmss}</Text>
        <View style={styles.avatar}><User size={52} color="#cfd6e4" /></View>
        <Text style={styles.callerName}>{caller}</Text>
        <Text style={styles.state}>mobile</Text>
      </View>
      {phase === 'ringing' ? (
        <View style={styles.row}>
          <Pressable onPress={end} style={[styles.round, { backgroundColor: '#E5484D' }]}><PhoneOff size={30} color="#fff" /></Pressable>
          <Pressable onPress={() => { Vibration.cancel(); setSecs(0); setPhase('incall'); }} style={[styles.round, { backgroundColor: '#30A46C' }]}><Phone size={30} color="#fff" /></Pressable>
        </View>
      ) : (
        <View style={styles.row}><Pressable onPress={end} style={[styles.round, { backgroundColor: '#E5484D' }]}><PhoneOff size={30} color="#fff" /></Pressable></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: spacing.xxl },
  h1: { ...typography.displayLarge, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  label: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { ...typography.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.glassFill },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.bodyMedium, color: colors.textPrimary },
  black: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  waitText: { ...typography.h2, color: '#444' },
  waitSub: { ...typography.caption, color: '#333', marginTop: spacing.sm },
  call: { flex: 1, backgroundColor: '#10141c', justifyContent: 'space-between', paddingVertical: 90 },
  top: { alignItems: 'center', gap: spacing.sm },
  state: { fontSize: 16, color: '#9aa4b5' },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1d2430', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.base },
  callerName: { fontSize: 34, fontWeight: '600', color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-evenly' },
  round: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
