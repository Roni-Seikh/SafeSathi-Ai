import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, EyeOff } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { PinPad } from '../../components/PinPad';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../constants/theme';
import { clearPins, hasPin, setPins } from '../../services/localSettings';

type Step = 'overview' | 'pin' | 'pin2' | 'duress' | 'duress2';

export function SecurityPinsScreen() {
  const [step, setStep] = useState<Step>('overview');
  const [has, setHas] = useState(false);
  const [pin, setPin] = useState('');
  const [duress, setDuress] = useState('');

  useEffect(() => { void hasPin().then(setHas); }, [step]);

  const reset = () => { setPin(''); setDuress(''); setStep('overview'); };

  if (step === 'pin') return <ScreenContainer><PinPad title="Choose your PIN" subtitle="4 digits. You'll enter it to cancel an SOS." onSubmit={(p) => { setPin(p); setStep('pin2'); }} onCancel={reset} /></ScreenContainer>;
  if (step === 'pin2') return <ScreenContainer><PinPad title="Confirm your PIN" onSubmit={(p) => { if (p !== pin) { setStep('pin'); return 'PINs did not match — start again'; } setStep('duress'); }} onCancel={reset} /></ScreenContainer>;
  if (step === 'duress') return <ScreenContainer><PinPad title="Choose your DURESS PIN" subtitle="A different 4 digits. Entering it makes the app look cancelled while help keeps coming." onSubmit={(p) => { if (p === pin) return 'Must be different from your PIN'; setDuress(p); setStep('duress2'); }} onCancel={reset} /></ScreenContainer>;
  if (step === 'duress2') return <ScreenContainer><PinPad title="Confirm duress PIN" onSubmit={async (p) => { if (p !== duress) { setStep('duress'); return 'PINs did not match — start again'; } await setPins(pin, duress); reset(); }} onCancel={reset} /></ScreenContainer>;

  return (
    <ScreenContainer scroll>
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View style={styles.row}><ShieldCheck size={20} color={colors.safe} /><Text style={styles.h}>PIN to cancel an SOS</Text></View>
        <Text style={styles.p}>Without a PIN anyone holding your phone can end an SOS with one tap. With a PIN, only you can.</Text>
      </GlassCard>
      <GlassCard style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}><EyeOff size={20} color={colors.danger} /><Text style={styles.h}>Duress PIN</Text></View>
        <Text style={styles.p}>If someone forces you to cancel, type your <Text style={styles.b}>duress PIN</Text> instead. The screen shows a normal “cancelled / you're safe” result — but the SOS stays active, your location keeps updating, audio evidence keeps recording, and the admin team sees the event flagged as DURESS.</Text>
        <Text style={[styles.p, { marginTop: spacing.sm }]}>It also works when ending a Guardian Journey and on the “I'm safe” countdown.</Text>
      </GlassCard>
      <Text style={styles.status}>{has ? '✓ PINs are set on this phone' : 'No PIN set — cancelling needs no code'}</Text>
      <Button label={has ? 'Change PINs' : 'Set up PINs'} onPress={() => setStep('pin')} />
      {has ? <Button label="Remove PINs" variant="ghost" onPress={async () => { await clearPins(); setHas(false); }} style={{ marginTop: spacing.sm }} /> : null}
      <Text style={styles.note}>PINs are stored only on this device, in the system keystore. If you forget them you can still reinstall the app — but we cannot recover them for you.</Text>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  h: { ...typography.h3, color: colors.textPrimary },
  p: { ...typography.bodySmall, color: colors.textSecondary },
  b: { color: colors.textPrimary, fontWeight: '700' },
  status: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  note: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.lg },
});
