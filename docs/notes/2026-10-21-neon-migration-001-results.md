# Neon Migration 001 Results

**NOTE ID:** NOTE-NEON-MIGRATION-001-RESULTS-2026-10-21  
**Date:** 2026-10-21  
**Status:** **VERIFIED PASS from GitHub Actions run logs — Project Owner review required**  
**Scope:** Official record of the owner-dispatched Migration 001 execution on Neon. This NOTE does not authorize Migration 002 or any further database change.

## 1. Executive result

The dedicated GitHub Actions workflow completed successfully on `main`. The live preflight passed, exactly one migration was applied, and the live postflight passed.

- **Preflight:** `MIGRATION_001_PREFLIGHT=PASS`
- **Migration apply:** completed; workflow log reports `Migrations complete!`
- **Postflight:** `MIGRATION_001_POSTFLIGHT=PASS`
- **Expected canonical tables:** 12 of 12 present
- **Legacy permission records:** all 5 retained, with 5 role-permission links
- **Currencies:** `TND` (3 decimal places), `EUR` (2), `USD` (2)
- **Migration history:** exactly 3 records, including Migration 001
- **Player rows / admin accounts / session rows:** 0 / 0 / 0
- No admin account was created. No wallet or payment migration was included.

**Decision:** Migration 001 has passed its run-time gates. Stop here. Migration 002 requires its own separate NOTE and the Project Owner's separate explicit approval.

## 2. Runtime evidence

