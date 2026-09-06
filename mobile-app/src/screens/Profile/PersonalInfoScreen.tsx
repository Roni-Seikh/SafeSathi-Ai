import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfileThunk } from '../../store/slices/authSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'PersonalInfo'>;

export function PersonalInfoScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.address?.city ?? '');
  const [state, setStateField] = useState(user?.address?.state ?? '');
  const [pincode, setPincode] = useState(user?.address?.pincode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (name.trim().length < 1) {
      setError('Name cannot be empty.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await dispatch(
        updateProfileThunk({
          name: name.trim(),
          address: { city: city.trim(), state: state.trim(), pincode: pincode.trim() },
        })
      ).unwrap();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer scroll>
      {error ? <ErrorBanner message={error} /> : null}

      <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />

      <Text style={styles.sectionLabel}>Address</Text>
      <TextField label="City" value={city} onChangeText={setCity} />
      <TextField label="State" value={state} onChangeText={setStateField} />
      <TextField label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" />

      <TextField label="Email" value={user?.email ?? ''} editable={false} />
      <TextField label="Phone" value={user?.phone ?? ''} editable={false} />

      <Button label="Save changes" onPress={() => void handleSave()} loading={saving} style={styles.save} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  save: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
