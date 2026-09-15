import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
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

  async function handleLogin() {
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Please enter your password.');
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in with your email and password.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

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
        label="Password"
        placeholder="********"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      <Button label="Log in" onPress={() => void handleLogin()} loading={submitting} style={styles.submit} />

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
