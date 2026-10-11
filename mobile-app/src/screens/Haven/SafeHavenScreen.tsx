import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Shield, Cross, Pill, Fuel, Navigation, Phone, RefreshCw } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { Haven, HavenKind, findHavens } from '../../services/havenApi';
import { Button } from '../../components/Button';

const META: Record<HavenKind, { label: string; color: string; icon: (c: string) => React.ReactNode }> = {
  police: { label: 'Police', color: colors.primary, icon: (c) => <Shield size={20} color={c} /> },
  hospital: { label: 'Hospital', color: colors.danger, icon: (c) => <Cross size={20} color={c} /> },
  pharmacy: { label: '24×7 pharmacy', color: colors.safe, icon: (c) => <Pill size={20} color={c} /> },
  fuel: { label: '24×7 petrol pump', color: colors.caution, icon: (c) => <Fuel size={20} color={c} /> },
};
const dist = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
const walkMin = (m: number) => Math.max(1, Math.round(m / 80));

export function SafeHavenScreen() {
  const [havens, setHavens] = useState<Haven[]>([]);
  const [filter, setFilter] = useState<HavenKind | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Location permission is needed to find places near you.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = await findHavens(pos.coords.latitude, pos.coords.longitude);
      setHavens(r.havens); setCached(r.fromCache);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load nearby places.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = havens.filter((h) => filter === 'all' || h.kind === filter);
  const nearest = shown[0];
  const navigate = (h: Haven) => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=walking`);

  return (
    <View style={styles.flex}>
      <View style={styles.chips}>
        {(['all', 'police', 'hospital', 'pharmacy', 'fuel'] as const).map((k) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[styles.chip, filter === k && styles.chipOn]}>
            <Text style={[styles.chipText, filter === k && { color: colors.textOnPrimary }]}>{k === 'all' ? 'All' : META[k].label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Finding safe places near you…</Text></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.err}>{error}</Text><Button label="Try again" onPress={() => void load()} style={{ marginTop: spacing.base }} /></View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          ListHeaderComponent={
            <View>
              {nearest ? (
                <View style={styles.hero}>
                  <Text style={styles.heroKicker}>NEAREST SAFE PLACE</Text>
                  <Text style={styles.heroName}>{nearest.name}</Text>
                  <Text style={styles.heroSub}>{META[nearest.kind].label} · {dist(nearest.distanceM)} · ~{walkMin(nearest.distanceM)} min walk</Text>
                  <Button label="Navigate there" onPress={() => navigate(nearest)} style={{ marginTop: spacing.md }} />
                </View>
              ) : null}
              <Pressable onPress={() => void Linking.openURL('tel:112')} style={styles.call112}><Phone size={16} color={colors.danger} /><Text style={styles.call112Text}>Can't get to one? Call 112</Text></Pressable>
              {cached ? <Text style={styles.muted}>Offline — showing places saved from your last search.</Text> : null}
            </View>
          }
          ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>No matching places within 3 km. Try “All” or call 112.</Text>}
          renderItem={({ item }) => {
            const m = META[item.kind];
            return (
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: `${m.color}22` }]}>{m.icon(m.color)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub}>{m.label} · {dist(item.distanceM)}{item.open247 ? ' · open 24×7' : ''}</Text>
                </View>
                {item.phone ? <Pressable onPress={() => void Linking.openURL(`tel:${item.phone}`)} style={styles.rowBtn}><Phone size={16} color={colors.primary} /></Pressable> : null}
                <Pressable onPress={() => navigate(item)} style={styles.rowBtn}><Navigation size={16} color={colors.primary} /></Pressable>
              </View>
            );
          }}
          ListFooterComponent={<Pressable onPress={() => void load()} style={styles.refresh}><RefreshCw size={14} color={colors.textTertiary} /><Text style={styles.muted}>Refresh · data © OpenStreetMap contributors</Text></Pressable>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.base },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  muted: { ...typography.caption, color: colors.textTertiary },
  err: { ...typography.body, color: colors.danger, textAlign: 'center' },
  hero: { backgroundColor: colors.primaryMuted, borderColor: colors.primary, borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, marginBottom: spacing.md },
  heroKicker: { ...typography.caption, color: colors.primary, letterSpacing: 1.2 },
  heroName: { ...typography.h2, color: colors.textPrimary, marginTop: 4 },
  heroSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  call112: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.dangerMuted, marginBottom: spacing.md },
  call112Text: { ...typography.bodyMedium, color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  icon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.base },
});
