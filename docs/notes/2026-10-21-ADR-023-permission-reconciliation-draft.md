# ADR-023 Draft — Permission Registry Reconciliation

**Date:** 2026-10-21  
**Status:** DIRECTION + MIGRATION A DESIGN APPROVED (2026-10-21); execution awaits local inventory and Migration Strategy approval. Migration B and migration 001 are NOT approved.  
**Decision ID:** NOTE-ADR-023  
**Parent decision:** Identity Legacy Option A — Adopt + Extend (accepted by Project Owner)  
**Related investigation:** [Identity Legacy Investigation](./2026-10-21-identity-legacy-investigation.md)  
**Related source of truth:** Approved Planning Library 04-api-contracts.md — “Initial permission set (registry is additive and must be synchronized with openapi.yaml”.  
**Scope:** permission catalog/role links only. This ADR does not create or execute a migration and does not change the current seed.

## 1. Decision requested

The Project Owner approved the **direction and Migration A design only** on 2026-10-21: add all 36 canonical permission codes and link them to the existing `project-admin` role, leaving the old migration and all five legacy permission rows and existing links untouched. This amended note records the five required clarifications. The approval is not permission to implement or run Migration A yet.

Do **not** seed only 31 new codes. The five existing seed codes have **zero exact-code overlap** with the 36-code canonical set. “36 canonical minus 5 old” is therefore not a valid reconciliation calculation.

The five old rows can remain as legacy catalog data for migration/history compatibility, but they must not be required by new canonical routes. A new migration may update role-to-permission assignments; it must not edit or replay the old migration file. Before any role-link cleanup, inspect the target local database for non-default/custom assignments and stop for review if unexpected state is present.

**Implementation remains blocked** until the local DB inventory note is populated with actual local query results and approved, and a separate Migration Strategy note detailing up/down migrations, provenance, rollback, and runtime tests is approved. Migration B is not approved; migration 001 is not approved. No local DB count may be inferred from the migration source or CI.

## 2. Current facts

The existing immutable migration is server/migrations/1792512000000_identity_sessions.sql. It seeds:

- Role project-admin with display name Project Administrator.
- Five permission rows listed below.
- A role-permission link from project-admin to each of those five rows.

It does **not** seed an identity_admins account. The separate local/test bootstrap tool provisions an administrator only when an operator explicitly supplies bootstrap values. CI also creates temporary administrator fixtures in a disposable test database; those are tests, not migration seeds.

### Existing five seeded permission codes

The exact identifiers from the immutable migration are:

| Legacy permission code | Seeded description | Closest canonical code(s) | Semantic assessment and required treatment |
|---|---|---|---|
| `admin.session.read` | Read the authenticated administrator session | None directly | No single canonical equivalent. It describes reading the authenticated admin's own session, not the admin-user directory. Do not map it automatically to `admin.users.read`. Keep the catalog row; remove its project-admin link only in a separately reviewed removal migration. |
| `admin.players.read` | Read player administration records | `players.read` | Closest semantic match. They are not exact aliases: the canonical permission must be used by new route contracts. If an actual consumer is later found, review its scope and change it to `players.read` where equivalent; do not silently rewrite the legacy row. |
| `admin.players.write` | Change permitted player account fields | No single equivalent; `players.status.write` is narrower | The old wording implies general writes, while the canonical set separates status changes and sensitive-profile reads and has no general `players.write`. Do not substitute `players.status.write` for broad edits. Any future write route must be assigned an approved, domain-specific permission. |
| `admin.security.audit.read` | Read security audit records | `audit.read` | Closest candidate, but the event scope must be compared with the canonical audit contract before mapping a consumer. The codes are not aliases. |
| `admin.security.manage` | Manage administrator identity security | No single equivalent; closest are `admin.users.write`, `admin.roles.write`, `admin.mfa.manage` | Legacy code bundles several administrative capabilities. Do not map it to only `admin.mfa.manage` or any single canonical code. New handlers must use the exact capability required by their contract. |

**Code-use scan (2026-10-21):** the repository tree was enumerated from `main`, and all 73 tracked `.ts`/`.tsx` files under `server/`, `frontend/`, and `backend/` were scanned for all five exact legacy strings plus the patterns `identity\.` and `identity:`. No exact legacy permission string was found in those TypeScript/TSX files. The `identity\.` pattern had no matches. The only `identity:` match was `server/test/identity.test.ts:84`: `identity: service` is a property passed to `buildApp` in test setup, not a permission code. The actual permission rows are seeded in `server/migrations/1792512000000_identity_sessions.sql`; that old migration must remain untouched.

This is a tracked-remote-source scan, not proof about untracked/ignored files in a developer's local checkout. Before a future removal migration, rerun the owner-requested search against the actual local checkout and review any extra hits. No legacy aliases are proposed: retain the five catalog rows for history, use canonical codes for new authorization, and stop for review if any real consumer is discovered.

**Specific behavior of `admin.session.read`:** this code is present in the legacy SQL seed but has no use in the scanned TypeScript/TSX source. In `server/src/identity/routes.ts`, `GET /api/v1/admin/session` resolves the current admin's session, requires an active admin and completed MFA, and returns that same admin's ID/email/display name/status plus their roles, permissions, MFA method and session timestamps. The route does not check `admin.session.read` as a permission guard. It is a self-session endpoint, not an admin-directory management route and not both. There is no one-to-one canonical replacement among the 36 codes: do not alias it to `admin.users.read`. Keep the legacy catalog row and link intact in Migration A; defer link removal to Migration B after the required checks. If a future contract introduces a distinct self-session permission, that is a separate contract/ADR decision.


## 3. Exact canonical permission set — 36 codes

The approved Initial permission set contains these 36 exact, case-sensitive codes. A new migration must use these identifiers exactly and synchronize them with openapi.yaml, API route requirements, tests, and GET /api/v1/admin/session effective permissions[].

| Domain | Canonical permission codes |
|---|---|
| Player management | players.read, players.status.write, players.profile.sensitive.read |
| Wallet | wallet.read, wallet.adjust.request, wallet.adjust.approve, wallet.status.manage |
| KYC and responsible gambling | kyc.review, kyc.documents.read, rg.case.read, rg.case.manage |
| Payments | payments.review, payments.approve, payments.execute, payments.methods.manage, payments.reconcile, payments.audit |
| Reports | reports.read, reports.export |
| Catalog | catalog.read, catalog.sync |
| CMS and media | cms.write, cms.approve, cms.publish, cms.media.write |
| Bonuses | bonuses.manage, bonuses.grant, bonuses.grant.approve |
| Admin directory and roles | admin.users.read, admin.users.write, admin.roles.read, admin.roles.write, admin.mfa.manage |
| Audit and operations | audit.read, ops.read, ops.provider.replay |

**Count validation:** the list contains 36 unique canonical codes. Intersection with the five existing codes is empty. Adding only 31 would leave five canonical permissions missing; renaming old codes in place would violate the rule not to alter the prior seed and would still change identifiers relied on by any existing local consumer.

## 4. Permission-reconciliation paths considered

### Path 1 — Add 31 rows to reach a count of 36

**Reject.** This arithmetic assumes the five old identifiers represent five canonical permissions. They do not. The resulting catalog would have 36 rows total (the five legacy rows plus 31 new canonical rows) but only 31 of the 36 canonical permission codes, leaving five canonical codes missing and the API permission registry incomplete.

### Path 2 — Replace or rewrite the legacy seed with the 36 canonical rows

**Reject.** Editing an already committed/applied migration rewrites history and can make local/CI databases diverge. It also violates the explicit instruction to preserve the old seed and offers no benefit over a new reconciliation migration.

### Path 3 — Add all 36 in an add-only migration, then review removal separately

**Recommend, subject to explicit approval and local-state inspection.**

1. **Migration A — additive only:** insert all 36 canonical permission rows and add links from the existing `project-admin` role to all 36 canonical permissions. Do not delete, rename, deactivate, or unlink any legacy permission row or link in Migration A.
2. Keep the old five permission catalog rows, the `project-admin` role row, and `1792512000000_identity_sessions.sql` unchanged.
3. Between Migration A and any removal, the default role may temporarily expose 41 effective permission codes (the 36 canonical plus the 5 legacy links). Tests for this transitional state must say so explicitly; the final target of 36 effective canonical permissions applies only after the later, separately approved removal step.
4. **Migration B — legacy-link removal, separate and not yet authorized:** only after local inventory and a fresh source scan, optionally remove the five legacy role links from `project-admin`. Keep the five legacy catalog rows intact. If any route, test, local customization, or another role relies on a legacy code/link, stop and obtain a separate mapping/compatibility decision before removal.
5. A permission code may be retained as catalog/history data without being an alias. Do not introduce alias behavior implicitly. Any future route must use the exact canonical permission required by its API contract.
6. Both operations must be idempotent. Existing canonical codes with the expected metadata may be reused; conflicting metadata must fail closed. Rollback must know which rows and links this migration actually created, so it cannot accidentally remove pre-existing local data.

This explicitly separates addition from removal. **Migration A's design is approved, but implementation is gated** by the actual local database inventory and a separately approved Migration Strategy note. Migration B remains unapproved and requires its own readiness gate and review.


## 5. Why all 36 are proposed for project-admin

The only built-in role seeded by the current migration is project-admin, and the current seed links that role to every permission then present. The one-time local bootstrap assigns that role to the first explicitly provisioned administrator. There is no admin account seed.

This ADR therefore proposes to preserve that role’s intended top-level administrative purpose by linking it to all 36 canonical permissions, rather than making the administrator authenticate successfully but receive an empty/incomplete effective permission set. The role record itself remains unchanged.

This is an explicit role policy, **not** permission to bypass security controls:

- A permission does not substitute for server-side authorization on every protected handler.
- wallet.adjust.approve, payments.approve, payments.execute, bonuses.grant.approve, and privilege-expanding role changes remain subject to their distinct-principal, approval, recent-MFA, idempotency, audit, and transaction requirements wherever those contracts require them.
- Assigning project-admin to a single administrator does not manufacture a second approver or allow a one-person bypass of dual control.
- No new route may use a legacy permission code after this ADR is approved; all route permission requirements must use the exact canonical codes and have negative runtime tests for a principal lacking the required permission.

If the Project Owner intends project-admin to be narrower than a full administrative role, that role map must be explicitly amended in this ADR before the migration is designed. Do not infer a narrower or broader permission set silently in SQL.

## 6. Authentication/login continuity

The current code path has separate authentication and authorization concerns:

- beginAdminLogin looks up an active identity_admins record and verifies its password; it does not require one of the five permission codes to start login.
- MFA completion creates the server-side session.
- resolveSession('admin', ...) loads the identity_admins row, then derives the assigned role names and effective permissions from the role/permission tables.
- GET /api/v1/admin/session requires a valid, active administrator session and completed MFA; it returns roles and effective permissions[].

Therefore, permission catalog seeding must **not** be used to authenticate an administrator. Login continuity is ensured by leaving the principal, role and MFA/session flows intact; the role map ensures the authenticated administrator gets a canonical permission context afterwards. The migration must not create an admin account or a default password.

### Required proof before reconciliation migration approval

The migration/test PR must prove against PostgreSQL:

1. An explicitly provisioned active admin assigned to project-admin can still complete password + MFA login and receive GET /api/v1/admin/session = 200.
2. The returned roles still include project-admin.
3. Immediately after Migration A, all 36 canonical codes are effective exactly once and the five legacy links/rows remain unchanged as the planned transitional state.
4. Only after the separate Migration B is approved/applied: no legacy code is returned in the project-admin effective permission set, while the five legacy catalog rows remain unchanged.
5. Every canonical permission used by a route exists in the registry; an admin without that permission gets 403 on the real handler.
6. Re-running the seed/test setup does not duplicate permissions, role links or an administrator.
7. Existing local data/role mappings discovered in the required local-DB inspection are preserved or resolved by a separate explicit decision, never assumed empty.

## 7. Additive migration requirements (future work; not authorized now)

After the local database inventory note is populated and approved and the Migration Strategy note is separately approved, Migration A may be implemented under these invariants:

- **No edit** to 1792512000000_identity_sessions.sql; no rewriting migration history.
- Insert the exact 36 canonical permission codes, with non-empty descriptions aligned to the approved contract/route semantics.
- Use the existing unique code constraint and composite primary key on identity_admin_role_permissions to keep the seed idempotent. Conflicting metadata for a pre-existing canonical code fails closed and requires review.
- Resolve role and permission rows by stable codes within the migration; do not rely on generated UUID values.
- Migration A adds canonical links only and leaves every legacy link intact. A later Migration B may detach the five legacy links only after local state and consumer checks have passed and that removal has separate approval.
- Leave existing administrator rows and their IDs/password hashes/MFA state unchanged; do not seed an admin.
- Wrap the insert, mapping, reconciliation, and verification in a transaction wherever supported; abort on unexpected duplicate/conflicting codes, missing project-admin, or failed expected-count assertions.
- Capture provenance for rows/links actually inserted by Migration A so a down path cannot delete pre-existing rows. Rollback must be application-first and non-destructive by default; only remove a migration-created link/row after checks prove it has no other role assignment or active code dependency. If safe proof is unavailable, preserve the catalog rows and use a forward fix. Do not add an `inactive` status unless a separate approved schema change creates that column; it does not exist in the current table.

**No migration file has been created or run while drafting this ADR.**

## 8. Four mandatory conditions added by conditional approval

### 8.1 Semantic analysis and exact-code usage

The five legacy codes, likely semantic relationships, and actual tracked-source scan results are recorded in Section 2 above. Conclusions:

- Only `admin.players.read` has a relatively direct closest canonical counterpart, `players.read`, subject to scope equivalence.
- `admin.security.audit.read` is a candidate for `audit.read`, but event coverage must be checked against the canonical audit contract.
- `admin.session.read`, `admin.players.write`, and `admin.security.manage` do not have safe one-to-one canonical replacements.
- No references to any of the five exact legacy permission codes were found in the 73 tracked TypeScript/TSX files scanned on remote `main`. The only `identity:` pattern match was test setup at `server/test/identity.test.ts:84`, not a permission consumer. This does not cover untracked/ignored local files, generated files excluded from the tree, or external consumers. Re-run the requested search against the developer checkout before Migration B. If a real consumer is found, record file and line, determine the equivalent contract permission, and update it only where semantics match; otherwise retain legacy behavior until a specific compatibility decision is approved. Do not create a blanket alias.

Suggested local command before any removal step:
```powershell
Get-ChildItem server,frontend,backend -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern 'identity\.|identity:|admin\.session\.read|admin\.players\.read|admin\.players\.write|admin\.security\.audit\.read|admin\.security\.manage'
```
Review all matches rather than mechanically replacing strings. No code changes are part of this ADR.

### 8.2 Local database inventory — intentionally pending

The current schema names are `identity_players`, `identity_admins`, `identity_admin_roles`, `identity_admin_permissions`, `identity_admin_role_permissions`, and `identity_admin_account_roles`. Do not substitute generic `players`, `admin_users`, `roles`, or `role_permissions` unless the local database inspection proves its schema is different.

**Result state: NOT RUN — the developer's local database is not accessible through the GitHub repository connection.** The direction and Migration A design are approved, so this is the next required evidence-gathering step. No local DB URL/connection was used, and no row counts are inferred from CI or migration DDL. Run this read-only inventory against the developer's local database only, record timestamp/environment, and attach actual outputs to the separate Investigation NOTE before drafting Migration Strategy.

```sql
SELECT COUNT(*) AS player_count FROM identity_players;
SELECT COUNT(*) AS admin_count FROM identity_admins;
SELECT COUNT(*) AS role_count FROM identity_admin_roles;
SELECT code, display_name FROM identity_admin_roles ORDER BY code;
SELECT COUNT(*) AS admin_role_assignment_count FROM identity_admin_account_roles;
SELECT role_id, COUNT(*) AS permission_link_count
FROM identity_admin_role_permissions
GROUP BY role_id
ORDER BY role_id;

-- Show role names and the full existing effective mapping, not IDs alone.
SELECT r.code AS role_code, p.code AS permission_code
FROM identity_admin_role_permissions rp
JOIN identity_admin_roles r ON r.id = rp.role_id
JOIN identity_admin_permissions p ON p.id = rp.permission_id
ORDER BY r.code, p.code;

-- Inspect exact legacy rows and all role links to them.
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
```

If the expected tables do not exist or the schema differs, stop and document that result; do not create them to make these queries pass. Any additional role besides `project-admin`, any unexpected account assignment, existing canonical code, or non-default link must be understood before migration design. Roles other than `project-admin` must retain their current links by default: inserting catalog rows does not grant those permissions to another role unless role-permission links are explicitly added. Migration A must not add canonical links to any other role. Unexpected/custom roles or assignments must be reviewed individually before a later removal decision. Do not remove any legacy link from another role. This ADR includes no live inventory statistics because they have not been collected.

### 8.3 Idempotent additive migration — required pseudo-code only

Migration A must not be written until all gates are met. This pseudo-code describes required behavior; it is not executable migration SQL and does not approve implementation.

```text
BEGIN TRANSACTION

ASSERT exactly one identity_admin_roles row has code = 'project-admin'
DEFINE expected = the 36 approved (code, description) pairs

INSERT expected rows into identity_admin_permissions
  ON CONFLICT (code) DO NOTHING
  RETURNING only rows actually inserted
RECORD inserted permission codes in a migration-owned provenance journal

ASSERT each expected code now exists exactly once
ASSERT every pre-existing expected code has the expected description
  otherwise RAISE EXCEPTION and ROLLBACK (never overwrite conflicting metadata)

INSERT (project-admin role, each expected permission) into
  identity_admin_role_permissions
  ON CONFLICT (role_id, permission_id) DO NOTHING
  RETURNING only role links actually inserted
RECORD inserted role/permission code pairs in the same provenance journal

ASSERT all 36 canonical codes exist with approved metadata
ASSERT all 36 canonical role links exist exactly once
ASSERT no unexpected role links or legacy-row edits occurred

COMMIT
```

The implementation must use the actual unique constraint on `identity_admin_permissions(code)` and the composite primary key on `identity_admin_role_permissions(role_id, permission_id)`. Existing identical records must not cause failure; metadata conflicts must abort the whole transaction. The journal mechanism/schema must be defined and reviewed in the Migration Strategy note so that rollback can distinguish new rows/links from records that predated the migration. Migration A must not unlink the five legacy permissions; that is a separate Migration B.

### 8.4 Migration B readiness criteria

Migration B may be proposed for implementation only after **all** of the following are evidenced and the Migration Strategy note is approved:

1. The local DB Investigation NOTE has real output for counts and inventories of `identity_players`, `identity_admins`, `identity_admin_roles`, `identity_admin_account_roles`, `identity_admin_permissions`, and `identity_admin_role_permissions`; every role code and each role's permission mapping is known. Any non-`project-admin` role is preserved, and no legacy link for another role is removed without a separate decision.
2. Repeat a local working-tree scan (including physically present untracked/ignored files) and review every result. Suggested PowerShell:
   ```powershell
   Get-ChildItem server,frontend,backend -Recurse -File -Include *.ts,*.tsx |
     Select-String -Pattern 'admin\.session\.read|admin\.players\.read|admin\.players\.write|admin\.security\.audit\.read|admin\.security\.manage'
   Get-ChildItem server,frontend,backend -Recurse -File -Include *.ts,*.tsx |
     Select-String -Pattern 'identity\.|identity:'
   ```
   Also inspect API contracts/specs and the focused files `server/src/identity/routes.ts`, `server/src/identity/service.ts`, `server/test/identity.test.ts`, and any UI/session consumers reported by the scan. Each true hit must have a documented disposition: retain the old link pending a decision, or update to an exactly equivalent canonical permission under its own tested change. False positives must be identified by file and line. Do not mass-replace or create a blanket alias.
3. Migration A acceptance tests pass against local PostgreSQL: existing admin login + MFA still works; `GET /api/v1/admin/session` returns 200 and `project-admin`; effective permissions are exactly the 36 canonical codes plus the five legacy codes (41 distinct entries) expected for this transition; rows and legacy links are unchanged; re-applying the additive seed creates no duplicates.
4. There are no unresolved consumers of the five legacy codes on the role/link being changed. If any role other than `project-admin` exists, B leaves its account assignments and links unchanged unless that role is explicitly covered by a separate approved decision.
5. A disposable local DB rollback drill proves B's down path can restore only legacy links recorded as removed, without changing pre-existing admins, IDs, password hashes, MFA settings, live local sessions, players, role rows, or canonical mappings.

**Safe-to-start B** means all five evidence items are attached to the Investigation/Strategy notes, all legacy-code hits are classified, the owner approves the specific B up/down plan, and runtime + rollback tests pass. A clean source scan alone is not enough. If any result is unclear, B stays blocked and the old links remain.

### 8.4 Rollback and login-continuity plan

The current `identity_admin_permissions` table has columns `id`, `code`, and `description`; it has **no `status` column**. Therefore `status='inactive'` is not a safe available option unless a separate schema change is explicitly designed and approved. Do not silently add it as part of this permission reconciliation.

Preferred rollback behavior:

1. **Test failure before commit:** the transaction rolls back as a unit; no partial seed/link change should remain.
2. **Problem discovered after applying Migration A:** first roll the application back to a version that does not require the new canonical registry/links. Then use the migration-owned provenance journal to remove only links actually created by Migration A, restoring the pre-migration role map. Do not delete any pre-existing role link or permission row.
3. **Permission-row cleanup:** delete one of the 36 catalog rows only when provenance proves Migration A created it, there are no role assignments remaining (including custom roles), and the rolled-back application has no dependency on it. If any condition is not provable, retain the permission row as harmless unassigned catalog/history data and use a reviewed forward fix rather than destructive rollback.
4. **Migration B rollback:** restore only legacy links that Migration B recorded as removed, and only if the legacy permission row still exists; do not delete the five legacy catalog rows. The provenance journal must also make re-application/rollback safe.
5. **Local rollback test:** use a disposable copy/backup of the local DB, record pre/post row counts and full role mappings, apply the up path, simulate failure, perform down, and assert that all pre-existing admin IDs, password hashes, MFA configuration, sessions, role assignments, permission metadata, and custom mappings are unchanged. Verify a second up/down cycle is safe.
6. **Admin cannot log in after migration:** do not reset or reseed the administrator or edit the legacy migration. Check identity/password/MFA/session state separately from permission mapping; roll the application back first and restore only the migration-created permission links via provenance. The PostgreSQL acceptance test must provision the admin explicitly, complete password + MFA, and assert `GET /api/v1/admin/session` returns 200 with `project-admin`. If this fails, abort rollout and investigate before any further migration.

The separate add/remove steps, rollback behavior, and local runtime tests must be approved in the Migration Strategy note before migration 001 or either permission migration is implemented.

## 9. Scope / dependencies / exclusions

In scope for ADR-023: permission catalog codes, seed metadata, default project-admin permission mapping, old-code compatibility treatment, login/session continuity acceptance tests.

Out of scope: renaming identity_*; player profile expansion; player_credentials; currency table/FKs; player/admin session split; KYC override endpoint; frontend integration; all real-money capabilities. Each remains gated by the separately approved migration strategy.

Fixed gates remain unchanged:

- Q-020 Open until relevant implemented routes/callbacks have route-level runtime coverage.
- Q-011 P0/Open; no staging/production deployment.
- Q-015 Open; no launch or real deposits.
- Q-009 Open; TND provider routing remains blocked.
- Phase 4 stays local development/test only.
- Overall revised Phase 4 estimate remains 23–30 days as a working estimate, subject to investigation and the approved implementation path.

## 10. Project Owner decision record

**Proposed decision:** Path 3 above — additive migration of all 36 canonical permission codes, preserve the old five historical rows and original migration, explicitly link canonical permissions to project-admin, and reconcile only the default legacy role links after local-state review.

This is permission reconciliation under the previously accepted top-level Identity decision **Option A — Adopt + Extend**; it does not reopen that schema-direction decision.

**Approval state (2026-10-21): DIRECTION + MIGRATION A DESIGN APPROVED.** Local DB inspection is now the next step. This ADR does not authorize Migration A implementation until actual local inventory results are captured and the Migration Strategy note is separately approved. Migration B and migration 001 are not approved. Do not rename any `identity_*` table or edit/delete the old migration.
