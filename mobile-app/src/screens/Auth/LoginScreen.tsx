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
import { loginWithEmail, getAuthErrorMessage } from '../../services/emailAuth';
import { useAppDispatch } from '../../store/hooks';
import { loginWithBackend } from '../../store/slices/authSlice';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  async function handleLogin() {
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Please enter your password.');
      return;
    }
    if (!captchaValid) {
      setError('Please solve the check above to continue.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Signs in with Firebase, then syncs the matching SafeSathi profile
      // from the backend — apiClient attaches the resulting ID token to
      // every request automatically (see services/apiClient.ts).
      await loginWithEmail(email.trim(), password);
      await dispatch(loginWithBackend()).unwrap();
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
      <AuthHeader title="Welcome back" subtitle="Log in with your email and password." />

      {error ? (
        <FadeInUp>
          <ErrorBanner message={error} />
        </FadeInUp>
      ) : null}

      <FadeInUp delay={60}>
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
        <PasswordField
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
        />
      </FadeInUp>

      <FadeInUp delay={180}>
        <MathCaptcha onValidChange={setCaptchaValid} regenerateOn={failedAttempts} />
      </FadeInUp>

      <FadeInUp delay={240}>
        <Button
          label="Log in"
          onPress={() => void handleLogin()}
          loading={submitting}
          disabled={!captchaValid}
          style={styles.submit}
        />
      </FadeInUp>

      <FadeInUp delay={280}>
        <Text style={styles.footerText}>
          New here?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Create an account
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
