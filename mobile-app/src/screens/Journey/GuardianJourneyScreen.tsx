import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Share, Vibration, ActivityIndicator, Alert } from 'react-native';
import { Footprints, Car, TrainFront, Home as HomeIcon, Search, MapPin, Minus, Plus, ShieldCheck, Share2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { PinPad } from '../../components/PinPad';
import { Journey, JourneyMode, journeyApi } from '../../services/journeyApi';
import { PlaceResult, distanceMeters, searchPlaces } from '../../services/havenApi';
import { bestEffortLocation } from '../../services/autoSOS';
import { checkPin, hasPin, updateLocalSettings } from '../../services/localSettings';
import { useLocalSettings } from '../../hooks/useLocalSettings';

const MODES: { id: JourneyMode; label: string; speedKmh: number; icon: (c: string) => React.ReactNode }[] = [
  { id: 'walk', label: 'Walk', speedKmh: 4.5, icon: (c) => <Footprints size={18} color={c} /> },
  { id: 'cab', label: 'Cab / Auto', speedKmh: 22, icon: (c) => <Car size={18} color={c} /> },
  { id: 'transit', label: 'Transit', speedKmh: 18, icon: (c) => <TrainFront size={18} color={c} /> },
];
const PING_MS = 20000;
const PROMPT_WINDOW_S = 120;

const fmtLeft = (ms: number) => {
  const neg = ms < 0; const s = Math.abs(Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${neg ? '+' : ''}${h ? `${h}:${String(m).padStart(2, '0')}` : String(m)}:${String(ss).padStart(2, '0')}`;
};
const mapsLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

export function GuardianJourneyScreen() {
  const local = useLocalSettings();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [needPin, setNeedPin] = useState(false);

  // setup form
  const [mode, setMode] = useState<JourneyMode>('walk');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [dest, setDest] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState(20);
  const [vehicle, setVehicle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => { try { setJourney(await journeyApi.active()); } catch { /* offline: keep last */ } }, []);
  useEffect(() => { void refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const active = journey && (journey.status === 'active' || journey.status === 'prompted');

  // live pings (also auto-detects arrival on the server) + status sync
  useEffect(() => {
    if (!active || !journey) return undefined;
    const tick = async () => {
      try {
        const loc = await bestEffortLocation(5000);
        const j = await journeyApi.ping(journey._id, loc);
        if (j) setJourney(j);
      } catch { await refresh(); }
    };
    void tick();
    const t = setInterval(() => void tick(), PING_MS);
    return () => clearInterval(t);
  }, [active, journey?._id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // the server asked "are you OK?" — make the phone impossible to ignore
  useEffect(() => { if (journey?.status === 'prompted') Vibration.vibrate([0, 600, 400, 600, 400, 600]); }, [journey?.status]);

  function onSearch(text: string) {
    setQuery(text); setDest(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { setResults(await searchPlaces(text.trim())); } catch { setResults([]); }
    }, 450);
  }

  async function pick(lat: number, lng: number, name: string) {
    setDest({ name, lat, lng }); setResults([]); setQuery(name);
    try {
      const here = await bestEffortLocation(4000);
      const km = distanceMeters(here.coordinates[1], here.coordinates[0], lat, lng) / 1000;
      const speed = MODES.find((m) => m.id === mode)?.speedKmh ?? 4.5;
      setEta(Math.min(360, Math.max(5, Math.ceil((km / speed) * 60 * 1.25) + 3)));
    } catch { /* keep manual ETA */ }
  }

  async function saveHome() {
    const here = await bestEffortLocation(5000);
    await updateLocalSettings({ homeLat: here.coordinates[1], homeLng: here.coordinates[0], homeLabel: 'Home' });
    await pick(here.coordinates[1], here.coordinates[0], 'Home');
    setMsg('Saved this spot as Home.');
  }

  async function start() {
    if (!dest) return;
    setBusy(true); setMsg(null);
    try {
      const startLoc = await bestEffortLocation(5000);
      const j = await journeyApi.start({
        mode, destinationName: dest.name, destination: { type: 'Point', coordinates: [dest.lng, dest.lat] }, start: startLoc, etaMinutes: eta,
        vehicleNumber: mode === 'cab' && vehicle.trim() ? vehicle.trim().toUpperCase() : undefined,
      });
      setJourney(j);
      void shareTrip(j, startLoc.coordinates[1], startLoc.coordinates[0]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not start the journey.');
    } finally { setBusy(false); }
  }

  async function shareTrip(j: Journey, lat?: number, lng?: number) {
    const eta = new Date(j.etaAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const v = j.vehicleNumber ? `\nVehicle: ${j.vehicleNumber}` : '';
    const where = lat !== undefined && lng !== undefined ? `\nStarted from: ${mapsLink(lat, lng)}` : '';
    await Share.share({ message: `I'm heading to ${j.destinationName} (${j.mode}). Expected arrival ${eta}.${v}${where}\nSafeSathi will alert you automatically if I don't arrive.` }).catch(() => undefined);
  }

  async function act(fn: () => Promise<Journey | null>) {
    setBusy(true);
    try { const j = await fn(); setJourney(j); } catch { setMsg('That did not go through — check your connection and try again.'); } finally { setBusy(false); }
  }

  async function endJourney() { if (await hasPin()) setNeedPin(true); else Alert.alert('End journey?', 'Your contacts will no longer be watching this trip.', [{ text: 'Keep going', style: 'cancel' }, { text: 'End', style: 'destructive', onPress: () => void act(() => journeyApi.cancel(journey!._id)) }]); }
  async function onPin(pin: string): Promise<string | void> {
    const r = await checkPin(pin);
    if (r === 'wrong') return 'Wrong PIN';
    setNeedPin(false);
    // duress: the trip *looks* ended, but the server raises a real SOS
    await act(() => journeyApi.cancel(journey!._id, r === 'duress'));
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (needPin) return <View style={[styles.flex, { justifyContent: 'center' }]}><PinPad title="Enter PIN to end journey" onSubmit={onPin} onCancel={() => setNeedPin(false)} cancelLabel="Back" /></View>;

  // ---------------- finished states ----------------
  if (journey && (journey.status === 'arrived' || journey.status === 'cancelled' || journey.status === 'escalated') && !active) {
    const done = journey.status === 'arrived';
    return (
      <View style={styles.center}>
        <ShieldCheck size={56} color={done ? colors.safe : colors.textTertiary} />
        <Text style={styles.bigTitle}>{done ? 'You arrived safely' : journey.status === 'escalated' ? 'Journey ended' : 'Journey ended'}</Text>
        <Text style={styles.muted}>{done ? `Your contacts were told you reached ${journey.destinationName}.` : 'Thanks for checking in.'}</Text>
        <Button label="Plan another journey" onPress={() => setJourney(null)} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      </View>
    );
  }

  // ---------------- active ----------------
  if (journey && active) {
    const leftMs = new Date(journey.etaAt).getTime() - now;
    const prompted = journey.status === 'prompted';
    const promptLeft = journey.promptedAt ? Math.max(0, PROMPT_WINDOW_S - Math.floor((now - new Date(journey.promptedAt).getTime()) / 1000)) : PROMPT_WINDOW_S;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        {prompted ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Are you OK?</Text>
            <Text style={styles.alertSub}>You're past your ETA. Tap below within {promptLeft}s or your contacts get an SOS with your location.</Text>
            <Button label="I'M OK" onPress={() => void act(() => journeyApi.imOk(journey._id, 10))} loading={busy} style={{ marginTop: spacing.md }} />
          </View>
        ) : null}
        <GlassCard>
          <Text style={styles.kicker}>{journey.mode.toUpperCase()} · TO {journey.destinationName.toUpperCase()}</Text>
          <Text style={[styles.clock, leftMs < 0 && { color: colors.danger }]}>{fmtLeft(leftMs)}</Text>
          <Text style={styles.muted}>{leftMs >= 0 ? 'until your expected arrival' : 'past your expected arrival'}{journey.remainingMeters !== undefined ? ` · ${journey.remainingMeters < 1000 ? `${Math.round(journey.remainingMeters)} m` : `${(journey.remainingMeters / 1000).toFixed(1)} km`} to go` : ''}</Text>
          {journey.vehicleNumber ? <Text style={styles.veh}>🚗 {journey.vehicleNumber}</Text> : null}
          <View style={styles.guardRow}><ShieldCheck size={16} color={colors.safe} /><Text style={styles.guardText}>Guardian is watching on our servers — even if your phone dies.</Text></View>
        </GlassCard>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Button label="I've arrived" onPress={() => void act(() => journeyApi.arrive(journey._id))} loading={busy} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button label="+10 min" variant="secondary" onPress={() => void act(() => journeyApi.extend(journey._id, 10))} disabled={busy} style={{ flex: 1 }} />
            <Button label="Share trip" variant="secondary" onPress={() => void shareTrip(journey)} style={{ flex: 1 }} />
          </View>
          <Button label="End journey" variant="ghost" onPress={() => void endJourney()} disabled={busy} />
        </View>
        {msg ? <Text style={styles.err}>{msg}</Text> : null}
      </ScrollView>
    );
  }

  // ---------------- setup ----------------
  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Text style={styles.lead}>Tell Sathi where you're going. If you don't arrive on time and can't confirm you're OK, your contacts are alerted with your last location.</Text>

      <Text style={styles.section}>How are you travelling?</Text>
      <View style={styles.pills}>
        {MODES.map((m) => (
          <Pressable key={m.id} onPress={() => setMode(m.id)} style={[styles.pill, mode === m.id && styles.pillOn]}>
            {m.icon(mode === m.id ? colors.textOnPrimary : colors.textSecondary)}<Text style={[styles.pillText, mode === m.id && { color: colors.textOnPrimary }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Destination</Text>
      <View style={styles.searchBox}><Search size={16} color={colors.textTertiary} /><TextInput value={query} onChangeText={onSearch} placeholder="Search a place or address" placeholderTextColor={colors.textTertiary} style={styles.searchInput} /></View>
      {results.map((r, i) => (
        <Pressable key={i} onPress={() => void pick(r.lat, r.lng, r.name)} style={styles.result}><MapPin size={16} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.resName} numberOfLines={1}>{r.name}</Text><Text style={styles.resSub} numberOfLines={1}>{r.subtitle}</Text></View></Pressable>
      ))}
      <View style={styles.pills}>
        {local.homeLat !== null && local.homeLng !== null ? (
          <Pressable onPress={() => void pick(local.homeLat as number, local.homeLng as number, local.homeLabel)} style={styles.pill}><HomeIcon size={16} color={colors.textSecondary} /><Text style={styles.pillText}>{local.homeLabel}</Text></Pressable>
        ) : null}
        <Pressable onPress={() => void saveHome()} style={styles.pill}><HomeIcon size={16} color={colors.textSecondary} /><Text style={styles.pillText}>{local.homeLat === null ? 'Set my current spot as Home' : 'Update Home to here'}</Text></Pressable>
      </View>
      {dest ? <Text style={styles.picked}>✓ Going to {dest.name}</Text> : null}

      <Text style={styles.section}>Expected travel time</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => setEta((e) => Math.max(2, e - 5))} style={styles.stepBtn}><Minus size={18} color={colors.textPrimary} /></Pressable>
        <Text style={styles.etaText}>{eta} min</Text>
        <Pressable onPress={() => setEta((e) => Math.min(360, e + 5))} style={styles.stepBtn}><Plus size={18} color={colors.textPrimary} /></Pressable>
      </View>
      <Text style={styles.muted}>We add 5 minutes of grace, then ask "Are you OK?" for 2 minutes before alerting anyone.</Text>

      {mode === 'cab' ? (
        <>
          <Text style={styles.section}>Vehicle number (optional)</Text>
          <TextInput value={vehicle} onChangeText={setVehicle} placeholder="e.g. WB 02 AB 1234" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" style={styles.field} />
        </>
      ) : null}

      <Button label="Start Guardian Journey" onPress={() => void start()} loading={busy} disabled={!dest} style={{ marginTop: spacing.lg }} />
      {msg ? <Text style={styles.err}>{msg}</Text> : null}
      <View style={styles.shareHint}><Share2 size={14} color={colors.textTertiary} /><Text style={styles.muted}>You'll get a share sheet to send trip details to anyone, even without the app.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl, backgroundColor: colors.background, flexGrow: 1 },
  lead: { ...typography.body, color: colors.textSecondary },
  section: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.bodySmall, color: colors.textPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, paddingHorizontal: spacing.md, backgroundColor: colors.glassFill },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: spacing.md },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder },
  resName: { ...typography.bodyMedium, color: colors.textPrimary },
  resSub: { ...typography.caption, color: colors.textSecondary },
  picked: { ...typography.bodyMedium, color: colors.safe, marginTop: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.glassFillStrong, alignItems: 'center', justifyContent: 'center' },
  etaText: { ...typography.h1, color: colors.textPrimary, minWidth: 110, textAlign: 'center' },
  field: { ...typography.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.glassFill },
  muted: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' },
  err: { ...typography.bodySmall, color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  shareHint: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  bigTitle: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.md },
  kicker: { ...typography.caption, color: colors.textTertiary, letterSpacing: 1 },
  clock: { fontSize: 56, fontWeight: '800', color: colors.textPrimary, marginVertical: spacing.xs },
  veh: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.sm },
  guardRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: spacing.md },
  guardText: { ...typography.caption, color: colors.safe, flex: 1 },
  alertCard: { backgroundColor: colors.dangerMuted, borderColor: colors.danger, borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, marginBottom: spacing.base },
  alertTitle: { ...typography.h1, color: colors.danger },
  alertSub: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs },
});
