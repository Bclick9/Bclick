# Neon Plugin Access — Governance

**NOTE ID:** NOTE-NEON-PLUGIN-ACCESS-GOVERNANCE  
**Date:** 2026-10-21  
**Status:** **APPROVED by Project Owner on 2026-10-21**  
**Scope:** Existing Neon project `copabet365`, repository secret `DATABASE_URL`, GitHub Actions migration execution, and any Neon database connector/plugin exposed in ChatGPT.

## 1. Purpose

Neon access through a ChatGPT plugin is available for troubleshooting and inspection. This access is deliberately governed as **read-only diagnostic access**. It does not replace repository review, migration files, or auditable GitHub Actions execution.

The Project Owner has established that the database is a new, uninitialized target: the read-only preflight connected to PostgreSQL 18.6 in the Frankfurt region, but found none of the 12 expected `identity_*` tables and no `public.pgmigrations` table. The six-count reference `0 / 0 / 1 / 5 / 0 / 5` was therefore **not measurable**; absent tables must not be treated as tables with zero rows.

## 2. Password rotation status

**Status: owner-reported complete; not independently verified by this NOTE.**

On 2026-10-21, the Project Owner confirmed that the Neon database password was changed and the repository Actions secret `DATABASE_URL` was updated afterward. This NOTE records that report; it does not read, display, validate, or re-test the secret value.

- Never paste or commit `DATABASE_URL`, passwords, or connection strings into chat, issues, PR comments, logs, or repository files.
- Do not print secrets or database endpoint hostnames in preflight output.
- If credentials are suspected to be exposed again, stop database access, rotate the credential, update the GitHub secret, and resume only after the Project Owner confirms the rotation.

## 3. Permitted and prohibited Plugin use

### Permitted: read-only diagnostics

Use the Neon plugin/connector only for explicitly requested, read-only checks such as:

- `SELECT` queries that inspect schema, migration history, counts, referential integrity, roles, permissions, and other bounded diagnostics.
- Schema/table/column inventory and safe troubleshooting of connection or SQL errors.
- Preflight checks that emit only the minimum evidence required for a decision and do not expose PII, password hashes, session/token hashes, MFA material, or credentials.

Before each read, confirm that the operation is genuinely read-only. Prefer transaction/session settings that enforce read-only access where the connector supports them. Do not infer that a statement is safe merely because it is submitted through a query tool.

### Prohibited: all writes via Plugin

Do **not** use the Neon plugin/connector for any operation that changes schema, data, migration history, database settings, or other persistent state. This prohibition includes, but is not limited to:

- Applying or rolling back migrations, DDL, `CREATE`, `ALTER`, `DROP`, or `TRUNCATE`.
- `INSERT`, `UPDATE`, `DELETE`, `MERGE`, data repair, seeding, or bootstrap operations.
- Any write disguised as a query, including mutating functions or procedures.
- Neon CLI setup/deployment, `neon deploy`, and modifications to `.env.local` or `neon.ts` as part of this task.

If a read-only command cannot be distinguished from a mutating operation, do not run it. Plugin access does not waive any Project Owner approval gate.

## 4. Required audit trail for migrations

Every write/migration operation must be executed through a repository-reviewed GitHub Actions workflow and the approved `DATABASE_URL` repository secret—not through the Plugin, a developer shell, Neon CLI, or an undocumented manual session.

The required evidence package for each approved migration consists of:

1. A version-controlled migration artifact with a stable migration ID/name; changes reviewed through a separate PR.
2. The exact target and environment marker, selected by a deliberate workflow input or protected GitHub Environment; the workflow must not silently default to an unreviewed target.
3. A successful read-only preflight on that exact database before any writes. On missing tables, failed queries, unexpected migration history, destination-name collisions, or a fingerprint mismatch, fail closed without auto-creating or repairing the schema.
4. A workflow run URL/ID, commit SHA, migration identifier(s), operator/approval context, timestamps, command exit status, and unredacted diagnostic logs **excluding secrets and sensitive values**.
5. Pre- and post-migration fingerprints: table names, migration history, required row counts, role/permission mappings, and relevant integrity checks, with expected versus observed values.
6. A post-migration verification step. Preserve the complete safe result as a NOTE linked to the workflow run and migration PR. Any mismatch stops the sequence for a Project Owner decision.
7. A tested recovery/rollback procedure or an explicit declaration that the migration is forward-fix only; never claim rollback is verified without evidence.

The migration runner must use the repository's existing `node-pg-migrate` mechanism. Workflow permissions should be least-privilege, write workflows should be manually invoked and protected by appropriate approval controls, and concurrency should prevent overlapping migration runs. A secret must be exposed only to the step that requires it and never echoed or included in an artifact.

**Implementation caveat:** this document defines the required audit controls; it does not assert that a baseline-write workflow already exists or has already been run. The baseline workflow itself must be reviewed before its first execution.

## 5. Current sequence and explicit approval boundaries

### Current blocker

The existing read-only Neon preflight was correctly blocked because the schema and migration history table are absent. It made no database changes. The six-count reference is not measurable until the approved baseline schema exists.

### Next step, only after this NOTE is approved

Prepare and review a dedicated GitHub Actions workflow that runs **only** these two existing baseline migrations in order:

1. `1792497600000_api_skeleton_baseline.sql`
2. `1792512000000_identity_sessions.sql`

Before that run, confirm the updated repository secret is available to Actions without displaying its value. The workflow must not create an administrator account and must not enable wallet, ledger, payment, provider callback, deposit, or other financial flows. Do not edit or replay old migration files. If the workflow or target identity is uncertain, stop before execution.

After both baselines succeed, run the same read-only preflight against Neon and publish the exact observations and workflow evidence. The expected tuple is `0 / 0 / 1 / 5 / 0 / 5` in the canonical order **players / admins / roles / role-permission links / admin-role links / permissions**. Verify the role is exactly `project-admin`, all 12 source tables exist, all planned destination names are collision-free, there are no sessions in the fresh baseline, the five legacy permission rows and links are intact, zero of 36 canonical permissions exist, and migration history contains exactly the two expected baseline migrations.

- If all checks pass, stop and request separate Project Owner authorization for Migration 001.
- If any check differs, any query fails, or the migration history differs, stop, document results, and request the Project Owner's decision.
- Do not create or execute Migration 001 automatically after the baseline or successful preflight.

## 6. Fixed gates

- **Q-020:** Open.
- **Q-011:** P0/Open. Neon is not thereby treated as isolated staging, and this work does not satisfy Q-011 or authorize production deployment.
- **Q-015:** Open; no launch.
- **Q-009:** TND provider routing remains blocked.
- **Phase 4:** local/cloud test work only; no production deployment or real-money flow.
- **Migration 001:** requires a successful Neon preflight followed by separate, explicit Project Owner approval.
- **Migration A / Migration 005:** requires its own separate NOTE and explicit authorization.
- **Migration B:** prohibited until its five ADR-023 criteria are evidenced and separately approved.

## 7. Approval record

- Password rotation and GitHub `DATABASE_URL` update: **reported complete by Project Owner on 2026-10-21; not independently verified here**.
- This Governance NOTE: **approved by Project Owner; PR #68 merged to main at commit `24e283539f521e00aaf06725b276cd15aed0d02d`**.
- Baseline migrations on Neon: **approved in principle by Project Owner, but execution remains gated on approval of this NOTE and a reviewed GitHub Actions write workflow**.
- Neon read-only preflight: **BLOCKED because the baseline schema is absent**; no writes were performed.
- Migration 001: **not created or executed; separate explicit approval required**.
