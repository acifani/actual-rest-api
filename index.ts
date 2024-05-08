import express from 'express';
import * as actual from './actual';
import { authMiddleware } from './auth';

const app = express();

app.use(authMiddleware);

app.get('/budget/:month', async (req, res) => {
  const budget = await actual.getBudgetAtMonth(req.params.month);
  res.status(200).json(budget);
});

app.get('/accounts', async (_, res) => {
  const accounts = await actual.getAccounts();
  res.status(200).json(accounts);
});

app.get('/accounts/:accountid/transactions', async (req, res) => {
  const transactions = await actual.getTransactions(req.params.accountid);
  res.status(200).json(transactions);
});

app.get('/transactions', async (req, res) => {
  const offbudget = req.query['offbudget'] === 'true';
  const transactions = await actual.getAllTransactions(offbudget);
  res.status(200).json(transactions);
});

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  res.sendStatus(500);
};
app.use(errorHandler);

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
