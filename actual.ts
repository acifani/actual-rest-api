import * as api from '@actual-app/api';

export async function init() {
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
  const query = api
    .q('transactions')
    .filter({ account: accountID })
    .select({ amount: { $sum: '$amount' } });
  const { data } = await api.runQuery(query);

  return data?.[0]?.amount ?? null;
}

export async function getTransactions(accountID: string) {
  return api.getTransactions(accountID);
}

export async function getAllTransactions(offbudget?: boolean) {
  const accounts = await api.getAccounts();

  const accountsToFetch = accounts?.filter(
    (a: any) => !a.offbudget || offbudget,
  );

  const transactions = [];
  for (const account of accountsToFetch) {
    const tx = await api.getTransactions(account.id);
    transactions.push(...tx);
  }

  return transactions;
}

export async function getBudgetAtMonth(month: string) {
  return api.getBudgetMonth(month);
}
