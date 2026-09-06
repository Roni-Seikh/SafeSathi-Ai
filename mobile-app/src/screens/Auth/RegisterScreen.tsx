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
import app from '../../services/firebase';
import { FIREBASE_CONFIG } from '../../constants/config';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterScreen({ navigation }: Props) {
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 1) return 'Please enter your name.';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    if (!PHONE_REGEX.test(phone)) return 'Please enter a valid phone number, with country code.';
    return null;
  }

  async function handleSendOtp() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const verificationId = await sendOtp(phone, recaptchaVerifier);
      navigation.navigate('OTPVerify', { phone, flow: 'register', verificationId, name: name.trim(), email: email.trim() });
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
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>We'll text you a code to verify your number.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <TextField label="Full name" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField label="Phone number" placeholder="+91 XXXXX XXXXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Button label="Send OTP" onPress={() => void handleSendOtp()} loading={submitting} style={styles.submit} />

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Log in
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
