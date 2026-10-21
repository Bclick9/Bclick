# Migration 003 — Credentials Split CI Results NOTE

**NOTE ID:** NOTE-MIGRATION-003-CREDENTIALS-RESULTS-2026-10-21  
**Date:** 2026-10-21  
**Status:** **DISPOSABLE CI REHEARSAL PASSED — AWAITING PROJECT OWNER REVIEW**  
**PR:** [#80 — feat(db): plan and rehearse Migration 003 credentials split](https://github.com/Bclick9/Bclick/pull/80)  
**Tested implementation commit:** `a2a1cc85b52dac423c1efc4572c08c9908e4710e)  
**Scope:** Review and verify Migration 003 candidate SQL and its CI-only rehearsal. This NOTE does not authorize applying Migration 003 to Neon.

## 1. Actual CI evidence

### Migration 003 Apply / Down / Re-apply

- **Workflow run:** [39605534869 — Identity Migration 003 CI rehearsal (disposable PostgreSQL only), run 10](https://github.com/Bclick9/Bclick/actions/runs/39605534869)
- **Job ID:** `119240751620`
- **Result:** `success`; all 21 job steps, including setup and cleanup steps, completed successfully.
- **Database:** disposable GitHub Actions service `bclick_ci`, PostgreSQL 18.6; synthetic fixture rows only.
- **Implementation commit tested:** `a2a1cc85b52dac423c1efc4572c08c9908e4710e`.

Observed markers and outcomes:

| Phase | Observed result |
|---|---|
| Build prior four-migration baseline | `MIGRATION_003_PRIOR_BASELINE=PASS` |
| Seed two synthetic players | `MIGRATION_003_SEED=PASS` |
| Apply Migration 003 and verify profile/credential mirrors, hash equality, v2/KYC fields and generated alias | `MIGRATION_003_POSTCHECK=PASS` |
| Deliberately alter one synthetic credential mirror | `MIGRATION_003_ROLLBACK_GUARD_MUTATION=PASS` |
| Attempt Down against the mismatched mirror | Expected refusal: `Migration 003 rollback stopped: 1 credential/profile rows differ from legacy source; no tables were dropped` |
| Verify refused Down kept migration and tables in place, preserved the legacy source hash, and restore the synthetic mirror | `MIGRATION_003_ROLLBACK_GUARD_REFUSAL=PASS` |
| Run identity/API suite before clean rollback | 15 passed, 0 failed |
| Clean Down | `MIGRATION_003_ROLLBACK_POSTCHECK=PASS`; migration history returned to four entries and original synthetic source rows/hashes remained unchanged |
| Re-apply Migration 003 | `MIGRATION_003_POSTCHECK=PASS` |
| Run identity/API suite after re-apply | 15 passed, 0 failed |
| Remove only the known synthetic fixtures | `MIGRATION_003_FIXTURE_CLEANUP=PASS`; zero player/profile/credential fixture rows remain |

The type-check command `pnpm api:typecheck` passed. The final cleanup log confirmed the reference tuple was restored to **`0 / 0 / 1 / 5 / 0 / 5`** and the remaining player, profile and credential row counts were all zero. The five-row migration history is expected because the CI database ended with Migration 003 re-applied.

The 15-test suite ran twice (15/15 each time); these are two successful executions of the same suite, not 30 distinct tests. Registration contract checks rejected missing date of birth, missing terms acceptance, missing age confirmation, and explicit false consent values.

## 2. Related CI and guard verification

All of the following checks for the tested commit completed successfully:

- [Identity Migration 001 CI rehearsal — run 39605535069](https://github.com/Bclick9/Bclick/actions/runs/39605535069): success.
- [Identity Migration 002 workflow — run 39605535167](https://github.com/Bclick9/Bclick/actions/runs/39605535167): disposable PostgreSQL pre/postflight success; the guarded Neon job was **skipped**.
- [Identity Migration 001 workflow — run 39605534980](https://github.com/Bclick9/Bclick/actions/runs/39605534980): disposable PostgreSQL pre/postflight success; the guarded Neon job was **skipped**.
- [Identity Migration 001 read-only CI target preflight — run 39605534997](https://github.com/Bclick9/Bclick/actions/runs/39605534997): success.
- [API skeleton and contract checks — run 39605534901](https://github.com/Bclick9/Bclick/actions/runs/39605534901): both jobs succeeded.
- [Application builds — run 39605534903](https://github.com/Bclick9/Bclick/actions/runs/39605534903): success.

## 3. Security review: SQL and CI files

### Migration 003 SQL candidate

- Up requires the exact four-migration predecessor history, checks required tables and existing v2/KYC column names, rejects pre-existing target tables, and checks source identifier normalization/uniqueness and non-empty source profile/credential values.
- New `player_profiles` and `player_credentials` rows are additive mirrors. The original `players` columns and `players.password_hash` remain in place; hashes are copied without transformation and are not printed by the rehearsal.
- The generated `age_confirmed_at` alias is read-only and derived from the existing `age_confirmation_at`. No duplicate v2/KYC source fields are introduced.
- Down validates the exact five-migration state and verifies row counts and source-to-mirror equality before dropping anything. The newly added negative-path rehearsal directly proved it refuses a mismatched credential hash before dropping either new table.
- The current application still reads/writes the legacy `players` fields. This is an expand/backfill migration, **not** an application cutover to the new credential table.

### Runtime synchronization caveat (important for a future Neon decision)

Migration 003 performs a one-time transactional copy. It does **not** add triggers or dual-write behavior. Once it is applied to a live database, subsequent registrations, profile edits, email changes or password resets handled only by the current IdentityService will change `players` without updating `player_profiles` / `player_credentials`. Therefore CI proves the initial backfill and safe rollback guards; it does not prove ongoing synchronization.

Until a separately reviewed application cutover / dual-write / catch-up process is implemented, runtime code must not treat the new tables as authoritative. Before any later Neon application approval, the Project Owner must explicitly decide how writes will be controlled during the interval and how rows created or changed after this one-time backfill will be reconciled. This caveat does not authorize Neon changes and does not expand this PR into Migration 004.

### CI changes to Migration 001 and Migration 002 workflows

- Migration 001's pinned SQL hash remains `dde5b276dd1220dba5107d7989b6c1378ead101a`. Its changed migration inventory is confined to the disposable CI job; the live-Neon job retains its original strict three-file target allowlist.
- Migration 002's prior migration hashes remain pinned; the M003 blob hash `aa26b9a9888b1f244f14a32272fd7467cfc3876f` is added only to the disposable-CI inventory. The M002 rehearsal creates and checks a separate four-file runner directory before applying exactly one migration.
- The live-Neon job in the Migration 002 workflow retains the strict four-file inventory and does not allowlist Migration 003. With M003 present as an additional repository migration, that inventory comparison fails closed before the guarded database steps. It has not been widened to execute M003.
- Both older workflows retain their `workflow_dispatch`-only Neon job conditions, main-branch requirement, exact target confirmation, protected `neon-baseline-setup` environment, pinned-migration checks, and one-migration `--count 1` application step. Their guarded Neon jobs were skipped in the reviewed PR runs.
- These are historical one-migration workflows, not an execution path for M003. With the current repository migration files present, the M001 three-file allowlist and M002 four-file allowlist do not match the current inventory; either workflow fails its exact inventory comparison before its guarded database steps. The allowlists were not widened to permit a live M003 run.
- Migration 003's new workflow has `contents: read`, provisions only a disposable local PostgreSQL service, and does not configure Neon secrets or a Neon environment. Its rehearsal script refuses to run unless CI mode, the explicit `ci-disposable` marker, localhost and database name `bclick_ci` all match.
- Corrected one inaccurate comment in Migration 001's workflow: it now accurately distinguishes the disposable five-migration inventory from the live workflow's unchanged three-file allowlist.

**Review conclusion:** no weakening of the existing Neon execution barriers was found in the reviewed diff. The M003 SQL remains a candidate migration only; its successful CI test is not production authorization.

## 4. Explicitly unchanged gates and prohibitions

- **Migration 003 on Neon: NOT AUTHORIZED by this NOTE.** It requires the Project Owner's separate, explicit approval, a separate guarded run after PR #80 is merged, and an explicit decision covering the runtime synchronization caveat in Section 3.
- Migration 004–006: out of scope and not authorized.
- Migration B: prohibited.
- Q-020, Q-011, Q-015 and Q-009: unchanged; Q-011 remains P0/Open until the VPS restore drill is completed.
- No `DATABASE_URL` change, Neon plugin write, live-database operation, wallet/ledger activation or real-money flow was performed or authorized by this work.

## 5. Owner decision requested

Review this Results NOTE together with PR #80. A PR approval/merge decision is separate from authorizing Migration 003 on Neon. After PR #80 is approved and merged, stop and seek separate approval before any Neon operation.
