import * as actual from './actual';
import { q, runQuery } from '@actual-app/api';
import express from 'express';
const router = express.Router();

const transactionsQuery = q('transactions').select([
  '*',
  'account.closed',
  'account.name',
  'account.offbudget',
  'category.name',
  'category.is_income',
  'payee.name',
  'schedule.name',
]);

const formatHandler: express.RequestHandler = (req, res) => {
  const format = req.query['format'] === 'csv' ? 'csv' : 'json';
  if (format === 'csv') {
    const data = jsonToCSV(res.locals.data);
    res.status(200).header('Content-Type', 'text/csv').send(data);
  } else if (format === 'json') {
    res.status(200).json(res.locals.data);
  }
};

router.get('/budget/:month', async (req, res) => {
  const budget = await actual.getBudgetAtMonth(req.params.month);
  res.status(200).json(budget);
});

router.get(
  '/accounts',
  async (_, res, next) => {
    const accounts = await actual.getAccounts();
    res.locals.data = accounts;
    next();
  },
  formatHandler,
);

router.get(
  '/accounts/:accountid',
  async (req, res, next) => {
    const account = await actual.getAccount(req.params.accountid);
    res.locals.data = account;
    next();
  },
  formatHandler,
);

router.get(
  '/accounts/:accountid/transactions',
  async (req, res, next) => {
    const { data } = await runQuery(
      transactionsQuery.filter({ account: req.params.accountid }),
    );
    res.locals.data = data;
    next();
  },
  formatHandler,
);

router.get(
  '/transactions',
  async (_, res, next) => {
    const { data } = await runQuery(transactionsQuery);
    res.locals.data = data;
    next();
  },
  formatHandler,
);

export { router };

function jsonToCSV(data: any) {
  let csv = '';

  const unpackHeaders = (x: object) => Object.keys(x).join(',') + '\n';
  const unpackValues = (x: object) =>
    Object.values(x)
      .map((v) => JSON.stringify(v))
      .join(',') + '\n';

  // object
  if (!Array.isArray(data)) {
    csv += unpackHeaders(data);
    csv += unpackValues(data);
    return csv;
  }

  // array
  csv += unpackHeaders(data?.[0]);
  for (const row of data) {
    csv += unpackValues(row);
  }

  return csv;
}
