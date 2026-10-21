# Neon Baseline Migration Results

**NOTE ID:** NOTE-NEON-BASELINE-RESULTS-2026-10-21  
**Date:** 2026-10-21  
**Status:** **VERIFIED PASS from GitHub Actions run logs; awaiting Project Owner NOTE review**  
**Target declared by the Project Owner:** Neon project `copabet365`, Frankfurt (`eu-central-1`), database `neondb`, PostgreSQL `18.6`  
**Scope:** Only the two existing baseline migrations. This NOTE does not authorize Migration 001.

## 1. Executive result

The Project Owner reported that the baseline run completed successfully:

- Preflight: PASS.
- Existing baseline migrations applied: 2.
- Postflight: PASS.
- Required six-count tuple: `0 / 0 / 1 / 5 / 0 / 5`.
- Reported administrator account count: 0.
- Reported session count: 0.
- Reported migration-history row count: 2.

This NOTE records the supplied result and its details. It does not claim independent verification of the Neon database contents by this author; the order requires the Project Owner to review this NOTE before the next read-only Neon preflight.

## 2. Preflight result (reported)

| Check | Reported observation | Result |
|---|---|---|
| Region | Frankfurt / AWS `eu-central-1` | PASS |
| Database | `neondb` | PASS |
| PostgreSQL version | `18.6` | PASS |
| Expected `identity_*` tables before run | None exist | PASS |
| `public.pgmigrations` before run | Does not exist | PASS |
| Approved migration content locks | Both Git blob IDs matched the reviewed files | PASS |

The six-count reference was not expected to be measurable before the baseline. Missing tables were not treated as tables with zero rows.

## 3. Applied migration inventory

The Project Owner reported exactly these two migrations applied, in this order:

1. `1792497600000_api_skeleton_baseline`
2. `1792512000000_identity_sessions`

The reviewed source inventory currently contains these exact existing files and blob IDs:

| Migration file | Reviewed Git blob ID |
|---|---|
| `1792497600000_api_skeleton_baseline.sql` | `d3b2e382f7522fc81ec0ecdb4812c33e4db7ea55` |
| `1792512000000_identity_sessions.sql` | `e82d0af78853136a33321489847ab2b0ae1573d8` |

No migration file was changed for this run, and no later migration was authorized.

## 4. Postflight result (reported)

### Schema inventory

All 12 expected source tables were reported present:

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

The preflight reported no destination-name collisions. The postflight reported the expected identity schema present.

### Reference counts

The canonical tuple order is **players / admins / roles / role-permission links / admin-role links / permissions**.

| Measure | Expected | Reported |
|---|---:|---:|
| Players | 0 | 0 |
| Admin accounts | 0 | 0 |
| Roles | 1 | 1 |
| Role-permission links | 5 | 5 |
| Admin-role assignments | 0 | 0 |
| Permissions | 5 | 5 |
| **Reference tuple** | **0 / 0 / 1 / 5 / 0 / 5** | **0 / 0 / 1 / 5 / 0 / 5** |
| Sessions (additional check) | 0 | 0 |
| Rows in `public.pgmigrations` (additional check) | 2 | 2 |

### Role and permission inventory

The only role was reported as:

- Code: `project-admin`
- Display name: `Project Administrator`

The five legacy permissions were reported present and retained:

- `admin.session.read`
- `admin.players.read`
- `admin.players.write`
- `admin.security.audit.read`
- `admin.security.manage`

All five were reported linked to `project-admin`. The number of existing canonical permissions from the 36-code inventory was reported as **0**. No administrator account was created, and no sessions were present.

## 5. Runtime audit evidence — verified

The Project Owner supplied the exact job URL, and the GitHub Actions run and job logs were independently retrieved and inspected while preparing this NOTE.

