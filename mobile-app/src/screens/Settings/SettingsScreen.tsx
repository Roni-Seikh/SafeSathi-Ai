import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { ChevronRight } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../constants/theme';
import { firebaseAuth } from '../../services/firebase';
import { logoutUser, deleteAccount } from '../../services/authApi';
import { useAppSelector } from '../../store/hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

const LANGUAGE_LABEL: Record<string, string> = { en: 'English', hi: 'हिन्दी (Hindi)', bn: 'বাংলা (Bengali)' };

export function SettingsScreen({ navigation }: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logoutUser();
      await signOut(firebaseAuth);
      // RootNavigator switches to AuthNavigator automatically once
      // Firebase's onAuthStateChanged fires with no user.
    } finally {
      setSigningOut(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This deactivates your SafeSathi account. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            await signOut(firebaseAuth);
          },
        },
      ]
    );
  }

  return (
    <ScreenContainer scroll>
      <GlassCard padded={false} style={styles.menu}>
        <Row label="Safety Preferences" onPress={() => navigation.navigate('SafetyPreferences')} />
        <Divider />
        <Row label="Language" value={LANGUAGE_LABEL[user?.preferredLanguage ?? 'en']} onPress={() => navigation.navigate('PersonalInfo')} />
      </GlassCard>

      <GlassCard style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About SafeSathi</Text>
        <Text style={styles.aboutBody}>
          Version 0.1.0 · Proactive Safety, Not Just an SOS Button.{'\n'}Built by Team 404 Error Not Found, Brainware
          University.
        </Text>
      </GlassCard>

      <Button label="Log Out" variant="secondary" onPress={() => void handleLogout()} loading={signingOut} style={styles.logout} />
      <Text style={styles.deleteLabel} onPress={confirmDeleteAccount}>
        Delete account
      </Text>
    </ScreenContainer>
  );
}

function Row({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  menu: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginLeft: spacing.lg,
  },
  aboutCard: {
    marginBottom: spacing.xl,
  },
  aboutTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  aboutBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  logout: {
    marginBottom: spacing.md,
  },
  deleteLabel: {
    ...typography.bodyMedium,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
