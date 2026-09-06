import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Link } from 'react-router-dom';
import * as analyticsService from '@/services/analytics.service';
import type { AdminOverview, SOSTrendPoint, PeakTimingPoint } from '@/types';
import { StatCard } from '@/components/common/StatCard';
import { PageSpinner } from '@/components/common/Spinner';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function DashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trend, setTrend] = useState<SOSTrendPoint[]>([]);
  const [timings, setTimings] = useState<PeakTimingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [overviewRes, trendRes, timingsRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getSOSTrend(14),
          analyticsService.getPeakTimings(14),
        ]);
        if (cancelled) return;
        setOverview(overviewRes);
        setTrend(trendRes);
        setTimings(timingsRes);
      } catch (err) {
        if (!cancelled) toast.error(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !overview) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      {overview.activeSOSNow > 0 && (
        <Link
          to="/sos"
          className="flex items-center justify-between rounded-lg border border-signal-red/30 bg-signal-redDim px-4 py-3 text-signal-red hover:bg-signal-redDim/70"
        >
          <span className="text-[14px] font-medium">
            {overview.activeSOSNow} active SOS alert{overview.activeSOSNow > 1 ? 's' : ''} need attention
          </span>
          <span className="text-[13px] underline">View SOS monitor →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total users" value={overview.totalUsers.toLocaleString()} />
        <StatCard label="Active users" value={overview.activeUsers.toLocaleString()} />
        <StatCard
          label="SOS in last 24h"
          value={overview.sosLast24h}
          tone={overview.sosLast24h > 0 ? 'amber' : 'default'}
        />
        <StatCard
          label="Active SOS now"
          value={overview.activeSOSNow}
          tone={overview.activeSOSNow > 0 ? 'red' : 'default'}
        />
        <StatCard label="Pending reports" value={overview.pendingReports} tone={overview.pendingReports > 0 ? 'amber' : 'default'} />
        <StatCard label="Total reports" value={overview.totalReports} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 font-display text-[15px] font-semibold text-ink-900">SOS trend — last 14 days</h2>
          {trend.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-muted">No SOS events recorded in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E7ED" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 12, fill: '#5B6472' }}
                  axisLine={{ stroke: '#E3E7ED' }}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6472' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  labelFormatter={(v) => formatDateLabel(v as string)}
                  formatter={(v: number) => [v, 'SOS events']}
                  contentStyle={{ fontSize: 13, borderRadius: 6, borderColor: '#E3E7ED' }}
                />
                <Line type="monotone" dataKey="count" stroke="#D6402F" strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="mb-4 font-display text-[15px] font-semibold text-ink-900">Peak hours — last 14 days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E7ED" />
              <XAxis
                dataKey="hour"
                tickFormatter={formatHourLabel}
                interval={2}
                tick={{ fontSize: 12, fill: '#5B6472' }}
                axisLine={{ stroke: '#E3E7ED' }}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6472' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                labelFormatter={(v) => formatHourLabel(v as number)}
                contentStyle={{ fontSize: 13, borderRadius: 6, borderColor: '#E3E7ED' }}
              />
              <Bar dataKey="sosCount" name="SOS" fill="#D6402F" radius={[2, 2, 0, 0]} />
              <Bar dataKey="reportCount" name="Reports" fill="#1E5FA8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
