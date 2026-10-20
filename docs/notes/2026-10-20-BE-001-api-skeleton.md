# BE-001 — Phase 3 API Skeleton

**Date:** 2026-10-20  
**Roadmap phase:** Phase 3 — Backend skeleton / environments / CI and first restore drill  
**Branch:** `feature/BE-001-api-skeleton`  
**Review target:** `feature/IR-003-phase2-architecture-review` (do not merge to `main` before review)

## 1. Implemented scope

This increment introduces the first real API workspace without changing the existing product/admin UI boundary.

- Added `server/` as the production API workspace; `backend/` remains the Backoffice/CMS React/Vite UI.
- Added a Fastify app with `GET /api/v1/health/live` and `GET /api/v1/health/ready`. Readiness performs a bounded PostgreSQL `SELECT 1` probe and fails closed with HTTP 503 and a safe response when the dependency is unavailable.
- Added validated runtime configuration in `packages/config` and a bounded PostgreSQL pool. The app does not run migrations during startup.
- Added request correlation IDs and structured logging that strips query strings and redacts authentication/cookie/provider-key headers.
- Added `packages/money` exact decimal-string to `bigint` minor-unit parsing and formatting, based on the planning currency exponents TND=3, EUR=2 and USD=2. Unsupported precision is rejected; the implementation does not round or truncate.
- Added `packages/api-client` generation from the mirrored canonical `docs/planning/openapi.yaml`; both planning OpenAPI files are linted by CI. The mirrored files are required for source-level contract tooling and do not alter the shared Library originals.
- Added PostgreSQL Compose configuration, an image for the API, a manual-only migration profile, Caddy example configuration, backup guidance and an isolated restore-drill runbook.
- Added an empty/no-op ordered migration solely to verify `node-pg-migrate` wiring without prematurely creating domain tables. The first business/domain schema migration remains subject to its reviewed scope and source planning gate.
- Added GitHub Actions checks for contract lint/generated-client drift, workspace TypeScript checks, unit tests, API build, ordered migration execution against PostgreSQL, API startup and Schemathesis against implemented Health operations.
- Harmonized the existing Backoffice build workflow to the workspace's pinned pnpm version.

## 2. Tests and known contract exception

GitHub Actions runs currently report the OpenAPI lint/generated-client job as passing. Earlier iterations of the API job also established that the typecheck, config/money/health unit tests, server build, database migration and readiness startup pass. Latest CI results should be read from the current branch's most recent workflow run before treating this increment as accepted.

The planning contract's `X-Request-Id` parameter says invalid or absent client IDs are replaced, while its schema also constrains the input with a pattern. Application-level tests preserve the documented replacement behavior. Schemathesis negative-data-rejection is therefore excluded temporarily, with an inline explanation in CI, until Phase 0.5 reconciles this contract. This exclusion is narrow and must not be read as closing Q-020/Phase 0.5 contract hardening. Unsupported HTTP methods on the Health endpoints are explicitly covered by tests and should produce 405 with `Allow: GET, HEAD`.

## 3. Intentionally excluded from this skeleton

No player/admin authentication, MFA, CSRF-protected mutations, RBAC-protected Backoffice actions, wallet posting, payment processing, CMS media upload, provider launch/session, provider callback or real-money route is implemented by this increment. The skeleton does not change ADRs, either OpenAPI source in the shared Library, or the open-question register. No real credentials or production provider configuration were added.

## 4. Restore drill status — NOT RUN

The repository contains a backup/restore runbook, but no staging VPS, off-host object-storage credentials, encryption-key recovery procedure or base-backup/WAL set was available in this task. Consequently:

- measured RPO / RTO: **not available**;
- isolated base + WAL restore: **not run**;
- restored-state ledger/projection reconciliation: **not available** because the wallet schema is a later phase;
- off-host archive freshness monitoring: **not configured or verified**.

The source-plan objectives (RPO ≤15 minutes and RTO ≤8 hours) remain targets, not achieved evidence. No backup-readiness or real-money launch claim can be made until the actual isolated restore drill and independent archive-alert checks pass.

## 5. Remaining dependencies / next decisions

- Reconcile the `X-Request-Id` schema/replace behavior as part of Phase 0.5; the temporary negative-data-rejection exclusion should then be removed.
- Complete the required Phase 0.5 security/API contract evidence or explicitly preserve affected features as disabled. Do not mistake CI for sign-off on the whole platform.
- Tech Lead review of the Phase 2 baseline remains a formal approval gate where applicable; this implementation does not retroactively sign ADRs.
- Provision an isolated staging/off-host backup environment to perform and record the actual restore drill.
- Only after review, continue the remaining Phase 3 acceptance work and later phases in the roadmap order.

## 6. Verification record

- **Passed:** GitHub Actions run [39420950279](https://github.com/Bclick9/Bclick/actions/runs/39420950279), tested code commit `645d167ae53317cf91acf06412ea7a999dac5f6f`.
- The contract job passed OpenAPI lint, generated-client regeneration and the no-diff check. The API job passed workspace typecheck, config/money/server tests, server build, PostgreSQL migration, API health startup and Schemathesis Health checks.
- Later commits only updated progress documentation; no application code changed after the tested code commit.
- External/staging restore: **not run**.
- Production deployment / provider sandbox / money movement: **not performed**.
- This branch has not been merged into `main`.
