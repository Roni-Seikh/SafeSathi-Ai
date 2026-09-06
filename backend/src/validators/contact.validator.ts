import { z } from 'zod';

export const addContactSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.string().min(1).max(50),
  phone: z.string().min(8).max(15),
  email: z.string().email().optional(),
  priority: z.number().int().min(1).max(5),
  isPrimary: z.boolean().optional(),
});

export const updateContactSchema = addContactSchema.partial();

export type AddContactPayload = z.infer<typeof addContactSchema>;
