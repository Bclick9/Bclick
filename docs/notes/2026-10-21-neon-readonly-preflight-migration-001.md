# Neon Read-Only Pre-Migration-001 Preflight Results

**NOTE ID:** NOTE-NEON-READONLY-PREFLIGHT-MIGRATION-001-2026-10-21  
**Date:** 2026-10-21  
**Status:** **PASS — EXACT MATCH TO APPROVED BASELINE — AWAITING PROJECT OWNER REVIEW**  
**Related PR:** [#73 — guarded Migration 001 + CI rehearsal](https://github.com/Bclick9/Bclick/pull/73)  
**Merged commit:** `d1534cc4341d45e0e375deac19eb2ec881e94ed5`  
**Purpose:** Record a fresh read-only inspection of Neon before any application of Migration 001.

## 1. Executive result

The live read-only checks matched the approved baseline exactly:

- Reference tuple — players / admins / roles / role-permission links / admin-role links / permissions: **0 / 0 / 1 / 5 / 0 / 5**.
- All 12 expected `identity_*` source tables exist.
- All 12 canonical destination names remain absent; **no destination-name collisions**.
- `public.pgmigrations` contains exactly the two approved baseline migration records.
- One `project-admin` / `Project Administrator` role remains.
- All five expected legacy permissions remain linked to `project-admin`.
- Player count, admin-account count, and session count are all zero.
- Canonical permission count is zero.
- **Migration 001 was not run.** No schema or data changes were requested or performed by these SELECT queries.

**Gate outcome: PASS for read-only preflight only. This is not an authorization to apply Migration 001.**

## 2. Exact Neon target inspected

| Property | Observed value |
|---|---|
| Project name | `copabet365` |
| Project ID | `wandering-poetry-29150200` |
| Region | `aws-eu-central-1` (Frankfurt) |
| Branch name | `production` |
| Branch ID | `br-weathered-pine-baj37djx` |
| Branch flags | `primary=true`, `default=true` |
| Database | `neondb` |
| PostgreSQL | `18.6 (fd34222)` |
| Schema checked | `public` |

**Important environment classification:** The inspected Neon branch is named `production` and is the primary/default branch. It is **not an isolated staging environment**. Q-011 (Restore Drill) remains P0/Open; this NOTE does not close it.

## 3. Six reference count queries

Six separate read-only `SELECT COUNT(*)` queries were executed against the existing `identity_*` source tables:

| Tuple position | Source table | Observed count |
|---:|---|---:|
| 1 — players | `identity_players` | 0 |
| 2 — admins | `identity_admins` | 0 |
| 3 — roles | `identity_admin_roles` | 1 |
| 4 — role-permission links | `identity_admin_role_permissions` | 5 |
| 5 — admin-role links | `identity_admin_account_roles` | 0 |
| 6 — permissions | `identity_admin_permissions` | 5 |

**Observed tuple: `0 / 0 / 1 / 5 / 0 / 5` — exact match.**

Additional read-only session count: `identity_sessions = 0`.

## 4. Table inventory

The information-schema inventory verified the following 12 source tables all exist:

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

All 12 canonical destination names are absent, so the pre-migration name-collision check passes:

- `players`
- `admin_users`
- `auth_sessions`
- `admin_mfa_challenges`
- `admin_mfa_recovery_codes`
- `player_one_time_tokens`
- `rate_limits`
- `audit_events`
- `roles`
- `permissions`
- `role_permissions`
- `admin_role_assignments`

The inventory also confirmed `public.pgmigrations` exists.

## 5. Migration history

A read-only query against `public.pgmigrations` returned exactly two rows:

| Migration record | Present |
|---|---|
| `1792497600000_api_skeleton_baseline` | Yes |
| `1792512000000_identity_sessions` | Yes |

**Observed migration history count: 2 — exact match.** No Migration 001 history row exists on Neon.

## 6. Role, permission, and account checks

The observed mapping is unchanged:

- Role: `project-admin` / `Project Administrator`.
- Legacy permissions linked to that role:
  - `admin.players.read`
  - `admin.players.write`
  - `admin.security.audit.read`
  - `admin.security.manage`
  - `admin.session.read`

Additional counts/checks:
- Player rows: `0`.
- Admin-account rows: `0`.
- Session rows: `0`.
- Canonical permissions from the approved 36-code inventory: `0`.

No admin account was created. No legacy permission was removed or modified.

## 7. Method and safety boundary

The checks used Neon Plugin SQL tooling exclusively for read-only `SELECT` statements: six table counts, table-name inventory, migration-history inspection, role/permission mapping, session count, canonical permission count, and database identity/version.

- No `INSERT`, `UPDATE`, `DELETE`, DDL, migration, or transaction-write operation was issued.
- No Neon Plugin write was performed.
- `DATABASE_URL` was not accessed or modified.
- No rollback was attempted.
- Migration 001 has **not** been applied to Neon.

CI rehearsal evidence remains separate and applies only to the disposable PostgreSQL database:
- [CI rehearsal — Run 39588684176](https://github.com/Bclick9/Bclick/actions/runs/39588684176)
- [Read-only CI gate — Run 39588682736](https://github.com/Bclick9/Bclick/actions/runs/39588682736)
- [API types/tests/contracts — Run 39588682597](https://github.com/Bclick9/Bclick/actions/runs/39588682597)
- [Application builds — Run 39588682622](https://github.com/Bclick9/Bclick/actions/runs/39588682622)

## 8. Decision required / next step

**STOP FOR PROJECT OWNER REVIEW.**

The current Neon state matches the approved baseline and passes the read-only pre-migration gate. Please review this NOTE and decide whether to issue the separate, explicit authorization to execute Migration 001 on Neon.

Until that separate approval is given:

- Do not execute Migration 001 on Neon.
- Do not execute Migration 002; it requires its own NOTE and separate approval.
- Migration B remains prohibited.
- Do not perform Neon rollback.
- Do not modify `DATABASE_URL`.
- Q-020, Q-011, Q-015, and Q-009 remain unchanged.
- Q-011 remains P0/Open; Neon remains non-isolated from staging.
- Phase 4 remains local/CI only; no production activation or real-money flow.

**Final result: PRE-MIGRATION READ-ONLY CHECK = PASS. DATABASE UNCHANGED. AWAITING SEPARATE PROJECT OWNER DECISION.**
