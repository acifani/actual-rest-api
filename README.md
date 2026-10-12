# actual-rest-api

Expose [Actual](https://actualbudget.org/) data via plain old HTTP REST APIs without the need of using the JS SDK or querying the SQLite3 DB.

## Running

```shell
git clone https://github.com/acifani/actual-rest-api.git
pnpm install
pnpm start
```

### Environment Variables

| Variable                          | Required | Default | Description                            |
| --------------------------------- | -------- | ------- | -------------------------------------- |
| `ACTUAL_SERVER_URL`               | Yes      | -       | URL of your Actual server              |
| `ACTUAL_PASSWORD`                 | Yes      | -       | Password to access your Actual server  |
| `ACTUAL_BUDGET_SYNC_ID`           | Yes      | -       | Sync ID of the budget to expose        |
| `AUTH_TOKEN`                      | No       | -       | Token to protect the API (recommended) |
| `PORT`                            | No       | `3000`  | Port to run the server on              |
| `ACTUAL_REFRESH_INTERVAL_SECONDS` | No       | `60`    | How often to sync data from Actual     |

You can create an `.env` file (see `.env.example`) or export the variables to your shell.

```shell
# Using Node.js native .env loader (requires v24+)
node --env-file=.env index.ts

# Or export them manually
export ACTUAL_SERVER_URL=https://my-actual.server.dev/
export ACTUAL_PASSWORD=mypassword
export ACTUAL_BUDGET_SYNC_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
node index.ts
```

### Docker

A Docker image is available in the [Packages](https://github.com/acifani/actual-rest-api/pkgs/container/actual-rest-api) section.

```shell
docker run -d \
  -p 3000:3000 \
  -e ACTUAL_SERVER_URL=https://my-actual.server.dev/ \
  -e ACTUAL_PASSWORD=mypassword \
  -e ACTUAL_BUDGET_SYNC_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  -e AUTH_TOKEN=your-secret-token \
  ghcr.io/acifani/actual-rest-api:latest
```

## Authentication

If `AUTH_TOKEN` is set, all requests must include the token as a query parameter:

```
GET /accounts?token=your-secret-token
```

## API Endpoints

All endpoints return JSON by default. Add `?format=csv` to get CSV output instead.

| Endpoint                         | Description                                |
| -------------------------------- | ------------------------------------------ |
| `GET /accounts`                  | List all accounts                          |
| `GET /accounts/:id`              | Get a single account                       |
| `GET /accounts/:id/transactions` | Get transactions for an account            |
| `GET /transactions`              | Get all transactions                       |
| `GET /budget/:month`             | Get budget for a month (format: `YYYY-MM`) |

### Transaction filters

Both transaction endpoints accept optional query parameters for JSON and CSV:

| Parameter   | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `startDate` | Include transactions on or after this date (`YYYY-MM-DD`).       |
| `endDate`   | Include transactions before this date (`YYYY-MM-DD`, exclusive). |
| `fields`    | Comma-separated column names, returned in the specified order.   |

All history and the fixed columns are returned unless filters are specified. `fields` can
select any field path supported by your Actual version (e.g. `payee.name`), without
wildcards or expressions. Amounts remain in minor currency units (e.g. cents).

## Google Sheets

You can import data directly into Google Sheets (or Excel) using the CSV format:

```
=IMPORTDATA("https://your-actual.server.dev/transactions?format=csv&token=your-secret-token")
```

For smaller imports, select a date range and columns:

```text
=IMPORTDATA("https://your-actual.server.dev/transactions?format=csv&startDate=2026-01-01&endDate=2027-01-01&fields=date,account.name,payee.name,category.name,amount&token=your-secret-token")
```

If needed, split imports into monthly ranges on separate tabs.
