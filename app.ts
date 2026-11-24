import express from 'express';
import { createAuth } from './auth.ts';
import { errorHandler } from './errors.ts';
import { router } from './routes.ts';

export function createApp(authToken?: string) {
  const app = express();
  if (authToken) app.use(createAuth(authToken));
  return app.use(router).use(errorHandler);
}
