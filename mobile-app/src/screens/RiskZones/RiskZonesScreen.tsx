import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeletonCard } from '../../components/LoadingSkeleton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { RiskBadge } from '../../components/RiskBadge';
import { colors, spacing, typography } from '../../constants/theme';
import { getHeatmap, recalculateHeatmap, bboxAroundPoint } from '../../services/heatmapApi';
import { getCurrentGeoPoint } from '../../services/location';
import { HeatmapZone } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'RiskZones'>;

const VIEW_RADIUS_METERS = 1500;

export function RiskZonesScreen(_props: Props) {
  const [zones, setZones] = useState<HeatmapZone[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError(null);
    try {
      const point = await getCurrentGeoPoint();
      const bbox = bboxAroundPoint(point.coordinates[1], point.coordinates[0], VIEW_RADIUS_METERS);
      const results = await getHeatmap(bbox);
      setZones(results.sort((a, b) => b.riskScore - a.riskScore));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load risk zones.');
      setZones([]);
    }
  }

  async function handleRecalculate() {
    setRecalculating(true);
    setError(null);
    try {
      const point = await getCurrentGeoPoint();
      const bbox = bboxAroundPoint(point.coordinates[1], point.coordinates[0], VIEW_RADIUS_METERS);
      const results = await recalculateHeatmap(bbox);
      setZones(results.sort((a, b) => b.riskScore - a.riskScore));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh risk zones.');
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <ScreenContainer>
      {error ? <ErrorBanner message={error} /> : null}

      <Button
        label="Refresh for my area"
        variant="secondary"
        onPress={() => void handleRecalculate()}
        loading={recalculating}
        style={styles.refreshButton}
      />

      {zones === null ? (
        <GlassCard>
          <LoadingSkeletonCard />
        </GlassCard>
      ) : zones.length === 0 ? (
        <EmptyState
          title="No risk data for this area yet"
          message="Zones appear once nearby reports or SOS events build up recent activity. Try Refresh after a report is filed nearby."
        />
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.zoneId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <View style={styles.row}>
                <RiskBadge level={item.riskLevel} />
                <Text style={styles.score}>Risk {item.riskScore}</Text>
              </View>
              <Text style={styles.meta}>
                {item.reportCount} report{item.reportCount === 1 ? '' : 's'} · {item.sosCount} SOS event
                {item.sosCount === 1 ? '' : 's'} · last {new Date(item.lastCalculatedAt).toLocaleDateString()}
              </Text>
            </GlassCard>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    marginVertical: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  score: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
