FROM ghcr.io/pnpm/pnpm:12

RUN pnpm runtime set node 26 -g

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

CMD [ "pnpm", "start:docker" ]
