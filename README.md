# actual-rest-api

Expose [Actual](https://actualbudget.org/) data via plain old HTTP rest APIs without the need of using the JS SDK or querying the SQLite3 DB.

## Running

```shell
git clone https://github.com/acifani/actual-rest-api.git
pnpm install
pnpm build
```

Some environment variables are required, you can find them in `.env.example`.
You can create an `.env` file or export them to your shell manually.

```shell
# Use native nodejs .env loader (requires v24+)
node --env-file=.env ./dist/index.js

# or export them on your shell however you want
export ACTUAL_SERVER_URL=https://my-actual.server.dev/
export ...

node ./dist/index.js
```

There's also a Docker image available in the
[Packages](https://github.com/acifani/actual-rest-api/pkgs/container/actual-rest-api) section of this repo.

## Google Sheets

You can import the data directly into Google Sheets (or Excel)

```gsheet
=IMPORTDATA("https://your-actual.server.dev/transactions?format=csv&token=...")
```
