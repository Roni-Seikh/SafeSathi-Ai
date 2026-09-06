import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

export interface ILocation extends Document {
  userId: Types.ObjectId;
  sosLogId?: Types.ObjectId; // set only for points recorded during an active SOS
  coordinates: IGeoPoint;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  batteryLevel?: number;
  isSharing: boolean;
  sharedWithContactIds: Types.ObjectId[];
  recordedAt: Date;
  createdAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sosLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog', index: true },
    coordinates: { type: geoPointSchema, required: true },
    accuracy: { type: Number },
    speed: { type: Number },
    heading: { type: Number },
    altitude: { type: Number },
    batteryLevel: { type: Number, min: 0, max: 100 },
    isSharing: { type: Boolean, default: false },
    sharedWithContactIds: [{ type: Schema.Types.ObjectId, ref: 'EmergencyContact' }],
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

locationSchema.index({ coordinates: '2dsphere' });
locationSchema.index({ userId: 1, recordedAt: -1 });

export default model<ILocation>('Location', locationSchema);
