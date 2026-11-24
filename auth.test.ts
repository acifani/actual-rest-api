import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';

import { createAuth } from './auth.ts';
import { errorHandler } from './errors.ts';

const token = 'correct-token';
let server: Server;
let baseURL: string;

before(async () => {
  const app = express()
    .use(createAuth(token))
    .get('/', (req, res) => { res.sendStatus(200); })
    .use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function status(query: string, authorization?: string) {
  const headers: Record<string, string> = authorization === undefined ? {} : { authorization };
  const response = await fetch(`${baseURL}/${query}`, { headers });
  if (response.status === 401) assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  return response.status;
}

test('a Bearer header with the token is accepted', async () => {
  assert.equal(await status('', `Bearer ${token}`), 200);
});

test('a token query parameter is accepted', async () => {
  assert.equal(await status(`?token=${token}`), 200);
});

test('the raw token as the Authorization header is rejected', async () => {
  assert.equal(await status('', token), 401);
});

test('a wrong token is rejected', async () => {
  assert.equal(await status('', 'Bearer wrong-token'), 401);
  assert.equal(await status('?token=wrong-token'), 401);
});

test('a missing token is rejected', async () => {
  assert.equal(await status(''), 401);
});

test('a multibyte token of the same string length is rejected', async () => {
  const multibyte = 'é'.repeat(token.length);
  assert.equal(await status(`?token=${encodeURIComponent(multibyte)}`), 401);
});

test('a header is used even when a correct query token is also sent', async () => {
  assert.equal(await status(`?token=${token}`, 'Bearer wrong-token'), 401);
});
