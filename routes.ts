import express, { type Request, type RequestHandler } from 'express';
import * as actual from './actual.ts';
import { HttpError } from './errors.ts';
import { parseTransactionOptions } from './transaction-query.ts';

type Format = 'json' | 'csv';
type Data = object | object[];
type Params = Record<string, string>;

const jsonOrCSV: readonly Format[] = ['json', 'csv'];
const jsonOnly: readonly Format[] = ['json'];

function reply(formats: readonly Format[], load: (req: Request<Params>) => Promise<Data>): RequestHandler<Params> {
  return async (req, res) => {
    const format = formats.find(format => format === (req.query.format ?? 'json'));
    if (!format) throw new HttpError(400, `format must be one of: ${formats.join(', ')}`);
    const data = await load(req);
    if (format === 'csv') res.type('csv').send(toCSV(data));
    else res.json(data);
  };
}

export const router = express.Router();

router.get('/accounts', reply(jsonOrCSV, actual.getAccounts));

router.get('/accounts/:id', reply(jsonOrCSV, async req => {
  const account = await actual.getAccount(req.params.id);
  if (!account) throw new HttpError(404, 'Account not found');
  return account;
}));

router.get('/accounts/:id/transactions', reply(jsonOrCSV, req =>
  actual.getTransactions(parseTransactionOptions(req.query), req.params.id)));

router.get('/transactions', reply(jsonOrCSV, req =>
  actual.getTransactions(parseTransactionOptions(req.query))));

router.get('/budget/:month', reply(jsonOnly, req => actual.getBudgetMonth(req.params.month)));

function toCSV(data: Data) {
  const rows = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  return [columns, ...rows.map(row => columns.map(column => row[column]))]
    .map(cells => cells.map(csvCell).join(','))
    .join('\n') + '\n';
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
