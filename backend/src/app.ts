import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.ts';
import { apiRouter } from './routes/index.ts';
import { errorHandler, notFoundHandler } from './middlewares/error.ts';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', index: false }));
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
