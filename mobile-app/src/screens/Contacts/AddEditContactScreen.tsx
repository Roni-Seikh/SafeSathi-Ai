import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createContact, editContact, removeContact } from '../../store/slices/contactsSlice';
import { MAX_EMERGENCY_CONTACTS } from '../../constants/config';

type Props = NativeStackScreenProps<AppStackParamList, 'AddEditContact'>;

export function AddEditContactScreen({ route, navigation }: Props) {
  const contactId = route.params?.contactId;
  const dispatch = useAppDispatch();
  const existing = useAppSelector((state) => state.contacts.items.find((c) => c._id === contactId));
  const contactCount = useAppSelector((state) => state.contacts.items.length);

  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '+91');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [isPrimary, setIsPrimary] = useState(existing?.isPrimary ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 1) return 'Please enter a name.';
    if (relationship.trim().length < 1) return 'Please enter a relationship (e.g. Mother, Friend).';
    if (!/^\+?[0-9]{8,15}$/.test(phone)) return 'Please enter a valid phone number.';
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        relationship: relationship.trim(),
        phone,
        email: email.trim() || undefined,
        isPrimary,
        priority: existing?.priority ?? Math.min(contactCount + 1, MAX_EMERGENCY_CONTACTS),
      };
      if (existing) {
        await dispatch(editContact({ id: existing._id, payload })).unwrap();
      } else {
        await dispatch(createContact(payload)).unwrap();
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this contact.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    try {
      await dispatch(removeContact(existing._id)).unwrap();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this contact.');
      setDeleting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      {error ? <ErrorBanner message={error} /> : null}

      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField label="Relationship" placeholder="e.g. Mother, Friend" value={relationship} onChangeText={setRelationship} />
      <TextField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Email (optional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <ToggleRow
        label="Primary contact"
        description="Contacted first when SOS is triggered."
        value={isPrimary}
        onValueChange={setIsPrimary}
      />

      <Button label={existing ? 'Save changes' : 'Add contact'} onPress={() => void handleSave()} loading={saving} style={styles.save} />

      {existing ? (
        <>
          <Text style={styles.deleteLabel} onPress={() => void handleDelete()}>
            {deleting ? 'Removing…' : 'Remove this contact'}
          </Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  save: {
    marginTop: spacing.lg,
  },
  deleteLabel: {
    ...typography.bodyMedium,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
