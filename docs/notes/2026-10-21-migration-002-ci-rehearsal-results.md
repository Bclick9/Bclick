# Migration 002 — CI Rehearsal Results

**NOTE ID:** NOTE-MIGRATION-002-CI-REHEARSAL-RESULTS-2026-10-21  
**Date:** 2026-10-21  
**Status:** **CI REHEARSAL PASS — Migration 002 on Neon remains NOT AUTHORIZED**  
**Related PR:** [#77 — feat(db): plan and rehearse Migration 002 session split](https://github.com/Bclick9/Bclick/pull/77)  
**Code commit tested:** `08b15a6725e2cd6697b983d275d2b48e7213c239`  
**Target:** GitHub Actions disposable PostgreSQL 18.6 only (`bclick_ci`, loopback connection)  
**Explicit exclusions:** no Neon connection, no Neon Plugin writes, no changes to `DATABASE_URL`, no Neon migration or rollback.

## 1. Executive result

The dedicated Migration 002 CI rehearsal completed successfully. It applied the ordered migrations to a disposable PostgreSQL 18.6 database, asserted the split schema, ran Identity API tests, proved the admin MFA database guard, proved the down migration refuses to proceed while session data exists without losing that data, removed only known CI fixtures, rolled back cleanly, verified the old schema was restored, re-applied Migration 002, and re-ran the API tests.

**Final conclusion:** `completed / success`. This is evidence for the disposable CI rehearsal only. It is not authorization to apply Migration 002 to Neon.

## 2. Authoritative workflow/job evidence

- **Workflow run:** [Run #39592634948 — Identity Migration 002 CI rehearsal (disposable database only)](https://github.com/Bclick9/Bclick/actions/runs/39592634948)
- **Job:** [Job 119197272325 — Apply, assert, rollback, and re-apply Migration 002 on disposable PostgreSQL](https://github.com/Bclick9/Bclick/actions/runs/39592634948/job/119197272325)
- **Run ID:** `39592634948`
- **Job ID:** `119197272325`
- **Run attempt:** 1
- **Conclusion:** `success`
- **Created:** 2026-10-21 11:31:54 UTC
- **Completed/updated:** 2026-10-21 11:32:53 UTC
- **Executed commit:** `08b15a6725e2cd6697b983d275d2b48e7213c239`

The workflow's target guard required `CI=true`, `BCLICK_M002_REHEARSAL_TARGET=ci-disposable`, a loopback database hostname, and database name `bclick_ci`. Its connection was the temporary PostgreSQL service provisioned by this Actions run. The workflow has no Neon environment or secret binding.

## 3. Apply and schema postcheck — PASS

The run applied the ordered migrations to the fresh disposable database. The M002 postcheck emitted `MIGRATION_002_POSTCHECK=PASS` and verified:

- `player_sessions` and `admin_sessions` exist.
- The mixed table `auth_sessions` is absent after Migration 002.
- Both new tables are empty immediately after migration.
- Player sessions use a required `player_id` foreign key to `players(id)`; admin sessions use a required `admin_id` foreign key to `admin_users(id)`.
- The new table columns and expected principal/expiry indexes exist.
- `admin_sessions.mfa_verified` is NOT NULL and has the check constraint requiring TRUE.
- Migration history contains exactly four rows, including `1792670400000_identity_sessions_split_002`.
- The unchanged reference tuple remains **players / admins / roles / role-permission links / admin-role links / permissions = `0 / 0 / 1 / 5 / 0 / 5`**.
- The five legacy permission codes and their five links remain intact.
- The currency rows remain `EUR=2`, `TND=3`, and `USD=2` decimal places.

No session rows were transferred because the rehearsal source was empty. The migration is designed to stop before DDL if `auth_sessions` is non-empty; that guard is not a substitute for a separately reviewed session-transfer plan if any target ever has rows.

## 4. Security/rollback tests — PASS

### Admin MFA database invariant

The rehearsal attempted to insert an `admin_sessions` row with `mfa_verified=false`. PostgreSQL rejected it with SQLSTATE `23514`, and the script printed:

`MIGRATION_002_MFA_GUARD=PASS`

The error line for this intentionally rejected insert is expected negative-test output; it did not fail the job. The accepted fixture then used `mfa_verified=true`.

### Rollback refusal with data preserved

The script inserted known test fixtures into `player_sessions` and `admin_sessions`, then the workflow attempted `node-pg-migrate down --count 1`. The down guard refused because a session row existed, and verification confirmed both session rows and the four-row migration history were intact.

Markers:
- `MIGRATION_002_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS`
- `MIGRATION_002_ROLLBACK_FIXTURES=CLEANED`

The logged SQL error `Migration 002 rollback stopped: player_sessions contains records` is expected guard behavior. It demonstrates that rollback did not drop populated session tables.

### Clean rollback and re-apply

After the script deleted only its known CI fixtures and returned the session tables to zero rows, the clean down migration succeeded. The rollback postcheck printed `MIGRATION_002_ROLLBACK_POSTCHECK=PASS` and verified:

- The mixed `auth_sessions` table was restored, with its expected columns and indexes.
- `player_sessions` and `admin_sessions` were absent.
- `auth_sessions` contained zero rows.
- Migration history returned to exactly the prior three records.
- The reference tuple, five legacy permission links, and currency precisions were unchanged.

The workflow then re-applied exactly Migration 002 and the postcheck emitted `MIGRATION_002_POSTCHECK=PASS` again.

## 5. Application/API and companion CI checks

The API test step passed both before and after the clean rollback/re-apply sequence. The Identity test suite now checks the real Set-Cookie response behavior for the two session classes:

- Player session cookie: `SameSite=Lax`, `Secure`, `HttpOnly`, `Path=/`, no `Domain`.
- Admin session cookie, only after the MFA completion path: `SameSite=Strict`, `Secure`, `HttpOnly`, `Path=/`, no `Domain`.
- CSRF cookies remain JavaScript-readable for the existing double-submit contract; player/admin CSRF values are not interchangeable.

The associated PR checks on the tested code commit also completed successfully:

| Check | Evidence | Conclusion |
|---|---|---|
| Migration 002 apply / assertions / rollback / re-apply | [Run 39592634948 · Job 119197272325](https://github.com/Bclick9/Bclick/actions/runs/39592634948/job/119197272325) | **PASS** |
| Migration 001 isolated CI rehearsal including API tests on latest schema | [Run 39592634945 · Job 119197289425](https://github.com/Bclick9/Bclick/actions/runs/39592634945/job/119197289425) | **PASS** |
| Migration 001 pre/postflight gate against disposable database | [Run 39592634951 · Job 119197237191](https://github.com/Bclick9/Bclick/actions/runs/39592634951/job/119197237191) | **PASS** |
| Migration 001 read-only CI preflight | [Run 39592634979 · Job 119197127866](https://github.com/Bclick9/Bclick/actions/runs/39592634979/job/119197127866) | **PASS** |
| API types/tests/migrations/health contract | [Run 39592634908 · Job 119197128761](https://github.com/Bclick9/Bclick/actions/runs/39592634908/job/119197128761) | **PASS** |
| OpenAPI lint and generated client | [Run 39592634908 · Job 119197128387](https://github.com/Bclick9/Bclick/actions/runs/39592634908/job/119197128387) | **PASS** |
| Storefront and dashboard builds | [Run 39592634923 · Job 119197127701](https://github.com/Bclick9/Bclick/actions/runs/39592634923/job/119197127701) | **PASS** |

The manual Neon job in Run `39592634951` was **skipped as expected** for a pull-request event. These CI results are not evidence of a Neon write, and no Neon operation was performed.

## 6. Important limitations and follow-ups

1. The source table is required to be empty. If any environment contains a session at review/apply time, stop and design a separately approved, auditable transfer/revocation plan. Do not run this migration unchanged against a non-empty source.
2. The schema migration and updated IdentityService are one coordinated change. Do not apply only the migration SQL or deploy application code alone in an incompatible order.
3. Cookie SameSite policy is application-level behavior, not database data; its regression tests passed in the Identity API test suite.
4. A successful CI rehearsal does not close Q-020, Q-011, Q-015 or Q-009, and it does not prove production readiness.

## 7. Fixed gates / decision still required

- **Q-020:** unchanged / open.
- **Q-011:** unchanged / **P0/Open**; restore drill outstanding. The Neon branch called `production` is not isolated staging.
- **Q-015:** unchanged / open.
- **Q-009:** unchanged / open; TND provider routing remains blocked.
- **Migration B:** remains prohibited.
- **Migration 002 on Neon:** **NOT AUTHORIZED**. Wait for the Project Owner's separate explicit approval after review of this NOTE and PR.
- **DATABASE_URL:** unchanged; do not modify.
- **Neon Plugin:** read-only diagnostics only; no plugin writes.
- **Rollback on Neon:** not attempted and not authorized by this CI NOTE.

**Final result: Migration 002 CI rehearsal = PASS; Migration 002 on Neon = STOP / AWAITING SEPARATE OWNER APPROVAL.**
