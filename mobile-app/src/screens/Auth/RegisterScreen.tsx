import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { PasswordField } from '../../components/PasswordField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { AuthHeader } from '../../components/AuthHeader';
import { FadeInUp } from '../../components/FadeInUp';
import { MathCaptcha } from '../../components/MathCaptcha';
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
  const [captchaValid, setCaptchaValid] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  function validate(): string | null {
    if (name.trim().length < 1) return 'Please enter your name.';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    if (!PHONE_REGEX.test(phone)) return 'Please enter a valid phone number, with country code.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!captchaValid) return 'Please solve the check below to continue.';
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
      setFailedAttempts((n) => n + 1); // forces MathCaptcha to regenerate
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <AuthHeader title="Create your account" subtitle="Set a password to secure your SafeSathi account." />

      {error ? (
        <FadeInUp>
          <ErrorBanner message={error} />
        </FadeInUp>
      ) : null}

      <FadeInUp delay={40}>
        <TextField label="Full name" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
      </FadeInUp>

      <FadeInUp delay={80}>
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </FadeInUp>

      <FadeInUp delay={120}>
        <TextField
          label="Phone number"
          placeholder="+91 XXXXX XXXXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </FadeInUp>

      <FadeInUp delay={160}>
        <PasswordField
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChangeText={setPassword}
          autoComplete="password-new"
        />
      </FadeInUp>

      <FadeInUp delay={200}>
        <PasswordField
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="password-new"
        />
      </FadeInUp>

      <FadeInUp delay={240}>
        <MathCaptcha onValidChange={setCaptchaValid} regenerateOn={failedAttempts} />
      </FadeInUp>

      <FadeInUp delay={280}>
        <Button
          label="Create account"
          onPress={() => void handleRegister()}
          loading={submitting}
          disabled={!captchaValid}
          style={styles.submit}
        />
      </FadeInUp>

      <FadeInUp delay={320}>
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Log in
          </Text>
        </Text>
      </FadeInUp>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  link: {
    color: colors.primary,
  },
});
