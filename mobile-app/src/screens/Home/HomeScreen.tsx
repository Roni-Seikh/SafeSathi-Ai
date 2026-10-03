import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Users, Settings as SettingsIcon, User as UserIcon, ShieldCheck,
  Navigation, Mic, Activity, FileWarning, Bell, Map, ChevronRight,
} from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { SOSHoldButton } from '../../components/SOSHoldButton';
import { PrimaryActionTile } from '../../components/PrimaryActionTile';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeInUp } from '../../components/FadeInUp';
import { PulseDot } from '../../components/PulseDot';
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
      <FadeInUp>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi{user ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.subGreeting}>SafeSathi is watching out for you.</Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={60}>
        <View style={styles.sosSection}>
          <SOSHoldButton onTrigger={() => void handleTrigger()} disabled={sosStatus === 'triggering'} />
          {sosError ? <Text style={styles.sosError}>{sosError}</Text> : null}
        </View>
      </FadeInUp>

      <FadeInUp delay={120}>
        <View style={styles.badgeRow}>
          <StatusBadge
            active={voiceStatus.isListening}
            icon={<Mic size={14} color={voiceStatus.isListening ? colors.safe : colors.textTertiary} />}
            activeLabel="Listening"
            inactiveLabel="Voice detection off"
          />
          <StatusBadge
            active={motionStatus.isMonitoring}
            icon={<Activity size={14} color={motionStatus.isMonitoring ? colors.safe : colors.textTertiary} />}
            activeLabel="Motion monitoring"
            inactiveLabel="Motion detection off"
          />
        </View>
        {voiceStatus.error ? <Text style={styles.detectionError}>{voiceStatus.error}</Text> : null}
      </FadeInUp>

      <FadeInUp delay={160}>
        <GlassCard style={styles.insightsCard}>
          <ShieldCheck size={22} color={colors.textSecondary} />
          <Text style={styles.insightsTitle}>Safe Route & Risk Zones are live</Text>
          <Text style={styles.insightsBody}>
            Find a safer path or check nearby risk zones below. A live SafeScore for exactly where you're standing
            right now is still on the roadmap.
          </Text>
        </GlassCard>
      </FadeInUp>

      <FadeInUp delay={200}>
        <Text style={styles.sectionLabel}>Featured</Text>
        <FeaturedRow
          label="Share Live Location"
          sublabel="Let a contact watch you get home safe"
          icon={<Navigation size={22} color={colors.primary} />}
          onPress={() => navigation.navigate('ShareLocation')}
        />
        <FeaturedRow
          label="Report an Incident"
          sublabel="Help build the community risk map"
          icon={<FileWarning size={22} color={colors.primary} />}
          onPress={() => navigation.navigate('ReportIncident')}
        />
      </FadeInUp>

      <FadeInUp delay={240}>
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.grid}>
          <PrimaryActionTile
            label="Emergency Contacts"
            icon={<Users size={26} color={colors.primary} />}
            onPress={() => navigation.navigate('Contacts')}
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
      </FadeInUp>
    </ScreenContainer>
  );
}

interface StatusBadgeProps {
  active: boolean;
  icon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
}

function StatusBadge({ active, icon, activeLabel, inactiveLabel }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, active && styles.badgeActive]}>
      {active ? <PulseDot size={6} /> : icon}
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{active ? activeLabel : inactiveLabel}</Text>
    </View>
  );
}

interface FeaturedRowProps {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function FeaturedRow({ label, sublabel, icon, onPress }: FeaturedRowProps) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.featuredRow} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.featuredIcon}>{icon}</View>
      <View style={styles.featuredText}>
        <Text style={styles.featuredLabel}>{label}</Text>
        <Text style={styles.featuredSublabel}>{sublabel}</Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </AnimatedPressable>
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
  sosSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sosError: {
    ...typography.bodySmall,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  detectionError: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
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
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  featuredRow: {
    ...{ backgroundColor: colors.glassFill, borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.lg },
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredText: {
    flex: 1,
  },
  featuredLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  featuredSublabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
