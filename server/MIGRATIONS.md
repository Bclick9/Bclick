# Server database migrations

Schema changes are explicit, ordered, reviewed and run with `node-pg-migrate`:

```powershell
$env:DATABASE_URL = 'postgresql://bclick_dev:local_only_change_me@127.0.0.1:5432/bclick'
pnpm --filter @bclick/server migrate:up
```

The identity schema is managed by the ordered SQL migrations in this directory. Migration 004 adds a separate sequence-backed public player number and editable personal-profile columns to the existing `players` table. The UUID `players.id` remains the internal primary key and foreign-key target; UI/support-facing player IDs use `player_number`. Username is required for new registrations and can be used for login. Existing accounts may continue to log in by email and can set a username once in Personal Info; usernames are case-insensitive and immutable after set.

The first public player number is `100000000` (nine digits). IDs increase by one without wrapping; after `999999999`, the next ID is `1000000000` (ten digits). Existing players are assigned numbers deterministically in creation order during Migration 004. Migration 005 reconciles local databases that already applied the earlier Migration 004 starting at `436222976`: when that known legacy starting number is still present, it accepts gaps caused by deleted local/test accounts if all numbers remain unique and are covered by the sequence high-water mark, then rebases surviving accounts in their existing number order starting at `100000000`. If the known legacy start is missing, it refuses to guess. IDs already in the approved namespace are never renumbered; their sequence high-water mark is preserved to avoid reusing deleted IDs. Unexpected states are rejected. Fresh databases are left at the approved start. Migration 005 intentionally blocks rollback to avoid silently changing IDs already shown to players.

Migration 004 also reconciles the existing Migration 003 profile and credential compatibility mirrors for accounts that were created after Migration 003. The active identity service still treats `players` as the source of truth. Keep those mirrors synchronized until a separately reviewed read/write cutover is approved.

Do not run local development migrations against Neon or another shared/prod database. Review the target connection carefully and test schema changes against a disposable database before approving them. Do not enable automatic schema sync at server startup. Rollbacks must fail closed rather than silently dropping public player identifiers or saved personal profile information.
