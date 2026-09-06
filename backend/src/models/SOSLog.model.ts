import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

export type SOSTriggerType = 'manual' | 'voice_keyword' | 'motion' | 'tone' | 'admin';
export type SOSStatus = 'active' | 'resolved' | 'false_alarm' | 'cancelled';
export type SOSContactChannel = 'push' | 'sms' | 'email' | 'call';
export type SOSContactDeliveryStatus = 'sent' | 'delivered' | 'failed';

export interface INotifiedContact {
  contactId: Types.ObjectId;
  channel: SOSContactChannel;
  notifiedAt: Date;
  deliveryStatus: SOSContactDeliveryStatus;
}

export interface ISOSLog extends Document {
  userId: Types.ObjectId;
  triggerType: SOSTriggerType;
  status: SOSStatus;
  location: IGeoPoint;
  address?: string;
  batteryLevel?: number;
  deviceInfo?: string;
  safeScoreAtTrigger?: number;
  notifiedContacts: INotifiedContact[];
  evidenceReportId?: Types.ObjectId;
  voiceLogId?: Types.ObjectId;
  sensorLogId?: Types.ObjectId;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: 'user' | 'contact' | 'admin' | 'auto_timeout';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sosLogSchema = new Schema<ISOSLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    triggerType: {
      type: String,
      enum: ['manual', 'voice_keyword', 'motion', 'tone', 'admin'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'false_alarm', 'cancelled'],
      default: 'active',
      index: true,
    },
    location: { type: geoPointSchema, required: true },
    address: { type: String },
    batteryLevel: { type: Number, min: 0, max: 100 },
    deviceInfo: { type: String },
    safeScoreAtTrigger: { type: Number, min: 0, max: 100 },
    notifiedContacts: [
      {
        contactId: { type: Schema.Types.ObjectId, ref: 'EmergencyContact' },
        channel: { type: String, enum: ['push', 'sms', 'email', 'call'] },
        notifiedAt: { type: Date, default: Date.now },
        deliveryStatus: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
      },
    ],
    evidenceReportId: { type: Schema.Types.ObjectId, ref: 'Report' },
    voiceLogId: { type: Schema.Types.ObjectId, ref: 'VoiceLog' },
    sensorLogId: { type: Schema.Types.ObjectId, ref: 'SensorLog' },
    triggeredAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: String, enum: ['user', 'contact', 'admin', 'auto_timeout'] },
    notes: { type: String },
  },
  { timestamps: true }
);

sosLogSchema.index({ location: '2dsphere' });
sosLogSchema.index({ userId: 1, status: 1, triggeredAt: -1 });

export default model<ISOSLog>('SOSLog', sosLogSchema);
