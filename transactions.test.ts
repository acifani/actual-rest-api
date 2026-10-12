import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { q } from '@actual-app/api';
import { buildTransactionsQuery, parseTransactionOptions } from './transaction-query.ts';

let lastQuery: ReturnType<typeof q> | undefined;
let rows: Record<string, unknown>[] = [{
  id: 'transaction-1', date: '2026-01-01', amount: 1234,
  'account.name': 'Checking', 'payee.name': 'Shop',
  raw_synced_data: '{}', 'payee.favorite': true,
}];
mock.module('@actual-app/api', {
  namedExports: {
    q,
    aqlQuery: async (query: ReturnType<typeof q>) => {
      lastQuery = query;
      return { data: rows };
    },
  },
});
const { router } = await import('./routes.ts');
let server: Server;
let baseURL: string;

before(async () => {
  const app = express();
  app.use(router);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  mock.restoreAll();
});

test('omitted options preserve the full query and response', async () => {
  assert.deepEqual(parseTransactionOptions({}), {});
  const response = await fetch(`${baseURL}/transactions`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), rows);
  // Assert the original public contract independently of the implementation list.
  assert.deepEqual(lastQuery!.serialize().selectExpressions, [
    'id', 'is_parent', 'is_child', 'parent_id', 'account', 'category',
    'amount', 'payee', 'notes', 'date', 'imported_id', 'error',
    'imported_payee', 'starting_balance_flag', 'transfer_id', 'sort_order',
    'cleared', 'reconciled', 'tombstone', 'schedule', 'account.closed',
    'account.name', 'account.offbudget', 'category.name', 'category.is_income',
    'payee.name', 'schedule.name',
  ]);
  assert.deepEqual(lastQuery!.serialize().filterExpressions, []);
});

test('date bounds and account filter combine without affecting later queries', () => {
  const query = buildTransactionsQuery({ startDate: '2026-01-01', endDate: '2026-02-01' }, 'account-1');
  assert.deepEqual(query.serialize().filterExpressions, [
    { account: 'account-1' },
    { date: { $gte: '2026-01-01' } },
    { date: { $lt: '2026-02-01' } },
  ]);
  assert.deepEqual(buildTransactionsQuery().serialize().filterExpressions, []);
  assert.deepEqual(buildTransactionsQuery({ endDate: '2026-02-01' }).serialize().filterExpressions,
    [{ date: { $lt: '2026-02-01' } }]);
  assert.deepEqual(parseTransactionOptions({ startDate: '2024-02-29', fields: 'date, amount' }),
    { startDate: '2024-02-29', fields: ['date', 'amount'] });
  assert.throws(() => parseTransactionOptions({ startDate: { x: '2026-01-01' } }), /valid date/);
});

test('both endpoints select JSON fields in order and omit automatic id', async () => {
  for (const path of ['/transactions', '/accounts/account-1/transactions']) {
    const response = await fetch(`${baseURL}${path}?startDate=2026-01-01&endDate=2027-01-01&fields=amount,date`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data, [{ amount: 1234, date: '2026-01-01' }]);
    assert.deepEqual(Object.keys(data[0]), ['amount', 'date']);
    assert.deepEqual(lastQuery!.serialize().selectExpressions, ['amount', 'date']);
    assert.deepEqual(lastQuery!.serialize().filterExpressions, [
      ...(path.startsWith('/accounts/') ? [{ account: 'account-1' }] : []),
      { date: { $gte: '2026-01-01' } },
      { date: { $lt: '2027-01-01' } },
    ]);
  }
});

test('CSV honors requested field order, including related names', async () => {
  const response = await fetch(`${baseURL}/transactions?format=csv&fields=amount,account.name,date`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type')!, /^text\/csv/);
  assert.equal(await response.text(), 'amount,account.name,date\n1234,"Checking","2026-01-01"\n');
});

test('explicit fields outside the default list are passed to Actual on both endpoints', async () => {
  for (const path of ['/transactions', '/accounts/account-1/transactions']) {
    const response = await fetch(`${baseURL}${path}?fields=payee.favorite,raw_synced_data`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ 'payee.favorite': true, raw_synced_data: '{}' }]);
    assert.deepEqual(lastQuery!.serialize().selectExpressions, ['payee.favorite', 'raw_synced_data']);
    const csv = await fetch(`${baseURL}${path}?format=csv&fields=payee.favorite,raw_synced_data`);
    assert.equal(csv.status, 200);
    assert.equal(await csv.text(), 'payee.favorite,raw_synced_data\ntrue,"{}"\n');
  }
});

test('invalid parameters return 400 before querying Actual on both endpoints', async () => {
  for (const path of ['/transactions', '/accounts/account-1/transactions']) {
    for (const query of [
      'startDate=2026-02-29', 'endDate=2026-04-31', 'startDate=2026-1-01',
      'startDate=', 'startDate=bad', 'startDate=2026-01-01&startDate=2026-02-01',
      'startDate=2026-02-01&endDate=2026-01-01',
      'startDate=2026-01-01&endDate=2026-01-01', 'fields=', 'fields=amount,',
      'fields=*', 'fields=account.*', 'fields=account..name', 'fields=$sum',
      'fields=amount,amount', 'fields=date&fields=amount',
    ]) {
      lastQuery = undefined;
      const response = await fetch(`${baseURL}${path}?${query}`);
      assert.equal(response.status, 400, `${path}?${query}`);
      const body = await response.json() as { error: string };
      assert.equal(typeof body.error, 'string');
      assert.equal(lastQuery, undefined);
    }
  }
});

test('empty results work in JSON and CSV', async () => {
  rows = [];
  const json = await fetch(`${baseURL}/transactions?fields=date,amount`);
  assert.deepEqual(await json.json(), []);
  const csv = await fetch(`${baseURL}/transactions?format=csv&fields=date,amount`);
  assert.equal(await csv.text(), '');
});
