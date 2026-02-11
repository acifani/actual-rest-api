import * as api from '@actual-app/api';

const transactionsQuery = api
  .q('transactions')
  .select([
    'id',
    'is_parent',
    'is_child',
    'parent_id',
    'account',
    'category',
    'amount',
    'payee',
    'notes',
    'date',
    'imported_id',
    'error',
    'imported_payee',
    'starting_balance_flag',
    'transfer_id',
    'sort_order',
    'cleared',
    'reconciled',
    'tombstone',
    'schedule',
    'account.closed',
    'account.name',
    'account.offbudget',
    'category.name',
    'category.is_income',
    'payee.name',
    'schedule.name',
  ]);

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

export async function getTransactions(accountID: string) {
  const { data } = (await api.aqlQuery(
    transactionsQuery.filter({ account: accountID }),
  )) as { data: unknown };
  return data;
}

export async function getAllTransactions() {
  const { data } = (await api.aqlQuery(transactionsQuery)) as { data: unknown };
  return data;
}

export async function getBudgetAtMonth(month: string) {
  return api.getBudgetMonth(month);
}
