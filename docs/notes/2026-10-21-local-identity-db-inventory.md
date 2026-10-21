# Local Identity Database Inventory — Evidence Record

**Date prepared:** 2026-10-21
**NOTE ID:** NOTE-IDENTITY-DB-2026-10-21
**Status:** DRAFT — local SQL results are NOT RUN / NOT PROVIDED; this is not yet a completed database investigation
**Decision reference:** [ADR-023 — Permission Registry Reconciliation](https://github.com/Bclick9/Bclick/blob/docs/adr-023-permission-reconciliation/docs/notes/2026-10-21-ADR-023-permission-reconciliation-draft.md), covered by [PR #62](https://github.com/Bclick9/Bclick/pull/62)
**Purpose:** capture actual local Identity database state before Migration A is implemented. No migration is created or run by this note.

## 1. Executive status

The repository connector can read committed source and migrations, but it does not provide access to the developer's local PostgreSQL instance. No local connection string was supplied or used. CI or migration source is not a substitute for local inventory; therefore **the actual local row counts and custom data state are unknown**.

This note is intentionally incomplete until read-only SQL is executed by the project owner against the intended local development database and the outputs are attached here. Do not put database URLs, passwords, player emails, admin emails, password hashes, MFA secrets, recovery codes, or session tokens in the note or PR.

## 2. Required local inventory — current evidence state

| Requested fact | Actual local result | State / interpretation |
|---|---:|---|
| Players: `identity_players` count | NOT RUN | Must be read from local DB |
| Admin accounts: `identity_admins` count | NOT RUN | Must be read from local DB |
| Roles: `identity_admin_roles` count | NOT RUN | Must also list every `code` and `display_name` |
| Admin-to-role assignments: `identity_admin_account_roles` count | NOT RUN | Must inspect assignment count grouped by role |
| Permission catalog: `identity_admin_permissions` count | NOT RUN | Must check whether any canonical code already exists |
| Role-to-permission links: `identity_admin_role_permissions` count | NOT RUN | Must inspect count grouped by role and full mapping |
| Legacy permission rows and links | NOT RUN locally | Source migration seeds five; local rows/links must be queried |
| Additional roles besides `project-admin` | UNKNOWN locally | Do not infer from the committed seed |
| Existing/custom data requiring preservation | UNKNOWN locally | No assumption that the database is empty is permitted |

### Source-only baseline (not local DB results)

The committed migration `server/migrations/1792512000000_identity_sessions.sql` declares and seeds one role (`project-admin`), five legacy permission records, and five role-permission links from that role to those records. It does not seed a player or administrator row and does not seed an admin-to-role assignment. The local-only `bootstrapAdmin` code in `server/src/identity/service.ts` inserts an administrator and assigns the existing `project-admin` role, but it may or may not have been run against the developer's database.

These are facts about committed code only. They are **not** evidence that the current local database has one role, five permissions, five links, zero admins, or zero players.

## 3. Read-only SQL to run locally

Run these queries only against the local development database that will be used for Phase 4. Confirm the database/environment in your own SQL client before running them. They are read-only `SELECT` statements.

```sql
-- Basic counts requested for this investigation
SELECT COUNT(*) AS player_count FROM identity_players;
SELECT COUNT(*) AS admin_count FROM identity_admins;
SELECT COUNT(*) AS role_count FROM identity_admin_roles;
SELECT COUNT(*) AS admin_role_assignment_count FROM identity_admin_account_roles;
SELECT COUNT(*) AS permission_count FROM identity_admin_permissions;
SELECT COUNT(*) AS role_permission_link_count FROM identity_admin_role_permissions;

-- Exact role inventory (does project-admin remain the only role?)
SELECT code, display_name
FROM identity_admin_roles
ORDER BY code;

-- Admin assignments grouped by role; counts only, no admin PII
SELECT r.code AS role_code, COUNT(ar.admin_id)::int AS assigned_admin_count
FROM identity_admin_roles r
LEFT JOIN identity_admin_account_roles ar ON ar.role_id = r.id
GROUP BY r.code
ORDER BY r.code;

-- Permission links grouped by role
SELECT r.code AS role_code, COUNT(rp.permission_id)::int AS permission_link_count
FROM identity_admin_roles r
LEFT JOIN identity_admin_role_permissions rp ON rp.role_id = r.id
GROUP BY r.code
ORDER BY r.code;

-- Full current mapping, needed to detect custom/non-default links
SELECT r.code AS role_code, p.code AS permission_code
FROM identity_admin_role_permissions rp
JOIN identity_admin_roles r ON r.id = rp.role_id
JOIN identity_admin_permissions p ON p.id = rp.permission_id
ORDER BY r.code, p.code;

-- Legacy codes and every role currently linked to each
SELECT p.code, p.description, r.code AS role_code
FROM identity_admin_permissions p
LEFT JOIN identity_admin_role_permissions rp ON rp.permission_id = p.id
LEFT JOIN identity_admin_roles r ON r.id = rp.role_id
WHERE p.code IN (
  'admin.session.read',
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage'
)
ORDER BY p.code, r.code;

-- Existing canonical codes (must be checked before any additive insert)
SELECT code, description
FROM identity_admin_permissions
WHERE code IN (
  'players.read', 'players.status.write', 'players.profile.sensitive.read',
  'wallet.read', 'wallet.adjust.request', 'wallet.adjust.approve', 'wallet.status.manage',
  'kyc.review', 'kyc.documents.read', 'rg.case.read', 'rg.case.manage',
  'payments.review', 'payments.approve', 'payments.execute', 'payments.methods.manage',
  'payments.reconcile', 'payments.audit', 'reports.read', 'reports.export',
  'catalog.read', 'catalog.sync', 'cms.write', 'cms.approve', 'cms.publish',
  'cms.media.write', 'bonuses.manage', 'bonuses.grant', 'bonuses.grant.approve',
  'admin.users.read', 'admin.users.write', 'admin.roles.read', 'admin.roles.write',
  'admin.mfa.manage', 'audit.read', 'ops.read', 'ops.provider.replay'
)
ORDER BY code;
```

If a required table does not exist, stop and record the exact error. Do not create a table or run a migration to make the inventory queries pass.

## 4. Data and state that must be preserved

Before Migration A, record the observed counts and role mappings. The migration plan must preserve:

- Every existing player and admin account row and its primary key; do not reset accounts or passwords.
- Admin status, password hashes, MFA enabled state and encrypted/pending TOTP material, enrollment/challenge/recovery-code state, and all existing admin sessions.
- All existing player sessions, verification tokens, security audit events, and other Identity rows.
- Existing role identities (IDs), role codes/display names, admin-to-role assignments, and every custom or non-default role-permission link.
- All five legacy permission catalog rows and their descriptions, and their existing links during Migration A.
- All permission rows and links that pre-date Migration A, including a canonical code that may already exist in the local catalog.

Migration A may add the 36 canonical catalog records and links to `project-admin` only. It must not update links on other roles. If existing canonical records have conflicting descriptions, stop for explicit review rather than overwriting them. Migration B (removing legacy links) is not approved and must not be included in Migration A.

## 5. Output needed to complete this NOTE

Attach these items to the note/PR once read-only queries have run:

1. Date/time and confirmation that the target was the local development database (do not include host, URL, or credentials).
2. The six count results in Section 2.
3. The role code/display-name list, assignment counts by role, permission-link counts by role, and complete role-permission mapping.
4. The five legacy codes' actual rows/links and any existing canonical codes returned by the final query.
5. A short preservation assessment: whether any role besides `project-admin` exists; whether the local mapping differs from the seed baseline; whether custom assignments/data require a change to Migration A's implementation plan.

Use counts and role/permission codes only. Do not export or attach emails, password hashes, MFA secrets, tokens, or raw account rows.

## 6. Gates and next sequence

- **Current gate:** local SQL output is missing. No actual counts are claimed by this NOTE.
- After actual results are attached, update this NOTE with the findings and wait for Project Owner approval of the completed NOTE.
- Only after that approval, prepare the separate Migration Strategy NOTE with detailed up/down paths, idempotency/provenance implementation, and PostgreSQL runtime + rollback tests; wait for its approval.
- Only after Migration Strategy approval may Migration A implementation begin.
- Migration B remains separately unapproved and must meet the ADR-023 readiness criteria after local inventory and Migration A tests.
- `migration 001` remains unapproved until the same Migration Strategy gate is passed.

Fixed gates remain: Q-020 open; Q-011 P0; Q-015 open; Q-009 blocks TND provider routing; Phase 4 local-only; the working estimate remains 23–30 days.