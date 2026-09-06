import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email is required'),
  phone: z.string().min(8, 'Phone number looks too short').max(15, 'Phone number looks too long'),
});

export const logoutSchema = z.object({
  fcmToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
