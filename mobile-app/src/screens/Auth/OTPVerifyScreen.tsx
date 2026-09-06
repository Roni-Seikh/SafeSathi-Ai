import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { OTPInput } from '../../components/OTPInput';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { confirmOtp } from '../../services/phoneAuth';
import { useAppDispatch } from '../../store/hooks';
import { registerWithBackend, loginWithBackend } from '../../store/slices/authSlice';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

export function OTPVerifyScreen({ route }: Props) {
  const { phone, flow, verificationId, name, email } = route.params;
  const dispatch = useAppDispatch();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Confirms the code with Firebase, which signs the user in — from
      // here on requests carry a real Firebase ID token.
      await confirmOtp(verificationId, code);

      if (flow === 'register' && name && email) {
        await dispatch(registerWithBackend({ name, email, phone })).unwrap();
      } else {
        await dispatch(loginWithBackend()).unwrap();
      }
      // RootNavigator switches to AppNavigator automatically once Redux
      // auth.status becomes 'authenticated' — no explicit navigation here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code didn\'t work — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <OTPInput value={code} onChange={setCode} />

      <Button label="Verify" onPress={() => void handleVerify()} loading={submitting} style={styles.submit} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  submit: {
    marginTop: spacing.xl,
  },
});
