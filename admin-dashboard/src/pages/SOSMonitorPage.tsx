import { useEffect, useState, useCallback } from 'react';
import { MapPin, RotateCw } from 'lucide-react';
import * as sosService from '@/services/sos.service';
import type { AdminSOSLog, SOSStatus, PageMeta } from '@/types';
import { SOS_STATUS_LABEL, SOS_TRIGGER_LABEL } from '@/constants';
import { PageSpinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';
import { Pagination } from '@/components/common/Pagination';
import { MapPreviewModal } from '@/components/common/MapPreviewModal';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

const STATUS_TABS: { value: SOSStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_alarm', label: 'False alarm' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusTone(status: SOSStatus) {
  if (status === 'active') return 'red' as const;
  if (status === 'resolved') return 'green' as const;
  if (status === 'false_alarm') return 'amber' as const;
  return 'neutral' as const;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const LIMIT = 20;

export function SOSMonitorPage() {
  const [logs, setLogs] = useState<AdminSOSLog[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [status, setStatus] = useState<SOSStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mapTarget, setMapTarget] = useState<AdminSOSLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const toast = useToast();

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await sosService.listSOS({
          page,
          limit: LIMIT,
          status: status === 'all' ? undefined : status,
        });
        setLogs(res.sosLogs);
        setMeta(res.meta);
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, status]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Active SOS events are time-critical — poll quietly while the tab is open.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                status === tab.value ? 'bg-ink-800 text-white' : 'bg-white text-slate-muted border border-line hover:bg-paper'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line"
          />
          <RotateCw size={13} className={autoRefresh ? 'animate-spin-slow text-signal-green' : ''} />
          Auto-refresh every 15s
        </label>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : logs.length === 0 ? (
          <EmptyState title="No SOS events" description="Nothing matches this filter right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-slate-muted">
                  <th className="px-4 py-2.5 font-medium">Triggered</th>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Trigger</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Battery</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(log.triggeredAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12.5px] text-slate-muted">{log.userId.slice(-8)}</td>
                    <td className="px-4 py-2.5">{SOS_TRIGGER_LABEL[log.triggerType] ?? log.triggerType}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill label={SOS_STATUS_LABEL[log.status] ?? log.status} tone={statusTone(log.status)} />
                    </td>
                    <td className="px-4 py-2.5">{log.batteryLevel != null ? `${log.batteryLevel}%` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setMapTarget(log)}
                        className="flex items-center gap-1 text-signal-blue hover:underline"
                      >
                        <MapPin size={14} /> View
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-muted">
                      {log.resolvedAt ? formatDateTime(log.resolvedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {mapTarget && (
        <MapPreviewModal
          title={`SOS location · ${SOS_TRIGGER_LABEL[mapTarget.triggerType]}`}
          lat={mapTarget.location.coordinates[1]}
          lng={mapTarget.location.coordinates[0]}
          onClose={() => setMapTarget(null)}
        />
      )}
    </div>
  );
}
