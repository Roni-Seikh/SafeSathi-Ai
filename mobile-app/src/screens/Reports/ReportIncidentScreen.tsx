import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { createReport, getReportImageUploadUrl, confirmReportImage } from '../../services/reportApi';
import { getCurrentGeoPoint } from '../../services/location';
import { ReportType } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'ReportIncident'>;

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'unsafe_area', label: 'Unsafe area' },
  { value: 'assault', label: 'Assault' },
  { value: 'suspicious_activity', label: 'Suspicious activity' },
  { value: 'other', label: 'Other' },
];

export function ReportIncidentScreen({ navigation }: Props) {
  const [type, setType] = useState<ReportType>('harassment');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (description.trim().length < 5) {
      setError('Please add a few more details about what happened.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const location = await getCurrentGeoPoint();
      const report = await createReport({ type, description: description.trim(), location, isAnonymous });

      if (imageUri) {
        const { uploadUrl, publicPath } = await getReportImageUploadUrl(report._id, 'image/jpeg');
        const imageBlob = await (await fetch(imageUri)).blob();
        await fetch(uploadUrl, { method: 'PUT', body: imageBlob, headers: { 'Content-Type': 'image/jpeg' } });
        await confirmReportImage(report._id, publicPath);
      }

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the report — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      {error ? <ErrorBanner message={error} /> : null}

      <Text style={styles.sectionLabel}>What happened</Text>
      <View style={styles.typeGrid}>
        {REPORT_TYPES.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setType(option.value)}
            style={[styles.typeChip, type === option.value && styles.typeChipSelected]}
          >
            <Text style={[styles.typeChipText, type === option.value && styles.typeChipTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <TextField
        label="Description"
        placeholder="What happened, and anything that might help others stay safe"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />

      <Pressable onPress={() => void handlePickImage()} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>{imageUri ? 'Photo attached ✓' : '+ Add a photo (optional)'}</Text>
      </Pressable>

      <Text style={styles.locationNote}>Your current location will be attached automatically.</Text>

      <ToggleRow
        label="Report anonymously"
        description="Your name won't be attached to this report."
        value={isAnonymous}
        onValueChange={setIsAnonymous}
      />

      <Button label="Submit Report" onPress={() => void handleSubmit()} loading={submitting} style={styles.submit} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  typeChipTextSelected: {
    color: colors.textOnPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  photoButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    marginBottom: spacing.md,
  },
  photoButtonText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  locationNote: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
