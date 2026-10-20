# Bclick — Cumulative Progress

Updated: 2026-10-20

## Current state

- **Current task:** IR-002 — Repository audit and due diligence.
- **Roadmap position:** Phase 1 audit completed for current repository structure/UI entry points/workspace scripts/CI definitions; Phase 0.5 contract hardening still has open P0 gates.
- **Branch:** `feature/IR-002-repository-audit` (branched from `feature/IR-001-initial-review` to retain the review trail).
- **Initial planning review:** [`00-initial-review.md`](./00-initial-review.md).
- **Current audit note:** [`2026-10-20-IR-002-repository-audit.md`](./2026-10-20-IR-002-repository-audit.md).
- **Implementation status:** Documentation-only audit. No app code, database migrations, provider adapters, OpenAPI files, ADRs, or open-question gates changed.
- **Application tests/builds:** Not run in this task; repository source and existing workflow definitions were inspected through GitHub.

## Findings requiring owner decision or external evidence

1. All 15 planning files are present in the shared ChatGPT Library under `/docs/planning/` and remain the planning review source. GitHub `main` does not contain a mirrored `docs/planning/` copy; that remains a separate repository traceability gap.
2. `frontend/` is the player-facing Vite/React storefront. `backend/` is the Backoffice/CMS Vite/React UI prototype and is **not** the production API server. Its README confirms there is no connected production database, authentication, wallet API, provider callbacks, or financial processing.
3. The repository currently has no `server/`, `packages/`, or `infra/` workspace and no root `tsconfig.json`; current package scripts and GitHub workflows build the two UIs but do not run tests, lint/typecheck, OpenAPI validation, generated-client compilation, or Schemathesis.
4. Existing UI payment demo types use JavaScript `number` amounts. This is demo-only; do not reuse them for money-moving code. The approved `packages/money` and exact minor-unit rules remain required.
5. Existing storefront sports UI loads a WinHouse iframe script in the browser. This is prototype behavior, not evidence of a secure server-issued provider session.
6. The two UI build workflows configure different pnpm versions (9 versus 10.4.1); unify/reconcile this as part of CI hardening. No current build failure is inferred from this alone.
7. BigBang and WinHouse exact official `agent.md` sources could not be retrieved by the available browser fetcher and remain required before their respective adapters. Q-007 (Aggregator payload integrity), Q-008 (stable/replay-safe `call_id`) and Q-009 (TND 3dp evidence) remain blocking for Aggregator real-money routing. Q-015 and other provider/payment/compliance gates also remain open.

## Completed

- **IR-001:** Reviewed the 13 supplied Markdown planning packages and both OpenAPI 3.1 planning contracts; recorded the initial review in `00-initial-review.md`.
- **IR-002:** Inspected the recursive `main` repository tree, root/workspace package manifests, both existing build workflows, storefront entry/catalog/Sports files, Backoffice App and payment demo type/readme.
- Created this IR-002 repository audit note, describing current boundaries, Phase 1 checklist, blockers, verification status and the Phase 3 prerequisite sequence.

## Next

- Phase 2 — Architecture and data-model approval remains the required gate before starting Phase 3 code.
- First code-building stage per `07-implementation-roadmap.md` is Phase 3: distinct `server/` workspace, Fastify health/readiness and validated config, PostgreSQL Compose and ordered migrations, structured logs/request IDs, required CI checks, planned packages/infra foundations, and an isolated staging restore drill.
- Do not rename `backend/`; do not create schema/API/money/infra implementation before the Phase 2 gate is approved. Do not change OpenAPI, ADRs or `12-open-questions.md` without explicit authorization. Keep all relevant real-money routes disabled until their own gates pass.
