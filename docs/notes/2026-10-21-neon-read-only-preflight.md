# Neon Read-Only Preflight Results

**NOTE ID:** NOTE-NEON-READ-ONLY-PREFLIGHT-2026-10-21  
**Date:** 2026-10-21  
**Status:** **READ-ONLY PREFLIGHT PASS — PROJECT OWNER REVIEW REQUIRED**  
**Prior approval:** PR #71 baseline-results NOTE approved and merged  
**Baseline comparison:** Matches the verified GitHub Actions postflight for Run `39584194467`, Job `119168922726`, executed commit `f3d5d84beeb359b6108e583b10cc656ebf136b82`  
**Scope:** Read-only inspection of the existing Neon database only. This NOTE does not authorize Migration 001.

## 1. Executive result

The live Neon read-only preflight matches the approved baseline reference:

| Reference measure | Expected | Live observed | Result |
|---|---:|---:|---|
| Players | 0 | 0 | PASS |
| Admin accounts | 0 | 0 | PASS |
| Roles | 1 | 1 | PASS |
| Role-permission links | 5 | 5 | PASS |
| Admin-role assignments | 0 | 0 | PASS |
| Permissions | 5 | 5 | PASS |
| **Reference tuple** | **0 / 0 / 1 / 5 / 0 / 5** | **0 / 0 / 1 / 5 / 0 / 5** | **PASS** |
| Session rows (additional check) | 0 | 0 | PASS |
| `public.pgmigrations` rows | 2 | 2 | PASS |

The live preflight also confirmed all 12 expected identity tables, exactly the two approved baseline migration-history entries, the expected project-admin role and five legacy permission links, zero canonical permissions from the checked 36-code set, and no destination-name collisions.

**Decision:** The read-only baseline comparison passes. Stop here and await the Project Owner's NOTE review. There is no authorization to start Migration 001.

## 2. Target identity and environment caution

The Neon Plugin's read-only project/branch metadata and SQL identity query returned:

| Field | Observed value |
|---|---|
| Neon project | `copabet365` |
| Project ID | `wandering-poetry-29150200` |
| Region | `aws-eu-central-1` / `eu-central-1` |
| Database | `neondb` |
| Branch | `production` |
| Branch ID | `br-weathered-pine-baj37djx` |
| Default branch | Yes |
| Branch protected flag | `false` |
| PostgreSQL | `18.6 (fd34222)`, server version number `180006` |
| SQL schema | `public` |
| SQL current role | `neondb_owner` |

The project metadata also reported `block_public_connections: false` and an empty allowed-IP list. No change was made to these settings.

**Important environment warning:** The live target is the default branch named `production`, and its metadata reports `protected: false`. This does not constitute isolated staging. Q-011 remains P0/Open; the successful counts do not reduce this risk or authorize production deployment.

## 3. Six live reference queries

Each of the six queries below was executed individually as a read-only `SELECT COUNT(*)` against project `copabet365`, branch `production`, database `neondb`.

| Measure | Read-only query | Result |
|---|---|---:|
| Players | `SELECT COUNT(*)::int FROM public.identity_players` | 0 |
| Admin accounts | `SELECT COUNT(*)::int FROM public.identity_admins` | 0 |
| Roles | `SELECT COUNT(*)::int FROM public.identity_admin_roles` | 1 |
| Role-permission links | `SELECT COUNT(*)::int FROM public.identity_admin_role_permissions` | 5 |
| Admin-role assignments | `SELECT COUNT(*)::int FROM public.identity_admin_account_roles` | 0 |
| Permissions | `SELECT COUNT(*)::int FROM public.identity_admin_permissions` | 5 |

Tuple order is fixed as **players / admins / roles / role-permission links / admin-role assignments / permissions**. The live result is **`0 / 0 / 1 / 5 / 0 / 5`**, identical to the approved baseline postflight tuple.

Supplemental read-only count: `SELECT COUNT(*)::int FROM public.identity_sessions` returned **0**.

## 4. Identity schema inventory — 12 of 12 tables present

The `information_schema.tables` query was restricted to schema `public` and the expected table names. All 12 were found:

1. `identity_players`
2. `identity_admins`
3. `identity_sessions`
4. `identity_admin_auth_challenges`
5. `identity_admin_recovery_codes`
6. `identity_one_time_tokens`
7. `identity_rate_limits`
8. `identity_security_audit_events`
9. `identity_admin_roles`
10. `identity_admin_permissions`
11. `identity_admin_role_permissions`
12. `identity_admin_account_roles`

**Result:** 12 expected tables present. A separate read-only lookup of the 12 legacy destination names (`players`, `admin_users`, `auth_sessions`, `admin_mfa_challenges`, `admin_mfa_recovery_codes`, `player_one_time_tokens`, `rate_limits`, `audit_events`, `roles`, `permissions`, `role_permissions`, `admin_role_assignments`) returned no collisions.

## 5. Migration history — exactly two rows

The read-only query against `public.pgmigrations` returned:

| Field | Result |
|---|---|
| Total migration-history rows | **2** |
| First row | `1792497600000_api_skeleton_baseline` |
| Second row | `1792512000000_identity_sessions` |

These are the same two baseline migrations recorded by the approved GitHub Actions run. No third migration is present in the observed history.

## 6. Role and permission consistency checks

| Check | Live result |
|---|---|
| Role inventory | Exactly `project-admin` / `Project Administrator` |
| Legacy permission count | 5 |
| Mappings to `project-admin` | All 5 legacy permissions |
| Canonical permissions from the baseline gate's 36-code list | 0 |
| Admin account rows | 0 |
| Session rows | 0 |

The five legacy permission codes observed, each linked to `project-admin`, were:

- `admin.players.read`
- `admin.players.write`
- `admin.security.audit.read`
- `admin.security.manage`
- `admin.session.read`

No admin account or session was created as part of these checks.

## 7. Method, boundaries, and side effects

- Used the Neon Plugin for project/branch metadata and explicit read-only SQL.
- SQL statements were limited to `SELECT` statements against identity, information-schema, and migration-history data.
- No `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, migration runner, transaction with writes, rollback, branch operation, or configuration change was run.
- No `DATABASE_URL` secret was read or changed; no connection string or password is recorded here.
- No Neon data, project setting, branch setting, or migration history was modified.
- This NOTE records current observations, not an assertion that the environment is isolated or production-safe.

## 8. Fixed gates and required next step

The Project Owner must review this NOTE and the results before any next database step.

- **Migration 001:** NOT AUTHORIZED. Wait for a separate, explicit Project Owner approval after this NOTE review.
- **Migration B:** Prohibited.
- **Q-020, Q-011, Q-015, Q-009:** Remain as previously recorded; none is closed by this preflight.
- **Q-011:** P0/Open. The checked Neon branch is named `production`, is the default branch, and is reported as unprotected; it is not isolated staging.
- **Phase 4:** Local/cloud testing only; no production deployment or real-money flows.
- **DATABASE_URL:** Do not change.
- **Rollback:** Not performed; do not attempt rollback on this Neon target.
- **Neon Plugin:** Read-only diagnostics only. All future writes require a reviewed and owner-approved GitHub Actions workflow as applicable.

**STOP:** This read-only preflight is complete. Publish/review this NOTE, then await the Project Owner's separate authorization before starting Migration 001.
