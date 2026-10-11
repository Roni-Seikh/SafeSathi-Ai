import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadEvidenceChunk } from '../services/evidenceApi';
import { EVIDENCE_CHUNK_MS } from '../constants/voice';

/**
 * Silent Evidence — records the room in short chunks the moment an SOS is active and uploads each chunk as soon
 * as it is finished. Properties that matter in a real incident:
 *  • SHORT chunks (20 s): if the phone is grabbed, dropped or destroyed, at most 20 s is lost — not the whole recording
 *  • DURABLE queue: every chunk is written to a persisted queue BEFORE upload; no signal → it waits and retries,
 *    and survives an app restart (flushPendingEvidence() runs at app start)
 *  • server hash-chains every chunk (SHA-256) so the sequence is tamper-evident
 * Runs only while the screen is on and the app is in the foreground (Android blocks background mic access without a
 * foreground service) — the SOS screen therefore keeps the screen awake.
 */
const QUEUE_KEY = 'safesathi.evidence.queue.v1';
const SEQ_KEY = (sosId: string) => `safesathi.evidence.seq.${sosId}`;

interface QueueItem { sosId: string; uri: string; seq: number; durationMs: number; recordedAt: string; lat?: number; lng?: number; attempts: number }

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: { extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 16000, numberOfChannels: 1, bitRate: 48000 },
  ios: {
    extension: '.m4a', outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.MEDIUM, sampleRate: 16000, numberOfChannels: 1, bitRate: 48000,
    linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 48000 },
};

let flushing = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function readQueue(): Promise<QueueItem[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]') as QueueItem[]; } catch { return []; }
}
const writeQueue = (q: QueueItem[]) => AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)).catch(() => undefined);

async function enqueue(item: QueueItem): Promise<void> {
  const q = await readQueue();
  q.push(item);
  await writeQueue(q);
  notify();
}

/** Uploads queued chunks in order. Stops at the first failure (keeps order for the hash chain) — retried later. */
export async function flushPendingEvidence(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: (await readQueue()).length };
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const q = await readQueue();
      const next = [...q].sort((a, b) => (a.sosId === b.sosId ? a.seq - b.seq : 0))[0];
      if (!next) break;
      try {
        await uploadEvidenceChunk({ sosId: next.sosId, uri: next.uri, seq: next.seq, durationMs: next.durationMs, recordedAt: next.recordedAt, lat: next.lat, lng: next.lng });
        await writeQueue((await readQueue()).filter((i) => !(i.sosId === next.sosId && i.seq === next.seq)));
        FileSystem.deleteAsync(next.uri, { idempotent: true }).catch(() => undefined);
        sent += 1;
        notify();
      } catch {
        const cur = await readQueue();
        await writeQueue(cur.map((i) => (i.sosId === next.sosId && i.seq === next.seq ? { ...i, attempts: i.attempts + 1 } : i)));
        break;
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, remaining: (await readQueue()).length };
}

/** Latest recorder status, readable from any screen without mounting a second recorder. */
export interface EvidenceRecorderState {
  state: 'idle' | 'starting' | 'recording' | 'error';
  chunksRecorded: number;
  pendingUpload: number;
  seconds: number;
  error: string | null;
}

const idleStatus: EvidenceRecorderState = { state: 'idle', chunksRecorded: 0, pendingUpload: 0, seconds: 0, error: null };
let busSnapshot = idleStatus;
const busSubs = new Set<(s: EvidenceRecorderState) => void>();
export const evidenceBus = {
  get: () => busSnapshot,
  set(s: EvidenceRecorderState) { busSnapshot = s; busSubs.forEach((l) => l(s)); },
  subscribe(l: (s: EvidenceRecorderState) => void) { busSubs.add(l); l(busSnapshot); return () => { busSubs.delete(l); }; },
};
export function useEvidenceStatus(): EvidenceRecorderState {
  const [s, setS] = useState(evidenceBus.get());
  useEffect(() => evidenceBus.subscribe(setS), []);
  return s;
}

/** Mounted ONCE (in useBackgroundDetection) so recording continues whichever screen is showing. */
export function useEvidenceRecorder(sosId: string | undefined, enabled: boolean): EvidenceRecorderState {
  const [state, setState] = useState<EvidenceRecorderState['state']>('idle');
  const [chunks, setChunks] = useState(0);
  const [pending, setPending] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wake = useRef<(() => void) | null>(null);

  // keep the "pending" counter live and retry uploads every 15 s while an incident is running
  useEffect(() => {
    const refresh = () => void readQueue().then((q) => setPending(q.length));
    listeners.add(refresh);
    refresh();
    const retry = enabled ? setInterval(() => void flushPendingEvidence(), 15000) : undefined;
    return () => { listeners.delete(refresh); if (retry) clearInterval(retry); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !sosId) return undefined;
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | undefined;

    const run = async () => {
      setState('starting');
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { setState('error'); setError('Microphone permission is off — evidence cannot be recorded.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
      // the speech recogniser releases the mic asynchronously when the SOS starts
      await new Promise((r) => setTimeout(r, 700));
      let seq = Number((await AsyncStorage.getItem(SEQ_KEY(sosId))) ?? '0');
      let failures = 0;

      while (!cancelled) {
        let rec: Audio.Recording | null = null;
        try {
          const created = await Audio.Recording.createAsync(RECORDING_OPTIONS);
          rec = created.recording;
          failures = 0;
          setState('recording');
          setError(null);
          const startedAt = Date.now();
          setSeconds(0);
          tick = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
          await new Promise<void>((resolve) => { wake.current = resolve; setTimeout(resolve, EVIDENCE_CHUNK_MS); });
          wake.current = null;
          if (tick) clearInterval(tick);

          const status = await rec.getStatusAsync();
          await rec.stopAndUnloadAsync();
          const uri = rec.getURI();
          rec = null;
          if (uri && (status.durationMillis ?? 0) > 500) {
            const pos = await Location.getLastKnownPositionAsync().catch(() => null);
            await enqueue({
              sosId, uri, seq, durationMs: status.durationMillis ?? EVIDENCE_CHUNK_MS, recordedAt: new Date(startedAt).toISOString(),
              lat: pos?.coords.latitude, lng: pos?.coords.longitude, attempts: 0,
            });
            seq += 1;
            await AsyncStorage.setItem(SEQ_KEY(sosId), String(seq));
            setChunks((c) => c + 1);
            void flushPendingEvidence();
          }
        } catch (e) {
          failures += 1;
          if (tick) clearInterval(tick);
          if (rec) await rec.stopAndUnloadAsync().catch(() => undefined);
          setState('error');
          setError(`Recording interrupted: ${e instanceof Error ? e.message : String(e)} — retrying…`);
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, Math.min(5000, 1000 * failures)));
        }
        if (cancelled) break;
      }
      setState('idle');
      void flushPendingEvidence();
    };

    void run();
    return () => {
      cancelled = true;
      wake.current?.(); // finish & upload the chunk in progress instead of discarding it
      if (tick) clearInterval(tick);
    };
  }, [enabled, sosId]);

  const result: EvidenceRecorderState = { state, chunksRecorded: chunks, pendingUpload: pending, seconds, error };
  useEffect(() => { evidenceBus.set(result); });
  return result;
}
