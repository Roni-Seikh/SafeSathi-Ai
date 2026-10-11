import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

export type JourneyMode = 'walk' | 'cab' | 'transit';
export type JourneyStatus = 'active' | 'prompted' | 'arrived' | 'cancelled' | 'escalated';

/** Guardian Journey — a server-side dead-man's switch. The watchdog runs on
 * the SERVER, so it still fires if the phone is dead, offline or snatched. */
export interface IJourney extends Document {
  userId: Types.ObjectId;
  mode: JourneyMode;
  status: JourneyStatus;
  destinationName: string;
  destination: IGeoPoint;
  start: IGeoPoint;
  startedAt: Date;
  etaAt: Date;
  graceMinutes: number;
  vehicleNumber?: string;
  driverName?: string;
  lastLocation?: IGeoPoint;
  lastLocationAt?: Date;
  remainingMeters?: number;
  promptedAt?: Date;
  arrivedAt?: Date;
  escalatedAt?: Date;
  sosLogId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const journeySchema = new Schema<IJourney>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: ['walk', 'cab', 'transit'], default: 'walk' },
    status: { type: String, enum: ['active', 'prompted', 'arrived', 'cancelled', 'escalated'], default: 'active', index: true },
    destinationName: { type: String, required: true, maxlength: 120 },
    destination: { type: geoPointSchema, required: true },
    start: { type: geoPointSchema, required: true },
    startedAt: { type: Date, default: Date.now },
    etaAt: { type: Date, required: true, index: true },
    graceMinutes: { type: Number, default: 5, min: 1, max: 60 },
    vehicleNumber: { type: String, maxlength: 20 },
    driverName: { type: String, maxlength: 60 },
    lastLocation: { type: geoPointSchema },
    lastLocationAt: { type: Date },
    remainingMeters: { type: Number },
    promptedAt: { type: Date },
    arrivedAt: { type: Date },
    escalatedAt: { type: Date },
    sosLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog' },
  },
  { timestamps: true }
);
journeySchema.index({ userId: 1, status: 1, startedAt: -1 });

export default model<IJourney>('Journey', journeySchema);
