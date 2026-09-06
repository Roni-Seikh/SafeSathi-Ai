import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContacts } from '../../store/slices/contactsSlice';
import { startSharingThunk, stopSharingThunk } from '../../store/slices/locationSlice';
import { useLocationTracking } from '../../hooks/useLocationTracking';

type Props = NativeStackScreenProps<AppStackParamList, 'ShareLocation'>;

export function ShareLocationScreen(_props: Props) {
  const dispatch = useAppDispatch();
  const { items: contacts } = useAppSelector((state) => state.contacts);
  const { isSharing, sharedWithUserIds } = useAppSelector((state) => state.location);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchContacts());
  }, [dispatch]);

  const { isTracking, lastSentAt } = useLocationTracking(isSharing);

  const linkedContacts = contacts.filter((contact) => !!contact.linkedUserId);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleStart() {
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(startSharingThunk(selectedIds.length ? selectedIds : undefined)).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sharing your location.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStop() {
    setSubmitting(true);
    try {
      await dispatch(stopSharingThunk()).unwrap();
    } finally {
      setSubmitting(false);
    }
  }

  if (linkedContacts.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          title="No contacts can view your location yet"
          message="Live location sharing only works with emergency contacts who also use SafeSathi — add one from Emergency Contacts first, using the same phone number they registered with."
        />
      </ScreenContainer>
    );
  }

  if (isSharing) {
    return (
      <ScreenContainer>
        <GlassCard style={styles.statusCard}>
          <Text style={styles.statusTitle}>You're sharing your location</Text>
          <Text style={styles.statusBody}>
            {sharedWithUserIds.length} contact{sharedWithUserIds.length === 1 ? '' : 's'} can see your live location
            right now.
          </Text>
          <Text style={styles.statusMeta}>
            {isTracking ? 'Tracking active' : 'Starting tracking…'}
            {lastSentAt ? ` · last sent ${lastSentAt.toLocaleTimeString()}` : ''}
          </Text>
        </GlassCard>
        <Button label="Stop Sharing" variant="danger" onPress={() => void handleStop()} loading={submitting} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={styles.sectionLabel}>Share with</Text>
      <FlatList
        data={linkedContacts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item._id);
          return (
            <Pressable onPress={() => toggle(item._id)}>
              <GlassCard style={styles.contactRow}>
                <View>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactMeta}>{item.relationship}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected ? <Check size={14} color={colors.textOnPrimary} /> : null}
                </View>
              </GlassCard>
            </Pressable>
          );
        }}
      />
      <Text style={styles.hint}>Leave everyone unselected to share with all contacts who get SOS alerts.</Text>
      <Button label="Start Sharing" onPress={() => void handleStart()} loading={submitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  contactName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  contactMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  statusCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusMeta: {
    ...typography.caption,
    color: colors.safe,
    marginTop: spacing.sm,
  },
});
