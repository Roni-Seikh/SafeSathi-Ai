import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { corsOrigins } from './config/env';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { defaultRateLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandlerMiddleware, notFoundMiddleware } from './middlewares/errorHandler.middleware';
import v1Router from './routes/v1';
import { sendSuccess } from './utils/apiResponse';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLoggerMiddleware);
  app.use(defaultRateLimiter);

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', v1Router);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
