import * as actual from './actual';
import express from 'express';
const router = express.Router();

router.get('/budget/:month', async (req, res) => {
  const budget = await actual.getBudgetAtMonth(req.params.month);
  res.status(200).json(budget);
});

router.get('/accounts', async (_, res) => {
  const accounts = await actual.getAccounts();
  res.status(200).json(accounts);
});

router.get('/accounts/:accountid/transactions', async (req, res) => {
  const transactions = await actual.getTransactions(req.params.accountid);
  res.status(200).json(transactions);
});

router.get('/transactions', async (req, res) => {
  const offbudget = req.query['offbudget'] === 'true';
  const transactions = await actual.getAllTransactions(offbudget);
  res.status(200).json(transactions);
});

export { router };
