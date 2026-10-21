# ADR-023 Draft — Permission Registry Reconciliation

**Date:** 2026-10-21  
**Status:** DRAFT — proposed decision only; awaiting explicit Project Owner approval  
**Decision ID:** NOTE-ADR-023  
**Parent decision:** Identity Legacy Option A — Adopt + Extend (accepted by Project Owner)  
**Related investigation:** [Identity Legacy Investigation](./2026-10-21-identity-legacy-investigation.md)  
**Related source of truth:** Approved Planning Library 04-api-contracts.md — “Initial permission set (registry is additive and must be synchronized with openapi.yaml”.  
**Scope:** permission catalog/role links only. This ADR does not create or execute a migration and does not change the current seed.

## 1. Decision requested

Approve a **new additive canonical permission seed of all 36 permission codes** in the approved 04-api-contracts.md set, while leaving the existing migration and its original five permission rows untouched.

Do **not** seed only 31 new codes. The five existing seed codes have **zero exact-code overlap** with the 36-code canonical set. “36 canonical minus 5 old” is therefore not a valid reconciliation calculation.

The five old rows can remain as legacy catalog data for migration/history compatibility, but they must not be required by new canonical routes. A new migration may update role-to-permission assignments; it must not edit or replay the old migration file. Before any role-link cleanup, inspect the target local database for non-default/custom assignments and stop for review if unexpected state is present.

**No code or database change is authorized by this draft.** The Project Owner must approve this ADR before any permission-reconciliation migration is written.

## 2. Current facts

The existing immutable migration is server/migrations/1792512000000_identity_sessions.sql. It seeds:

- Role project-admin with display name Project Administrator.
- Five permission rows listed below.
- A role-permission link from project-admin to each of those five rows.

It does **not** seed an identity_admins account. The separate local/test bootstrap tool provisions an administrator only when an operator explicitly supplies bootstrap values. CI also creates temporary administrator fixtures in a disposable test database; those are tests, not migration seeds.

### Existing five seeded permission codes

| Existing code | Existing description | Exact code in the canonical 36? |
|---|---|---|
| admin.session.read | Read the authenticated administrator session | No |
| admin.players.read | Read player administration records | No |
| admin.players.write | Change permitted player account fields | No |
| admin.security.audit.read | Read security audit records | No |
| admin.security.manage | Manage administrator identity security | No |

These must not be silently aliased to similar names. For example, admin.players.read is not the canonical players.read, and admin.security.audit.read is not audit.read.

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

**Reject.** This arithmetic assumes the five old identifiers represent five canonical permissions. They do not. The resulting catalog would have 41 rows but only 31 of the 36 canonical permission codes, leaving the API permission registry incomplete.

### Path 2 — Replace or rewrite the legacy seed with the 36 canonical rows

**Reject.** Editing an already committed/applied migration rewrites history and can make local/CI databases diverge. It also violates the explicit instruction to preserve the old seed and offers no benefit over a new reconciliation migration.

### Path 3 — Add all 36 canonical rows in a new migration and reconcile role links

**Recommend, subject to Project Owner approval and local-state inspection.**

1. Insert all 36 canonical permission rows in a new additive permission-reconciliation migration.
2. Keep the old five permission rows and project-admin role row intact; do not rename or delete those historical rows.
3. Add explicit role links for the 36 canonical codes to the existing project-admin role, so the bootstrapped project administrator retains the intended complete project-admin capability set after canonical permissions become the enforced vocabulary.
4. After the local database inspection confirms only the expected default assignments (or after any custom assignments are separately resolved), remove the five old legacy links from project-admin so those non-canonical names are not returned as effective permissions. Keep the five catalog rows themselves unchanged and unassigned to new canonical routes. If the database contains custom roles or other uses of these codes, stop and review rather than deleting or reassigning them blindly.
5. Ensure repeated application cannot create duplicate codes or duplicate role links. If a canonical code already exists with conflicting metadata, fail the migration/verification gate for explicit review; do not silently overwrite its description or identity.

This is additive with respect to the **migration history and permission catalog**: the old migration and all five old catalog records remain. Reconciliation of the default role-link set happens in a new reviewed migration, only after the actual target database state has been inspected.

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
3. The effective canonical permission list contains the expected 36 codes exactly once each.
4. No legacy code is returned in the effective permission set after the reviewed default link cleanup, while the five legacy permission catalog rows remain unchanged.
5. Every canonical permission used by a route exists in the registry; an admin without that permission gets 403 on the real handler.
6. Re-running the seed/test setup does not duplicate permissions, role links or an administrator.
7. Existing local data/role mappings discovered in the required local-DB inspection are preserved or resolved by a separate explicit decision, never assumed empty.

## 7. Additive migration requirements (future work; not authorized now)

After this ADR is approved, the later migration strategy may include a new permission-seed/reconciliation migration with these invariants:

- **No edit** to 1792512000000_identity_sessions.sql; no rewriting migration history.
- Insert the exact 36 canonical permission codes, with non-empty descriptions aligned to the approved contract/route semantics.
- Use the existing unique code constraint and composite primary key on identity_admin_role_permissions to keep the seed idempotent. Conflicting metadata for a pre-existing canonical code fails closed and requires review.
- Resolve/create role links by stable role/permission codes within the migration; do not rely on generated UUID values.
- Link the intended canonical set to project-admin; only detach the five legacy links after local state confirms the expected default assignment and no unreviewed custom role semantics would be lost.
- Leave existing administrator rows and their IDs/password hashes/MFA state unchanged; do not seed an admin.
- Wrap the insert, mapping, reconciliation, and verification in a transaction wherever supported; abort on unexpected duplicate/conflicting codes, missing project-admin, or failed expected-count assertions.
- The down policy must not delete canonical permission records that have assignments or route dependencies. If rollback would require destructive deletion, prefer a reviewed forward fix. Never drop the old tables or old seed rows as part of permission reconciliation.

**No migration file has been created or run while drafting this ADR.**

## 8. Scope / dependencies / exclusions

In scope for ADR-023: permission catalog codes, seed metadata, default project-admin permission mapping, old-code compatibility treatment, login/session continuity acceptance tests.

Out of scope: renaming identity_*; player profile expansion; player_credentials; currency table/FKs; player/admin session split; KYC override endpoint; frontend integration; all real-money capabilities. Each remains gated by the separately approved migration strategy.

Fixed gates remain unchanged:

- Q-020 Open until relevant implemented routes/callbacks have route-level runtime coverage.
- Q-011 P0/Open; no staging/production deployment.
- Q-015 Open; no launch or real deposits.
- Q-009 Open; TND provider routing remains blocked.
- Phase 4 stays local development/test only.
- Overall revised Phase 4 estimate remains 23–30 days as a working estimate, subject to investigation and the approved implementation path.

## 9. Project Owner decision record

**Proposed decision:** Path 3 above — additive migration of all 36 canonical permission codes, preserve the old five historical rows and original migration, explicitly link canonical permissions to project-admin, and reconcile only the default legacy role links after local-state review.

This is permission reconciliation under the previously accepted top-level Identity decision **Option A — Adopt + Extend**; it does not reopen that schema-direction decision.

**Approval state: PENDING.** This draft is not an implementation authorization. Do not inspect/change a local database, write the permission migration, rename any identity_* table, or proceed to migration 001 on the strength of this draft. Await explicit Project Owner approval of ADR-023 first.
