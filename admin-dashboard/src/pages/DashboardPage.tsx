import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sparkles, Users as UsersIcon, ArrowRight } from 'lucide-react';
import * as analyticsService from '@/services/analytics.service';
import { listSOS } from '@/services/sos.service';
import { useIntelligence } from '@/hooks/useIntelligence';
import type { AdminOverview, AdminSOSLog } from '@/types';
import { RiskGauge, HeatGrid, Skeleton, PulseDot, AnimatedNumber } from '@/components/ui/primitives';
import { AdoptionCard, Card, HotspotsCard, InsightsFeed, KpiCard, LiveSOSCard, ReportTypesCard, TrendCard, TriggerCard } from '@/components/dashboard/widgets';

const PERIODS = [7, 30, 90] as const;
const LEVEL_COPY = {
  low: { label: 'Low risk', cls: 'bg-signal-greenDim text-signal-green' },
  elevated: { label: 'Elevated', cls: 'bg-signal-amberDim text-signal-amber' },
  high: { label: 'High risk', cls: 'bg-signal-redDim text-signal-red' },
} as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4"><Skeleton className="h-56" /><div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}</div></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div>
    </div>
  );
}

export function DashboardPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { data, error, loading, reload } = useIntelligence(days);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [live, setLive] = useState<AdminSOSLog[]>([]);

  useEffect(() => { analyticsService.getOverview().then(setOverview).catch(() => undefined); }, []);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        let res = await listSOS({ page: 1, limit: 6, status: 'active' });
        if (res.sosLogs.length === 0) res = await listSOS({ page: 1, limit: 6 });
        if (alive) setLive(res.sosLogs);
      } catch { /* keep previous */ }
    };
    void pull();
    const t = setInterval(() => void pull(), 12000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (loading && !data) return <DashboardSkeleton />;
  if (error && !data) return (
    <div className="panel mx-auto mt-10 max-w-md p-8 text-center">
      <p className="font-display text-[17px] font-semibold text-ink-900">Couldn't load intelligence</p>
      <p className="mt-1 text-[13.5px] text-slate-muted">{error}</p>
      <button onClick={reload} className="btn-primary mt-4">Try again</button>
    </div>
  );
  if (!data) return null;

  const k = data.kpis;
  const series = data.daily.map((d) => d.count);
  const lvl = LEVEL_COPY[data.riskIndex.level];
  const top = data.insights.find((i) => i.severity === 'critical' || i.severity === 'warning');

  return (
    <div className="space-y-5">
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-semibold leading-tight text-ink-900">Safety <span className="text-gradient">Command Center</span></h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-muted">
            <span className="flex items-center gap-1.5"><PulseDot color="#1F8A57" size={7} />Live · updated {new Date(data.generatedAt).toLocaleTimeString()}</span>
            {overview && <span className="flex items-center gap-1.5"><UsersIcon size={13} /><AnimatedNumber value={overview.totalUsers} /> users · <AnimatedNumber value={overview.activeUsers} /> active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-0.5">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setDays(p)} className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-all ${days === p ? 'bg-accent text-white shadow-glow' : 'text-slate-muted hover:text-ink-900'}`}>{p}d</button>
            ))}
          </div>
          <button onClick={reload} className="btn-secondary !px-3 !py-2" aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {top && (
        <Link to="/insights" className="group flex items-center gap-3 rounded-xl border border-accent/30 bg-gradient-to-r from-accent-soft to-transparent px-4 py-3 transition-all hover:border-accent hover:shadow-glow dark:from-accent/15">
          <Sparkles size={18} className="text-accent" />
          <p className="flex-1 text-[13.5px] text-ink-900"><span className="font-semibold">{top.title}.</span> <span className="text-slate-muted">{top.detail}</span></p>
          <ArrowRight size={16} className="text-accent transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      {/* ---- risk gauge + KPIs ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card title="City risk index" subtitle="Active SOS · 24h surge · open reports · anomalies" className="flex flex-col items-center text-center">
          <RiskGauge score={data.riskIndex.score} level={data.riskIndex.level} />
          <span className={`mt-1 rounded-full px-3 py-1 text-[12px] font-semibold ${lvl.cls}`}>{lvl.label}</span>
          <p className="mt-2 text-[12px] text-slate-muted">{data.riskIndex.last24h} SOS in 24h vs {data.riskIndex.dailyAvgPrev7}/day average</p>
        </Card>
        <div className="stagger grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-3">
          <KpiCard label={`SOS events (${days}d)`} value={k.sosTotal} delta={k.sosDeltaPct} spark={series} color="#5B6CFF" hint="vs previous period" />
          <KpiCard label="Active right now" value={k.activeNow} color="#D6402F" alert={k.activeNow > 0} hint={k.activeNow > 0 ? 'needs attention' : 'all clear'} spark={series.slice(-10)} />
          <KpiCard label="False-alarm rate" value={Math.round(k.falseAlarmRate * 100)} suffix="%" color="#F2A93B" hint="lower is better" />
          <KpiCard label="Avg time to resolve" value={k.avgResolutionMinutes ?? 0} decimals={1} suffix=" min" color="#33D6B0" hint={k.avgResolutionMinutes === null ? 'no resolved events yet' : 'resolved SOS only'} />
          <KpiCard label="Evidence coverage" value={Math.round(k.evidenceCoverage * 100)} suffix="%" color="#2AA7D6" hint="SOS with audio" />
          <KpiCard label="Auto-detected share" value={Math.round(k.autoTriggerShare * 100)} suffix="%" color="#8A5BFF" hint={k.duressEvents > 0 ? `${k.duressEvents} duress event(s)` : 'voice · motion · shake'} />
        </div>
      </div>

      {/* ---- trend + triggers ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><TrendCard data={data} /></div>
        <TriggerCard triggers={data.triggers} />
      </div>

      {/* ---- heat grid + hotspots ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="When do emergencies happen?" subtitle={`Weekday × hour, last ${days} days`} className="lg:col-span-2"><HeatGrid matrix={data.heatmap} /></Card>
        <HotspotsCard hotspots={data.hotspots} />
      </div>

      {/* ---- insights + live ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="AI insights" subtitle="Generated from live data — explainable rules, no black box" right={<Link to="/insights" className="text-[12.5px] font-medium text-accent hover:underline">See all →</Link>} className="lg:col-span-2">
          <InsightsFeed insights={data.insights} limit={5} />
        </Card>
        <LiveSOSCard logs={live} activeCount={k.activeNow} />
      </div>

      {/* ---- adoption + reports ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdoptionCard d={data.detection.adoption} />
        <ReportTypesCard types={data.reportTypes} />
      </div>
    </div>
  );
}
