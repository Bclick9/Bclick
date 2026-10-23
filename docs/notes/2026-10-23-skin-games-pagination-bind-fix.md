# Skin Games pagination bind failure — fixed 2026-10-23

## Evidence from local API

The Owner's local API log for GET /api/v1/admin/casino/skin-games contains:

- requestId: `7a398a9b-0ff3-4d27-9100-55fed3bfa56e`
- SQLSTATE: `08P01`
- PostgreSQL message: `bind message supplies 2 parameters, but prepared statement "" requires 0`
- API response: HTTP 500 / INTERNAL_ERROR

## Root cause

In `server/src/bigbang/skin-games-admin-routes.ts`, the list handler appends the page size and offset to the array passed to `database.query`, but the generated SQL used:

```ts
LIMIT ${values.length+1} OFFSET ${values.length+2}
```

Because there was no extra dollar sign before those interpolations, the SQL emitted numeric literals (e.g. `LIMIT 1 OFFSET 2`) instead of PostgreSQL bind placeholders. Node-postgres still sent the page-size and offset values, so the PostgreSQL extended-query protocol rejected the parameter count. This explains the exact local error. The provider list can still work because its endpoint has a different query implementation.

## Fix merged

PR #122 merged as `46945fdc8478860a16cc9e13afbbcd3aef2e1cd6`. The fix changes the SQL fragments to `LIMIT $n OFFSET $n+1`, with the placeholder numbers calculated from the number of optional filter parameters. Regression assertions verify:
- no filters: `LIMIT $1 OFFSET $2` with values `[50, 0]`;
- a provider filter: `p.code=$1 LIMIT $2 OFFSET $3` with values `['habanero', 20, 20]`.

The endpoint's normal authenticated response test also verifies actual canonical UUID/source fields and no-store headers. No schema, data, or migration change is involved in this fix.

## Local acceptance remaining (still pending)

After PR #122 is merged, update main, confirm the local worktree is clean before pulling, and restart `.`\start-bclick-local.ps1` to rebuild/restart the host-side API. Refresh Skin Games and confirm non-zero real rows. Then choose Standard, drag a game, reload and verify its saved display order persists and affects the public catalogue.

Do not manually rerun or roll back Migration 012 for this SQLSTATE: the observed error is a parameter-binding mismatch. Q-005, Q-006, Q-010, Q-011, Q-013, and Q-020 remain open; Premium and real-money functionality remain blocked.
