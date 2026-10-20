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
- Added `packages/api-client` generation from the mirrored canonical `docs/planning/openapi.yaml`; both planning OpenAPI files are linted by CI. The `X-Request-Id` contract correction was applied to both the repository mirror and the canonical OpenAPI source in the shared Library; other planning sources remain unchanged.
- Added PostgreSQL Compose configuration, an image for the API, a manual-only migration profile, Caddy example configuration, backup guidance and an isolated restore-drill runbook.
- Added an empty/no-op ordered migration solely to verify `node-pg-migrate` wiring without prematurely creating domain tables. The first business/domain schema migration remains subject to its reviewed scope and source planning gate.
- Added GitHub Actions checks for contract lint/generated-client drift, workspace TypeScript checks, unit tests, API build, ordered migration execution against PostgreSQL, API startup and Schemathesis against implemented Health operations.
- Harmonized the existing Backoffice build workflow to the workspace's pinned pnpm version.

## 2. Verification and Phase 0.5 contract correction

GitHub Actions run [39423227939](https://github.com/Bclick9/Bclick/actions/runs/39423227939) passed the OpenAPI lint/generated-client and API jobs after the request-ID correction. Run [39423555201](https://github.com/Bclick9/Bclick/actions/runs/39423555201) also passed after explicit Redocly structural, unresolved-reference, unique-operationId and unique-parameter rules were configured. The latter run's tested code/config commit is `460bd12e56682cd65fe23e2676fe2e7b2b868cae`; commits after it only change review/status notes.

The `X-Request-Id` contract is reconciled in both the repository mirror and the canonical shared Library OpenAPI source: the request parameter accepts an arbitrary string so malformed IDs can be replaced without a 4xx response, while the response header requires an 8-128 character safe identifier. Runtime validation applies the same 8-128 character and ASCII allowlist rule, and tests cover the shortest valid value plus invalid characters, too-short values and overlong values. The temporary Schemathesis negative-data-rejection exclusion was removed so this check now runs. This closes only the request-ID mismatch; it does not by itself close Q-020 or all Phase 0.5 gates. Unsupported HTTP methods on the Health endpoints are explicitly covered by tests and should produce 405 with `Allow: GET, HEAD`.

## 3. Intentionally excluded from this skeleton

No player/admin authentication, MFA, CSRF-protected mutations, RBAC-protected Backoffice actions, wallet posting, payment processing, CMS media upload, provider launch/session, provider callback or real-money route is implemented by this increment. Apart from the request-ID correction documented here and in [`2026-10-20-PHASE-0-5-security-gates.md`](./2026-10-20-PHASE-0-5-security-gates.md), the skeleton does not change ADRs or the open-question register. No real credentials or production provider configuration were added.

## 4. Restore drill status — NOT RUN

The repository contains a backup/restore runbook, but no staging VPS, off-host object-storage credentials, encryption-key recovery procedure or base-backup/WAL set was available in this task. Consequently:

- measured RPO / RTO: **not available**;
- isolated base + WAL restore: **not run**;
- restored-state ledger/projection reconciliation: **not available** because the wallet schema is a later phase;
- off-host archive freshness monitoring: **not configured or verified**.

The source-plan objectives (RPO ≤15 minutes and RTO ≤8 hours) remain targets, not achieved evidence. No backup-readiness or real-money launch claim can be made until the actual isolated restore drill and independent archive-alert checks pass.

## 5. Remaining dependencies / next decisions

- The request-ID schema/runtime/test/client reconciliation is complete for this increment and the Schemathesis negative-data-rejection exclusion is removed. Remaining Phase 0.5 gates are tracked in [`2026-10-20-PHASE-0-5-security-gates.md`](./2026-10-20-PHASE-0-5-security-gates.md).
- Complete the required Phase 0.5 security/API contract evidence or explicitly preserve affected features as disabled. Do not mistake CI for sign-off on the whole platform.
- Tech Lead review of the Phase 2 baseline remains a formal approval gate where applicable; this implementation does not retroactively sign ADRs.
- Provision an isolated staging/off-host backup environment to perform and record the actual restore drill.
- Only after review, continue the remaining Phase 3 acceptance work and later phases in the roadmap order.

## 6. Verification record

- **Passed:** [Run 39423227939](https://github.com/Bclick9/Bclick/actions/runs/39423227939) verifies the request-ID reconciliation, and [run 39423555201](https://github.com/Bclick9/Bclick/actions/runs/39423555201) verifies the same code plus explicit Redocly rules.
- Both latest jobs passed OpenAPI lint, generated-client regeneration/no-diff, workspace typecheck, config/money/server tests, API build, PostgreSQL migration, API startup and Schemathesis Health checks with all checks enabled.
- Subsequent commits only updated progress/review notes; application code and CI configuration are unchanged from tested commit `460bd12e56682cd65fe23e2676fe2e7b2b868cae`.
- External/staging restore: **not run**.
- Production deployment / provider sandbox / money movement: **not performed**.
- This branch has not been merged into `main`.
