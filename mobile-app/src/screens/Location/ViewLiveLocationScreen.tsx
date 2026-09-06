import React, { useEffect, useState } from 'react';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { MapPin, BatteryMedium } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeletonCard } from '../../components/LoadingSkeleton';
import { colors, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLiveLocationThunk, liveLocationUpdated, liveSharingStopped, clearLiveView } from '../../store/slices/locationSlice';
import { watchLocation, unwatchLocation } from '../../services/socket';

type Props = NativeStackScreenProps<AppStackParamList, 'ViewLiveLocation'>;

/**
 * No embedded map here — @maplibre/maplibre-react-native needs a custom
 * native build and doesn't render in Expo Go. Rather than pull that in
 * for one screen, this shows the live coordinates/battery/freshness
 * directly and deep-links to the device's own Maps app; Phase 6 builds
 * one shared MapLibre component and upgrades every location-aware screen
 * (this one, Safe Route, the Heatmap) to use it together.
 */
export function ViewLiveLocationScreen({ route }: Props) {
  const { sharerUserId, sharerName } = route.params;
  const dispatch = useAppDispatch();
  const { liveView, status, error } = useAppSelector((state) => state.location);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchLiveLocationThunk(sharerUserId));

    let mounted = true;
    watchLocation(
      sharerUserId,
      (payload) => mounted && dispatch(liveLocationUpdated(payload)),
      () => mounted && dispatch(liveSharingStopped())
    )
      .then((ok) => {
        if (mounted && !ok) setSocketError('Live updates are unavailable — showing the last known location.');
      })
      .catch(() => mounted && setSocketError('Live updates are unavailable — showing the last known location.'));

    return () => {
      mounted = false;
      void unwatchLocation(sharerUserId);
      dispatch(clearLiveView());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharerUserId]);

  function openInMaps() {
    if (!liveView) return;
    const [lng, lat] = liveView.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    void Linking.openURL(url);
  }

  if (status === 'loading' && !liveView) {
    return (
      <ScreenContainer>
        <GlassCard>
          <LoadingSkeletonCard />
        </GlassCard>
      </ScreenContainer>
    );
  }

  if (!liveView && error) {
    return (
      <ScreenContainer>
        <EmptyState title="No live location available" message={error} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <GlassCard style={styles.card}>
        <Text style={styles.name}>{sharerName ?? 'Live location'}</Text>
        {liveView?.isStale ? (
          <Text style={styles.stopped}>Sharing has stopped — this was their last known location.</Text>
        ) : (
          <Text style={styles.live}>● Live</Text>
        )}

        <View style={styles.row}>
          <MapPin size={18} color={colors.textSecondary} />
          <Text style={styles.rowText}>
            {liveView ? `${liveView.coordinates[1].toFixed(5)}, ${liveView.coordinates[0].toFixed(5)}` : '—'}
          </Text>
        </View>

        {liveView?.batteryLevel != null ? (
          <View style={styles.row}>
            <BatteryMedium size={18} color={colors.textSecondary} />
            <Text style={styles.rowText}>{liveView.batteryLevel}% battery</Text>
          </View>
        ) : null}

        {liveView ? (
          <Text style={styles.updatedAt}>Updated {new Date(liveView.recordedAt).toLocaleTimeString()}</Text>
        ) : null}

        {socketError ? <Text style={styles.socketError}>{socketError}</Text> : null}
      </GlassCard>

      <Button label="Open in Maps" onPress={openInMaps} disabled={!liveView} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  live: {
    ...typography.bodySmall,
    color: colors.safe,
  },
  stopped: {
    ...typography.bodySmall,
    color: colors.caution,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  updatedAt: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  socketError: {
    ...typography.caption,
    color: colors.caution,
    marginTop: spacing.sm,
  },
});
