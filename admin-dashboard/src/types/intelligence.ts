export interface Kpis {
  sosTotal: number; sosPrevious: number; sosDeltaPct: number; activeNow: number; falseAlarmRate: number; autoTriggerShare: number;
  avgResolutionMinutes: number | null; evidenceCoverage: number; duressEvents: number; pendingReports: number;
}
export interface TriggerStat { type: string; total: number; falseAlarms: number; duress: number; precision: number }
export interface Hotspot { lat: number; lng: number; sos: number; reports: number; recentSOS: number; riskScore: number }
export interface Insight { severity: 'critical' | 'warning' | 'info' | 'positive'; title: string; detail: string }
export interface Intelligence {
  periodDays: number;
  generatedAt: string;
  kpis: Kpis;
  riskIndex: { score: number; level: 'low' | 'elevated' | 'high'; last24h: number; dailyAvgPrev7: number };
  status: Record<string, number>;
  triggers: TriggerStat[];
  hourly: { hour: number; count: number }[];
  heatmap: number[][];
  daily: { date: string; count: number }[];
  forecast: { date: string; predicted: number }[];
  anomalies: { date: string; count: number; zScore: number; expected: number }[];
  hotspots: Hotspot[];
  reportTypes: Record<string, { total: number; severity: Record<string, number> }>;
  detection: {
    voice: { keyword: string; count: number; triggeredSOS: number; avgScream: number }[];
    sensors: { eventType: string; count: number }[];
    adoption: { voice: number; motion: number; tone: number; autoSOS: number; evidence: number; users: number };
  };
  journeys: Record<string, number>;
  userGrowth: { date: string; count: number }[];
  insights: Insight[];
}
export interface EvidenceChunkAdmin {
  _id: string; seq: number; durationMs: number; sizeBytes: number; sha256: string; chainHash: string; recordedAt: string;
  screamProbability?: number; detectedKeyword?: string; url?: string;
}
export interface SOSEvidence {
  chunks: EvidenceChunkAdmin[];
  verification: { valid: boolean; chunkCount: number; firstBrokenSeq: number | null; gaps: number[]; headHash: string | null; problems: string[]; deepChecked: boolean };
  summary: string;
}
