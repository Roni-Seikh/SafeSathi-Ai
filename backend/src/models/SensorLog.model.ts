import { Schema, model, Document, Types } from 'mongoose';

export type SensorEventType = 'running' | 'phone_snatch' | 'violent_movement' | 'sudden_fall' | 'normal';

/** Summary statistics over an analysis window, not raw sample streams —
 * the mobile app pre-aggregates on-device before sending, to keep
 * bandwidth/battery cost low (see ARCHITECTURE.md §10). */
export interface IMotionSummary {
  meanMagnitude: number;
  peakMagnitude: number;
  variance: number;
  sampleCount: number;
  windowMs: number;
}

export interface ISensorLog extends Document {
  userId: Types.ObjectId;
  eventType: SensorEventType;
  accelerometer: IMotionSummary;
  gyroscope: IMotionSummary;
  confidenceScore: number; // 0–1, from the on-device/AI motion classifier
  triggeredSOS: boolean;
  sosLogId?: Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
}

const motionSummarySchema = new Schema<IMotionSummary>(
  {
    meanMagnitude: { type: Number, required: true },
    peakMagnitude: { type: Number, required: true },
    variance: { type: Number, required: true },
    sampleCount: { type: Number, required: true },
    windowMs: { type: Number, required: true },
  },
  { _id: false }
);

const sensorLogSchema = new Schema<ISensorLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      enum: ['running', 'phone_snatch', 'violent_movement', 'sudden_fall', 'normal'],
      required: true,
    },
    accelerometer: { type: motionSummarySchema, required: true },
    gyroscope: { type: motionSummarySchema, required: true },
    confidenceScore: { type: Number, min: 0, max: 1, required: true },
    triggeredSOS: { type: Boolean, default: false },
    sosLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog' },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

sensorLogSchema.index({ userId: 1, recordedAt: -1 });

export default model<ISensorLog>('SensorLog', sensorLogSchema);
