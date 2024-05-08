import express from 'express';
import * as actual from './actual';
import { authMiddleware } from './auth';

const app = express();

app.use(authMiddleware);

app.get('/accounts', async (_, res) => {
  try {
    const accounts = await actual.getAccounts();
    return res.status(200).json(accounts);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
});

app.get('/accounts/:accountid/transactions', async (req, res) => {
  try {
    const transactions = await actual.getTransactions(req.params.accountid);
    return res.status(200).json(transactions);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const offbudget = req.query['offbudget'] === 'true';
    const transactions = await actual.getAllTransactions(offbudget);
    return res.status(200).json(transactions);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
});

app.get('/budget', async (_, res) => {
  try {
    const budget = actual.getLatestBudget();
    return res.status(200).json(budget);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
});

app.get('/budget/:month', async (req, res) => {
  try {
    const budget = await actual.getBudgetAtMonth(req.params.month);
    return res.status(200).json(budget);
  } catch (e) {
    console.error(e);
    return res.status(500).send();
  }
});

// Server start
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
  console.log('Initializing Actual DB...');
  actual.init().then(() => console.log('Actual DB initialized'));
});

// Refresh Actual data at a given frequence
const intervalID = setInterval(() => {
  actual.init().then(() => console.log('Actual DB refreshed'));
}, Number(process.env.ACTUAL_REFRESH_INTERVAL_SECONDS) * 1000 ?? 60_000);

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Graceful shutdown
function shutdown() {
  clearInterval(intervalID);

  console.log('Shutting down Actual DB...');
  actual.shutdown().then(() => console.log('Actual DB shut down'));

  console.log('Closing HTTP server...');
  server.close(() => console.log('HTTP server closed'));
}
