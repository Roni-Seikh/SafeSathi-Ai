import { useEffect, useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Copy, Link2, FileAudio } from 'lucide-react';
import { getSOSEvidence } from '@/services/intelligence.service';
import { getApiErrorMessage } from '@/services/apiClient';
import type { SOSEvidence } from '@/types/intelligence';
import { PageSpinner } from './Spinner';

/** Admin view of one SOS's evidence: audio clips + tamper-evidence verification + police-ready summary. */
export function EvidenceModal({ sosId, onClose }: { sosId: string; onClose: () => void }) {
  const [data, setData] = useState<SOSEvidence | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    getSOSEvidence(sosId, deep).then((d) => alive && setData(d)).catch((e) => alive && setErr(getApiErrorMessage(e))).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [sosId, deep]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const v = data?.verification;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-line bg-white shadow-lift animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div><h2 className="font-display text-[16px] font-semibold text-ink-900">Evidence vault</h2><p className="font-mono text-[12px] text-slate-muted">SOS …{sosId.slice(-8)}</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 text-slate-muted hover:bg-paper hover:text-ink-900"><X size={18} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {busy && !data ? <PageSpinner /> : err ? <p className="text-[13.5px] text-signal-red">{err}</p> : data && v ? (
            <>
              <div className={`rounded-xl p-4 ${v.chunkCount === 0 ? 'bg-line' : v.valid ? 'bg-signal-greenDim' : 'bg-signal-redDim'}`}>
                <div className="flex items-center gap-2">
                  {v.valid ? <ShieldCheck size={20} className="text-signal-green" /> : <ShieldAlert size={20} className="text-signal-red" />}
                  <p className={`font-display text-[15px] font-semibold ${v.chunkCount === 0 ? 'text-slate-muted' : v.valid ? 'text-signal-green' : 'text-signal-red'}`}>
                    {v.chunkCount === 0 ? 'No audio recorded for this SOS' : v.valid ? `Integrity chain intact · ${v.chunkCount} clip(s)` : `Chain BROKEN at clip #${(v.firstBrokenSeq ?? 0) + 1}`}
                  </p>
                </div>
                {v.problems.map((p, i) => <p key={i} className="mt-1 text-[12.5px] text-ink-900">• {p}</p>)}
                {v.headHash && <p className="mt-2 flex items-center gap-1 break-all font-mono text-[11px] text-slate-muted"><Link2 size={12} className="shrink-0" />{v.headHash}</p>}
                <label className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-muted"><input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />Deep verify (re-download every file and re-hash it){busy && <span className="animate-pulse">…</span>}</label>
              </div>

              <ul className="space-y-2">
                {data.chunks.map((c) => (
                  <li key={c._id} className="rounded-lg border border-line p-3">
                    <div className="flex items-center gap-2">
                      <FileAudio size={15} className="text-accent" />
                      <p className="text-[13px] font-medium text-ink-900">Clip {c.seq + 1} · {Math.round(c.durationMs / 1000)}s · {(c.sizeBytes / 1024).toFixed(0)} KB</p>
                      <span className="ml-auto text-[12px] text-slate-muted">{new Date(c.recordedAt).toLocaleTimeString()}</span>
                    </div>
                    {c.url ? <audio controls preload="none" src={c.url} className="mt-2 h-9 w-full" /> : <p className="mt-1 text-[12px] text-slate-muted">Audio link unavailable.</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {(c.screamProbability ?? 0) >= 0.7 && <span className="rounded bg-signal-redDim px-1.5 py-0.5 text-[11px] font-semibold text-signal-red">scream {Math.round((c.screamProbability ?? 0) * 100)}%</span>}
                      {c.detectedKeyword && <span className="rounded bg-signal-amberDim px-1.5 py-0.5 text-[11px] font-semibold text-signal-amber">“{c.detectedKeyword}”</span>}
                      <span className="font-mono text-[11px] text-slate-muted">sha256 {c.sha256.slice(0, 16)}…</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div>
                <div className="mb-1.5 flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-wider text-slate-muted">Police-ready summary</p>
                  <button onClick={() => { void navigator.clipboard.writeText(data.summary); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 text-[12.5px] text-accent hover:underline"><Copy size={13} />{copied ? 'Copied' : 'Copy'}</button></div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-paper p-3 font-mono text-[11.5px] leading-relaxed text-ink-900">{data.summary}</pre>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
