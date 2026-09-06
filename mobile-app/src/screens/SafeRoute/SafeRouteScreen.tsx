import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation.types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GlassCard } from '../../components/GlassCard';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { RiskBadge, riskLevelFromSafeScore } from '../../components/RiskBadge';
import { colors, spacing, typography } from '../../constants/theme';
import { getSafeRoute } from '../../services/routeApi';
import { getCurrentGeoPoint, getBatteryLevelPercent, ensureLocationPermission } from '../../services/location';
import { RouteCandidate } from '../../types/api.types';

type Props = NativeStackScreenProps<AppStackParamList, 'SafeRoute'>;

/**
 * VERIFICATION NOTE: Location.geocodeAsync uses the OS's native geocoder
 * (CLGeocoder on iOS, the platform Geocoder on Android) — no API key or
 * external service needed from this app — but like useVoiceDetector, it
 * hasn't been exercised against a real device in this build environment.
 */
export function SafeRouteScreen(_props: Props) {
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState<RouteCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (destination.trim().length < 3) {
      setError('Enter a destination to search for.');
      return;
    }
    setError(null);
    setSearching(true);
    setRoutes(null);
    try {
      await ensureLocationPermission();
      const geocoded = await Location.geocodeAsync(destination.trim());
      if (geocoded.length === 0) {
        setError("Couldn't find that destination — try a more specific address.");
        return;
      }

      const [origin, batteryLevel] = await Promise.all([getCurrentGeoPoint(), getBatteryLevelPercent()]);
      const destinationPoint = {
        type: 'Point' as const,
        coordinates: [geocoded[0].longitude, geocoded[0].latitude] as [number, number],
      };

      const results = await getSafeRoute({ origin, destination: destinationPoint, batteryLevel: batteryLevel ?? 100 });
      setRoutes(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find a route — please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <ScreenContainer>
      <TextField
        label="Destination"
        placeholder="Search for an address or place"
        value={destination}
        onChangeText={setDestination}
        returnKeyType="search"
        onSubmitEditing={() => void handleSearch()}
      />
      <Button label="Find Safe Route" onPress={() => void handleSearch()} loading={searching} style={styles.searchButton} />

      {error ? <ErrorBanner message={error} /> : null}

      {routes && routes.length === 0 ? (
        <EmptyState title="No routes found" message="Try a different destination." />
      ) : null}

      {routes && routes.length > 0 ? (
        <FlatList
          data={routes}
          keyExtractor={(_item, index) => `route-${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <GlassCard style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeLabel}>{index === 0 ? 'Recommended route' : `Route ${index + 1}`}</Text>
                <RiskBadge level={riskLevelFromSafeScore(item.safeScore)} label={`SafeScore ${item.safeScore}`} />
              </View>
              <Text style={styles.routeMeta}>
                {(item.distanceMeters / 1000).toFixed(1)} km · {Math.round(item.estimatedDurationSeconds / 60)} min walk
              </Text>
            </GlassCard>
          )}
          ListFooterComponent={
            <Text style={styles.footerNote}>
              Routes are ranked by the safest stretch along the way, not just distance. Map view is coming in a future
              update.
            </Text>
          }
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchButton: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  routeCard: {
    marginBottom: spacing.md,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  routeLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  routeMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
