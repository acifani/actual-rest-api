import express from 'express';
import * as actual from './actual.ts';
import { authMiddleware } from './auth.ts';
import { router } from './routes.ts';

const app = express();

app.use(authMiddleware);
app.use('/', router);

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
}, (Number(process.env.ACTUAL_REFRESH_INTERVAL_SECONDS) || 60) * 1000);

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
