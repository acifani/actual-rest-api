import assert from 'node:assert/strict';
import { get, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { q } from '@actual-app/api';

const api = {
  init: mock.fn(async () => {}),
  downloadBudget: mock.fn(async () => {}),
  sync: mock.fn(async () => {}),
  shutdown: mock.fn(async () => {}),
  getAccounts: mock.fn(async () => [] as unknown[]),
};
mock.module('@actual-app/api', { exports: { q, ...api } });
const { start } = await import('./index.ts');

const syncIntervalMs = 1000;

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const servers: Server[] = [];

async function startService() {
  const service = await start({
    port: 0,
    syncIntervalMs,
    actual: { serverURL: 'http://actual.invalid', password: 'password', syncID: 'budget' },
  });
  servers.push(service.server);
  return service;
}

const settle = () => new Promise(resolve => setImmediate(resolve));

async function tick() {
  mock.timers.tick(syncIntervalMs);
  await settle();
}

let consoleError: ReturnType<typeof mock.method>;

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mock.resetCalls();
  mock.timers.enable({ apis: ['setInterval'] });
  mock.method(console, 'log', () => {});
  consoleError = mock.method(console, 'error', () => {});
});

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
  mock.timers.reset();
  mock.restoreAll();
});

test('startup opens the budget once and later ticks only sync', async () => {
  const service = await startService();
  await tick();
  await tick();
  assert.equal(api.init.mock.callCount(), 1);
  assert.equal(api.downloadBudget.mock.callCount(), 1);
  assert.equal(api.sync.mock.callCount(), 2);
  await service.shutdown();
});

test('a rejected sync is logged and the next tick syncs again', async () => {
  const failure = new Error('server unreachable');
  api.sync.mock.mockImplementationOnce(async () => {
    throw failure;
  });
  const service = await startService();
  await tick();
  assert.ok(consoleError.mock.calls.some(call => call.arguments.includes(failure)));
  await tick();
  assert.equal(api.sync.mock.callCount(), 2);
  await service.shutdown();
});

test('a tick is skipped while a sync is in flight', async () => {
  const slow = deferred();
  api.sync.mock.mockImplementationOnce(() => slow.promise);
  const service = await startService();
  await tick();
  await tick();
  assert.equal(api.sync.mock.callCount(), 1);
  slow.resolve();
  await settle();
  await tick();
  assert.equal(api.sync.mock.callCount(), 2);
  await service.shutdown();
});

test('shutdown closes the server and waits for the in-flight sync before shutting Actual down', async () => {
  const slow = deferred();
  api.sync.mock.mockImplementationOnce(() => slow.promise);
  const service = await startService();
  await tick();
  const stopped = service.shutdown();
  await settle();
  assert.equal(service.server.listening, false);
  assert.equal(api.shutdown.mock.callCount(), 0);
  await tick();
  assert.equal(api.sync.mock.callCount(), 1);
  slow.resolve();
  await stopped;
  assert.equal(api.shutdown.mock.callCount(), 1);
});

test('shutdown lets an in-flight request finish before shutting Actual down', async () => {
  const slow = deferred();
  api.getAccounts.mock.mockImplementationOnce(async () => {
    await slow.promise;
    return [];
  });
  const service = await startService();
  const { port } = service.server.address() as AddressInfo;
  const status = new Promise<number | undefined>((resolve, reject) => {
    get({ port, path: '/accounts', agent: false }, response => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject);
  });
  while (api.getAccounts.mock.callCount() === 0) await settle();
  const stopped = service.shutdown();
  await settle();
  assert.equal(api.shutdown.mock.callCount(), 0);
  slow.resolve();
  assert.equal(await status, 200);
  await stopped;
  assert.equal(api.shutdown.mock.callCount(), 1);
});

test('a second shutdown returns the same promise and shuts Actual down once', async () => {
  const service = await startService();
  const first = service.shutdown();
  const second = service.shutdown();
  assert.equal(second, first);
  await first;
  await service.shutdown();
  assert.equal(api.shutdown.mock.callCount(), 1);
});
