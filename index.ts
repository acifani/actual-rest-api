import { once } from 'node:events';
import express from 'express';
import * as actual from './actual.ts';
import { authEnabled, authMiddleware } from './auth.ts';
import { router } from './routes.ts';

const app = express();

app.use(authMiddleware);
app.use('/', router);

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  res.sendStatus(500);
};
app.use(errorHandler);

export async function start({ port, syncIntervalMs }: { port: number | string; syncIntervalMs: number }) {
  console.log('Initializing Actual DB...');
  await actual.init();
  console.log('Actual DB initialized');

  const server = app.listen(port);
  await once(server, 'listening');

  let inFlightSync: Promise<void> | undefined;
  const syncInterval = setInterval(() => {
    if (inFlightSync) return;
    inFlightSync = actual
      .sync()
      .then(() => console.log('Actual DB synced'), error => console.error('Actual DB sync failed:', error))
      .finally(() => {
        inFlightSync = undefined;
      });
  }, syncIntervalMs);

  let stopped: Promise<void> | undefined;
  function shutdown() {
    stopped ??= (async () => {
      clearInterval(syncInterval);

      console.log('Closing HTTP server...');
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
      console.log('HTTP server closed');

      await inFlightSync;

      console.log('Shutting down Actual DB...');
      await actual.shutdown();
      console.log('Actual DB shut down');
    })();
    return stopped;
  }

  return { server, shutdown };
}

if (import.meta.main) {
  if (!authEnabled) console.warn('AUTH_TOKEN is not set, so the API is open to anyone who can reach it');

  const port = process.env.PORT || 3000;
  const service = await start({
    port,
    syncIntervalMs: (Number(process.env.ACTUAL_REFRESH_INTERVAL_SECONDS) || 60) * 1000,
  });
  console.log(`Listening on port ${port}...`);

  process.on('SIGTERM', service.shutdown);
  process.on('SIGINT', service.shutdown);
}
