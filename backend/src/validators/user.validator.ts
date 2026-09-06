import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional(),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional(),
    })
    .partial()
    .optional(),
  preferredLanguage: z.enum(['en', 'hi', 'bn']).optional(),
});

export const updateMedicalInfoSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  organDonor: z.boolean().optional(),
});

export const updateSafetyPreferencesSchema = z.object({
  voiceDetectionEnabled: z.boolean().optional(),
  motionDetectionEnabled: z.boolean().optional(),
  toneDetectionEnabled: z.boolean().optional(),
  autoSOSEnabled: z.boolean().optional(),
  silentEvidenceEnabled: z.boolean().optional(),
  fakeCallVoiceUrl: z.string().url().optional(),
});

export const registerFcmTokenSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
});

export const avatarUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
