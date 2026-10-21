# Migration 001 Pre-Migration Verification — CI Results

**Date:** 2026-10-21  
**Gate:** Pre-migration verification before planned Migration 001 (rename `identity_*` tables)  
**Result:** **PASS for the disposable GitHub Actions CI target only**  
**Workflow run:** [Identity Migration 001 preflight — run #39572392001](https://github.com/Bclick9/Bclick/actions/runs/39572392001)  
**Checker:** `server/scripts/identity-pre-migration-gate.ts`, introduced for review in [PR #66](https://github.com/Bclick9/Bclick/pull/66)  
**Migration Strategy:** approved by Project Owner and merged to `main` in PR #65.

## Scope limitation — read before interpreting this result

The checked target was a freshly initialized, disposable GitHub Actions PostgreSQL database: `bclick_ci`, PostgreSQL **18.6**. The CI job applied only the two already-existing baseline migrations to construct the expected schema, then ran read-only preflight queries. It did **not** run Migration 001 and did not rename any table.

This result is **not** a result for a separate developer-local, staging, or production database. If Migration 001 is later intended for a different database, the identical gate must be run against that exact target and the output reviewed before that database can be changed.

## 1. Six-count reference tuple

Canonical order: **players / admins / roles / role-permission links / admin-role links / permissions**.

| Check | Observed target result | Expected CI reference | Gate |
|---|---:|---:|---|
| `identity_players` | 0 | 0 | PASS |
| `identity_admins` | 0 | 0 | PASS |
| `identity_admin_roles` | 1 | 1 | PASS |
| `identity_admin_role_permissions` | 5 | 5 | PASS |
| `identity_admin_account_roles` | 0 | 0 | PASS |
| `identity_admin_permissions` | 5 | 5 | PASS |

## 2. Role, session and table-name checks

- Role inventory is exactly one row: `project-admin` / `Project Administrator`.
- All **12** expected source tables with `identity_*` names exist.
- None of the 12 planned destination names already exists; no table-name collision was found.
- `identity_sessions` row count is **0** in this disposable target. The principal-type grouped result is empty; unknown principal types = **0**.
- Orphan player sessions = **0**; orphan admin sessions = **0**.
- Applied migration history contains exactly the expected current baseline:
  - `1792497600000_api_skeleton_baseline`
  - `1792512000000_identity_sessions`

The session count is directly measured by this run; it was not claimed as a measured value in the earlier Investigation NOTE.

## 3. RBAC / legacy preservation checks

All five existing permission links remain assigned to `project-admin`:

| Legacy permission code | Link result |
|---|---|
| `admin.players.read` | Linked to `project-admin` |
| `admin.players.write` | Linked to `project-admin` |
| `admin.security.audit.read` | Linked to `project-admin` |
| `admin.security.manage` | Linked to `project-admin` |
| `admin.session.read` | Linked to `project-admin` |

Existing canonical permissions found: **0 of 36**. No legacy permission row or link was deleted, aliased or changed by this check.

## 4. Outcome and next gate

The gate emitted `PREFLIGHT_GATE=PASS` and `MIGRATION_001_EXECUTED=false`. Therefore the approved CI reference matches this particular disposable database. The check does not authorize Migration 001 on this CI target or any other database by itself.

**Still required before Migration 001:**
1. Project Owner's separate, explicit approval of Migration 001.
2. A passing pre-migration check on the exact database to be changed, if it is not this disposable CI target.
3. The reviewed Migration 001 implementation, application compatibility checks, and rollback validation.

No numbered Migration 001, Migration A/B, or Migration 002–006 was implemented or executed by this preflight run. Fixed project gates and the 23–30 day estimate remain unchanged.
