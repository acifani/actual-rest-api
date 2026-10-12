FROM node:26-slim

RUN npx get-pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

CMD [ "pnpm", "start:docker" ]
