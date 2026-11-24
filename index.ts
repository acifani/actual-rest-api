import { once } from 'node:events';
import * as actual from './actual.ts';
import { createApp } from './app.ts';
import { loadConfig, type Config } from './config.ts';

export async function start(config: Config) {
  await actual.init(config.actual);
  const server = createApp(config.authToken).listen(config.port);
  await once(server, 'listening');
  console.log(`Listening on port ${config.port}`);

  let inFlightSync: Promise<void> | undefined;
  const syncTimer = setInterval(() => {
    inFlightSync ??= actual.sync()
      .catch(error => console.error('Actual sync failed:', error))
      .finally(() => { inFlightSync = undefined; });
  }, config.syncIntervalMs);

  let stopping: Promise<void> | undefined;
  const shutdown = () => stopping ??= (async () => {
    console.log('Shutting down');
    clearInterval(syncTimer);
    server.close();
    await once(server, 'close');
    await inFlightSync;
    await actual.shutdown();
    console.log('Shut down');
  })();

  return { server, shutdown };
}

if (import.meta.main) {
  const config = loadConfig();
  if (!config.authToken) console.warn('AUTH_TOKEN is not set, so the API is open to anyone who can reach it');
  const { shutdown } = await start(config);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
