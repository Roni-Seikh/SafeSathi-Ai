import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, User as UserIcon } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

interface RowProps {
  label: string;
  onPress: () => void;
}

function Row({ label, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <ScreenContainer scroll>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <UserIcon size={32} color={colors.primary} />
        </View>
        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.phone}>{user?.phone ?? ''}</Text>
      </View>

      <GlassCard padded={false} style={styles.menu}>
        <Row label="Personal Information" onPress={() => navigation.navigate('PersonalInfo')} />
        <Divider />
        <Row label="Medical Information" onPress={() => navigation.navigate('MedicalInfo')} />
        <Divider />
        <Row label={`Emergency Contacts`} onPress={() => navigation.navigate('Contacts')} />
        <Divider />
        <Row label="Safety Preferences" onPress={() => navigation.navigate('SafetyPreferences')} />
        <Divider />
        <Row label="Settings" onPress={() => navigation.navigate('Settings')} />
      </GlassCard>
    </ScreenContainer>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  phone: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  menu: {
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.glassFillStrong,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginLeft: spacing.lg,
  },
});
