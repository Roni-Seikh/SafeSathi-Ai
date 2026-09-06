import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { AuthStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { sendOtp } from '../../services/phoneAuth';
import { FIREBASE_CONFIG } from '../../constants/config';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export function LoginScreen({ navigation }: Props) {
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [phone, setPhone] = useState('+91');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendOtp() {
    if (!PHONE_REGEX.test(phone)) {
      setError('Please enter a valid phone number, with country code.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const verificationId = await sendOtp(phone, recaptchaVerifier);
      navigation.navigate('OTPVerify', { phone, flow: 'login', verificationId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={FIREBASE_CONFIG} attemptInvisibleVerification />

      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in with the phone number on your account.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <TextField label="Phone number" placeholder="+91 XXXXX XXXXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Button label="Send OTP" onPress={() => void handleSendOtp()} loading={submitting} style={styles.submit} />

      <Text style={styles.footerText}>
        New here?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
          Create an account
        </Text>
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
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
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  link: {
    color: colors.primary,
  },
});
