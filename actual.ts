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
  return api.getAccounts();
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

export async function getLatestBudget() {
  const budgetMonths = await api.getBudgetMonths();
  if (!budgetMonths?.length) {
    return null;
  }

  return api.getBudgetMonth(budgetMonths.at(-1));
}

export async function getBudgetAtMonth(month: string) {
  return api.getBudgetMonth(month);
}
