# Bclick API server skeleton

This workspace is the actual API server; `backend/` remains the Backoffice/CMS React/Vite UI.

## Scope in this increment

- Fastify server with `GET /api/v1/health/live` and `GET /api/v1/health/ready`, aligned to the health schemas in `docs/planning/openapi.yaml`.
- Validated runtime configuration from `@bclick/config`.
- PostgreSQL pool readiness probe, server request IDs, query-string-safe request logging and secret-header redaction.
- Explicit `node-pg-migrate` command. The application does not automatically run migrations at startup.

There are no identity, admin mutation, wallet, payment, CMS upload, provider callback or provider-launch endpoints in this skeleton. A healthy process is not evidence that real-money processing is ready.

## Run locally

Prerequisites: Node.js 22.12 or newer, pnpm 10.4.1, and a PostgreSQL database accessible from the host.

```sh
pnpm install --frozen-lockfile
pnpm --filter @bclick/config build
```

Set these environment variables in your shell (do not commit a real credential file):

```sh
export NODE_ENV=development
export HOST=127.0.0.1
export PORT=3000
export DATABASE_URL='postgres://bclick_dev:local_only_change_me@127.0.0.1:5432/bclick'
pnpm --filter @bclick/server dev
```

In PowerShell, use `$env:DATABASE_URL='postgres://…'` and set the other `$env:NAME` variables the same way.

The readiness endpoint returns `200 {"status":"ok"}` only when a database `SELECT 1` succeeds; otherwise it returns `503 {"status":"not_ready"}`. It does not return exception messages or connection details.

## Checks

```sh
pnpm api:lint
pnpm api:client:generate
pnpm api:typecheck
pnpm api:test
pnpm --filter @bclick/server build
```

The generated TypeScript contract is derived from `docs/planning/openapi.yaml`. Edit the canonical contract first and commit the regenerated declaration with the same change.
