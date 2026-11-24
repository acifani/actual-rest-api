import * as actual from './actual.ts';
import express from 'express';
import { parseTransactionOptions, type TransactionOptions } from './transaction-query.ts';
const router = express.Router();

function send(req: express.Request, res: express.Response, data: any, fields?: string[]) {
  if (req.query['format'] === 'csv') {
    res.status(200).header('Content-Type', 'text/csv').send(toCSV(data, fields));
  } else {
    res.status(200).json(data);
  }
}

router.get('/budget/:month', async (req, res) => {
  const budget = await actual.getBudgetAtMonth(req.params.month);
  res.status(200).json(budget);
});

router.get('/accounts', async (req, res) => {
  send(req, res, await actual.getAccounts());
});

router.get('/accounts/:accountid', async (req, res) => {
  send(req, res, await actual.getAccount(req.params.accountid));
});

router.get('/accounts/:accountid/transactions', async (req, res) => {
  let options: TransactionOptions;
  try {
    options = parseTransactionOptions(req.query);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }
  send(req, res, await actual.getTransactions(req.params.accountid, options), options.fields);
});

router.get('/transactions', async (req, res) => {
  let options: TransactionOptions;
  try {
    options = parseTransactionOptions(req.query);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }
  send(req, res, await actual.getAllTransactions(options), options.fields);
});

export { router };

function toCSV(data: object | object[], fields?: string[]) {
  const rows = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
  if (rows.length === 0) return '';
  const columns = fields ?? Object.keys(rows[0]);
  return [columns, ...rows.map(row => columns.map(column => row[column]))]
    .map(cells => cells.map(csvCell).join(',')).join('\n') + '\n';
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