| Field | Verified value |
|---|---|
| Workflow run | [Run #39590390596](https://github.com/Bclick9/Bclick/actions/runs/39590390596) |
| Job | [Guarded Migration 001 apply and postflight on Neon](https://github.com/Bclick9/Bclick/actions/runs/39590390596/job/119189604508) |
| Run ID | `39590390596` |
| Job ID | `119189604508` |
| Workflow | [`.github/workflows/identity-migration-001-neon.yml`](https://github.com/Bclick9/Bclick/blob/main/.github/workflows/identity-migration-001-neon.yml) |
| Event | `workflow_dispatch` |
| Branch | `main` |
| Executed commit | `fa82881938b82e082a18ae8e40153895c543ff75` |
| Run attempt | 1 |
| Run status / conclusion | `completed / success` |
| Started | 2026-10-21 11:13:46 UTC |
| Last updated / completed | 2026-10-21 11:14:31 UTC |
| Explicit target confirmation | `copabet365-neondb-frankfurt` |
| Database reported by gates | `neondb` |
| PostgreSQL | `18.6 (fd34222)` |
| Schema | `public` |

The retrieved job record shows successful completion of the main-branch/target gate, migration-content and inventory lock, locked dependency install, read-only preflight, single migration apply, and read-only postflight.

## 3. Read-only preflight — verified PASS

The preflight output was retrieved from the job log and reports the following state **before** Migration 001:

| Check | Observed result |
|---|---|
| Exact target marker | `copabet365-neondb-frankfurt` |
| Source identity tables | 12 present |
| Canonical destination-name collisions | None |
| Reference tuple — players / admins / roles / role-permission links / admin-role links / permissions | `0 / 0 / 1 / 5 / 0 / 5` |
| Player rows | 0 |
| Admin-account rows | 0 |
| Session rows | 0 |
| Role | `project-admin` / `Project Administrator` |
| Legacy permission rows and links | 5 / 5 |
| Canonical permissions from the checked inventory | 0 |
| Migration history | Exactly the two approved baseline records |
| Migration 001 already applied | `false` |

The 12 source tables were `identity_players`, `identity_admins`, `identity_sessions`, `identity_admin_auth_challenges`, `identity_admin_recovery_codes`, `identity_one_time_tokens`, `identity_rate_limits`, `identity_security_audit_events`, `identity_admin_roles`, `identity_admin_permissions`, `identity_admin_role_permissions`, and `identity_admin_account_roles`.

The five retained legacy permission codes were `admin.players.read`, `admin.players.write`, `admin.security.audit.read`, `admin.security.manage`, and `admin.session.read`.

## 4. Applied migration

The workflow verified the reviewed Migration 001 file against its locked Git blob hash and checked the migration inventory before applying it:

- File: `server/migrations/1792584000000_identity_domain_migration_001.sql`
- Expected Git blob ID: `dde5b276dd1220dba5107d7989b6c1378ead101a`
- Apply command was constrained to one migration: `node-pg-migrate up --count 1`.
- Workflow output: `Migrations complete!`

Migration 001 renamed the 12 legacy identity tables to the approved canonical names, added the currency reference table and its TND/EUR/USD precision records, and added the reviewed player-domain columns, constraints, indexes, and foreign keys. No later migration was run by this workflow.

## 5. Read-only postflight — verified PASS

The postflight gate passed and recorded the following live results:

### Canonical tables

All 12 expected canonical tables exist:

1. `players`
2. `admin_users`
3. `auth_sessions`
4. `admin_mfa_challenges`
5. `admin_mfa_recovery_codes`
6. `player_one_time_tokens`
7. `rate_limits`
8. `audit_events`
9. `roles`
10. `permissions`
11. `role_permissions`
12. `admin_role_assignments`

The 12 old `identity_*` source table names remaining after the rename: **none**.

### Counts and migration history

| Check | Postflight observation |
|---|---:|
| Players | 0 |
| Admin accounts | 0 |
| Roles | 1 |
| Role-permission links | 5 |
| Admin-role assignments | 0 |
| Permissions | 5 |
| **Reference tuple** | **`0 / 0 / 1 / 5 / 0 / 5`** |
| Sessions | 0 |
| Legacy permission codes retained | 5 |
| Legacy role-permission links retained | 5 |
| Canonical permissions from checked inventory | 0 |
| Migration-history rows | 3 |

The exact migration history is:

1. `1792497600000_api_skeleton_baseline`
2. `1792512000000_identity_sessions`
3. `1792584000000_identity_domain_migration_001`

### Currency and domain checks

| Currency | Decimal places |
|---|---:|
| TND | 3 |
| EUR | 2 |
| USD | 2 |

The postflight also verified the required player columns and registration-evidence constraints, the currency and KYC-related foreign keys, the retained `project-admin` role and all five legacy permissions, and the absence of an admin account or wallet/payment migration.

## 6. Warnings and non-actions

The job succeeded; the required preflight and postflight gate markers both show PASS. Non-blocking toolchain warnings included a `pg-connection-string` warning about SSL-mode alias behavior in a future major version, Node/tooling deprecation warnings, and a warning that some GitHub Actions were transitioning from Node.js 20 to Node.js 24. They did not fail the job. This NOTE does not change SSL configuration or repository workflow dependencies; address those separately if needed.

No rollback was performed. No Neon Plugin write was used. No `DATABASE_URL` value is reproduced here or changed by this NOTE. Evidence review consisted of retrieving the Actions run/job metadata and logs; no additional SQL or database write was issued while preparing this record.

## 7. Environment classification and fixed gates

The known target is Neon project `copabet365`, Frankfurt, database `neondb`, on the branch named `production` (the primary/default branch per the preceding verified target notes). This branch is **not isolated staging**. A successful migration does not close the restore/recovery risk or establish production readiness.

- **Q-020:** unchanged / open.
- **Q-011:** unchanged / **P0/Open**. Restore drill remains outstanding.
- **Q-015:** unchanged / open.
- **Q-009:** unchanged / open; TND provider routing remains blocked.
- **Phase 4:** local/cloud testing only; no production launch and no real-money flow.
- **Migration 002:** **NOT AUTHORIZED**; requires its own NOTE and separate explicit Project Owner approval.
- **Migration B:** remains prohibited.
- **Rollback:** not performed; do not attempt rollback on this Neon target without a separate recovery plan and explicit approval.
- **`DATABASE_URL`:** do not change.
- **Neon Plugin:** read-only diagnostics only; future writes require a reviewed and explicitly approved GitHub Actions workflow.

## 8. Stop point

This NOTE records the verified successful Migration 001 run only. After the Project Owner reviews this NOTE/PR, **stop and wait**. Do not start Migration 002, any other migration, rollback, or additional database operation without the corresponding separate approval.

**Final result: Migration 001 on Neon = PASS. Migration 002 = STOP / AWAITING SEPARATE OWNER APPROVAL.**
