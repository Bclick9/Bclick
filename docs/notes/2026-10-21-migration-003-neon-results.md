# Migration 003 — Neon Apply Results NOTE

**NOTE ID:** NOTE-MIGRATION-003-NEON-RESULTS-2026-10-21  
**Date:** 2026-10-21  
**Status:** **APPLIED SUCCESSFULLY — POSTFLIGHT PASSED — STOP POINT REACHED**  
**Repository:** `Bclick9/Bclick`  
**Workflow run:** [39607855943 — Identity Migration 003 on Neon · run 4](https://github.com/Bclick9/Bclick/actions/runs/39607855943)  
**Workflow commit on main:** `13fdf78b81d9ac496aaf1815f4b38a5b77f3d34c`  
**Neon job ID:** `119248640217`  
**Run window (UTC):** started `2026-10-21T13:25:24Z`; completed `2026-10-21T13:26:05Z`  
**Target marker:** `copabet365-neondb-frankfurt`  
**Target identity reported by the gate:** database `neondb`, schema `public`, PostgreSQL `18.6 (fd34222)`

## 1. Outcome

Migration 003, `1792756800000_identity_player_credentials_003`, was applied to the approved Neon target through the dedicated protected GitHub Actions workflow. The run completed with conclusion `success`.

The live job completed all of the following steps successfully:

1. Required `main` and the exact owner target confirmation.
2. Verified the exact reviewed migration inventory and pinned SQL blobs.
3. Installed the locked workspace.
4. Executed the read-only Neon Preflight.
5. Applied exactly one migration using `node-pg-migrate up --count 1`.
6. Executed the read-only Neon Postflight.

Observed gate markers:

- `MIGRATION_003_NEON_PREFLIGHT=PASS`
- `MIGRATION_003_NEON_POSTFLIGHT=PASS`

The disposable-PostgreSQL rehearsal job was skipped in this `workflow_dispatch` run as designed; it had already passed separately in CI. This NOTE records a real Neon apply, not a claim based only on rehearsal.

## 2. Preflight evidence

Before applying Migration 003, the read-only gate confirmed:

- Database: `neondb`
- Server version: PostgreSQL `18.6 (fd34222)`
- Schema: `public`
- Migration history count: **4**
- Migration history exactly:
  1. `1792497600000_api_skeleton_baseline`
  2. `1792512000000_identity_sessions`
  3. `1792584000000_identity_domain_migration_001`
  4. `1792670400000_identity_sessions_split_002`
- Player count: **0**
- Player sessions: **0**
- Admin sessions: **0**
- Profile and credential destination tables: absent before execution
- Required existing v2/KYC source columns: present
- Currency configuration unchanged: EUR = 2 decimal places, TND = 3, USD = 2

Approved reference tuple order is players / admins / roles / role-permission links / admin-role links / permissions. Preflight returned:

`0 / 0 / 1 / 5 / 0 / 5`

## 3. Apply and Postflight evidence

Postflight confirmed:

- Migration history count: **5**
- The four prior migrations remain present and in order.
- The fifth migration is `1792756800000_identity_player_credentials_003`.
- Player count: **0**
- `player_profiles` row count: **0**
- `player_credentials` row count: **0**
- Player sessions: **0**
- Admin sessions: **0**
- Generated `players.age_confirmed_at` alias: present.
- Existing v2/KYC source columns: preserved.
- Credential foreign-key and unique constraints: present.
- EUR / TND / USD precision: unchanged at 2 / 3 / 2 decimal places.
- Approved reference tuple remains **`0 / 0 / 1 / 5 / 0 / 5`**.

The database was empty of player records at the approved checkpoint. Therefore this live run created the profile and credential tables but did not copy any real player rows or password hashes. Exact profile/hash copy behavior, including a negative-path rollback guard, was exercised against synthetic rows in the separate disposable PostgreSQL rehearsal documented in [Migration 003 CI Results NOTE](2026-10-21-migration-003-credentials-results.md).

## 4. Scope and stop point

- **Migration 003 on Neon: COMPLETE.** Apply and Postflight passed.
- **Migration 004, 005 and 006: NOT STARTED and NOT AUTHORIZED by this NOTE.**
- **Migration B: remains prohibited.**
- No wallet, ledger, payments, provider settlement or real-money flow was migrated or activated.
- No application Auth API cutover was performed in this work.
- No player, profile, credential or session records were inserted by this migration run.

## 5. Runtime synchronization caveat

Migration 003 is a one-time additive schema/backfill migration. It does not create triggers or dual-write behavior. The current application code still reads and writes legacy `players` fields, so future registrations, profile/email changes or password resets will not automatically update `player_profiles` or `player_credentials`.

The project owner explicitly identified the next phase as updating Fastify Auth API code to use the new tables in this test environment. Until that separately reviewed code change is complete, the new tables must not be treated as already synchronized with subsequent legacy writes.

## 6. Required next action

**STOP HERE, as instructed by the Project Owner.** Report this NOTE and await the owner’s request to proceed with the Auth API implementation. Do not start Migration 004–006 or any additional database mutation from this milestone.
