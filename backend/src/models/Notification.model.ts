import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'sos_alert'
  | 'im_safe'
  | 'community_alert'
  | 'report_status_update'
  | 'low_safe_score'
  | 'location_share_started'
  | 'system';
export type NotificationSendChannel = 'push' | 'sms' | 'email';
export type NotificationDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel: NotificationSendChannel;
  deliveryStatus: NotificationDeliveryStatus;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['sos_alert', 'im_safe', 'community_alert', 'report_status_update', 'low_safe_score', 'location_share_started', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    channel: { type: String, enum: ['push', 'sms', 'email'], default: 'push' },
    deliveryStatus: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default model<INotification>('Notification', notificationSchema);
