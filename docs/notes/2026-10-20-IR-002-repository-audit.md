# IR-002 — Repository Audit and Due Diligence

**Date:** 2026-10-20  
**Roadmap phase:** Phase 1 — Repository audit and due diligence  
**Related prerequisite:** Phase 0.5 — Contract hardening (still has open P0 gates)  
**Branch:** `feature/IR-002-repository-audit`  
**Scope:** Read-only audit; no application code, architecture documents, OpenAPI contracts, schemas, or provider behavior changed.

## 1. Executive result

The repository currently contains two React + TypeScript + Vite user interfaces. `frontend/` is the player-facing storefront. Despite its name, `backend/` is the Backoffice/CMS UI prototype, not an API server. The Backoffice README explicitly says there is no production database, authentication, wallet API, provider callbacks, or financial processing connected.

The first actual server-building stage remains **Phase 3 — Backend skeleton / environments / CI and first restore drill** in `docs/planning/07-implementation-roadmap.md`. Phase 3 depends on the repository due diligence in Phase 1 and architecture/data-model approval in Phase 2. This audit must not be treated as Phase 2 approval or permission to bypass its gate.

## 2. Source inventory and observations

### Repository structure

- The inspected `main` tree contains 102 entries. Its workspace folders are `frontend/` and `backend/`; the repository tree does not currently contain `server/`, `packages/`, or `infra/`.
- The root tree does not contain a root `README.md`, root `tsconfig.json`, or `docs/planning/` mirror. The shared Library planning bundle remains the review source; the absence of a GitHub mirror is a separate traceability issue.
- The repository does not contain the `docs/notes/` files on `main`; this task's note and cumulative progress live on the task branch.

### Workspace and scripts

- Root `package.json` provides development/build/preview commands for the storefront and admin UI, but no root test, lint, typecheck, OpenAPI lint, generated-client, or Schemathesis commands.
- `pnpm-workspace.yaml` includes only `frontend` and `backend`.
- `frontend/package.json` and `backend/package.json` both describe Vite-based React UI workspaces. The inspected tree has no root or workspace TypeScript configuration files.
- The two existing build workflows install with different pnpm versions: `.github/workflows/backend-build.yml` sets pnpm 9, while `.github/workflows/frontend-build.yml` sets pnpm 10.4.1. This is a CI reproducibility risk to resolve in Phase 0.5; no claim is made that it currently causes a build failure.
- The workflows build the storefront and Backoffice UI. They do not run tests, lint/typecheck, validate either planning OpenAPI contract, compile a generated API client, or run Schemathesis.

### Storefront

- `frontend/App.tsx` is a React Router route shell, with pages/components for casino, sports, account, wallet and other player-facing views.
- `frontend/data/catalog.ts` documents its catalogue values as static demonstration data; the storefront does not yet have a production API connection.
- `frontend/pages/Sports.tsx` loads the WinHouse embed script from the browser with a configured embed key. This is existing prototype behavior, not an authenticated server-side provider session. No provider callback or wallet work was performed.
- `frontend/scripts/sync-assets.mjs` includes external asset downloads and is run by the storefront's dev/build scripts unless `SKIP_ASSET_SYNC=1`. The existing frontend workflow sets this flag. Treat the asset script as a build side effect to account for in reproducible/isolated CI, not as a backend capability.

### Backoffice UI and payment demo types

- `backend/README.md` explicitly identifies this directory as the administration UI only and confirms its forms/data are local demo state until a real backend is integrated.
- `backend/App.tsx` imports sample player/bonus data and maintains page mutations in local React state. Its UI cannot be treated as server-side persistence, authorization, or an audit trail.
- `backend/lib/paymentRequests.ts` declares demo payment amounts as JavaScript `number` values. This is acceptable only as existing display/demo data; it must not be reused for real-money calculations. The planning rules require the approved `packages/money` design, exact decimal strings and minor units, with no JS-number money arithmetic.
- The directory name `backend/` must remain unchanged for compatibility; the roadmap says to add a separate `server/` workspace for the actual API.

## 3. Phase 1 checklist

| Item | Status | Evidence / constraint |
|---|---|---|
| Identify current storefront and admin route/UI entry points | Reviewed | `frontend/App.tsx`, `frontend/pages/Sports.tsx`, `frontend/data/catalog.ts`, `backend/App.tsx` inspected. |
| Confirm what `backend/` means today | Confirmed | `backend/README.md` says UI-only prototype, not production API. |
| Review workspace, scripts and existing CI coverage | Reviewed | Root/workspace package files and both GitHub build workflows inspected. |
| Obtain exact BigBang and WinHouse agent documents | Blocked | Earlier initial review could not retrieve the exact official `agent.md` files using the available browser fetcher. They remain required inputs; HTML must not be substituted. |
| Complete provider/pricing/currency questionnaire | Open | Record provider/account-specific written answers and evidence before adapter implementation. Q-006 and Q-009 remain open; currency/provider gates apply per route. |
| Record jurisdiction/compliance decision | Open | Q-015 remains a launch blocker until approved evidence exists. |
| Close Phase 0.5 API/security/CI P0 contracts | Open | At minimum, Q-001..Q-005, Q-010, Q-013 and Q-020 require their specified contract/test evidence or explicitly feature-specific hard-disabled status. Other provider/payment gates remain open. |

## 4. First coding phase: prerequisites and boundaries

The roadmap's first code-building phase is **Phase 3**, not a rename of `backend/`. Its listed initial deliverables are:

1. Add a distinct `server/` API workspace with Fastify health/readiness routes and validated environment configuration.
2. Add a PostgreSQL Compose service and ordered SQL migrations under `server/migrations/` using `node-pg-migrate`.
3. Add structured logging/request IDs and required CI checks for lint, typecheck, tests and OpenAPI validation.
4. Introduce the planned `packages/api-client`, `packages/money`, `packages/config` and `infra/` foundations.
5. Run and document an isolated staging restore drill using base backup + WAL, including measured RPO/RTO and consistency checks.

**Phase 3 is not started by this audit.** Phase 2 must approve the architecture and data-model decisions first. No `server/`, database migration, new API route, dependency, money library or infra configuration was created here.

## 5. Verification status

- Validation performed: source-level inspection of the GitHub repository tree and the file contents listed above.
- Build/test status: **not run**. This task used the GitHub source inspection interface and made documentation-only changes; it did not execute the repository locally. Existing CI definitions were inspected, not asserted to have passed.
- Application changes: none.
- OpenAPI/ADR/open-questions changes: none.
- Provider integrations, payment flows and real-money behavior: none.

## 6. Next step

Proceed to Phase 2 as a decision gate: review and approve the existing architecture/data-model requirements in the shared planning bundle, reconcile any needed decisions with the existing ADR/OpenAPI/open-question sources, and record explicit approvals before beginning Phase 3 code. Do not resolve open questions by inference; do not enable real-money routes while their listed gates remain open.
