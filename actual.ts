import * as api from '@actual-app/api';
import type { ActualConfig } from './config.ts';
import { buildTransactionsQuery, type TransactionOptions } from './transaction-query.ts';

export const { sync, shutdown, getBudgetMonth } = api;

export async function init({ serverURL, password, syncID }: ActualConfig) {
  await api.init({ dataDir: './data', serverURL, password });
  await api.downloadBudget(syncID);
}

type Account = Awaited<ReturnType<typeof api.getAccounts>>[number];

async function withBalance(account: Account) {
  return { ...account, balance: await api.getAccountBalance(account.id) };
}

export async function getAccounts() {
  return Promise.all((await api.getAccounts()).map(withBalance));
}

export async function getAccount(id: string) {
  const account = (await api.getAccounts()).find(account => account.id === id);
  return account && withBalance(account);
}

export async function getTransactions(options: TransactionOptions, accountID?: string) {
  const { data } = (await api.aqlQuery(buildTransactionsQuery(options, accountID))) as {
    data: Record<string, unknown>[];
  };
  const { fields } = options;
  // ActualQL always returns id, even when it is not selected.
  return fields ? data.map(row => Object.fromEntries(fields.map(field => [field, row[field]]))) : data;
}
