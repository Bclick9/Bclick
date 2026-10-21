# Neon Baseline Workflow Review

**NOTE ID:** NOTE-NEON-BASELINE-WORKFLOW-REVIEW  
**Date:** 2026-10-21  
**Status:** **AWAITING PROJECT OWNER REVIEW — no Neon writes performed**  
**Scope:** One controlled run of the two existing baseline migrations on `copabet365` / `neondb` / Frankfurt, using GitHub Actions only.

## 1. Credential-check evidence

On 2026-10-21, the Project Owner supplied the following output from the local hidden-input credential test:

```text
CURRENT_CREDENTIAL=ACCEPTED
OLD_CREDENTIAL_RESULT=REJECTED_AUTHENTICATION
CREDENTIAL_TEST_EXIT_CODE=0
```

This result supports that the current URL authenticated and the first old password was rejected for authentication when tested against the same endpoint, database and username. The assistant did not run this local test itself; the evidence is the terminal output supplied by the Project Owner. No credential value is recorded in this NOTE.

## 2. Exact scope of the proposed workflow

The new workflow, `.github/workflows/neon-baseline-migrations.yml`, is manually invoked with `workflow_dispatch` only for database writes. It rejects non-`main` refs and requires the explicit target confirmation `copabet365-neondb-frankfurt`. It references the GitHub repository secret `DATABASE_URL`; the value is never echoed, written to an artifact, or included in the report.

The job references the GitHub Environment `neon-baseline-setup`. **Before first execution, the repository owner must verify that this Environment is configured with required reviewer/protection controls.** The PR review is not a substitute for the runtime environment gate.

Only the following existing migrations are allowed, in the existing order:

1. `1792497600000_api_skeleton_baseline.sql`
2. `1792512000000_identity_sessions.sql`

The workflow verifies that the migrations directory contains exactly these two files and that both file contents match the reviewed Git blob IDs:
- `1792497600000_api_skeleton_baseline.sql`: `d3b2e382f7522fc81ec0ecdb4812c33e4db7ea55`
- `1792512000000_identity_sessions.sql`: `e82d0af78853136a33321489847ab2b0ae1573d8`

This gate prevents the baseline workflow from inadvertently applying a later migration, including Migration 001.

## 3. Fail-closed pre-check

Before the migration runner receives `DATABASE_URL`, the pre-check confirms:
- The explicit target marker is the approved Frankfurt target.
- The connection URL identifies the `neondb` database and the `eu-central-1.aws.neon.tech` region without printing the host.
- The connected database is `neondb` and the server is PostgreSQL 18.
- The only migration files are the two reviewed baseline files with the exact expected Git blob IDs.
- The `public.pgmigrations` table does not exist.
- None of the 12 expected `identity_*` tables or 12 reserved destination names already exists.

If any item fails, the job exits before running a migration. The pre-check correctly describes the six-count reference as **not measurable before the baseline**; absent tables are not reported as zero-count tables.

The workflow can verify the connection's database name, PostgreSQL major version and Frankfurt region without printing the hostname. SQL metadata alone does not prove the Neon project slug. The binding of this repository's existing `DATABASE_URL` secret to project `copabet365` therefore remains part of the Project Owner's secret-management responsibility; this workflow does not read or reveal the secret value. Confirm that the already-configured secret still points to `copabet365` before manually invoking the workflow.

## 4. Migration and post-check

The write step runs the repository's existing command `pnpm --filter @bclick/server migrate:up` through GitHub Actions. The checked-in migration inventory guard ensures this can apply only the two approved baseline files. No Neon Plugin writes, Neon CLI, `.env.local` edits, `neon.ts` edits, or shell-local database writes are part of the path.

The workflow does **not** run `admin:bootstrap`; it must not create an administrator account, wallet, ledger, payments, provider callbacks, deposits, or any financial flows.

After migration, the read-only post-check requires:
- All 12 source identity tables exist and no destination-name collisions exist.
- Reference tuple in the canonical order **players / admins / roles / role-permission links / admin-role links / permissions** equals `0 / 0 / 1 / 5 / 0 / 5`.
- Only role is `project-admin` / `Project Administrator`.
- Exactly the five legacy permissions are present and linked to `project-admin`.
- No canonical permissions from the 36-code inventory, no admin accounts, no sessions, no unknown session principal types, and no orphan sessions.
- Migration history contains exactly the two expected baseline migrations.

Any mismatch fails the job and requires a Project Owner decision. No automatic retry, repair, rollback, or Migration 001 follows a mismatch.

## 5. Audit evidence and recovery boundary

The run logs print the workflow run ID, attempt, commit SHA, repository and target marker. The safe pre/post report contains schema inventory, expected counts, role/permission mappings and migration history; it does not print `DATABASE_URL`, hostnames, player/admin PII, password hashes, session token hashes or MFA material.

The workflow has a concurrency group to prevent overlapping runs and uses a read-only GitHub token permission set (`contents: read`). The database secret is exposed only to the pre-check, migration runner and post-check steps which need it.

This workflow does not attempt rollback on Neon: rolling back `1792512000000_identity_sessions.sql` would drop the newly created identity tables. The workflow instead fails closed and stops for review; no rollback is claimed to have been tested on Neon.

After a successful run, create a separate results NOTE containing the actual workflow run URL/ID, commit SHA, pre-check output, migration command outcome, post-check output, and any errors. Stop after documenting the baseline results. **Migration 001 must not be created or executed automatically** and requires a separate explicit Project Owner approval.

## 6. Fixed gates

- Q-020 remains open.
- Q-011 remains P0/Open. Neon is not isolated staging and this work does not authorize production deployment.
- Q-015 remains open; no launch.
- Q-009 remains blocked for TND provider routing.
- Phase 4 remains local/cloud testing only.
- Migration 001 requires the successful Neon preflight plus separate explicit approval.
- Migration A / Migration 005 requires its own NOTE and explicit authorization.
- Migration B remains prohibited until its five ADR-023 criteria are evidenced and separately approved.

## 7. Current status

- Credential test: result supplied by Project Owner; current credential accepted, first old credential rejected.
- Baseline migration approval: approved in principle by Project Owner.
- Workflow code: prepared for review; **not yet approved, merged, or run**.
- Neon schema: no baseline migrations have been run by this workflow.
- Migration 001: not created or executed.
