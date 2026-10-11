import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default('v1'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Admin JWT auth — separate from Firebase, see docs/architecture/ARCHITECTURE.md §4
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Firebase Admin SDK — end-user auth, storage, push
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, 'FIREBASE_CLIENT_EMAIL is required'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),
  FIREBASE_STORAGE_BUCKET: z.string().min(1, 'FIREBASE_STORAGE_BUCKET is required'),

  AI_SERVICE_BASE_URL: z.string().default('http://localhost:8001'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  CORS_ORIGIN: z.string().default(''),

  LOG_LEVEL: z.string().default('debug'),

  // --- Optional: Sathi AI chatbot. With no key the bot still answers from its built-in
  // women-safety knowledge base; with a key it also generates grounded free-form replies.
  ANTHROPIC_API_KEY: z.string().optional(),
  CHAT_MODEL: z.string().default('claude-haiku-4-5-20251001'),

  // --- Optional: AI annotation (scream score / keyword) of each evidence chunk. Needs the AI service.
  EVIDENCE_AI_ANALYSIS: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),

  // Guardian Journey watchdog tick (ms) and how long the user has to answer the "are you OK?" push.
  JOURNEY_WATCHDOG_MS: z.coerce.number().default(30000),
  JOURNEY_PROMPT_TIMEOUT_MS: z.coerce.number().default(120000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
