import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { registerWithEmail, getAuthErrorMessage } from '../../services/emailAuth';
import { useAppDispatch } from '../../store/hooks';
import { registerWithBackend } from '../../store/slices/authSlice';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

export function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 1) return 'Please enter your name.';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    if (!PHONE_REGEX.test(phone)) return 'Please enter a valid phone number, with country code.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Creates the Firebase identity, then completes registration with
      // the backend — apiClient attaches the resulting ID token to every
      // request automatically (see services/apiClient.ts). Phone here is
      // stored as contact info for emergency alerts, not OTP-verified —
      // isPhoneVerified reflects that (see backend AuthService.register).
      await registerWithEmail(email.trim(), password);
      await dispatch(
        registerWithBackend({ name: name.trim(), email: email.trim(), phone: phone.trim() })
      ).unwrap();
      // RootNavigator switches to AppNavigator automatically once Redux
      // auth.status becomes 'authenticated' — no explicit navigation here.
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Set a password to secure your SafeSathi account.</Text>
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
        autoComplete="email"
      />
      <TextField
        label="Phone number"
        placeholder="+91 XXXXX XXXXX"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextField
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password-new"
      />
      <TextField
        label="Confirm password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="password-new"
      />

      <Button label="Create account" onPress={() => void handleRegister()} loading={submitting} style={styles.submit} />

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
