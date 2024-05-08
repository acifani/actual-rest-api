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

router.get('/accounts', async (_, res) => {
  const accounts = await actual.getAccounts();
  res.status(200).json(accounts);
});

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
  csv += Object.keys(data?.[0]).join(',') + '\n';

  for (const row of data) {
    csv += Object.values(row)
      .map((v) => JSON.stringify(v))
      .join(',');
    csv += '\n';
  }

  return csv;
}
