import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateMedicalInfoThunk } from '../../store/slices/authSlice';
import { BloodGroup } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'MedicalInfo'>;

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function MedicalInfoScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [bloodGroup, setBloodGroup] = useState<BloodGroup | undefined>(user?.medicalInfo.bloodGroup);
  const [allergies, setAllergies] = useState(user?.medicalInfo.allergies.join(', ') ?? '');
  const [conditions, setConditions] = useState(user?.medicalInfo.conditions.join(', ') ?? '');
  const [medications, setMedications] = useState(user?.medicalInfo.medications.join(', ') ?? '');
  const [organDonor, setOrganDonor] = useState(user?.medicalInfo.organDonor ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toList(text: string): string[] {
    return text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await dispatch(
        updateMedicalInfoThunk({
          bloodGroup,
          allergies: toList(allergies),
          conditions: toList(conditions),
          medications: toList(medications),
          organDonor,
        })
      ).unwrap();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your medical information.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer scroll>
      {error ? <ErrorBanner message={error} /> : null}

      <Text style={styles.sectionLabel}>Blood group</Text>
      <View style={styles.chipRow}>
        {BLOOD_GROUPS.map((group) => (
          <Pressable
            key={group}
            onPress={() => setBloodGroup(group)}
            style={[styles.chip, bloodGroup === group && styles.chipSelected]}
          >
            <Text style={[styles.chipText, bloodGroup === group && styles.chipTextSelected]}>{group}</Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label="Allergies (comma separated)"
        value={allergies}
        onChangeText={setAllergies}
        placeholder="e.g. Penicillin, Peanuts"
      />
      <TextField
        label="Existing conditions (comma separated)"
        value={conditions}
        onChangeText={setConditions}
        placeholder="e.g. Asthma"
      />
      <TextField
        label="Current medications (comma separated)"
        value={medications}
        onChangeText={setMedications}
        placeholder="e.g. Inhaler"
      />

      <ToggleRow label="Organ donor" value={organDonor} onValueChange={setOrganDonor} />

      <Button label="Save changes" onPress={() => void handleSave()} loading={saving} style={styles.save} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.textOnPrimary,
  },
  save: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
