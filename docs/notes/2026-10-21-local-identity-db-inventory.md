# Identity Database Investigation — CI Inventory Evidence Record

**Date:** 2026-10-21  
**NOTE ID:** NOTE-IDENTITY-DB-2026-10-21  
**Status:** CI investigation COMPLETE; submitted for Project Owner review. Developer-local database state is not observed by this run.  
**Selected execution path:** Alternative 3 — PostgreSQL in GitHub Actions.  
**Decision reference:** [ADR-023 — Permission Registry Reconciliation](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-21-ADR-023-permission-reconciliation-draft.md), merged via [PR #62](https://github.com/Bclick9/Bclick/pull/62).  
**Executed evidence:** [GitHub Actions run #39569244094](https://github.com/Bclick9/Bclick/actions/runs/39569244094) — API types, tests, migrations and health contract; completed successfully.

## 1. What I executed

I used the existing API CI job's disposable PostgreSQL service and executed read-only SQL after the ordered migrations had been applied. The investigation queried the six tables required by ADR-023, row counts, every role and its display name, administrator-role assignment counts, role-permission counts and complete mapping, the five legacy permission rows/links, and any existing code from the approved 36-code canonical permission set.

The runner log emitted a structured `IDENTITY_DB_INVESTIGATION_JSON` report. The successful run's SQL inventory is in [run #39569244094](https://github.com/Bclick9/Bclick/actions/runs/39569244094). PostgreSQL reported version **18.6** and database name **`bclick_ci`**. The workflow applies these migrations in order:

- `1792497600000_api_skeleton_baseline`
- `1792512000000_identity_sessions`

The test job completed successfully, including migrations, typecheck, API tests, build, health startup, and Schemathesis health checks. No production credential or external database was used. The report contains only counts and role/permission codes; it does not log account records, emails, password hashes, tokens, or MFA material.

## 2. Actual results from the disposable CI database

These values are **measured SQL results from this run**, not inferred from the migration file:

| Inventory item | CI result |
|---|---:|
| `identity_players` rows | **0** |
| `identity_admins` rows | **0** |
| `identity_admin_roles` rows | **1** |
| `identity_admin_account_roles` rows | **0** |
| `identity_admin_permissions` rows | **5** |
| `identity_admin_role_permissions` rows | **5** |

All six required inventory tables exist:

- `identity_players`
- `identity_admins`
- `identity_admin_roles`
- `identity_admin_permissions`
- `identity_admin_account_roles`
- `identity_admin_role_permissions`

### Role and administrator assignments

| Role code | Display name | Assigned admin accounts | Role-permission links |
|---|---|---:|---:|
| `project-admin` | Project Administrator | **0** | **5** |

No other role was present in this newly migrated CI database. The applied migration does not provision a real administrator account or assign an administrator to the role.

### Full role-permission mapping observed

All five existing links belong to `project-admin`:

| Legacy permission code | Description from database | Linked role |
|---|---|---|
| `admin.players.read` | Read player administration records | `project-admin` |
| `admin.players.write` | Change permitted player account fields | `project-admin` |
| `admin.security.audit.read` | Read security audit records | `project-admin` |
| `admin.security.manage` | Manage administrator identity security | `project-admin` |
| `admin.session.read` | Read the authenticated administrator session | `project-admin` |

### Existing canonical permissions

The query checked all 36 approved canonical codes from ADR-023. **Zero canonical codes were already present** in this freshly migrated CI database. The catalog currently consists of the five legacy rows above; there is no exact-code overlap with the canonical set.

## 3. Findings and implications

1. The current migration chain runs on PostgreSQL 18.6 in CI, creates the required Identity tables, and succeeds before the API tests.
2. In a fresh database, the seed baseline is one role, five legacy permissions and five links. It creates neither player/admin accounts nor an admin-to-role assignment.
3. The five legacy permission records are all linked to `project-admin`. Migration A must keep those rows and links untouched while adding all **36** canonical permissions and their approved `project-admin` links. The clean CI starting-state total after such an additive step would be 41 catalog rows and 41 links for `project-admin`, assuming the same clean seed baseline; that is a forecast from the observed baseline, not a migration executed by this investigation.
4. The canonical result in CI supports the existing ADR-023 decision that adding only 31 codes would be incorrect. All 36 canonical codes must be considered independently from the five legacy identifiers.
5. These results establish the behavior of the repository's committed migration chain against a clean PostgreSQL database. They do **not** prove that any separate developer-local database is empty or has the same role mappings.

## 4. Explicit boundary: CI is not the developer-local database

I chose the Project Owner's proposed **GitHub Actions DB** alternative and ran the queries myself. The CI database is disposable and is created from scratch by this workflow. Its zero player/admin counts and lack of custom roles cannot be attributed to a local database that was not connected.

To protect any existing local state, the Migration Strategy must require a target-database preflight and fail closed before mutation if the real migration target has missing/extra tables, unexpected roles, pre-existing canonical codes with conflicting metadata, or unexpected links. Migration A must remain additive and preserve all pre-existing account rows, role identities, assignments, custom mappings, and all five legacy rows/links. This CI report does not authorize running a migration against an uninspected target. Migration B must remain separately gated by local-state and consumer evidence.

The selected CI path lets us complete the investigation of the **repository-defined fresh-database baseline** without asking the Project Owner to set up PostgreSQL or run SQL. It cannot retrieve private local data by design; no such data has been guessed or fabricated.

## 5. Gate status and next sequence

- **This CI investigation:** complete; results and successful run are recorded above.
- **Project Owner review:** pending for this completed evidence NOTE.
- **Migration Strategy NOTE:** prepare only after approval of this investigation NOTE. It must specify idempotency, provenance, up/down behavior, fail-closed target preflight, and PostgreSQL runtime/rollback tests.
- **Migration A:** not implemented or run; still requires the separately approved Migration Strategy and all its target preflight checks.
- **Migration B:** not approved; keep all legacy links intact until its separate readiness criteria are satisfied.
- **Migration 001:** not approved and must not be created before the Migration Strategy NOTE is approved.
- **Fixed gates remain unchanged:** Q-020 open; Q-011 P0/no deployment; Q-015 open/no launch or real deposits; Q-009 blocks TND provider routing; Phase 4 remains local-development/test only; estimate remains 23–30 days.

No migration, seed, schema, production configuration, wallet, payment, or provider-routing changes were made as part of this investigation.
