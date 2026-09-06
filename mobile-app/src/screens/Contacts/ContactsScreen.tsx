import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Star, ChevronRight } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeletonCard } from '../../components/LoadingSkeleton';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContacts } from '../../store/slices/contactsSlice';
import { MAX_EMERGENCY_CONTACTS } from '../../constants/config';
import { EmergencyContact } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'Contacts'>;

export function ContactsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.contacts);

  useEffect(() => {
    dispatch(fetchContacts());
  }, [dispatch]);

  const atLimit = items.length >= MAX_EMERGENCY_CONTACTS;

  return (
    <ScreenContainer>
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {items.length} / {MAX_EMERGENCY_CONTACTS} contacts
        </Text>
      </View>

      {status === 'loading' && items.length === 0 ? (
        <GlassCard>
          <LoadingSkeletonCard />
        </GlassCard>
      ) : items.length === 0 ? (
        <EmptyState
          title="No emergency contacts yet"
          message="Add the people you trust most — they'll be notified the moment you trigger SOS."
          actionLabel="Add contact"
          onAction={() => navigation.navigate('AddEditContact')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ContactRow contact={item} onPress={() => navigation.navigate('AddEditContact', { contactId: item._id })} />}
        />
      )}

      {items.length > 0 ? (
        <Button
          label={atLimit ? 'Contact limit reached' : 'Add contact'}
          onPress={() => navigation.navigate('AddEditContact')}
          disabled={atLimit}
          style={styles.addButton}
        />
      ) : null}
    </ScreenContainer>
  );
}

function ContactRow({ contact, onPress }: { contact: EmergencyContact; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.rowPressed]}>
      <GlassCard style={styles.contactCard}>
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{contact.name}</Text>
            {contact.isPrimary ? <Star size={14} color={colors.caution} fill={colors.caution} /> : null}
          </View>
          <Text style={styles.contactMeta}>
            {contact.relationship} · {contact.phone}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  countRow: {
    paddingVertical: spacing.md,
  },
  countText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  rowPressed: {
    opacity: 0.85,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  contactMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
});
