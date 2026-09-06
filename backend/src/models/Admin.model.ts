import { Schema, model, Document } from 'mongoose';

export type AdminRole = 'super_admin' | 'moderator' | 'analyst';

export interface IAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // bcrypt hash — never store or return a plaintext password. Hashing
    // happens in AdminService.createAdmin / AdminAuthService (Phase 2).
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'moderator', 'analyst'], default: 'moderator' },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export default model<IAdmin>('Admin', adminSchema);
