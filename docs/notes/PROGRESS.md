# Bclick — Cumulative Progress

Updated: 2026-10-20

## Current state

- **Current task:** Phase 4 pre-code gate — CSRF cookie separation and contract verification. The Project Owner approved the Phase 4 plan and accepted Q-003 with amendment on 2026-10-20. No Phase 4 application/middleware/auth-route code has started.
- **Roadmap position:** All five shared planning files and the GitHub OpenAPI mirror specify distinct player/admin/enrollment CSRF cookies and lifecycle rules. OpenAPI lint, generated-client drift, the CSRF lifecycle/collision guard, API types/tests/migration/Health contract and application builds passed in [run 39450975081](https://github.com/Bclick9/Bclick/actions/runs/39450975081) and [run 39450975053](https://github.com/Bclick9/Bclick/actions/runs/39450975053). Runtime cross-context/rotation/logout tests remain pending until handlers exist. The Phase 3 API skeleton is merged via PR #54; Q-011 restore drill remains NOT RUN and P0/Open; Q-020 remains open.
- **Current branch:** `main` (PRs [#53](https://github.com/Bclick9/Bclick/pull/53) and [#54](https://github.com/Bclick9/Bclick/pull/54) merged; documentation-only Phase 4 plan committed for owner review).
- **Phase 1 audit:** [`2026-10-20-IR-002-repository-audit.md`](./2026-10-20-IR-002-repository-audit.md).
- **Phase 2 review:** [`2026-10-20-IR-003-phase-2-architecture-review.md`](./2026-10-20-IR-003-phase-2-architecture-review.md).
- **Phase 3 implementation note:** [`2026-10-20-BE-001-api-skeleton.md`](./2026-10-20-BE-001-api-skeleton.md).
- **Q-001–Q-003 owner decision memo:** [`2026-10-20-Q001-Q003-auth-csrf-owner-decisions.md`](./2026-10-20-Q001-Q003-auth-csrf-owner-decisions.md); [Issue #55](https://github.com/Bclick9/Bclick/issues/55). CSRF cookie separation amendment: [`2026-10-20-phase4-csrf-update.md`](./2026-10-20-phase4-csrf-update.md). CSRF/auth implementation remains blocked until static contract/generated-client checks pass and runtime acceptance tests are added with actual handlers.
- **Owner operating constraints clarified:** [`2026-10-20-local-development-boundaries.md`](./2026-10-20-local-development-boundaries.md) records one initial project-manager/admin account, `localhost` development until a later gated VPS deployment, and the distinction between the intended `admin` username and the prohibited fixed/default `admin/admin` credential. This context note does not approve or close Q-001–Q-003.
- **Verification runs:** [39423227939](https://github.com/Bclick9/Bclick/actions/runs/39423227939), [39423555201](https://github.com/Bclick9/Bclick/actions/runs/39423555201), and [39425591791](https://github.com/Bclick9/Bclick/actions/runs/39425591791) and [39426289876](https://github.com/Bclick9/Bclick/actions/runs/39426289876) passed the request-ID reconciliation, explicit Redocly rules, static Q-020 guard, and negative canaries respectively. Earlier run 39420950279 covered the original API skeleton implementation.
- **Implementation status:** No authentication/session lifecycle, wallet ledger, payments, CMS media upload or provider adapter/callback/launch routes were added. No deployment or real-money operation performed.

## Completed

- **IR-001:** Reviewed the supplied planning bundle and both OpenAPI 3.1 contracts; created the initial review note.
- **IR-002:** Audited the repository tree, workspace manifests, current UI boundaries and existing CI definitions.
- **IR-003:** Recorded a recommended Phase 2 technical architecture/data-model baseline and the owner decisions/evidence that remain open.
- **BE-001:** Added the separate Fastify `server/` workspace and health/readiness, validated config, PostgreSQL pool probe, redacted request logging, request IDs, exact `packages/money` primitives, shared config package, generated OpenAPI client, PostgreSQL Compose, migration wiring, CI, Caddy example and backup/restore runbooks.
- **Phase 0.5 / Q-020 follow-up:** Added `scripts/verify_openapi_contracts.py` and pinned Python dependencies to detect duplicate YAML keys, unresolved refs, duplicate operation IDs/parameters, and validate representative error and Aggregator callback fixtures. GitHub Actions runs [39425591791](https://github.com/Bclick9/Bclick/actions/runs/39425591791) and [39426289876](https://github.com/Bclick9/Bclick/actions/runs/39426289876) passed both jobs, including negative canaries that prove the duplicate/ref/operationId/parameter guards fail on malformed input. This remains static validation, not runtime coverage for unimplemented handlers.
- **BE-001 verification:** Both CI jobs passed on run 39423227939: OpenAPI lint/generated-client drift, workspace typecheck, config/money/server unit tests, API build, PostgreSQL migration, health startup, and Schemathesis Health checks with negative-data rejection enabled. The current head makes structural/reference/operationId/parameter rules explicit; run 39423555201 passed those checks.
- Aligned Backoffice workflow to pnpm 10.4.1; generated `pnpm-lock.yaml` and the committed API-client declarations with a temporary branch-only workflow, then removed that temporary workflow after use.
- Recorded [Phase 0.5 security/API gate status](./2026-10-20-PHASE-0-5-security-gates.md), separating verified contract work from owner/vendor/evidence gates that remain open.

## Findings and gates

1. The supplied 15 planning files remain the source of truth in the shared Library; the two OpenAPI files are mirrored under GitHub `docs/planning/` for contract linting and generation. The remaining planning Markdown is not copied into GitHub `main`.
2. The current `server/migrations/1792497600000_api_skeleton_baseline.sql` is intentionally a no-op migration to verify ordered migration tooling only. No production/domain tables have been created.
3. The `X-Request-Id` mismatch has been reconciled on the BE-001 branch: the request header schema accepts any string (so invalid values can be replaced), the response header schema constrains server IDs to 8-128 safe ASCII characters, and runtime validation/tests enforce the same rule. The temporary Schemathesis negative-data-rejection exclusion was removed. This addresses only this contract inconsistency; Q-020 and the other Phase 0.5/security gates remain open until their full required checks and approvals are evidenced.
4. **Restore drill NOT RUN.** No staging VPS/off-host backup storage, encryption-key recovery, base backup/WAL set or independent archive monitoring was provisioned. Measured RPO/RTO are unavailable; repository runbook is guidance, not evidence.
5. BigBang/WinHouse agent-spec evidence, Aggregator Q-007/Q-008 and per-provider TND Q-009 remain open; those routes are still absent from the skeleton. Q-001..Q-005, Q-010, Q-013, Q-020 and the other listed payment/compliance gates remain open or feature-specifically disabled.
6. The Tech Lead has accepted the architecture/data-model baseline for planning in `2026-10-20-IR-003-phase-2-architecture-review.md`. Phase 2 remains partially open because named owners/confirmed dates are missing. PR #54 is merged into `main`; the source note has been reconciled to reflect that fact.

## Next

1. The Phase 4 plan is approved and static OpenAPI/generated-client/guard CI is green. Review and approve [the CSRF amendment note](./2026-10-20-phase4-csrf-update.md). Do not add CSRF middleware or auth/session/MFA handlers until that note is approved; include the required runtime acceptance tests in the implementation work before the relevant PR can merge.
2. Continue runtime contract coverage for each actually implemented route as it lands; retain the existing OpenAPI lint, generated-client drift, static guard and Health-route Schemathesis checks. Q-020 remains open until applicable handlers and approved provider callbacks have runtime coverage.
3. Provision isolated staging plus encrypted off-host base backup/WAL storage and independent archive monitoring when available; then run the real restore drill and record measured RPO/RTO. `infra/restore-drill/last-drill.md` must remain `NOT RUN` until actual evidence exists.
4. The Q-011 controlled exception allows local Phase 4 development only; it does not authorize deployment or provider integration/callback. Keep wallet, payments, CMS media upload/publish, provider callbacks and real-money routes disabled until their feature-specific security, contract, restore, vendor and compliance gates pass.
