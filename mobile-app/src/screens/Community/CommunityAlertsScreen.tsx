import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeletonCard } from '../../components/LoadingSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { colors, spacing, typography } from '../../constants/theme';
import { getNearbyAlerts } from '../../services/communityApi';
import { getCurrentGeoPoint } from '../../services/location';
import { Report } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'CommunityAlerts'>;

const TYPE_LABELS: Record<Report['type'], string> = {
  harassment: 'Harassment',
  stalking: 'Stalking',
  unsafe_area: 'Unsafe area',
  assault: 'Assault',
  suspicious_activity: 'Suspicious activity',
  other: 'Incident',
};

export function CommunityAlertsScreen(_props: Props) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError(null);
    try {
      const point = await getCurrentGeoPoint();
      const results = await getNearbyAlerts(point.coordinates[1], point.coordinates[0]);
      setReports(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load nearby alerts.');
      setReports([]);
    }
  }

  return (
    <ScreenContainer>
      {error ? <ErrorBanner message={error} /> : null}

      {reports === null ? (
        <GlassCard>
          <LoadingSkeletonCard />
        </GlassCard>
      ) : reports.length === 0 ? (
        <EmptyState title="No alerts nearby" message="Nothing reported within 800m of you in the last 24 hours." />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <View style={styles.row}>
                <AlertTriangle size={18} color={colors.caution} />
                <Text style={styles.type}>{TYPE_LABELS[item.type]}</Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </GlassCard>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  type: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
