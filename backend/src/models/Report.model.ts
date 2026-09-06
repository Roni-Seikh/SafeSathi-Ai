import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema } from '../types/common.types';

export type ReportType =
  | 'harassment'
  | 'stalking'
  | 'unsafe_area'
  | 'assault'
  | 'suspicious_activity'
  | 'other';
export type ReportStatus = 'pending' | 'verified' | 'rejected' | 'resolved';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IReport extends Document {
  userId?: Types.ObjectId; // absent when isAnonymous is true
  type: ReportType;
  description: string;
  images: string[]; // Firebase Storage URLs
  location: IGeoPoint;
  address?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  isAnonymous: boolean;
  contributesToHeatmap: boolean;
  verifiedBy?: Types.ObjectId; // ref Admin
  verifiedAt?: Date;
  rejectionReason?: string;
  linkedSOSLogId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['harassment', 'stalking', 'unsafe_area', 'assault', 'suspicious_activity', 'other'],
      required: true,
    },
    description: { type: String, required: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    location: { type: geoPointSchema, required: true },
    address: { type: String },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'resolved'], default: 'pending', index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    isAnonymous: { type: Boolean, default: false },
    contributesToHeatmap: { type: Boolean, default: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    linkedSOSLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog' },
  },
  { timestamps: true }
);

reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1, createdAt: -1 });

export default model<IReport>('Report', reportSchema);
