import { useEffect, useState, useCallback } from 'react';
import { MapPin, Check, X } from 'lucide-react';
import * as reportsService from '@/services/reports.service';
import type { AdminReport, ReportStatus, PageMeta } from '@/types';
import { REPORT_STATUS_LABEL, REPORT_TYPE_LABEL } from '@/constants';
import { PageSpinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';
import { Pagination } from '@/components/common/Pagination';
import { Modal } from '@/components/common/Modal';
import { MapPreviewModal } from '@/components/common/MapPreviewModal';
import { RoleGate } from '@/components/common/RoleGate';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

const STATUS_TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resolved', label: 'Resolved' },
];

function statusTone(status: ReportStatus) {
  if (status === 'pending') return 'amber' as const;
  if (status === 'verified' || status === 'resolved') return 'green' as const;
  return 'red' as const;
}

function severityTone(severity: string) {
  if (severity === 'critical' || severity === 'high') return 'red' as const;
  if (severity === 'medium') return 'amber' as const;
  return 'neutral' as const;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const LIMIT = 20;

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [status, setStatus] = useState<ReportStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mapTarget, setMapTarget] = useState<AdminReport | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminReport | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.listReports({
        page,
        limit: LIMIT,
        status: status === 'all' ? undefined : status,
      });
      setReports(res.reports);
      setMeta(res.meta);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify(report: AdminReport) {
    setActioningId(report._id);
    try {
      await reportsService.verifyReport(report._id);
      toast.success('Report marked as verified.');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget || rejectReason.trim().length === 0) return;
    setActioningId(rejectTarget._id);
    try {
      await reportsService.rejectReport(rejectTarget._id, rejectReason.trim());
      toast.success('Report rejected.');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

      <div className="panel overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : reports.length === 0 ? (
          <EmptyState title="No reports" description="Nothing matches this filter right now." />
        ) : (
          <div className="divide-y divide-line">
            {reports.map((report) => (
              <div key={report._id} className="flex flex-col gap-2.5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[14px] font-semibold text-ink-900">
                      {REPORT_TYPE_LABEL[report.type] ?? report.type}
                    </span>
                    <StatusPill label={REPORT_STATUS_LABEL[report.status]} tone={statusTone(report.status)} />
                    <StatusPill label={report.severity} tone={severityTone(report.severity)} />
                    {report.isAnonymous && <StatusPill label="Anonymous" tone="neutral" />}
                  </div>
                  <span className="text-[12.5px] text-slate-muted">{formatDate(report.createdAt)}</span>
                </div>

                <p className="max-w-3xl text-[13.5px] text-ink-900/90">{report.description}</p>

                {report.status === 'rejected' && report.rejectionReason && (
                  <p className="text-[12.5px] text-signal-red">Rejection reason: {report.rejectionReason}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => setMapTarget(report)}
                    className="flex items-center gap-1 text-[13px] text-signal-blue hover:underline"
                  >
                    <MapPin size={14} /> {report.address ?? 'View location'}
                  </button>

                  {report.status === 'pending' && (
                    <RoleGate allow={['super_admin', 'moderator']}>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleVerify(report)}
                          disabled={actioningId === report._id}
                          className="btn-secondary border-signal-green/40 px-3 py-1.5 text-[13px] text-signal-green hover:bg-signal-greenDim"
                        >
                          <Check size={14} /> Verify
                        </button>
                        <button
                          onClick={() => setRejectTarget(report)}
                          disabled={actioningId === report._id}
                          className="btn-secondary border-signal-red/40 px-3 py-1.5 text-[13px] text-signal-red hover:bg-signal-redDim"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </RoleGate>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {mapTarget && (
        <MapPreviewModal
          title={REPORT_TYPE_LABEL[mapTarget.type] ?? 'Report location'}
          lat={mapTarget.location.coordinates[1]}
          lng={mapTarget.location.coordinates[0]}
          markerColor="#C97A1F"
          onClose={() => setMapTarget(null)}
        />
      )}

      {rejectTarget && (
        <Modal
          title="Reject report"
          onClose={() => {
            setRejectTarget(null);
            setRejectReason('');
          }}
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleReject}
                disabled={rejectReason.trim().length === 0 || actioningId === rejectTarget._id}
              >
                Reject report
              </button>
            </>
          }
        >
          <label htmlFor="reason" className="field-label">
            Reason — shown in the report's audit trail
          </label>
          <textarea
            id="reason"
            rows={3}
            maxLength={1000}
            className="field-input resize-none"
            placeholder="e.g. Duplicate of an already-verified report"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
