import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint, geoPointSchema, SupportedLanguage } from '../types/common.types';

export interface IMedicalInfo {
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: string[];
  conditions: string[];
  medications: string[];
  organDonor: boolean;
}

export interface IAddress {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
}

/** Per-user toggles for the proactive detection features. All default ON,
 * since SafeSathi's value proposition depends on them running by default —
 * the user can opt out per-feature from Settings. */
export interface ISafetyPreferences {
  voiceDetectionEnabled: boolean;
  motionDetectionEnabled: boolean;
  toneDetectionEnabled: boolean;
  autoSOSEnabled: boolean;
  silentEvidenceEnabled: boolean;
  /** Opts into proactive push notifications when another user files a
   * report within COMMUNITY_ALERT_RADIUS_METERS of this user's last
   * known location — see ReportService.create(). */
  communityAlertsEnabled: boolean;
  fakeCallVoiceUrl?: string;
}

export interface ILocationSharingState {
  isActive: boolean;
  /** User _ids of the contacts currently permitted to view this user's
   * live location — resolved from EmergencyContact.linkedUserId at the
   * moment sharing starts, since only contacts who are also SafeSathi
   * users can view in-app. */
  sharedWithUserIds: Types.ObjectId[];
  startedAt?: Date;
}

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  profilePhotoUrl?: string;
  medicalInfo: IMedicalInfo;
  address: IAddress;
  preferredLanguage: SupportedLanguage;
  safetyPreferences: ISafetyPreferences;
  fcmTokens: string[];
  lastKnownLocation?: IGeoPoint;
  lastKnownLocationUpdatedAt?: Date;
  locationSharing: ILocationSharingState;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['female', 'male', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    profilePhotoUrl: { type: String },
    medicalInfo: {
      bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
      medications: { type: [String], default: [] },
      organDonor: { type: Boolean, default: false },
    },
    address: {
      line1: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
    },
    preferredLanguage: { type: String, enum: ['en', 'hi', 'bn'], default: 'en' },
    safetyPreferences: {
      voiceDetectionEnabled: { type: Boolean, default: true },
      motionDetectionEnabled: { type: Boolean, default: true },
      toneDetectionEnabled: { type: Boolean, default: true },
      autoSOSEnabled: { type: Boolean, default: true },
      silentEvidenceEnabled: { type: Boolean, default: true },
      communityAlertsEnabled: { type: Boolean, default: true },
      fakeCallVoiceUrl: { type: String },
    },
    fcmTokens: { type: [String], default: [] },
    lastKnownLocation: { type: geoPointSchema },
    lastKnownLocationUpdatedAt: { type: Date },
    locationSharing: {
      isActive: { type: Boolean, default: false },
      sharedWithUserIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
      startedAt: { type: Date },
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ lastKnownLocation: '2dsphere' });

export default model<IUser>('User', userSchema);
