import { Schema, model, Document } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

export type RiskLevel = 'green' | 'yellow' | 'red';
export type HeatmapDataSource = 'crime_dataset' | 'user_reports' | 'sos_logs' | 'ai_prediction' | 'hybrid';

/** See docs/architecture/SAFESCORE_ALGORITHM.md for how each factor is derived. */
export interface IHeatmapFactors {
  crimeDatasetScore: number; // 0–100
  reportDensityScore: number; // 0–100
  sosDensityScore: number; // 0–100
  timeOfDayRiskScore: number; // 0–100
}

export interface IHeatmap extends Document {
  zoneId: string; // geohash or grid-cell identifier, unique per cell
  center: IGeoPoint;
  radiusMeters: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0–100, higher = more dangerous (inverse of SafeScore)
  factors: IHeatmapFactors;
  dataSource: HeatmapDataSource;
  reportCount: number;
  sosCount: number;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const heatmapSchema = new Schema<IHeatmap>(
  {
    zoneId: { type: String, required: true, unique: true, index: true },
    center: { type: geoPointSchema, required: true },
    radiusMeters: { type: Number, required: true, default: 250 },
    riskLevel: { type: String, enum: ['green', 'yellow', 'red'], required: true, index: true },
    riskScore: { type: Number, min: 0, max: 100, required: true },
    factors: {
      crimeDatasetScore: { type: Number, min: 0, max: 100, default: 0 },
      reportDensityScore: { type: Number, min: 0, max: 100, default: 0 },
      sosDensityScore: { type: Number, min: 0, max: 100, default: 0 },
      timeOfDayRiskScore: { type: Number, min: 0, max: 100, default: 0 },
    },
    dataSource: {
      type: String,
      enum: ['crime_dataset', 'user_reports', 'sos_logs', 'ai_prediction', 'hybrid'],
      default: 'hybrid',
    },
    reportCount: { type: Number, default: 0 },
    sosCount: { type: Number, default: 0 },
    lastCalculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

heatmapSchema.index({ center: '2dsphere' });

export default model<IHeatmap>('Heatmap', heatmapSchema);
