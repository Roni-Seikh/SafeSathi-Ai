import { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import * as exportService from '@/services/export.service';
import type { ExportType, MonthlyReportSummary } from '@/types';
import { PageSpinner } from '@/components/common/Spinner';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/services/apiClient';

const CSV_OPTIONS: { type: ExportType; label: string; description: string }[] = [
  { type: 'users', label: 'Users', description: 'Name, contact details, verification and account status.' },
  { type: 'reports', label: 'Reports', description: 'Type, severity, status and location for every filed report.' },
  { type: 'sos', label: 'SOS logs', description: 'Trigger type, status, location and battery level for every SOS event.' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function ExportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [downloadingType, setDownloadingType] = useState<ExportType | null>(null);
  const [summary, setSummary] = useState<MonthlyReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const toast = useToast();

  async function handleDownload(type: ExportType) {
    setDownloadingType(type);
    try {
      await exportService.downloadCSV(type);
      toast.success(`${type} CSV downloaded.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingType(null);
    }
  }

  async function handleGenerateSummary() {
    setLoadingSummary(true);
    setSummary(null);
    try {
      const res = await exportService.getMonthlyReport(month, year);
      setSummary(res);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel p-5">
        <h2 className="mb-1 font-display text-[15px] font-semibold text-ink-900">Raw data export</h2>
        <p className="mb-4 text-[13px] text-slate-muted">Download up to 10,000 rows per file as CSV.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CSV_OPTIONS.map((opt) => (
            <div key={opt.type} className="rounded-md border border-line p-4">
              <div className="mb-1 flex items-center gap-2">
                <FileText size={16} className="text-slate-muted" />
                <span className="font-medium text-ink-900">{opt.label}</span>
              </div>
              <p className="mb-3 text-[12.5px] text-slate-muted">{opt.description}</p>
              <button
                onClick={() => handleDownload(opt.type)}
                disabled={downloadingType === opt.type}
                className="btn-secondary w-full text-[13px]"
              >
                <Download size={14} />
                {downloadingType === opt.type ? 'Downloading…' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-ink-900">Monthly summary report</h2>
          {summary && (
            <button onClick={() => window.print()} className="btn-secondary text-[13px]">
              <Printer size={14} /> Print / save as PDF
            </button>
          )}
        </div>
        <p className="mb-4 text-[13px] text-slate-muted">
          Generates a structured summary for a given month — print it to PDF from your browser for a formatted report.
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label" htmlFor="month">
              Month
            </label>
            <select
              id="month"
              className="field-input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="year">
              Year
            </label>
            <input
              id="year"
              type="number"
              className="field-input w-28"
              value={year}
              min={2020}
              max={2100}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <button onClick={handleGenerateSummary} disabled={loadingSummary} className="btn-primary">
            {loadingSummary ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {loadingSummary && <PageSpinner />}

        {summary && (
          <div className="rounded-md border border-line p-5">
            <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-900">
              SafeSathi summary — {MONTH_NAMES[summary.month - 1]} {summary.year}
            </h3>
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] text-slate-muted">Total SOS events</p>
                <p className="font-display text-[24px] font-semibold text-ink-900">{summary.totalSOSEvents}</p>
              </div>
              <div>
                <p className="text-[13px] text-slate-muted">Total reports filed</p>
                <p className="font-display text-[24px] font-semibold text-ink-900">{summary.totalReports}</p>
              </div>
            </div>

            <h4 className="mb-2 text-[13px] font-medium text-ink-900">Daily SOS trend</h4>
            {summary.sosTrend.length === 0 ? (
              <p className="mb-4 text-[13px] text-slate-muted">No SOS events this month.</p>
            ) : (
              <table className="mb-5 w-full text-left text-[13px]">
                <tbody>
                  {summary.sosTrend.map((point) => (
                    <tr key={point.date} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-slate-muted">
                        {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-1.5 text-right font-medium text-ink-900">{point.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4 className="mb-2 text-[13px] font-medium text-ink-900">Peak hours (top 5)</h4>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-slate-muted">
                  <th className="pb-1.5 font-medium">Hour</th>
                  <th className="pb-1.5 font-medium text-right">SOS</th>
                  <th className="pb-1.5 font-medium text-right">Reports</th>
                </tr>
              </thead>
              <tbody>
                {[...summary.peakTimings]
                  .sort((a, b) => b.sosCount + b.reportCount - (a.sosCount + a.reportCount))
                  .slice(0, 5)
                  .map((row) => (
                    <tr key={row.hour} className="border-t border-line">
                      <td className="py-1.5">{row.hour}:00</td>
                      <td className="py-1.5 text-right">{row.sosCount}</td>
                      <td className="py-1.5 text-right">{row.reportCount}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
