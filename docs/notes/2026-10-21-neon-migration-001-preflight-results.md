# Neon Pre-Migration Verification — Migration 001

**Date:** 2026-10-21  
**Status:** **BLOCKED — Project Owner decision required before any database-changing step**  
**Target label:** `neon-copabet365`  
**Workflow:** [Neon Migration 001 preflight](https://github.com/Bclick9/Bclick/pull/67#issuecomment-6312332531)  
**PR:** [#67 — guarded Neon preflight](https://github.com/Bclick9/Bclick/pull/67)  
**Prerequisite:** PR #66 was merged to `main` at commit `920b5294d607e0700f3b01361222584c75ccdedc`.

## 1. What was executed

The GitHub Actions workflow used the repository secret `DATABASE_URL` and ran the approved pre-migration checker in read-only mode. It did not invoke `migrate:up`, any existing baseline migration, Migration 001, Neon CLI, or `neon deploy`. The connection string and endpoint hostname were not logged.

The checker verified that the endpoint hostname matched Neon and contained the Frankfurt region marker `eu-central-1`. The PostgreSQL connection reported database name `neondb` and server version `18.6 (fd34222)`.

**Target identity limitation:** the workflow has no Neon control-plane/API credential with which to independently confirm the Neon project display name `copabet365`. The intended project association therefore depends on the Project Owner's configuration of the `DATABASE_URL` repository secret; only the Neon hostname/region and connected database information were independently checked.

## 2. Preflight observations

| Check | Observed result | Gate |
|---|---|---|
| Expected source tables (`identity_*`) | 0 of 12 found | BLOCKED |
| Missing source tables | All 12 expected tables | BLOCKED |
| Planned canonical destination-name collisions | 0 found | No collision observed, but source schema is absent |
| `public.pgmigrations` history table | Not found | BLOCKED |
| Six-count tuple (`players / admins / roles / role-permission links / admin-role links / permissions`) | **Unavailable** — source tables do not exist | NOT MATCHED / NOT MEASURABLE |
| Role, session, legacy permission/link and canonical permission queries | Not run because prerequisite schema is absent | BLOCKED |
| Migration 001 executed | `false` | PASS — no migration was run |

All 12 missing source names are:
- `identity_players`
- `identity_admins`
- `identity_sessions`
- `identity_admin_auth_challenges`
- `identity_admin_recovery_codes`
- `identity_one_time_tokens`
- `identity_rate_limits`
- `identity_security_audit_events`
- `identity_admin_roles`
- `identity_admin_permissions`
- `identity_admin_role_permissions`
- `identity_admin_account_roles`

## 3. Decision and stop condition

The approved six-count reference `0 / 0 / 1 / 5 / 0 / 5` describes the database **after** the two existing baseline migrations have created the identity schema. It cannot be compared to an uninitialized database by treating absent tables as empty tables. The read-only gate therefore emits `PREFLIGHT_GATE=BLOCKED` and exits non-zero. No schema or data change was made by this run.

**Migration 001 has not been created or executed.** The conditional approval does not pass because the target preflight did not match the reference.

## 4. Project Owner decision required

Choose how to initialize this Neon target before repeating the mandatory read-only preflight:

**Option A — authorize repository baseline initialization:** explicitly authorize running only the two existing migrations in order:
1. `1792497600000_api_skeleton_baseline.sql` (currently a no-op baseline marker).
2. `1792512000000_identity_sessions.sql` (creates the 12 `identity_*` tables and seeds the `project-admin` role plus the five existing legacy permissions/links).

This is a separate schema-changing operation and has **not** been authorized or run by this note. After it succeeds, rerun the Neon preflight; proceed to Migration 001 only if the complete gate passes.

**Option B — owner initializes the schema separately:** keep the database unchanged from this run, have the Project Owner initialize it through an explicitly chosen process, then request another read-only preflight.

Until a decision is received, do not create/apply Migration 001, do not run Migration A/005 or Migration B, and do not run migrations 002–006.

## 5. Fixed project gates

- Q-020 remains Open.
- Q-011 remains P0/Open; no production deployment.
- Q-015 remains Open; no launch.
- Q-009 remains blocked for TND provider routing.
- Phase 4 remains local/test-only; this verification is not a production deployment.
- Permission Migration A/005 needs its own separate NOTE and authorization.
- Migration B remains blocked.
