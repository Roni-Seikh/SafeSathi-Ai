import { Schema, model, Document, Types } from 'mongoose';

export interface IEmergencyContact extends Document {
  userId: Types.ObjectId;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number; // 1 (highest) – 5 (lowest); also caps the contact count
  isPrimary: boolean;
  notifyOnSOS: boolean;
  notifyOnImSafe: boolean;
  notifyOnLowSafeScore: boolean;
  /** Set automatically (Phase 2, EmergencyContactService) when this
   * contact's phone number matches a registered SafeSathi user — lets SOS
   * alerts reach them as an in-app push + live-location view instead of
   * only an SMS fallback. Re-resolved whenever the phone number changes. */
  linkedUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    priority: { type: Number, min: 1, max: 5, required: true },
    isPrimary: { type: Boolean, default: false },
    notifyOnSOS: { type: Boolean, default: true },
    notifyOnImSafe: { type: Boolean, default: true },
    notifyOnLowSafeScore: { type: Boolean, default: false },
    linkedUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Business rule: a user may have at most 5 emergency contacts. This is
// enforced in the service layer (EmergencyContactService.addContact, built
// in Phase 2), not here, because it requires a count query against
// existing documents rather than a static schema constraint.
emergencyContactSchema.index({ userId: 1, priority: 1 });

export default model<IEmergencyContact>('EmergencyContact', emergencyContactSchema);
