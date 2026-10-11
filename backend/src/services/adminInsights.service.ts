import SOSLog from '../models/SOSLog.model';
import Report from '../models/Report.model';
import User from '../models/User.model';
import VoiceLog from '../models/VoiceLog.model';
import SensorLog from '../models/SensorLog.model';
import Evidence from '../models/Evidence.model';
import Journey from '../models/Journey.model';

const TZ = 'Asia/Kolkata';
const DAY = 86400000;

/** Holt's linear (double exponential) smoothing — a deliberately simple, explainable forecaster. */
export function holtForecast(series: number[], horizon: number, alpha = 0.5, beta = 0.3): number[] {
  if (series.length < 3) return Array(horizon).fill(series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0);
  let level = series[0];
  let trend = series[1] - series[0];
  for (let i = 1; i < series.length; i++) {
    const prev = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, h) => Math.max(0, +(level + (h + 1) * trend).toFixed(2)));
}

export function detectAnomalies(dates: string[], counts: number[], window = 14, z = 2): { date: string; count: number; zScore: number; expected: number }[] {
  const out: { date: string; count: number; zScore: number; expected: number }[] = [];
  for (let i = window; i < counts.length; i++) {
    const w = counts.slice(i - window, i);
    const mean = w.reduce((a, b) => a + b, 0) / w.length;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length) || 0.8; // floor so 0→1 isn't "infinite σ"
    const zs = (counts[i] - mean) / sd;
    if (zs >= z && counts[i] >= 2) out.push({ date: dates[i], count: counts[i], zScore: +zs.toFixed(2), expected: +mean.toFixed(1) });
  }
  return out;
}

const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

