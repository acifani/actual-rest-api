import * as api from '@actual-app/api';
import { buildTransactionsQuery, type TransactionOptions } from './transaction-query.ts';

export async function init() {
  if (!process.env.ACTUAL_SERVER_URL || !process.env.ACTUAL_PASSWORD) {
    throw new Error(
      'ACTUAL_SERVER_URL and ACTUAL_PASSWORD environment variables must be set',
    );
  }

  if (!process.env.ACTUAL_BUDGET_SYNC_ID) {
    throw new Error('ACTUAL_BUDGET_SYNC_ID environment variable must be set');
  }

  await api.init({
    dataDir: './data',
    serverURL: process.env.ACTUAL_SERVER_URL,
    password: process.env.ACTUAL_PASSWORD,
  });

  await api.downloadBudget(process.env.ACTUAL_BUDGET_SYNC_ID);
}

export async function shutdown() {
  return api.shutdown();
}

export async function getAccounts() {
  const accounts = await api.getAccounts();
  return Promise.all(
    accounts.map(async (a: any) => ({
      ...a,
      balance: await getAccountBalance(a.id),
    })),
  );
}

export async function getAccount(id: string) {
  const accounts = await api.getAccounts();
  const account = accounts.find((a: any) => a.id === id);
  if (!account) {
    return null;
  }

  const balance = await getAccountBalance(id);
  return { ...account, balance };
}

export async function getAccountBalance(
  accountID: string,
): Promise<number | null> {
  return api.getAccountBalance(accountID);
}

export async function getTransactions(accountID: string, options: TransactionOptions = {}) {
  return queryTransactions(options, accountID);
}

export async function getAllTransactions(options: TransactionOptions = {}) {
  return queryTransactions(options);
}

async function queryTransactions(options: TransactionOptions, accountID?: string) {
  const { data } = (await api.aqlQuery(buildTransactionsQuery(options, accountID))) as {
    data: Record<string, unknown>[];
  };
  // ActualQL automatically includes id, even when it is not selected.
  const fields = options.fields;
  return fields
    ? data.map(row => Object.fromEntries(fields.map(field => [field, row[field]])))
    : data;
}

export async function getBudgetAtMonth(month: string) {
  return api.getBudgetMonth(month);
}
