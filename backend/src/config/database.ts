import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err: Error) => logger.error('MongoDB connection error', { error: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  const maxRetries = 5;
  let attempt = 0;

  // Render/Atlas cold starts can briefly refuse connections — retry with
  // backoff instead of crashing the process on the very first attempt.
  for (;;) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      return;
    } catch (error) {
      attempt += 1;
      logger.error(`MongoDB connection attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
