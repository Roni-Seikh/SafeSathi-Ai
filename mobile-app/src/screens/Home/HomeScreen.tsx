import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users, Settings as SettingsIcon, User as UserIcon, ShieldCheck, Navigation, Mic, Activity, FileWarning, Bell, Map } from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { SOSHoldButton } from '../../components/SOSHoldButton';
import { PrimaryActionTile } from '../../components/PrimaryActionTile';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchActiveSOS, triggerSOSThunk } from '../../store/slices/sosSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const sosStatus = useAppSelector((state) => state.sos.status);
  const sosError = useAppSelector((state) => state.sos.error);
  const motionStatus = useAppSelector((state) => state.detection.motion);
  const voiceStatus = useAppSelector((state) => state.detection.voice);

  useEffect(() => {
    // If the user force-closed the app mid-SOS, land them back on the
    // active-SOS screen instead of a Home screen that doesn't reflect it.
    dispatch(fetchActiveSOS())
      .unwrap()
      .then((active) => {
        if (active) navigation.replace('SOSActive');
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTrigger() {
    const result = await dispatch(triggerSOSThunk());
    if (triggerSOSThunk.fulfilled.match(result)) {
      navigation.replace('SOSActive');
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi{user ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.subGreeting}>SafeSathi is watching out for you.</Text>
        </View>
      </View>

      <GlassCard style={styles.insightsCard}>
        <ShieldCheck size={22} color={colors.textSecondary} />
        <Text style={styles.insightsTitle}>Safe Route & Risk Zones are live</Text>
        <Text style={styles.insightsBody}>
          Find a safer path or check nearby risk zones below. A live SafeScore for exactly where you're standing right
          now is still on the roadmap.
        </Text>
      </GlassCard>

      <View style={styles.sosSection}>
        <SOSHoldButton onTrigger={() => void handleTrigger()} disabled={sosStatus === 'triggering'} />
        {sosError ? <Text style={styles.sosError}>{sosError}</Text> : null}
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, voiceStatus.isListening && styles.badgeActive]}>
          <Mic size={14} color={voiceStatus.isListening ? colors.safe : colors.textTertiary} />
          <Text style={[styles.badgeText, voiceStatus.isListening && styles.badgeTextActive]}>
            {voiceStatus.isListening ? 'Listening' : 'Voice detection off'}
          </Text>
        </View>
        <View style={[styles.badge, motionStatus.isMonitoring && styles.badgeActive]}>
          <Activity size={14} color={motionStatus.isMonitoring ? colors.safe : colors.textTertiary} />
          <Text style={[styles.badgeText, motionStatus.isMonitoring && styles.badgeTextActive]}>
            {motionStatus.isMonitoring ? 'Motion monitoring' : 'Motion detection off'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Quick actions</Text>
      <View style={styles.grid}>
        <PrimaryActionTile
          label="Emergency Contacts"
          icon={<Users size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('Contacts')}
        />
        <PrimaryActionTile
          label="Share Live Location"
          icon={<Navigation size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('ShareLocation')}
        />
        <PrimaryActionTile
          label="Safe Route"
          icon={<Map size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('SafeRoute')}
        />
        <PrimaryActionTile
          label="Risk Zones"
          icon={<ShieldCheck size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('RiskZones')}
        />
        <PrimaryActionTile
          label="Report Incident"
          icon={<FileWarning size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('ReportIncident')}
        />
        <PrimaryActionTile
          label="Community Alerts"
          icon={<Bell size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('CommunityAlerts')}
        />
        <PrimaryActionTile
          label="Profile"
          icon={<UserIcon size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('Profile')}
        />
        <PrimaryActionTile
          label="Settings"
          icon={<SettingsIcon size={26} color={colors.primary} />}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subGreeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  insightsCard: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  insightsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  insightsBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sosError: {
    ...typography.bodySmall,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  badgeActive: {
    borderColor: colors.safe,
    backgroundColor: colors.safeMuted,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  badgeTextActive: {
    color: colors.safe,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
