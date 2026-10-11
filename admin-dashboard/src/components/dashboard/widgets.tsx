import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ReferenceDot, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertOctagon, AlertTriangle, Info, CheckCircle2, MapPin, ArrowUpRight, Mic, Activity, Archive, ShieldCheck, Radio } from 'lucide-react';
import { AnimatedNumber, PulseDot, Sparkline } from '@/components/ui/primitives';
import { SOS_TRIGGER_LABEL, REPORT_TYPE_LABEL } from '@/constants';
import type { Hotspot, Insight, Intelligence, TriggerStat } from '@/types/intelligence';
import type { AdminSOSLog } from '@/types';

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const PALETTE = ['#5B6CFF', '#33D6B0', '#F2A93B', '#D6402F', '#8A5BFF', '#2AA7D6', '#9AA6B8'];

export function Card({ title, subtitle, right, children, className = '' }: { title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel card-hover p-5 ${className}`}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-[15px] font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ KPI */
export function KpiCard({ label, value, decimals = 0, suffix = '', delta, goodWhenDown = true, spark, color = '#5B6CFF', hint, alert }: {
  label: string; value: number; decimals?: number; suffix?: string; delta?: number; goodWhenDown?: boolean; spark?: number[]; color?: string; hint?: string; alert?: boolean;
}) {
  const up = (delta ?? 0) > 0, flat = (delta ?? 0) === 0;
  const good = flat ? null : goodWhenDown ? !up : up;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <div className={`panel card-hover group relative overflow-hidden p-4 ${alert ? 'shadow-glowRed' : ''}`}>
      <span className="absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-medium text-slate-muted">{label}</p>
        {alert && <PulseDot />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-[30px] font-semibold leading-none text-ink-900"><AnimatedNumber value={value} decimals={decimals} suffix={suffix} /></p>
        {spark && <div className="opacity-80 transition-opacity group-hover:opacity-100"><Sparkline data={spark} color={color} /></div>}
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-[12px]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${good === null ? 'bg-line text-slate-muted' : good ? 'bg-signal-greenDim text-signal-green' : 'bg-signal-redDim text-signal-red'}`}>
            <Icon size={12} />{Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-slate-muted">{hint}</span>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Trend + forecast */
export function TrendCard({ data }: { data: Intelligence }) {
  type Row = { date: string; actual: number | null; forecast: number | null };
  const rows: Row[] = [
    ...data.daily.map((d): Row => ({ date: d.date, actual: d.count, forecast: null })),
    ...data.forecast.map((f): Row => ({ date: f.date, actual: null, forecast: f.predicted })),
  ];
  // connect the forecast line to the last actual point so the dashed line starts where the solid one ends
  if (data.daily.length && data.forecast.length) rows[data.daily.length - 1].forecast = rows[data.daily.length - 1].actual;
  const anomalyDates = new Set(data.anomalies.map((a) => a.date));
  return (
    <Card title="SOS volume & 7-day forecast" subtitle="Solid = actual · dashed = Holt-smoothed forecast · red dots = statistical anomalies" right={<span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent dark:bg-accent/20">AI forecast</span>}>
      <div className="h-[260px]">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5B6CFF" stopOpacity=".38" /><stop offset="1" stopColor="#5B6CFF" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E7ED" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#8a94a6' }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8a94a6' }} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={{ borderRadius: 10, fontSize: 12.5 }} />
            <Area type="monotone" dataKey="actual" name="SOS events" stroke="#5B6CFF" strokeWidth={2.4} fill="url(#gArea)" connectNulls={false} animationDuration={1200} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#33D6B0" strokeWidth={2.4} strokeDasharray="6 5" dot={false} connectNulls animationDuration={1400} />
            {rows.filter((r) => anomalyDates.has(r.date) && r.actual !== null).map((r) => (
              <ReferenceDot key={r.date} x={r.date} y={r.actual as number} r={6} fill="#D6402F" stroke="#fff" strokeWidth={2} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------- Trigger mix + precision */
export function TriggerCard({ triggers }: { triggers: TriggerStat[] }) {
  const total = triggers.reduce((s, t) => s + t.total, 0);
  const pie = triggers.map((t) => ({ name: SOS_TRIGGER_LABEL[t.type] ?? t.type, value: t.total }));
  return (
    <Card title="How SOS events start" subtitle="Share by trigger · bar = detector precision (not marked false alarm)">
      {total === 0 ? <p className="py-10 text-center text-[13px] text-slate-muted">No SOS events in this period.</p> : (
        <>
          <div className="relative mx-auto h-[170px] w-[170px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none" animationDuration={1100}>
                  {pie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12.5 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[26px] font-semibold text-ink-900"><AnimatedNumber value={total} /></span>
              <span className="text-[11px] text-slate-muted">events</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {triggers.map((t, i) => (
              <li key={t.type} className="text-[12.5px]">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-900"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{SOS_TRIGGER_LABEL[t.type] ?? t.type}{t.duress > 0 && <span className="rounded bg-signal-redDim px-1.5 text-[10.5px] font-semibold text-signal-red">{t.duress} DURESS</span>}</span>
                  <span className="text-slate-muted">{t.total} · {Math.round(t.precision * 100)}% precise</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${t.precision * 100}%`, background: t.precision >= 0.8 ? '#1F8A57' : t.precision >= 0.6 ? '#C97A1F' : '#D6402F' }} /></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------- Hotspots */
export function HotspotsCard({ hotspots }: { hotspots: Hotspot[] }) {
  const max = Math.max(1, ...hotspots.map((h) => h.riskScore));
  return (
    <Card title="Emerging hotspots" subtitle="~1 km grid · SOS weighted ×3 vs. reports" right={<Link to="/heatmap" className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">Map <ArrowUpRight size={13} /></Link>}>
      {hotspots.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No clusters yet.</p> : (
        <ol className="space-y-2.5">
          {hotspots.slice(0, 6).map((h, i) => (
            <li key={`${h.lat}${h.lng}`}>
              <a href={`https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lng}#map=15/${h.lat}/${h.lng}`} target="_blank" rel="noreferrer" className="group block rounded-lg p-2 transition-colors hover:bg-paper">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-redDim font-display text-[13px] font-semibold text-signal-red">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-[13px] font-medium text-ink-900"><MapPin size={12} className="text-slate-muted" />{h.lat.toFixed(3)}, {h.lng.toFixed(3)}</p>
                    <p className="text-[12px] text-slate-muted">{h.sos} SOS · {h.reports} reports{h.recentSOS > 0 ? ` · ${h.recentSOS} this week` : ''}</p>
                  </div>
                  <span className="font-mono text-[12px] text-slate-muted">{h.riskScore}</span>
                </div>
                <div className="ml-10 mt-1.5 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-signal-amber to-signal-red transition-all duration-1000" style={{ width: `${(h.riskScore / max) * 100}%` }} /></div>
              </a>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- AI insights */
const SEV = {
  critical: { icon: AlertOctagon, cls: 'text-signal-red bg-signal-redDim', bar: '#D6402F' },
  warning: { icon: AlertTriangle, cls: 'text-signal-amber bg-signal-amberDim', bar: '#C97A1F' },
  info: { icon: Info, cls: 'text-signal-blue bg-signal-blueDim', bar: '#5B6CFF' },
  positive: { icon: CheckCircle2, cls: 'text-signal-green bg-signal-greenDim', bar: '#1F8A57' },
} as const;

export function InsightsFeed({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const order = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
  const list = [...insights].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, limit ?? insights.length);
  return (
    <ul className="stagger space-y-2.5">
      {list.map((ins, i) => {
        const S = SEV[ins.severity];
        return (
          <li key={i} className="flex gap-3 rounded-lg border border-line p-3 transition-all duration-200 hover:translate-x-1 hover:border-accent/50" style={{ borderLeft: `3px solid ${S.bar}` }}>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${S.cls}`}><S.icon size={15} /></span>
            <div className="min-w-0"><p className="text-[13.5px] font-semibold text-ink-900">{ins.title}</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-muted">{ins.detail}</p></div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------- Live SOS */
export function LiveSOSCard({ logs, activeCount }: { logs: AdminSOSLog[]; activeCount: number }) {
  return (
    <Card title="Live SOS feed" subtitle={activeCount > 0 ? `${activeCount} active right now` : 'No active alerts'} right={activeCount > 0 ? <span className="flex items-center gap-1.5 rounded-full bg-signal-redDim px-2.5 py-1 text-[11.5px] font-semibold text-signal-red"><PulseDot size={6} />LIVE</span> : <span className="flex items-center gap-1.5 rounded-full bg-signal-greenDim px-2.5 py-1 text-[11.5px] font-semibold text-signal-green"><ShieldCheck size={12} />ALL CLEAR</span>}>
      {logs.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">Nothing to show.</p> : (
        <ul className="space-y-1.5">
          {logs.map((l) => (
            <li key={l._id}>
              <Link to="/sos" className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-paper">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${l.status === 'active' ? 'bg-signal-redDim text-signal-red' : 'bg-line text-slate-muted'}`}>{l.status === 'active' ? <PulseDot size={8} /> : <Radio size={14} />}</span>
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-900">{SOS_TRIGGER_LABEL[l.triggerType] ?? l.triggerType}{l.duress && <span className="rounded bg-signal-red px-1 text-[10px] font-bold text-white">DURESS</span>}</p><p className="text-[12px] text-slate-muted">{new Date(l.triggeredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {l.status.replace('_', ' ')}</p></div>
                <ArrowUpRight size={14} className="text-slate-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- Detection adoption */
function Ring({ pct, label, icon, color }: { pct: number; label: string; icon: ReactNode; color: string }) {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative h-[68px] w-[68px]">
        <svg viewBox="0 0 64 64" className="-rotate-90"><circle cx="32" cy="32" r={R} fill="none" stroke="var(--line)" strokeWidth="6" /><circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} /></svg>
        <div className="absolute inset-0 flex items-center justify-center text-slate-muted">{icon}</div>
      </div>
      <p className="font-display text-[15px] font-semibold text-ink-900">{pct}%</p>
      <p className="text-[11.5px] text-slate-muted">{label}</p>
    </div>
  );
}
export function AdoptionCard({ d }: { d: Intelligence['detection']['adoption'] }) {
  return (
    <Card title="Protection adoption" subtitle={`${d.users.toLocaleString()} active users have switched on…`}>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <Ring pct={d.autoSOS} label="Auto-SOS" color="#5B6CFF" icon={<ShieldCheck size={18} />} />
        <Ring pct={d.voice} label="Voice" color="#33D6B0" icon={<Mic size={18} />} />
        <Ring pct={d.motion} label="Motion" color="#F2A93B" icon={<Activity size={18} />} />
        <Ring pct={d.tone} label="Tone" color="#8A5BFF" icon={<Radio size={18} />} />
        <Ring pct={d.evidence} label="Evidence" color="#2AA7D6" icon={<Archive size={18} />} />
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- Report types */
export function ReportTypesCard({ types }: { types: Intelligence['reportTypes'] }) {
  const rows = Object.entries(types).map(([k, v]) => ({ name: REPORT_TYPE_LABEL[k] ?? k, total: v.total, high: (v.severity.high ?? 0) + (v.severity.critical ?? 0) })).sort((a, b) => b.total - a.total);
  return (
    <Card title="Reported incidents" subtitle="By type · darker = high / critical severity">
      {rows.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No reports in this period.</p> : (
        <div style={{ height: Math.max(150, rows.length * 38) }}>
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 12, fill: '#8a94a6' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12.5 }} cursor={{ fill: 'rgba(128,128,160,.08)' }} />
              <Bar dataKey="total" name="Total" fill="#5B6CFF" radius={[0, 6, 6, 0]} barSize={14} animationDuration={1100} />
              <Bar dataKey="high" name="High / critical" fill="#D6402F" radius={[0, 6, 6, 0]} barSize={14} animationDuration={1100} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
