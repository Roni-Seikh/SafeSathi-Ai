import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Share, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { ShieldCheck, ShieldAlert, Play, Pause, FileText, ChevronDown, ChevronUp, UploadCloud, Link2 } from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { Button } from '../../components/Button';
import { SOSLog } from '../../types/api.types';
import { getSOSHistory } from '../../services/sosApi';
import { ChainVerification, EvidenceChunk, getEvidenceReport, listEvidence, verifyEvidence } from '../../services/evidenceApi';
import { flushPendingEvidence, useEvidenceStatus } from '../../hooks/useEvidenceRecorder';

type Props = NativeStackScreenProps<AppStackParamList, 'EvidenceVault'>;
interface Detail { chunks: EvidenceChunk[]; verification: ChainVerification | null; loading: boolean }

const fmtDur = (ms: number) => `${Math.round(ms / 1000)}s`;

export function EvidenceVaultScreen({ route }: Props) {
  const status = useEvidenceStatus();
  const [events, setEvents] = useState<SOSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(route.params?.sosId ?? null);
  const [detail, setDetail] = useState<Record<string, Detail>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const sound = useRef<Audio.Sound | null>(null);

  const load = useCallback(async () => {
    try { setEvents((await getSOSHistory(1, 30)).sosLogs); } catch { /* offline */ }
  }, []);
  useEffect(() => { void load().finally(() => setLoading(false)); return () => { void sound.current?.unloadAsync(); }; }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetail((d) => ({ ...d, [id]: { chunks: d[id]?.chunks ?? [], verification: d[id]?.verification ?? null, loading: true } }));
    try {
      const [chunks, verification] = await Promise.all([listEvidence(id), verifyEvidence(id)]);
      setDetail((d) => ({ ...d, [id]: { chunks, verification, loading: false } }));
    } catch {
      setDetail((d) => ({ ...d, [id]: { chunks: [], verification: null, loading: false } }));
    }
  }, []);
  useEffect(() => { if (open && !detail[open]) void loadDetail(open); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(c: EvidenceChunk) {
    if (!c.url) return;
    await sound.current?.unloadAsync().catch(() => undefined);
    sound.current = null;
    if (playing === c._id) { setPlaying(null); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const { sound: s } = await Audio.Sound.createAsync({ uri: c.url }, { shouldPlay: true });
    sound.current = s; setPlaying(c._id);
    s.setOnPlaybackStatusUpdate((st) => { if (st.isLoaded && st.didJustFinish) setPlaying(null); });
  }

  async function shareSummary(id: string) {
    try { const r = await getEvidenceReport(id); await Share.share({ message: r.text }); } catch { /* ignore */ }
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={events}
        keyExtractor={(e) => e._id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.lead}>Every SOS records short audio clips. Each clip is fingerprinted (SHA-256) and linked to the one before it on our server, so any later edit, deletion or re-ordering is detectable.</Text>
            {status.pendingUpload > 0 ? (
              <Pressable onPress={() => void flushPendingEvidence()} style={styles.pending}><UploadCloud size={16} color={colors.caution} /><Text style={styles.pendingText}>{status.pendingUpload} clip{status.pendingUpload > 1 ? 's' : ''} waiting for signal — tap to upload now</Text></Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : <Text style={styles.empty}>No SOS events yet — your recordings will appear here.</Text>}
        renderItem={({ item }) => {
          const d = detail[item._id];
          const isOpen = open === item._id;
          const ok = d?.verification?.valid;
          return (
            <View style={styles.card}>
              <Pressable onPress={() => setOpen(isOpen ? null : item._id)} style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{new Date(item.triggeredAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.sub}>{item.triggerType.replace('_', ' ')} · {item.status.replace('_', ' ')}</Text>
                </View>
                {d?.verification ? (ok ? <ShieldCheck size={20} color={colors.safe} /> : <ShieldAlert size={20} color={colors.danger} />) : null}
                {isOpen ? <ChevronUp size={18} color={colors.textTertiary} /> : <ChevronDown size={18} color={colors.textTertiary} />}
              </Pressable>

              {isOpen ? (
                <View style={{ marginTop: spacing.md }}>
                  {!d || d.loading ? <ActivityIndicator color={colors.primary} /> : (
                    <>
                      {d.verification ? (
                        <View style={[styles.verdict, { backgroundColor: ok ? colors.safeMuted : colors.dangerMuted }]}>
                          <Text style={[styles.verdictTitle, { color: ok ? colors.safe : colors.danger }]}>{d.verification.chunkCount === 0 ? 'No clips recorded' : ok ? `Integrity chain intact · ${d.verification.chunkCount} clip${d.verification.chunkCount > 1 ? 's' : ''}` : 'Integrity chain BROKEN'}</Text>
                          {d.verification.problems.map((p, i) => <Text key={i} style={styles.verdictSub}>• {p}</Text>)}
                          {d.verification.headHash ? <View style={styles.hashRow}><Link2 size={12} color={colors.textTertiary} /><Text style={styles.hash} numberOfLines={1}>{d.verification.headHash}</Text></View> : null}
                        </View>
                      ) : null}
                      {d.chunks.map((c) => (
                        <View key={c._id} style={styles.chunk}>
                          <Pressable onPress={() => void toggle(c)} style={styles.play} disabled={!c.url}>{playing === c._id ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}</Pressable>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.chunkTitle}>Clip {c.seq + 1} · {fmtDur(c.durationMs)}</Text>
                            <Text style={styles.sub}>{new Date(c.recordedAt).toLocaleTimeString()} · sha256 {c.sha256.slice(0, 10)}…</Text>
                          </View>
                          {(c.screamProbability ?? 0) >= 0.7 ? <View style={styles.flag}><Text style={styles.flagText}>scream {Math.round((c.screamProbability ?? 0) * 100)}%</Text></View> : null}
                          {c.detectedKeyword ? <View style={styles.flag}><Text style={styles.flagText}>“{c.detectedKeyword}”</Text></View> : null}
                        </View>
                      ))}
                      <Button label="Share incident summary (for police)" variant="secondary" onPress={() => void shareSummary(item._id)} style={{ marginTop: spacing.md }} />
                      <View style={styles.fileHint}><FileText size={12} color={colors.textTertiary} /><Text style={styles.hint}>You can file a Zero FIR at any police station — attach this summary.</Text></View>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  lead: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,200,87,0.12)', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  pendingText: { ...typography.caption, color: colors.caution, flex: 1 },
  empty: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },
  card: { backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: spacing.base, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyMedium, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  verdict: { borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  verdictTitle: { ...typography.bodyMedium },
  verdictSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  hashRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  hash: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  chunk: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder },
  play: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chunkTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  flag: { backgroundColor: colors.dangerMuted, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { ...typography.caption, color: colors.danger },
  fileHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textTertiary, flex: 1 },
});
