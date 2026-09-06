import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema, IGeoLineString, geoLineStringSchema } from '../types/common.types';

export interface IRoute extends Document {
  userId: Types.ObjectId;
  origin: IGeoPoint;
  destination: IGeoPoint;
  routeGeometry: IGeoLineString;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  safeScore: number; // 0–100, min-along-route score (see SAFESCORE_ALGORITHM.md §6)
  riskZonesCrossed: Types.ObjectId[]; // refs to Heatmap
  wasSelected: boolean; // true if the user chose this route over alternatives offered
  createdAt: Date;
}

const routeSchema = new Schema<IRoute>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    origin: { type: geoPointSchema, required: true },
    destination: { type: geoPointSchema, required: true },
    routeGeometry: { type: geoLineStringSchema, required: true },
    distanceMeters: { type: Number, required: true },
    estimatedDurationSeconds: { type: Number, required: true },
    safeScore: { type: Number, min: 0, max: 100, required: true },
    riskZonesCrossed: [{ type: Schema.Types.ObjectId, ref: 'Heatmap' }],
    wasSelected: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

routeSchema.index({ userId: 1, createdAt: -1 });

export default model<IRoute>('Route', routeSchema);