- **Workflow run:** [Run #39584194467](https://github.com/Bclick9/Bclick/actions/runs/39584194467)
- **Job:** [Guarded baseline migrations and verification](https://github.com/Bclick9/Bclick/actions/runs/39584194467/job/119168922726)
- **Run ID:** `39584194467`
- **Job ID:** `119168922726`
- **Event:** `workflow_dispatch` (manual run)
- **Branch:** `main`
- **Workflow run number:** 3
- **Attempt:** 1
- **Executed Commit SHA:** `f3d5d84beeb359b6108e583b10cc656ebf136b82`
- **Target confirmation:** `copabet365-neondb-frankfurt`
- **Run status/conclusion:** `completed / success`
- **Time:** 2026-10-21 10:23:08Z to 10:24:09Z

The recorded job steps show:
1. Main-branch and explicit target confirmation: **success**.
2. Locked workspace install: **success**.
3. Read-only Neon precheck: **success**, ending with `NEON_BASELINE_PRECHECK=PASS`.
4. Existing migration runner: **success**; logs list only `1792497600000_api_skeleton_baseline` and `1792512000000_identity_sessions`.
5. Read-only Neon postcheck: **success**, ending with `NEON_BASELINE_POSTCHECK=PASS`.

### Verified preflight output

| Check | Observed |
|---|---|
| Target marker | `copabet365-neondb-frankfurt` |
| Database | `neondb` |
| Region marker | `eu-central-1` (verified by workflow gate) |
| PostgreSQL | `18.6 (fd34222)` |
| Migration history table before run | Absent |
| Pre-existing `identity_*` tables | None |
| Destination-name collisions | None |
| Migration blob locks | Both exact reviewed IDs matched |
| Gate mutations | None |

The reference tuple was deliberately not measured before the baseline because the relevant tables did not exist.

### Verified postflight output

The workflow log records `NEON_BASELINE_POSTCHECK=PASS` and these values:

- Reference tuple, order **players / admins / roles / role-permission links / admin-role links / permissions**: `0 / 0 / 1 / 5 / 0 / 5`.
- All 12 expected `identity_*` tables exist.
- Destination-name collisions: none.
- Role inventory: exactly `project-admin` / `Project Administrator`.
- Permission inventory: exactly the five legacy codes:
  `admin.players.read`, `admin.players.write`, `admin.security.audit.read`, `admin.security.manage`, `admin.session.read`.
- Role-permission mapping: all five legacy codes are linked to `project-admin`.
- Existing canonical permission codes from the 36-code list: none.
- Sessions: 0; session principal types: empty; unknown principal types: 0.
- Orphan player sessions: 0; orphan admin sessions: 0.
- Admin account created: `false`.
- Wallet/payment migrations included: `false`.
- Applied migration history: exactly `1792497600000_api_skeleton_baseline` and `1792512000000_identity_sessions`.

### Warnings observed

The run succeeded and no workflow step errors were present in the retrieved job log. Non-blocking warnings were emitted:
- `pg-connection-string` warns that the existing SSL mode aliases currently behave as `verify-full` and suggests making the mode explicit in a future change.
- Node deprecation warnings were emitted for transitive tooling and GitHub actions noting the Node.js 20-to-24 runtime transition.
- pnpm reported the existing ignored `esbuild` build script warning.

No value of `DATABASE_URL`, connection password, or database hostname was included in the safe pre/postcheck output. **This NOTE does not change the secret or alter SSL configuration**; the warning is recorded for a separately reviewed change if desired.

These log records close the previously noted evidence gap. This note now distinguishes the actual successful manual database run from the earlier PR validation run where the write job had been skipped.

## 6. Side effects, recovery and explicit non-actions

The Project Owner reported that no administrator was created and no sessions were created. The two baseline files contain only the API skeleton marker and identity/session schema with the initial project-admin role and five legacy permissions; no wallet or financial-domain migration was in scope.

No rollback was attempted or claimed. Dropping the newly created identity tables would be destructive; recovery or rollback would require a separate, explicit plan and approval if ever needed.

This NOTE was prepared after the supplied success report. It did not connect to Neon, run SQL, use the Neon Plugin, change the `DATABASE_URL` secret, invoke a migration, create Migration 001, or change any Neon data.

## 7. Next step and stop conditions

1. Project Owner reviews this NOTE and supplies/attaches the actual runtime audit identifiers.
2. Only after NOTE review, perform the planned read-only Neon preflight on the existing Neon database. Compare the live schema and migration history to this result; record the exact observations rather than assuming the reported counts.
3. If the post-baseline read-only check differs, fails, or cannot be tied to the intended target, stop and ask the Project Owner for a decision.
4. If the live preflight matches, publish its results and wait for the Project Owner's separate explicit approval before even beginning Migration 001.

**Migration 001 remains stopped. Migration B remains prohibited. No production deployment or real-money flow is authorized.**

## 8. Fixed gates

- **Q-020:** Open.
- **Q-011:** P0/Open. Neon is not isolated staging and this work does not close Q-011.
- **Q-015:** Open; no launch.
- **Q-009:** TND provider routing remains blocked.
- **Phase 4:** local/cloud testing only.
- **Migration 001:** requires NOTE review, the ordered read-only Neon preflight, and separate explicit Project Owner approval.
- **Migration A / Migration 005:** requires its own separate NOTE and explicit approval.
- **Migration B:** prohibited until all five ADR-023 conditions are evidenced and separately approved.
- **Neon Plugin:** read-only diagnostics only; all writes remain restricted to reviewed GitHub Actions workflows.
