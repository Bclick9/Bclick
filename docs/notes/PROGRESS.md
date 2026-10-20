# Bclick — Cumulative Progress

Updated: 2026-10-20

## Current state

- **Current task:** BE-001 — Phase 3 API skeleton / environments / CI foundation.
- **Roadmap position:** Phase 1 repository audit recorded; Phase 2 architecture/data-model review recorded with owner sign-off still pending; Phase 3 skeleton slice implemented. Phase 0.5 P0 contracts and staging restore acceptance remain open.
- **Current branch:** `feature/BE-001-api-skeleton`.
- **Phase 1 audit:** [`2026-10-20-IR-002-repository-audit.md`](./2026-10-20-IR-002-repository-audit.md).
- **Phase 2 review:** [`2026-10-20-IR-003-phase-2-architecture-review.md`](./2026-10-20-IR-003-phase-2-architecture-review.md).
- **Phase 3 implementation note:** [`2026-10-20-BE-001-api-skeleton.md`](./2026-10-20-BE-001-api-skeleton.md).
- **Q-001–Q-003 owner decision memo:** [`2026-10-20-Q001-Q003-auth-csrf-owner-decisions.md`](./2026-10-20-Q001-Q003-auth-csrf-owner-decisions.md); [decision issue #55](https://github.com/Bclick9/Bclick/issues/55). Authentication/MFA/CSRF implementation remains blocked pending named owner approval.
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
6. Phase 2 review recommended the architecture; it has not been falsely marked as a Tech Lead signature. This implementation branch remains unmerged.

## Next

- Review the Phase 3 draft PR against the Phase 2 review branch; do not merge to `main` without owner review.
- Add runtime 400/401/403/422 contract cases as the corresponding handlers are implemented; continue closing remaining Phase 0.5 P0 gates with required evidence and owner approvals.
- Provision isolated staging and off-host encrypted backup/WAL storage, then execute the real restore drill and record measured RPO/RTO and alerts before claiming recovery readiness.
- Continue in roadmap order; do not add auth, wallet, payment or provider behavior until its contract/security prerequisites are satisfied.