export class AdminInsightsService {
  async intelligence(days = 30) {
    const now = new Date();
    const since = new Date(now.getTime() - days * DAY);
    const prevSince = new Date(since.getTime() - days * DAY);

    const [
      total, prevTotal, active, statusAgg, triggerAgg, resolveAgg, evidenceSos, hourAgg, dowHourAgg, dailyAgg,
      sosPoints, reportPoints, reportTypeAgg, voiceAgg, sensorAgg, prefAgg, userGrowth, journeyAgg, last24, last7avgAgg, pendingReports,
    ] = await Promise.all([
      SOSLog.countDocuments({ triggeredAt: { $gte: since } }),
      SOSLog.countDocuments({ triggeredAt: { $gte: prevSince, $lt: since } }),
      SOSLog.countDocuments({ status: 'active' }),
      SOSLog.aggregate([{ $match: { triggeredAt: { $gte: since } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      SOSLog.aggregate([
        { $match: { triggeredAt: { $gte: since } } },
        { $group: { _id: '$triggerType', total: { $sum: 1 }, falseAlarms: { $sum: { $cond: [{ $eq: ['$status', 'false_alarm'] }, 1, 0] } }, duress: { $sum: { $cond: ['$duress', 1, 0] } } } },
      ]),
      SOSLog.aggregate([
        { $match: { triggeredAt: { $gte: since }, resolvedAt: { $exists: true }, status: 'resolved' } },
        { $project: { mins: { $divide: [{ $subtract: ['$resolvedAt', '$triggeredAt'] }, 60000] } } },
        { $group: { _id: null, avg: { $avg: '$mins' }, max: { $max: '$mins' }, n: { $sum: 1 } } },
      ]),
      Evidence.distinct('sosLogId', { createdAt: { $gte: since } }),
      SOSLog.aggregate([{ $match: { triggeredAt: { $gte: since } } }, { $group: { _id: { $hour: { date: '$triggeredAt', timezone: TZ } }, n: { $sum: 1 } } }]),
      SOSLog.aggregate([
        { $match: { triggeredAt: { $gte: since } } },
        { $group: { _id: { d: { $dayOfWeek: { date: '$triggeredAt', timezone: TZ } }, h: { $hour: { date: '$triggeredAt', timezone: TZ } } }, n: { $sum: 1 } } },
      ]),
      SOSLog.aggregate([
        { $match: { triggeredAt: { $gte: new Date(now.getTime() - Math.max(days, 28) * DAY) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$triggeredAt', timezone: TZ } }, n: { $sum: 1 } } },
      ]),
      SOSLog.find({ triggeredAt: { $gte: since } }).select('location triggeredAt status').lean(),
      Report.find({ createdAt: { $gte: since } }).select('location type severity status').lean(),
      Report.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { type: '$type', severity: '$severity' }, n: { $sum: 1 } } }]),
      VoiceLog.aggregate([{ $match: { recordedAt: { $gte: since } } }, { $group: { _id: '$detectedKeyword', n: { $sum: 1 }, triggered: { $sum: { $cond: ['$triggeredSOS', 1, 0] } }, scream: { $avg: '$toneAnalysis.screamProbability' } } }]),
      SensorLog.aggregate([{ $match: { recordedAt: { $gte: since } } }, { $group: { _id: '$eventType', n: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, users: { $sum: 1 }, voice: { $sum: { $cond: ['$safetyPreferences.voiceDetectionEnabled', 1, 0] } }, motion: { $sum: { $cond: ['$safetyPreferences.motionDetectionEnabled', 1, 0] } }, tone: { $sum: { $cond: ['$safetyPreferences.toneDetectionEnabled', 1, 0] } }, auto: { $sum: { $cond: ['$safetyPreferences.autoSOSEnabled', 1, 0] } }, evidence: { $sum: { $cond: ['$safetyPreferences.silentEvidenceEnabled', 1, 0] } } } },
      ]),
      User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } }]),
      Journey.aggregate([{ $match: { startedAt: { $gte: since } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      SOSLog.countDocuments({ triggeredAt: { $gte: new Date(now.getTime() - DAY) } }),
      SOSLog.countDocuments({ triggeredAt: { $gte: new Date(now.getTime() - 8 * DAY), $lt: new Date(now.getTime() - DAY) } }),
      Report.countDocuments({ status: 'pending' }),
    ]);

    // ---- daily series (filled) -------------------------------------------------
    const dailyMap = new Map<string, number>(dailyAgg.map((d: { _id: string; n: number }) => [d._id, d.n]));
    const dates: string[] = [];
    const counts: number[] = [];
    const span = Math.max(days, 28);
    for (let i = span - 1; i >= 0; i--) {
      const key = new Date(now.getTime() - i * DAY + 5.5 * 3600000).toISOString().slice(0, 10);
      dates.push(key);
      counts.push(dailyMap.get(key) ?? 0);
    }
    const forecast = holtForecast(counts, 7).map((v, i) => ({ date: new Date(now.getTime() + (i + 1) * DAY + 5.5 * 3600000).toISOString().slice(0, 10), predicted: v }));
    const anomalies = detectAnomalies(dates, counts);
    const daily = dates.map((date, i) => ({ date, count: counts[i] })).slice(-days);

    // ---- hourly + heatmap --------------------------------------------------------
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourAgg.find((x: { _id: number }) => x._id === h)?.n ?? 0 }));
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0)); // Mon..Sun x 24
    for (const r of dowHourAgg as { _id: { d: number; h: number }; n: number }[]) matrix[(r._id.d + 5) % 7][r._id.h] = r.n; // Mongo: 1=Sun
    const peak = [...hourly].sort((a, b) => b.count - a.count)[0];

    // ---- breakdowns --------------------------------------------------------------
    const status = Object.fromEntries((statusAgg as { _id: string; n: number }[]).map((s) => [s._id, s.n]));
    const falseAlarms = status.false_alarm ?? 0;
    const triggers = (triggerAgg as { _id: string; total: number; falseAlarms: number; duress: number }[]).map((t) => ({
      type: t._id, total: t.total, falseAlarms: t.falseAlarms, duress: t.duress, precision: t.total ? +(1 - t.falseAlarms / t.total).toFixed(3) : 1,
    }));
    const autoCount = triggers.filter((t) => t.type !== 'manual' && t.type !== 'admin').reduce((s, t) => s + t.total, 0);

    // ---- hotspots (≈1.1 km grid) -------------------------------------------------
    type Cell = { key: string; lat: number; lng: number; sos: number; reports: number; recent: number; sumLat: number; sumLng: number };
    const cells = new Map<string, Cell>();
    const add = (coords: number[], kind: 'sos' | 'reports', recent: boolean) => {
      const [lng, lat] = coords;
      const key = `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`;
      const c = cells.get(key) ?? { key, lat, lng, sos: 0, reports: 0, recent: 0, sumLat: 0, sumLng: 0 };
      c[kind] += 1; c.sumLat += lat; c.sumLng += lng; if (recent) c.recent += 1;
      cells.set(key, c);
    };
    const weekAgo = now.getTime() - 7 * DAY;
    for (const s of sosPoints) add(s.location.coordinates, 'sos', new Date(s.triggeredAt).getTime() >= weekAgo);
    for (const r of reportPoints) add(r.location.coordinates, 'reports', false);
    const hotspots = [...cells.values()]
      .map((c) => ({ lat: +(c.sumLat / (c.sos + c.reports)).toFixed(5), lng: +(c.sumLng / (c.sos + c.reports)).toFixed(5), sos: c.sos, reports: c.reports, recentSOS: c.recent, riskScore: c.sos * 3 + c.reports }))
      .sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);
    const hotspotShare = hotspots.length && total + reportPoints.length ? Math.round(((hotspots[0].sos + hotspots[0].reports) / (total + reportPoints.length)) * 100) : 0;

    // ---- reports ----------------------------------------------------------------
    const reportTypes: Record<string, { total: number; severity: Record<string, number> }> = {};
    for (const r of reportTypeAgg as { _id: { type: string; severity: string }; n: number }[]) {
      const t = (reportTypes[r._id.type] ??= { total: 0, severity: {} });
      t.total += r.n; t.severity[r._id.severity] = (t.severity[r._id.severity] ?? 0) + r.n;
    }

    // ---- detection engine ------------------------------------------------------
    const voice = (voiceAgg as { _id: string; n: number; triggered: number; scream: number }[]).map((v) => ({ keyword: v._id, count: v.n, triggeredSOS: v.triggered, avgScream: +(v.scream ?? 0).toFixed(2) }));
    const sensors = (sensorAgg as { _id: string; n: number }[]).map((s) => ({ eventType: s._id, count: s.n }));
    const prefs = prefAgg[0] ?? { users: 0, voice: 0, motion: 0, tone: 0, auto: 0, evidence: 0 };
    const adoption = (n: number) => (prefs.users ? Math.round((n / prefs.users) * 100) : 0);

    // ---- composite risk index ------------------------------------------------
    const dailyAvgPrev7 = last7avgAgg / 7;
    const surge = dailyAvgPrev7 > 0 ? last24 / dailyAvgPrev7 : last24 > 0 ? 2 : 0;
    const riskIndex = Math.round(Math.min(100, active * 12 + Math.min(40, surge * 14) + Math.min(20, pendingReports * 2) + Math.min(15, anomalies.filter((a) => a.date >= dates[dates.length - 3]).length * 15)));
    const riskLevel = riskIndex >= 66 ? 'high' : riskIndex >= 33 ? 'elevated' : 'low';

    // ---- natural-language insights ------------------------------------------
    const insights: { severity: 'critical' | 'warning' | 'info' | 'positive'; title: string; detail: string }[] = [];
    const delta = pct(total, prevTotal);
    if (prevTotal > 0 || total > 0) insights.push({ severity: delta >= 25 ? 'warning' : delta <= -15 ? 'positive' : 'info', title: `SOS volume ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta)}%`, detail: `${total} events in the last ${days} days vs ${prevTotal} in the previous ${days}.` });
    if (active > 0) insights.push({ severity: 'critical', title: `${active} SOS event${active > 1 ? 's' : ''} active right now`, detail: 'Open the SOS Monitor to follow live location and evidence.' });
    if (peak && peak.count > 0) insights.push({ severity: 'info', title: `Peak risk window ${String(peak.hour).padStart(2, '0')}:00–${String((peak.hour + 1) % 24).padStart(2, '0')}:00 IST`, detail: `${peak.count} events (${Math.round((peak.count / Math.max(total, 1)) * 100)}% of all) fall in this hour — consider time-targeted community alerts.` });
    if (hotspots[0] && hotspots[0].riskScore >= 3) insights.push({ severity: 'warning', title: 'Top hotspot identified', detail: `A ~1 km zone near ${hotspots[0].lat}, ${hotspots[0].lng} holds ${hotspotShare}% of all incidents (${hotspots[0].sos} SOS, ${hotspots[0].reports} reports).` });
    for (const t of triggers) if (t.total >= 5 && t.precision < 0.6 && t.type !== 'manual') insights.push({ severity: 'warning', title: `${t.type.replace('_', ' ')} detector: ${Math.round((1 - t.precision) * 100)}% false alarms`, detail: `${t.falseAlarms} of ${t.total} auto-triggers were marked false alarm. Review thresholds or retrain with confirmed events.` });
    for (const a of anomalies.slice(-2)) insights.push({ severity: 'warning', title: `Anomaly on ${a.date}`, detail: `${a.count} SOS events vs ~${a.expected} expected (${a.zScore}σ above the 14-day norm).` });
    if (total > 0) { const cov = Math.round((evidenceSos.length / total) * 100); insights.push({ severity: cov < 40 ? 'warning' : 'positive', title: `${cov}% of SOS events have audio evidence`, detail: cov < 40 ? 'Low coverage — check microphone permission onboarding and Silent Evidence adoption.' : 'Evidence capture is working well.' }); }
    if (pendingReports > 0) insights.push({ severity: pendingReports > 10 ? 'warning' : 'info', title: `${pendingReports} report${pendingReports > 1 ? 's' : ''} awaiting moderation`, detail: 'Unverified reports do not strengthen the heatmap until verified.' });
    const fcTotal = forecast.reduce((s, f) => s + f.predicted, 0);
    insights.push({ severity: 'info', title: `Forecast: ~${Math.round(fcTotal)} SOS events next 7 days`, detail: `Holt linear smoothing on the last ${span} days (≈${(fcTotal / 7).toFixed(1)}/day).` });

    const resolve = resolveAgg[0];
    return {
      periodDays: days,
      generatedAt: now.toISOString(),
      kpis: {
        sosTotal: total, sosPrevious: prevTotal, sosDeltaPct: delta, activeNow: active,
        falseAlarmRate: total ? +(falseAlarms / total).toFixed(3) : 0,
        autoTriggerShare: total ? +(autoCount / total).toFixed(3) : 0,
        avgResolutionMinutes: resolve ? +resolve.avg.toFixed(1) : null,
        evidenceCoverage: total ? +(evidenceSos.length / total).toFixed(3) : 0,
        duressEvents: triggers.reduce((s, t) => s + t.duress, 0),
        pendingReports,
      },
      riskIndex: { score: riskIndex, level: riskLevel, last24h: last24, dailyAvgPrev7: +dailyAvgPrev7.toFixed(2) },
      status, triggers, hourly, heatmap: matrix, daily, forecast, anomalies, hotspots, reportTypes,
      detection: { voice, sensors, adoption: { voice: adoption(prefs.voice), motion: adoption(prefs.motion), tone: adoption(prefs.tone), autoSOS: adoption(prefs.auto), evidence: adoption(prefs.evidence), users: prefs.users } },
      journeys: Object.fromEntries((journeyAgg as { _id: string; n: number }[]).map((j) => [j._id, j.n])),
      userGrowth: (userGrowth as { _id: string; n: number }[]).sort((a, b) => a._id.localeCompare(b._id)).map((u) => ({ date: u._id, count: u.n })),
      insights,
    };
  }
}
