# Database Migration Strategy — Migrations 001–006

**Date:** 2026-10-21  
**NOTE ID:** NOTE-DB-MIGRATION-STRATEGY-001-006  
**Status:** DRAFT FOR PROJECT OWNER APPROVAL — no numbered migration or ADR-023 Migration A/B is authorized by this note alone  
**Investigation dependency:** [Approved CI Identity Database Investigation NOTE](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-21-local-identity-db-inventory.md) — approved by Project Owner; measured evidence from [GitHub Actions run #39569244094](https://github.com/Bclick9/Bclick/actions/runs/39569244094).  
**RBAC dependency:** [ADR-023 — Permission Registry Reconciliation](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-21-ADR-023-permission-reconciliation-draft.md), merged in PR #62.  
**Execution boundary:** planning and review only. No migration SQL in this note has been applied to any target database.

## 1. Decision requested

Approve or request changes to this ordered migration strategy. Approval of this NOTE is approval of the plan document only; it does **not** authorize applying Migration 001 or any later migration. Migration 001 (the first database-changing migration) requires its own explicit, separate Project Owner approval after its target-database verification gate passes. The numbered migrations are future, ordered migration artifacts using the repository's existing `node-pg-migrate` mechanism; the labels 001–006 below are plan IDs, not filenames or already-existing migrations.

ADR-023's permission **Migration A** is a separate name for the additive canonical-permission registry change described as numbered Migration 005 below. It cannot start until this Strategy NOTE is approved, the specific target preflight passes, and the Project Owner explicitly authorizes that step. Permission **Migration B** is not included in or authorized by Migrations 001–006; its five ADR-023 criteria remain mandatory. No old permission row is to be deleted.

## 2. Governing invariants

1. PostgreSQL remains the authoritative source of truth. Use ordered, reviewed SQL migrations; never automatic schema synchronization on app startup.
2. Do not edit or replay the already-committed `server/migrations/1792512000000_identity_sessions.sql` or `1792497600000_api_skeleton_baseline.sql`. All changes go in new migrations.
3. Migrations 001–006 must not create a wallet, ledger, payment, provider callback, or real-money route. Those domains retain their own design and release gates.
4. Preserve every existing UUID, administrator/player row, password hash, MFA state, token/session/audit row, role ID/code/name, permission row, administrator-role assignment, and role-permission link unless a later, separately approved migration explicitly changes a named item.
5. No default administrator account or password is created by a migration. First-admin provisioning remains the approved out-of-band bootstrap procedure.
6. No aliasing or silent renaming of the five legacy permissions. Canonical routes use canonical permission codes only.
7. The intended transition following ADR-023 Migration A is 36 canonical permissions plus the five retained legacy permission rows/links = **41 effective permissions for `project-admin`**. This is a planned transitional state, not the preflight reference and not a claim that Migration A has run.
8. Every target environment is isolated. Current Phase 4 remains local-development/test only; Q-011 remains P0/Open and is not changed by this note.

## 3. Mandatory pre-migration verification gate — fail closed

This gate is compulsory **before Migration 001 on every target DB** (local, CI, staging, or any other environment). It is also compulsory before any subsequent migration, using the phase-appropriate table names and expected checkpoint described below. The gate must execute against the exact database that would be changed; a query against a different database, a local seed file, or a prior CI run is not a substitute.

### 3.1 Exact initial gate before Migration 001

Run these read-only queries on the database while the original `identity_*` table names still exist:

```sql
SELECT COUNT(*) AS player_count FROM identity_players;
SELECT COUNT(*) AS admin_count FROM identity_admins;
SELECT COUNT(*) AS role_count FROM identity_admin_roles;
SELECT code FROM identity_admin_roles ORDER BY code;
SELECT COUNT(*) AS admin_role_assignment_count FROM identity_admin_account_roles;
SELECT COUNT(*) AS permission_count FROM identity_admin_permissions;

-- Required as part of the reference tuple; do not omit this count.
SELECT COUNT(*) AS role_permission_link_count
FROM identity_admin_role_permissions;

-- Verify the existing polymorphic session split and detect orphan/unknown principal types.
SELECT principal_type, COUNT(*) AS session_count
FROM identity_sessions
GROUP BY principal_type
ORDER BY principal_type;

SELECT COUNT(*) AS total_session_count FROM identity_sessions;
```

The read-only SQL statements above must all finish successfully. If an expected table is missing, a query errors, an unrecognized `principal_type` exists, or the measured inventory does not match the reference below, **STOP. Do not apply a migration, create missing tables, repair data automatically, or guess that the database is empty. Record the output/error and request the Project Owner's decision.**

### 3.2 CI reference fingerprint and comparison order

The measured clean-CI reference is based on [Investigation run #39569244094](https://github.com/Bclick9/Bclick/actions/runs/39569244094), PostgreSQL 18.6, `bclick_ci`, after the two current migrations were applied:

| Check | CI reference before Migration 001 |
|---|---:|
| `identity_players` | 0 rows |
| `identity_admins` | 0 rows |
| `identity_admin_roles` | 1 row |
| Role code list | exactly `project-admin` |
| `identity_admin_role_permissions` | 5 links |
| `identity_admin_account_roles` | 0 links |
| `identity_admin_permissions` | 5 rows |
| `identity_sessions` | 0 rows in a fresh migration-only CI baseline |
| Existing canonical permission codes | 0 of the 36 |
| Legacy permission codes | all five present, all five linked to `project-admin` |

For the six-number reference tuple, the canonical order used in this NOTE is **players / admins / roles / role-permission links / admin-role links / permission rows = `0 / 0 / 1 / 5 / 0 / 5`**. The role code list must also match exactly. The session query is an additional safety check, not part of the six-number tuple. The previous approved Investigation NOTE did not capture a measured session-row count, so this NOTE does not claim that number as observed evidence. A nonzero session count—or an unknown principal mapping—must stop execution for explicit review.

The reference describes a new database built from current migrations. It does **not** describe any private developer-local database. The Project Owner expressly approved the comparison rule: when a target differs from the reference before Migration 001, stop, document differences, and request a decision before proceeding.

### 3.3 Gate before Migrations 002–006

Migration 001 changes some table names; therefore, do not keep running SQL that refers to table names which have already been renamed. Before each subsequent migration, run the same semantic checks against the **current schema names** and compare the results to the exact checkpoint produced by the prior approved migration. The next checkpoint must be written into that migration's PR before execution. Any unexplained difference from the approved checkpoint is a hard stop and requires a Project Owner decision.

In addition, every migration's preflight must check: current database/environment marker; required tables/columns and migration history; relevant row counts; duplicate natural keys; orphaned references; invalid enums/currency/country values; legacy and canonical permission rows; and schema version/code SHA. Never infer a safe target based only on the database name.

## 4. Ordered migration plan

| Plan ID | Purpose | Data movement | Reversible approach | Main gate |
|---|---|---|---|---|
| **001** | Rename current `identity_*` tables to canonical domain names without changing columns or rows | None; metadata-only table renames | Rename tables back after stopping the new application version | Initial reference gate + separate explicit owner approval |
| **002** | Split the mixed player/admin session store into `player_sessions` and `admin_sessions` | Copy by principal type, compare, then switch application reads/writes | Preserve source `auth_sessions` until cutover is proven; repopulate it before any rollback | Session classification, no orphans, equal counts and token-hash/ID preservation |
| **003** | Add normalized `player_profiles` and `player_credentials` and backfill current player profile/credential fields | Copy current display name and email/password credential values without rewriting password hashes | Keep old columns during expand/cutover; rollback reads from new tables or restores copied values | Uniqueness, exact row counts, credential verification tests |
| **004** | Introduce `currencies`, normalize registration-country semantics, and add settlement/display-currency references | Seed only TND/EUR/USD and add FK/checks after validating all existing values | Additive columns/FKs first; no currency conversion or silent invalid-value coercion | Currency/country preflight and precision invariants |
| **005** | ADR-023 Migration A: add 36 canonical permission rows and `project-admin` links | Additive only; preserve all five legacy rows and their links | Provenance-backed down path only for rows/links this migration created | Strategy approval + target gate + specific owner approval for Migration A |
| **006** | Validate and harden identity/RBAC/session constraints and indexes after the preceding backfills | Constraint/index changes; no account or permission deletion | Constraint/index rollback only if safe; no destructive cleanup | Full PostgreSQL integration suite, down/up drill, and owner go/no-go |

These six plans intentionally separate rename, copy/backfill, enforcement, and permission reconciliation. They do not authorize a "run everything" command.

## 5. Migration 001 — rename existing tables (first database-changing step)

**Status: NOT IMPLEMENTED; separate explicit Project Owner approval required.** This is a table-name migration only. It must not alter column definitions, UUIDs, status values, records, primary/foreign keys, constraints, indexes, or the five legacy permission records. Keep the existing migration history untouched.

### 5.1 Planned table mapping

| Current table | Name after Migration 001 | Reason / boundary |
|---|---|---|
| `identity_players` | `players` | Canonical player entity; columns are not redesigned in 001 |
| `identity_admins` | `admin_users` | Canonical admin principal; MFA/password fields remain unchanged |
| `identity_sessions` | `auth_sessions` | Temporary truthful name because one table contains both player and admin sessions; do not incorrectly rename a mixed table to only player or admin sessions |
| `identity_admin_auth_challenges` | `admin_mfa_challenges` | Admin-only challenge/enrollment records |
| `identity_admin_recovery_codes` | `admin_mfa_recovery_codes` | Admin recovery-code records |
| `identity_one_time_tokens` | `player_one_time_tokens` | Current table's FK/purpose are player-only |
| `identity_rate_limits` | `rate_limits` | Current rate-limit state |
| `identity_security_audit_events` | `audit_events` | Security/audit event record |
| `identity_admin_roles` | `roles` | Role registry |
| `identity_admin_permissions` | `permissions` | Permission registry |
| `identity_admin_role_permissions` | `role_permissions` | Role-permission link table |
| `identity_admin_account_roles` | `admin_role_assignments` | Admin-to-role link table |

`identity_sessions` cannot safely become `player_sessions` or `admin_sessions` by a single table rename: its existing `principal_type` explicitly supports both. The temporary `auth_sessions` name avoids a false semantic rename; Migration 002 performs the actual split. Column names such as `country_code`, `settlement_currency`, `email_normalized`, and `password_hash` remain unchanged in Migration 001.

### 5.2 Up pseudo-SQL

The real migration must verify all 12 source names exist and all 12 destination names are absent before mutation. It must run atomically, aborting on any mismatch:

```sql
BEGIN;

-- Pseudocode preconditions (implemented as migration assertions):
-- assert the pre-M001 fingerprint and all source/destination table names;
-- assert current migration history is the approved baseline;
-- abort if any destination table already exists.

ALTER TABLE identity_players RENAME TO players;
ALTER TABLE identity_admins RENAME TO admin_users;
ALTER TABLE identity_sessions RENAME TO auth_sessions;
ALTER TABLE identity_admin_auth_challenges RENAME TO admin_mfa_challenges;
ALTER TABLE identity_admin_recovery_codes RENAME TO admin_mfa_recovery_codes;
ALTER TABLE identity_one_time_tokens RENAME TO player_one_time_tokens;
ALTER TABLE identity_rate_limits RENAME TO rate_limits;
ALTER TABLE identity_security_audit_events RENAME TO audit_events;
ALTER TABLE identity_admin_roles RENAME TO roles;
ALTER TABLE identity_admin_permissions RENAME TO permissions;
ALTER TABLE identity_admin_role_permissions RENAME TO role_permissions;
ALTER TABLE identity_admin_account_roles RENAME TO admin_role_assignments;

-- Assert all canonical table names exist, old names are absent,
-- row counts and role/permission mappings are unchanged, then COMMIT.
COMMIT;
```

This is illustrative SQL, not a command to paste or execute. Assertion and table-name collision checks must be implemented in the reviewed migration so any precondition failure rolls back the complete operation. Renamed indexes or constraint names may still contain `identity_*`; that is cosmetic and must not be used as a reason to rebuild them in this migration.

### 5.3 Application compatibility and rollback

The migration PR must update every application/test/query reference to the renamed tables in lockstep with the database migration; otherwise the existing API will keep querying missing `identity_*` tables. The application build, identity tests, migration integration tests, and repository-wide SQL/string search are required before merge. Do not run an old application build against the renamed schema.

**Rollback:** stop the local API/test process using the new names; verify the rollback checkpoint; reverse all 12 `ALTER TABLE ... RENAME` operations in reverse order in one transaction; run the prior version's identity tests. Because 001 must not rewrite rows or columns, this rollback restores the prior naming layout. If table/constraint state has changed unexpectedly after the migration, stop and use a reviewed forward repair rather than forcing rename commands. Never delete or recreate a table to accomplish rollback.

## 6. Migration 002 — split player and admin sessions

### Up design

1. Confirm `auth_sessions` contains only `principal_type IN ('player','admin')`; assert no unknown values.
2. Assert every player session has an existing `players.id` and every admin session an existing `admin_users.id`. Any orphan causes a hard failure; never drop it or associate it to a guessed principal.
3. Create `player_sessions` with session ID, `player_id` FK, unique `token_hash`, session version, created/authenticated/expiry timestamps, and revoke timestamp. Add indexes by player/expiry and active expiry.
4. Create `admin_sessions` with session ID, `admin_id` FK, unique `token_hash`, session version, created/authenticated/expiry timestamps, revoke timestamp and mandatory `mfa_verified` assurance. Add indexes by admin/expiry and active expiry.
5. Insert each `auth_sessions` row by `principal_type` into the corresponding table, preserving IDs and token hashes exactly (never print token hashes). Assert `source total = player target + admin target`, per-type counts match, IDs are unique, and selected non-secret metadata matches.
6. Keep `auth_sessions` intact as the migration source/rollback safety copy for the defined cutover window. Only after the new application path has passed runtime tests can a later separately reviewed cleanup migration retire that compatibility source. Migration 002 itself does not drop it.

Example copy logic:

```sql
INSERT INTO player_sessions
  (id, player_id, token_hash, session_version, created_at,
   authenticated_at, expires_at, revoked_at)
SELECT id, principal_id, token_hash, session_version, created_at,
       authenticated_at, expires_at, revoked_at
FROM auth_sessions
WHERE principal_type = 'player';

INSERT INTO admin_sessions
  (id, admin_id, token_hash, session_version, created_at,
   authenticated_at, expires_at, revoked_at, mfa_verified)
SELECT id, principal_id, token_hash, session_version, created_at,
       authenticated_at, expires_at, revoked_at, mfa_verified
FROM auth_sessions
WHERE principal_type = 'admin';
```

The production version must wrap table creation/copy/assertions in a controlled transaction and use the repository's actual column types and constraints. The old source rows are not removed by these inserts.

### Rollback

Roll back the application first to the compatible `auth_sessions` reader/writer. Before dropping the split tables, preserve any sessions created or changed after cutover by copying them back into `auth_sessions`; assert no ID/token-hash conflicts and reconcile all counts. If sessions cannot be mapped exactly, do not drop either representation: stop and restore from the safety copy/backup or implement a reviewed forward fix. Do not invalidate every administrator session silently as a rollback shortcut.

### Tests

- Unit: principal-type dispatch and unknown-type denial.
- PostgreSQL integration: empty and mixed player/admin fixtures; FK failures for orphan principals; uniqueness; expiry/revocation and MFA assurance preserved.
- Migration test: row counts/IDs/fields compare without logging hashes; repeated execution is blocked safely by migration history rather than duplicating sessions.
- Rollback: create sessions in the split tables after simulated cutover, copy back, and prove all sessions are still represented exactly once.

## 7. Migration 003 — normalize player profile and credentials

### Up design

Create a one-to-one `player_profiles` table (PK/FK `player_id`) and a `player_credentials` table with player FK, credential kind, normalized identifier, password hash, verification/change timestamps and unique identifier constraints. The existing table currently combines login credentials and profile fields; normalization must copy data, not lose or reinterpret it.

Planned backfill (pseudocode; adapt names to the approved final schema):

```sql
-- Create player_profiles(player_id PK/FK, display_name, created_at, updated_at).
INSERT INTO player_profiles (player_id, display_name, created_at, updated_at)
SELECT id, display_name, created_at, updated_at
FROM players;

-- Create player_credentials with a password credential kind and unique normalized ID.
INSERT INTO player_credentials
  (player_id, kind, identifier, identifier_norm, password_hash,
   created_at, updated_at)
SELECT id, 'email_password', email, email_normalized, password_hash,
       created_at, updated_at
FROM players;
```

Required assertions: source player count equals profile count; each player has exactly one profile for the fields being migrated and one expected email/password credential; normalized identifiers are unique; no password hash changes; application-side password verification still succeeds against the copied hash. Existing email/name/password columns remain in `players` during the expand/cutover stage, so rollback can be performed without reconstructing secrets or relying on lossy conversion. The app changes to write/read the canonical tables in a separate, tested code cutover; the migration does not silently drop legacy columns.

If no player rows are present, the empty copy is still tested with fixture rows in a disposable PostgreSQL integration DB. If real rows exist in the target and fail the comparison/uniqueness test, stop and ask for a decision; do not skip, merge, or overwrite duplicates.

### Rollback and tests

Rollback the application to the previous credential/profile source before reversing this migration. New-table rows created since cutover must either be copied back with exact one-to-one mapping or cause a hard stop; never reset user passwords. Unit tests cover normalized identifier handling, credential-kind dispatch, and absence of plaintext secrets. Integration tests cover duplicate identifiers, invalid/null legacy fields, password verification before/after copy, and count equality. Rollback tests verify that every old account can authenticate after reverting the schema/code pair.

## 8. Migration 004 — currency registry and country semantics

### Up design

1. Create `currencies` with code PK, exponent constrained to an approved range, and enabled/policy metadata.
2. Seed TND=3, EUR=2, USD=2 using conflict-safe inserts. If a code already exists with a different exponent or conflicting metadata, abort rather than overwrite it.
3. Add canonical `registration_country_code` to `players`; backfill from the old `country_code` only after verifying every value can be normalized unambiguously to an uppercase ISO alpha-2 form. Keep the old column during the expand phase.
4. Add FK from `players.settlement_currency` to `currencies(code)`; add FK from `preferred_display_currency` where non-null. Validate all current values first; do not invent a default for invalid/missing currency.
5. Add a country-code check after checking all existing values. Do not silently strip invalid characters or silently set `TN`.
6. Keep product policy as one immutable settlement currency per player account. A display-currency preference is presentation only. This migration must not activate provider routing or permit FX/rounding.

Illustrative SQL:

```sql
CREATE TABLE currencies (
  code text PRIMARY KEY,
  exponent smallint NOT NULL CHECK (exponent BETWEEN 0 AND 4)
  -- additional enabled/policy timestamps require the reviewed final DDL
);

INSERT INTO currencies (code, exponent) VALUES
  ('TND', 3), ('EUR', 2), ('USD', 2)
ON CONFLICT (code) DO NOTHING;

-- Required assertions: existing rows' exponents equal the approved values.
-- Add registration_country_code, backfill only after value validation.
-- Add the settlement/display-currency FKs after checking for orphan values.
```

### Rollback and tests

Currency seed rollback must remove only seed rows inserted by this migration and only if no FK references or dependent data exist; otherwise preserve them and use a forward repair. Roll back application references before dropping a new FK/column. Unit tests cover currency exponent and country normalization. PostgreSQL integration tests cover FK failures, unknown currency rejection, conflicting existing exponent, invalid country values, and TND three-decimal exact representation (without enabling provider routing). Test that preferred display currency cannot change settlement currency. Q-009 remains Open and TND provider routing remains blocked.

## 9. Migration 005 — ADR-023 Migration A: additive canonical permissions

**Hard gate:** this numbered step is ADR-023 **Migration A**. It may not begin before this Strategy NOTE is approved, a current target fingerprint is recorded, and the Project Owner separately authorizes Migration A. No schema migration or prior approval automatically authorizes this step.

### Canonical permission codes to insert (exactly 36)

- Player: `players.read`, `players.status.write`, `players.profile.sensitive.read`
- Wallet: `wallet.read`, `wallet.adjust.request`, `wallet.adjust.approve`, `wallet.status.manage`
- KYC/RG: `kyc.review`, `kyc.documents.read`, `rg.case.read`, `rg.case.manage`
- Payments: `payments.review`, `payments.approve`, `payments.execute`, `payments.methods.manage`, `payments.reconcile`, `payments.audit`
- Reports: `reports.read`, `reports.export`
- Catalogue: `catalog.read`, `catalog.sync`
- CMS/media: `cms.write`, `cms.approve`, `cms.publish`, `cms.media.write`
- Bonuses: `bonuses.manage`, `bonuses.grant`, `bonuses.grant.approve`
- Admin/roles: `admin.users.read`, `admin.users.write`, `admin.roles.read`, `admin.roles.write`, `admin.mfa.manage`
- Audit/operations: `audit.read`, `ops.read`, `ops.provider.replay`

### Up pseudo-code

```text
BEGIN
  ASSERT exactly one roles row exists for code 'project-admin'
  ASSERT canonical code list equals the approved 36 unique identifiers

  INSERT the 36 (code, reviewed description) rows into permissions
    without overwriting any existing row
  Record for each code whether this migration created the permission row

  For each canonical code:
    if it existed already with the exact approved description, reuse it
    if it exists with conflicting metadata, RAISE EXCEPTION and ROLLBACK

  INSERT role_permissions links from project-admin to each canonical code only
    without duplicating an existing (role_id, permission_id) pair
  Record whether this migration created each link

  ASSERT all 36 canonical codes exist exactly once
  ASSERT all 36 canonical links for project-admin exist exactly once
  ASSERT all five legacy rows and their pre-existing links remain unchanged
  ASSERT no other role's link changed
COMMIT
```

Implementation must define a reviewed, persistent provenance mechanism for rows/links actually created (for example, a migration-owned provenance table keyed by migration ID, entity kind and stable codes). `ON CONFLICT DO NOTHING` alone is **not** a safe rollback plan because it cannot tell pre-existing data from migration-created data. Metadata conflicts fail closed. Do not use generated UUIDs as business keys; resolve role/permission IDs by stable codes. Do not edit the existing seed migration.

### Expected state after Migration A on the same clean CI baseline

- Permissions: 41 total rows (36 canonical + 5 legacy).
- `project-admin` permission links: 41 total.
- 41 effective permission codes are expected as the explicitly approved transition.
- All five legacy permission rows and links remain present; do not add an alias, rename, delete, deactivate, or unlink them.
- Other roles, existing account assignments and custom mappings must remain unchanged. CI's zero-assignment baseline does not prove a different target is empty.

### Rollback and tests

Rollback only links/permission rows whose provenance confirms they were created by Migration A. First revert application code to a version that does not depend on the canonical registry, then remove only migration-created links, and delete a migration-created catalog row only if it has no remaining assignments/dependencies. If provenance is missing or a row is now referenced by another role, keep the row and use a forward fix rather than deleting it. The five old permission rows are never deleted by this rollback.

Tests must prove all 36 exact codes and descriptions, exactly-once links, unchanged legacy row descriptions/IDs/links, unchanged other-role mappings, 41 effective permissions on the planned transition path, idempotent re-application behavior, fail-closed metadata conflict, failure rollback atomicity, explicit admin password+MFA login and `GET /api/v1/admin/session = 200` with `project-admin`, and 403 on any real protected handler whose required permission is absent. No administrator account is seeded by this migration.

## 10. Migration 006 — post-backfill integrity hardening

Migration 006 adds only the constraints/indexes supported by validated data after the previous approved steps. It is not a cleanup migration and must not delete old identity or permission records.

Planned checks include:
- Validate `player_profiles.player_id` and `player_credentials.player_id` one-to-one / FK coverage and normalized identifier uniqueness.
- Validate `player_sessions` and `admin_sessions` principal FKs, unique token hashes, expiry ordering and required admin MFA assurance.
- Validate `players.settlement_currency` and optional display currency reference `currencies(code)`; validate country/status allowed values.
- Validate unique role/permission natural codes and link-pair uniqueness; verify all canonical route permission codes exist without converting legacy codes into aliases.
- Add only indexes justified by the accepted schema/query paths and check plans. Index naming cleanup is cosmetic and must not make this migration destructive.
- Ensure session/MFA challenge constraints express single-use expiry and bounded attempts without accidentally making legacy rows invalid. If a constraint cannot be validated because a row violates it, abort and request data disposition; do not silently delete or coerce the row.

Use `ADD CONSTRAINT ... NOT VALID` followed by validation where PostgreSQL supports this safely for the selected FK/check. Do not claim that this syntax applies to every kind of constraint; unique constraints require an appropriate duplicate scan and unique index/constraint plan. Concurrent index creation, if needed for a populated target, must be in a deliberately non-transactional migration with its own partial-failure recovery note; do not combine unsupported concurrent DDL with a transaction and hope the migration succeeds.

**Rollback:** drop only constraints/indexes added by Migration 006, after application rollback if needed. Do not drop a pre-existing index or constraint by name unless the migration's provenance proves it was created there. No row deletion, permission removal, currency reinterpretation, or schema rename occurs in 006.

## 11. Test and evidence plan (required across the sequence)

### Unit tests
- Stable table/column mapping contract; canonical permission list is exactly 36 unique codes and does not overlap the five legacy strings.
- Currency parsing/exponents and country normalization; no floating point money conversion.
- Player credential-kind/normalized-identifier validation; session principal routing; admin MFA requirement.
- Preflight fingerprint comparison fails on a count or role-code mismatch and prints safe counts/codes only.
- Rollback provenance selects only records created by the named migration.

### PostgreSQL integration tests
- Apply the existing migration chain to a fresh PostgreSQL database; snapshot all six gate counts and complete role-permission mapping.
- Execute each migration independently in plan order in a disposable database, asserting schema names, row counts, FKs, uniqueness, role links, canonical codes and preserved data after each step.
- Include adversarial fixtures: unexpected role, extra admin-role assignment, pre-existing canonical permission with conflicting description, duplicate normalized email, missing player/admin parent, orphan session, unknown currency, invalid country, duplicate token hash, expired/consumed challenge, and a migration collision.
- Run Identity API tests after table renames and the session/credential cutovers. Test successful explicit bootstrap, password+MFA login, session endpoint, independent player/admin logout and denial of enrollment-only cookies from unrelated Backoffice reads/mutations.
- CI test data must be generated only in the disposable CI database, not in developer or production data.

### Rollback / recovery tests
For each migration, use a disposable clone with a known before-state snapshot and execute up → assertions → down → assertions. Then execute a second up/down cycle. Compare row counts, stable IDs, normalized identifiers, role codes and mappings, permission descriptions, session IDs/state, and password hash verification; never print hashes/tokens. Confirm no rows are lost, duplicated or reassigned. For copy migrations, include rows inserted after cutover to prove either correct down-copy or a deliberate hard stop.

If any migration down path cannot preserve post-cutover writes safely, document the migration as **forward-fix only** and require a tested backup/restore route before approval; do not label it reversible merely because a `DROP` statement exists.

### Required evidence before merge/execution
- CI green on the specific migration PR; preflight report attached with environment identifier but without connection strings or account PII.
- Exact source/target counts, table/column inventory, role mapping and relevant unique/FK checks.
- Application compatibility tests for the exact schema version.
- Rollback drill output from a disposable database.
- A clear GO/NO-GO record from the Project Owner for the specific migration. No automatic production rollout or implicit authorization.

## 12. Ordering rationale

1. **001 rename first:** it is the explicitly requested first schema change and alters no rows/columns; the application references must be changed atomically with the schema.
2. **002 session separation next:** the current single table contains two principal types, while the target model explicitly separates player and admin sessions. Split only after table names and reference baseline are verified.
3. **003 profile/credential normalization:** requires the canonical `players` table and must preserve passwords exactly; keeping legacy columns temporarily makes the cutover testable.
4. **004 currency/country normalization:** currency FK and settlement-country checks require controlled backfills and are kept separate from credential/schema renames. It must not enable provider routes.
5. **005 canonical permissions/Migration A:** the code/role mapping is additive, has a separate approval gate, and must not be mixed with identity data backfills or permission cleanup.
6. **006 hardening:** add/validate constraints only after data shape and application reads/writes are proven; a constraint failure should surface bad data, not trigger automatic data repair.

## 13. Risk register

| Risk | Severity | Mitigation / stop condition |
|---|---|---|
| Target DB differs from fresh CI baseline | Critical | Mandatory preflight comparison; stop, report differences and request owner decision |
| Table renamed while running application still queries old name | High | Update code/tests in lockstep; stop application during local cutover; no old app against new schema |
| Mixed `identity_sessions` is incorrectly renamed as player-only or admin-only | High | Rename to temporary `auth_sessions`; split by `principal_type` in Migration 002 with count/ID checks |
| Session or account rows orphaned during split/backfill | Critical | Explicit FK/orphan queries, transaction, exact counts; stop instead of discarding |
| Password hash changed or credential lost | Critical | Copy stored hash bytes/string unchanged; verify before/after; never reset passwords |
| Existing permission metadata differs | High | Fail closed; no overwrite or alias; ask for decision |
| Down migration deletes a pre-existing role link/permission | Critical | Persistent provenance; down removes only rows/links created by that migration |
| Invalid country/currency gets an invented default | High | Backfill validation and explicit failure; no silent `TN`/currency defaults |
| Partial index creation or DDL failure leaves inconsistent schema | High | Migration transactions where supported; otherwise specific recovery note and post-failure inventory |
| Strategy approval mistaken for execution approval | Critical | Separate owner approval per migration; M001 specifically requires separate explicit approval |
| Phase 4 schema activity expands into payments/wallet/provider routing | Critical | Out of scope; no money-moving tables/routes, real deposits, provider callbacks or TND routing |
| Backup/recovery not proven | Critical | Q-011 stays P0/Open; no staging/production release, no claim of tested restore |

## 14. What must not be done

- Do not apply any migration before the gate and the specific approval.
- Do not compare a private/local database to CI by assumption or label CI counts as local counts.
- Do not edit an old migration or reset/reseed a real admin to make tests pass.
- Do not run all six migrations automatically after approving the Strategy NOTE.
- Do not rename `identity_sessions` directly to `player_sessions` or `admin_sessions` without splitting rows by principal type.
- Do not drop `auth_sessions`, legacy columns, or rows during the expand/cutover step merely to make the final schema look clean.
- Do not delete any of the five legacy permission rows or links. Do not add aliases between old and canonical permissions.
- Do not implement Migration B until all five ADR-023 criteria have been evidenced and it receives separate approval.
- Do not create Migration 001 before the Migration Strategy NOTE is approved and its separate explicit approval plus gate are satisfied.
- Do not create wallet ledger, payments, provider transaction/callback tables, or enable real-money flows in this migration set.
- Do not change Q-011 remediation planning, close Q-020, close Q-015, or enable TND routing under Q-009.

## 15. Fixed gates and estimate

- **Q-020:** Open; runtime contract evidence is required as each handler is implemented.
- **Q-011:** P0/Open; Project Owner is addressing it separately. This NOTE does not change the plan, claim restore completion, or authorize deployment.
- **Q-015:** Open; no launch or real deposits.
- **Q-009:** TND provider routing remains blocked until the required provider-specific precision evidence and golden fixtures are accepted.
- **Phase 4:** local-development/test only.
- **Working estimate:** 23–30 days remains unchanged.

## 16. Approval record (pending)

- Investigation NOTE #64: approved by Project Owner; the completed note was merged to `main`.
- Migration Strategy NOTE: **awaiting Project Owner approval**.
- Migration 001: **not implemented; separate explicit approval and target gate required**.
- Migration A / Migration 005: **not implemented; requires strategy approval and separate explicit owner authorization**.
- Migration B: **blocked** by the five criteria in ADR-023.
- Migration 001–006: **none executed against a target DB by this NOTE**.
