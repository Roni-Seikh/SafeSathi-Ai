import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Cell } from 'recharts';
import { Mic, Activity, Route, Zap, FlaskConical } from 'lucide-react';
import { useIntelligence } from '@/hooks/useIntelligence';
import { Skeleton, AnimatedNumber } from '@/components/ui/primitives';
import { Card, InsightsFeed, TrendCard, TriggerCard, HotspotsCard, AdoptionCard, ReportTypesCard, PALETTE } from '@/components/dashboard/widgets';

const SENSOR_LABEL: Record<string, string> = { normal: 'Normal', running: 'Running', sudden_fall: 'Sudden fall', phone_snatch: 'Phone snatch (heuristic)', violent_movement: 'Struggle (heuristic)' };
const KW_LABEL: Record<string, string> = { help: 'Help', save_me: 'Save me', bachao: 'Bachao', chere_din: 'Let go / Chhod do', stop: 'Stop', none: 'No keyword' };
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function InsightsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useIntelligence(days);
  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /><Skeleton className="h-72" /></div>;
  if (error && !data) return <div className="panel mx-auto mt-10 max-w-md p-8 text-center"><p className="text-ink-900">{error}</p><button className="btn-primary mt-4" onClick={reload}>Retry</button></div>;
  if (!data) return null;

  const hourly = data.hourly.map((h) => ({ ...h, label: `${h.hour}:00` }));
  const peak = Math.max(...hourly.map((h) => h.count), 0);
  const journeyTotal = Object.values(data.journeys).reduce((a, b) => a + b, 0);
  const sensors = data.detection.sensors.map((s) => ({ name: SENSOR_LABEL[s.eventType] ?? s.eventType, count: s.count }));
  const voice = data.detection.voice.filter((v) => v.keyword !== 'none');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-semibold text-ink-900">AI <span className="text-gradient">Insights</span></h2>
          <p className="text-[13px] text-slate-muted">Explainable analytics: forecasting, anomaly detection, hotspot clustering and detector quality.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="field-input !w-auto" aria-label="Period">
          {[7, 14, 30, 60, 90, 180].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
      </div>

      <Card title="Everything worth your attention" subtitle={`${data.insights.length} findings, most urgent first`}><InsightsFeed insights={data.insights} /></Card>
      <TrendCard data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Anomaly detector" subtitle="Days ≥ 2σ above the trailing 14-day norm" className="lg:col-span-1">
          {data.anomalies.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No unusual spikes — volume is within the normal range.</p> : (
            <ul className="space-y-2">{data.anomalies.slice().reverse().map((a) => (
              <li key={a.date} className="flex items-center justify-between rounded-lg bg-signal-redDim px-3 py-2.5">
                <div><p className="text-[13px] font-semibold text-signal-red">{fmtDate(a.date)}</p><p className="text-[12px] text-ink-900">{a.count} events vs ~{a.expected} expected</p></div>
                <span className="font-mono text-[13px] font-semibold text-signal-red">{a.zScore}σ</span>
              </li>))}</ul>
          )}
        </Card>
        <Card title="Hour-of-day profile" subtitle="Total SOS by hour (IST)" className="lg:col-span-2">
          <div className="h-[220px]"><ResponsiveContainer><BarChart data={hourly} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E7ED" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#8a94a6' }} tickLine={false} axisLine={false} interval={1} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8a94a6' }} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(h) => `${h}:00–${Number(h) + 1}:00`} contentStyle={{ borderRadius: 10, fontSize: 12.5 }} cursor={{ fill: 'rgba(128,128,160,.08)' }} />
            <Bar dataKey="count" name="SOS" radius={[5, 5, 0, 0]} animationDuration={1100}>{hourly.map((h) => <Cell key={h.hour} fill={h.count === peak && peak > 0 ? '#D6402F' : '#5B6CFF'} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TriggerCard triggers={data.triggers} />
        <Card title="Voice Guardian activity" subtitle="Keywords that raised an SOS" right={<Mic size={16} className="text-slate-muted" />}>
          {voice.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No voice detections yet.</p> : (
            <ul className="space-y-2.5">{voice.map((v, i) => (
              <li key={v.keyword} className="text-[12.5px]"><div className="mb-1 flex justify-between"><span className="font-medium text-ink-900">{KW_LABEL[v.keyword] ?? v.keyword}</span><span className="text-slate-muted">{v.count} heard · {v.triggeredSOS} SOS</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${(v.count / Math.max(...voice.map((x) => x.count))) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></div></li>))}</ul>
          )}
        </Card>
        <Card title="Motion events" subtitle="Classified by the SisFall-trained model" right={<Activity size={16} className="text-slate-muted" />}>
          {sensors.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No sensor events logged yet.</p> : (
            <div className="h-[200px]"><ResponsiveContainer><BarChart data={sensors} layout="vertical" margin={{ left: 4, right: 12 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 11.5, fill: '#8a94a6' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12.5 }} cursor={{ fill: 'rgba(128,128,160,.08)' }} />
              <Bar dataKey="count" fill="#33D6B0" radius={[0, 6, 6, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-slate-muted"><FlaskConical size={12} className="mt-0.5 shrink-0" />Snatch/struggle are heuristic and log-only — they never auto-trigger SOS.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HotspotsCard hotspots={data.hotspots} />
        <Card title="Guardian Journeys" subtitle={`${journeyTotal} started in this period`} right={<Route size={16} className="text-slate-muted" />}>
          {journeyTotal === 0 ? <p className="py-8 text-center text-[13px] text-slate-muted">No journeys yet.</p> : (
            <div className="grid grid-cols-2 gap-3">{(['arrived', 'active', 'cancelled', 'escalated'] as const).map((s) => (
              <div key={s} className="rounded-lg bg-paper p-3"><p className="font-display text-[22px] font-semibold text-ink-900"><AnimatedNumber value={data.journeys[s] ?? 0} /></p><p className="text-[12px] capitalize text-slate-muted">{s === 'escalated' ? 'auto-escalated to SOS' : s}</p></div>))}</div>
          )}
        </Card>
        <Card title="New sign-ups" subtitle="Daily" right={<Zap size={16} className="text-slate-muted" />}>
          <div className="h-[160px]"><ResponsiveContainer><AreaChart data={data.userGrowth} margin={{ left: -24, right: 4 }}>
            <defs><linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#33D6B0" stopOpacity=".4" /><stop offset="1" stopColor="#33D6B0" stopOpacity="0" /></linearGradient></defs>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10.5, fill: '#8a94a6' }} tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#8a94a6' }} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={{ borderRadius: 10, fontSize: 12.5 }} />
            <Area type="monotone" dataKey="count" name="Sign-ups" stroke="#33D6B0" strokeWidth={2.2} fill="url(#gUsers)" /></AreaChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><AdoptionCard d={data.detection.adoption} /><ReportTypesCard types={data.reportTypes} /></div>
    </div>
  );
}
