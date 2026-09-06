import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { ToggleRow } from '../../components/ToggleRow';
import { ErrorBanner } from '../../components/ErrorBanner';
import { spacing } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateSafetyPreferencesThunk } from '../../store/slices/authSlice';
import { SafetyPreferences } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'SafetyPreferences'>;

const PREFERENCE_ROWS: Array<{
  key: keyof Pick<
    SafetyPreferences,
    'voiceDetectionEnabled' | 'motionDetectionEnabled' | 'toneDetectionEnabled' | 'autoSOSEnabled' | 'silentEvidenceEnabled'
  >;
  label: string;
  description: string;
}> = [
  {
    key: 'voiceDetectionEnabled',
    label: 'Voice Detection',
    description: 'Listen for keywords like "Help", "Bachao" in the background.',
  },
  {
    key: 'toneDetectionEnabled',
    label: 'Tone Detection',
    description: 'Detect screaming or fear in your voice, even without a keyword.',
  },
  {
    key: 'motionDetectionEnabled',
    label: 'Motion Detection',
    description: 'Detect phone snatching, violent movement, or a sudden fall.',
  },
  {
    key: 'autoSOSEnabled',
    label: 'Auto-SOS',
    description: 'Automatically trigger SOS when a danger signal is confirmed.',
  },
  {
    key: 'silentEvidenceEnabled',
    label: 'Silent Evidence Capture',
    description: 'Record audio/photo evidence in the background during an SOS.',
  },
];

export function SafetyPreferencesScreen(_props: Props) {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.auth.user?.safetyPreferences);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(key: keyof SafetyPreferences, value: boolean) {
    setError(null);
    setSavingKey(key);
    try {
      await dispatch(updateSafetyPreferencesThunk({ [key]: value })).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this preference.');
    } finally {
      setSavingKey(null);
    }
  }

  if (!preferences) return null;

  return (
    <ScreenContainer scroll>
      {error ? <ErrorBanner message={error} /> : null}

      <GlassCard style={styles.card}>
        {PREFERENCE_ROWS.map((row, index) => (
          <View key={row.key}>
            <ToggleRow
              label={row.label}
              description={row.description}
              value={preferences[row.key]}
              onValueChange={(value) => void handleToggle(row.key, value)}
              disabled={savingKey === row.key}
            />
            {index < PREFERENCE_ROWS.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
