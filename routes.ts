import * as actual from './actual.ts';
import express from 'express';
import { parseTransactionOptions, type TransactionOptions } from './transaction-query.ts';
const router = express.Router();

function send(req: express.Request, res: express.Response, data: any, fields?: string[]) {
  if (req.query['format'] === 'csv') {
    res.status(200).header('Content-Type', 'text/csv').send(jsonToCSV(data, fields));
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

function jsonToCSV(data: any, fields?: string[]) {
  let csv = '';

  const unpackHeaders = (x: object) => (fields ?? Object.keys(x)).join(',') + '\n';
  const unpackValues = (x: object) =>
    (fields ? fields.map(field => (x as Record<string, unknown>)[field]) : Object.values(x))
      .map((v) => JSON.stringify(v))
      .join(',') + '\n';

  // object
  if (!Array.isArray(data)) {
    csv += unpackHeaders(data);
    csv += unpackValues(data);
    return csv;
  }

  // array
  if (data.length === 0) {
    return csv;
  }
  csv += unpackHeaders(data[0]);
  for (const row of data) {
    csv += unpackValues(row);
  }

  return csv;
}
