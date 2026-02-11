import * as actual from './actual.ts';
import express from 'express';
const router = express.Router();

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
    const account = await actual.getAccount(req.params.accountid as string);
    res.locals.data = account;
    next();
  },
  formatHandler,
);

router.get(
  '/accounts/:accountid/transactions',
  async (req, res, next) => {
    const transactions = await actual.getTransactions(req.params.accountid as string);
    res.locals.data = transactions;
    next();
  },
  formatHandler,
);

router.get(
  '/transactions',
  async (_, res, next) => {
    const transactions = await actual.getAllTransactions();
    res.locals.data = transactions;
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
  if (data.length === 0) {
    return csv;
  }
  csv += unpackHeaders(data[0]);
  for (const row of data) {
    csv += unpackValues(row);
  }

  return csv;
}
