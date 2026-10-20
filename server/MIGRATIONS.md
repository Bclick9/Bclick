# Server database migrations

Schema changes are explicit, ordered, reviewed and run with `node-pg-migrate`:

```sh
DATABASE_URL='postgres://…' pnpm --filter @bclick/server migrate:up
```

The first application-domain migration is intentionally not included in the skeleton. The reviewed planning data model still has owner decisions around retention/legal hold, role/permission details and cross-document consistency; adding illustrative tables here would falsely turn open decisions into schema. Keep this directory in place and add the first migration only after its scope is approved.

Use migration files supported by the pinned `node-pg-migrate` version, preferably SQL migrations with explicit Up/Down markers for auditable DDL. Do not enable automatic schema sync at server startup. Test new migrations against an empty database and a restored staging copy before deployment. A rollback must not delete posted ledger history; financial corrections are append-only compensating journals.
