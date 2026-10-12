import * as api from '@actual-app/api';

// Public default columns: keep this explicit and stable as Actual's schema grows.
export const defaultTransactionFields = [
  'id', 'is_parent', 'is_child', 'parent_id', 'account', 'category',
  'amount', 'payee', 'notes', 'date', 'imported_id', 'error',
  'imported_payee', 'starting_balance_flag', 'transfer_id', 'sort_order',
  'cleared', 'reconciled', 'tombstone', 'schedule', 'account.closed',
  'account.name', 'account.offbudget', 'category.name', 'category.is_income',
  'payee.name', 'schedule.name',
] as const;

export interface TransactionOptions {
  startDate?: string;
  endDate?: string;
  fields?: string[];
}

export function parseTransactionOptions(query: Record<string, unknown>): TransactionOptions {
  const options: TransactionOptions = {};
  for (const key of ['startDate', 'endDate'] as const) {
    const value = query[key];
    if (value === undefined) continue;
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    ) {
      throw new Error(`${key} must be a valid date in YYYY-MM-DD format`);
    }
    options[key] = value;
  }
  if (options.startDate && options.endDate && options.startDate >= options.endDate) {
    throw new Error('startDate must be earlier than endDate (which is exclusive)');
  }

  if (query.fields !== undefined) {
    if (typeof query.fields !== 'string') {
      throw new Error('fields must be a comma-separated list of transaction fields');
    }
    const fields = query.fields.split(',').map(field => field.trim());
    if (fields.some(field => !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(field))) {
      throw new Error('fields must contain non-empty field names or dot-separated field paths');
    }
    if (new Set(fields).size !== fields.length) {
      throw new Error('fields must not contain duplicates');
    }
    options.fields = fields;
  }
  return options;
}

export function buildTransactionsQuery(options: TransactionOptions = {}, accountID?: string) {
  let query = api.q('transactions').select(options.fields ?? [...defaultTransactionFields]);
  if (accountID !== undefined) query = query.filter({ account: accountID });
  if (options.startDate) query = query.filter({ date: { $gte: options.startDate } });
  if (options.endDate) query = query.filter({ date: { $lt: options.endDate } });
  return query;
}
