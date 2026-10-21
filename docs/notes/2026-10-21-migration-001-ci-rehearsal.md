# Migration 001 — CI Rehearsal Results

**NOTE ID:** NOTE-MIGRATION-001-CI-REHEARSAL-2026-10-21  
**Date:** 2026-10-21  
**Status:** **CI REHEARSAL PASS — AWAITING PROJECT OWNER REVIEW**  
**PR:** #73 — feat(db): add guarded Migration 001 with CI rehearsal  
**Code commit tested:** \`b4915a9a154c141075cfc3b726ffd8460cc572a4\`  
**Migration file:** \`server/migrations/1792584000000_identity_domain_migration_001.sql\`  
**Scope:** Disposable GitHub Actions PostgreSQL database only. Migration 001 has **not** been applied to Neon.

## 1. Executive result

The latest CI rehearsal completed successfully against a disposable PostgreSQL 18.6 database called \`bclick_ci\`. It used only the two approved baseline migration files to establish the starting schema, ran the read-only pre-Migration-001 gate, applied Migration 001, tested constraints and invariants, demonstrated rollback refusal when a test player row existed, rolled back cleanly after removing only that test fixture, verified the original baseline, re-applied Migration 001, and reran API tests.

**Result: PASS for the CI rehearsal. This is not approval to apply Migration 001 to Neon.** The next step is Project Owner review of this NOTE. No Neon preflight or database write is being run as part of this NOTE.

## 2. Actual GitHub Actions evidence

### Main Migration 001 rehearsal

- **Workflow run:** [Run 39588449898 — Identity Migration 001 CI rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39588449898)
- **Job:** [Job 119183105604 — Apply, assert, rollback, and re-apply Migration 001 on disposable PostgreSQL](https://github.com/Bclick9/Bclick/actions/runs/39588449898/job/119183105604)
- **Run ID:** \`39588449898\`
- **Job ID:** \`119183105604\`
- **Run conclusion:** \`success\`
- **Executed code commit:** \`b4915a9a154c141075cfc3b726ffd8460cc572a4\`
- **Disposable target reported by the workflow:** \`ci-disposable\`
- **Database/server:** \`bclick_ci\`, PostgreSQL \`18.6\`
- **Secrets:** The workflow used only its local, ephemeral CI connection. No Neon connection string or Neon credential was used in this rehearsal.

The job log contains the explicit pass markers:
- \`MIGRATION_001_POSTCHECK=PASS\` after the first apply.
- \`MIGRATION_001_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS\` after the guarded-down test.
- \`MIGRATION_001_ROLLBACK_POSTCHECK=PASS\` after clean rollback.
- \`MIGRATION_001_POSTCHECK=PASS\` again after re-apply.

### Companion CI checks on the same code commit

| Check | Run/job | Result |
|---|---|---|
| Read-only pre-Migration-001 gate against disposable CI target | [Run 39588449889](https://github.com/Bclick9/Bclick/actions/runs/39588449889) · [Job 119183105472](https://github.com/Bclick9/Bclick/actions/runs/39588449889/job/119183105472) | **PASS** |
| API types, tests, migrations and health contract | [Run 39588449834](https://github.com/Bclick9/Bclick/actions/runs/39588449834) · [Job 119183105667](https://github.com/Bclick9/Bclick/actions/runs/39588449834/job/119183105667) | **PASS** |
| OpenAPI lint and generated client | [Run 39588449834](https://github.com/Bclick9/Bclick/actions/runs/39588449834) · [Job 119183105299](https://github.com/Bclick9/Bclick/actions/runs/39588449834/job/119183105299) | **PASS** |
| Application builds | [Run 39588449846](https://github.com/Bclick9/Bclick/actions/runs/39588449846) · [Job 119183106484](https://github.com/Bclick9/Bclick/actions/runs/39588449846/job/119183106484) | **PASS** |
| Baseline workflow validation (no database access) | [Run 39588449800](https://github.com/Bclick9/Bclick/actions/runs/39588449800) · [Job 119183105928](https://github.com/Bclick9/Bclick/actions/runs/39588449800/job/119183105928) | **PASS**; live-target job correctly skipped |

The passing API check specifically recorded successful TypeScript typecheck and config/money/API tests. The Migration 001 rehearsal job recorded success for all 18 main steps, including the apply, guarded rollback refusal, clean rollback, baseline verification, re-apply and API test steps.

## 3. Pre-migration gate — disposable CI only

The rehearsal created the starting database from the **two baseline files only**. The read-only gate reported target \`ci-disposable\`, database \`bclick_ci\`, PostgreSQL \`18.6\`, the expected 12 \`identity_*\` source tables, no canonical destination tables, and the approved starting inventory. The gate explicitly reported \`MIGRATION_001_EXECUTED=false\` at preflight time.

This gate was run only against the local disposable Actions service. It did not connect to or inspect Neon.

## 4. Post-apply results

The rehearsal postcheck output recorded:

| Check | Observed | Result |
|---|---:|---|
| Reference tuple — players / admins / roles / role-permission links / admin-role links / permissions | \`0 / 0 / 1 / 5 / 0 / 5\` | PASS |
| Canonical tables created by renaming | 12 | PASS |
| EUR decimal places | 2 | PASS |
| TND decimal places | 3 | PASS |
| USD decimal places | 2 | PASS |
| Migration 001 migration-history row | Present as third migration | PASS |
| Admin accounts created | 0 | PASS |
| 36 canonical permissions added | 0 | PASS |
| Persistent fixture data from transaction-scoped constraint tests | 0 | PASS |

The currency rows were exactly:

| Code | Decimal places |
|---|---:|
| EUR | 2 |
| TND | 3 |
| USD | 2 |

The script also verified the expected renamed tables and absence of the legacy table names; required DOB/terms/age-policy columns and their non-null constraints; the settlement/display-currency foreign keys; requester/approver references; phone and username indexes; and the role/permission inventory.

The one role remained \`project-admin\` / \`Project Administrator\`. All five legacy permissions and all five role links were retained. No canonical permission codes were added.

## 5. Constraint and registration tests

The disposable rehearsal exercised database constraints, with its test-row transaction explicitly rolled back afterward:

- Unique normalized username and unique phone-number indexes reject duplicates.
- Username and normalized username must agree.
- The age boundary rejects a date that is one day younger than 18; the exact 18-year boundary is accepted.
- Missing required \`terms_version\` is rejected.
- Unknown KYC tier is rejected.
- A non-expiring KYC override of \`waive\` without separate requester/approver IDs is rejected.
- Unknown KYC requester is rejected by the foreign key.

The existing Identity API tests passed on the renamed schema. They cover required consent fields, server-side under-age rejection, and persistence of date of birth, terms/age-policy version and timestamps, normalized username, and E.164 phone value in CI configuration.

## 6. Rollback rehearsal

The rollback test deliberately installed one player fixture into the disposable \`players\` table and attempted \`node-pg-migrate down --count 1\`.

- The Down migration **refused** to proceed because the players table was populated.
- The test then verified the fixture row and all three migration-history rows were still present, and printed \`MIGRATION_001_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS\`.
- The script removed only its known test fixture from the disposable database.
- Clean rollback succeeded.
- The post-down check printed \`MIGRATION_001_ROLLBACK_POSTCHECK=PASS\` and confirmed:
  - the original 12 \`identity_*\` table names restored;
  - the reference tuple again \`0 / 0 / 1 / 5 / 0 / 5\`;
  - \`currencies\` no longer existed;
  - \`pgmigrations\` returned to exactly two rows;
  - all five legacy permission records and mappings remained.
- Migration 001 was then re-applied and the postcheck passed again.

**Scope of this evidence:** rollback safety was tested in the disposable CI database only. It is not a recommendation or authorization to roll back Neon.

## 7. What this rehearsal does not prove

- It does not establish that Neon currently matches the tested baseline. A separate fresh read-only Neon preflight remains required after the owner reviews this NOTE.
- It does not isolate the Neon project or close Q-011. Neon was not accessed during this run, and the existing Neon branch is not isolated staging.
- It does not close Q-020. CAPTCHA/provider-side verification and other open contract/security questions are not authorized by this migration rehearsal.
- It does not authorize Migration 002, Migration A/005, Migration B, production deployment, provider wallet callbacks, deposits/withdrawals, or any real-money flow.
- The baseline workflow’s live-database job was skipped during these PR checks, as expected; only the local disposable CI service was written.

## 8. Safety boundary and next step

- **PR #73 remains open for review.**
- **Migration 001 has not been applied to Neon.**
- **No Neon Plugin write or SQL statement against Neon was run.**
- \`DATABASE_URL\` was not changed.
- No Neon rollback was attempted.
- Q-020, Q-011, Q-015, Q-009 remain unchanged.
- Q-011 remains P0/Open; Phase 4 remains local/CI-only.
- Migration 002 still requires a separate NOTE and approval. Migration B remains prohibited.

**STOP FOR PROJECT OWNER REVIEW:** Please review the NOTE and CI run/job evidence. Only after your review should we start the separate read-only pre-Migration-001 check on the existing Neon target. If that check differs from the approved baseline, we will stop and request your decision. No Neon migration will be triggered before the required approval gate.
