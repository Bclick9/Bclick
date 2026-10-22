# Bclick — Cumulative Progress

Updated: 2026-10-20

## Current state — reconciled 2026-10-22

The prior status text was stale. This section reflects the repository state checked on 2026-10-22 and the wallet increments merged to main.

- **Current delivery:** the Fastify server and player identity/session implementation are present. Migration 006 (wallet/ledger foundation) is merged, and the player wallet balance/statement read API plus frontend wallet view are present.
- **Merged wallet increments:** [PR #86](https://github.com/Bclick9/Bclick/pull/86) added the wallet/ledger foundation and read API; [PR #87](https://github.com/Bclick9/Bclick/pull/87) added the player wallet UI and local/CI integration fixes. The UI acceptance reported by the Project Owner covered a zero TND balance, an empty statement without fabricated entries, unauthenticated redirect to login, error/retry behavior, and deposit/withdraw previews remaining non-transactional.
- **Important boundary:** the wallet endpoints are read-only. No player money-movement/posting API, deposit or withdrawal execution, wager settlement, provider wallet callback, BigBang catalogue adapter, catalogue sync job, or provider launch route is authorized by these merges.
- **Phase 5 status:** implementation foundation merged; **formal Phase 5 exit remains blocked**. Q-010 has partial DB-invariant/concurrent-debit test evidence, but the application idempotency scope/replay/conflicting-payload contract and posting-service tests are not complete. Q-011 restore drill is still NOT RUN.
- **Contract and security status:** Q-020 remains open at platform level. Static OpenAPI validation/client-generation checks and Health-route runtime checks do not replace runtime contract/security tests for every implemented route. The accepted Q-001–Q-003 decisions do not by themselves prove all admin/MFA/CSRF runtime acceptance criteria.
- **Next product phase:** prepare for Phase 6 — BigBang catalogue adapter — only at planning/fixture level until the outstanding security authorization is resolved. Q-005 (game slug/UUID/provider/category semantics) and Q-006 (versioned BigBang/WinHouse agent-spec evidence) are still P0 gates. The recorded Q-011 exception is local Phase 4 only and does not authorize provider integration; no external provider calls or credentials are to be used under this note.
- **Production/real-money state:** not approved. Do not activate wallet posting, payments, provider callbacks, launch flows, or real-money routes.

## CSRF amendment verification — 2026-10-20

- `08-frontend-integration.md` parameterizes `readCsrfToken` with the three literal session types and shows a context-specific usage example; future middleware must be initialized with the matching security context.
- Production topology is expressly unresolved: same-host means the three names are required in production; separate subdomains make the names defense-in-depth but still useful. Until an owner decision before deployment, design for the conservative same-host case.
- The CI guard verifies the three `x-csrf-policy` names, no legacy `__Host-bclick_csrf`, issue/rotation/deletion on every cookie, `Secure`, `Path=/`, no `Domain`, SameSite and JavaScript-readable/non-HttpOnly attributes, header mappings, conditional enrollment, TOTP transition and a collision negative canary.
- The generated client is tool-owned. CI executes `pnpm api:client:generate` and then `git diff --exit-code -- packages/api-client/src/generated/openapi.d.ts`; API run 39450975081 passed this check. No manual generated-type patch is retained by the checked generated-client drift gate.
- Main evidence: [generator-alignment commit `c36cbb7`](https://github.com/Bclick9/Bclick/commit/c36cbb7941806e796137c472c5faef037a61c4f5), [CSRF verification commit `308fca4`](https://github.com/Bclick9/Bclick/commit/308fca40168e855628863731c645e913ebda1dd7), and [topology clarification commit `adc64ea`](https://github.com/Bclick9/Bclick/commit/adc64ea018dfde27fb14424eb3738214e07b2d47).


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

1. The 15-file planning bundle remains available in the shared Library; only the OpenAPI contracts are mirrored in the repository. This progress note and the Phase 6 readiness note summarize the relevant decisions without silently replacing the source register.
2. Migration 006 is present on main. CI's PostgreSQL rehearsal verifies migration history reaches eight entries, creates zero-balance player accounts, and exercises read-only balance/statement responses.
3. **Q-010 — partially evidenced, OPEN.** server/test/wallet.test.ts exercises double-entry journal constraints, append-only enforcement, currency/account matching, rejection of overdrafts, projection-vs-ledger totals, and two concurrent debits where only one may succeed. These are DB-level rehearsal cases, not proof of an application posting service's idempotency contract. A normative idempotency scope, same-key/same-payload replay, same-key/different-payload conflict, and transaction-level posting-service tests remain required.
4. **Q-011 — NOT RUN, OPEN, P0.** infra/restore-drill/last-drill.md still records no provisioned staging/off-host target, no base+WAL restore, no independent archive freshness/failure alerts, and no measured RPO/RTO. A runbook or passing disposable CI cannot close this gate.
5. **Q-020 — OPEN.** The static validator, schema/client generation, client drift guard, and Health-route runtime checks are useful partial evidence; add and maintain runtime contract tests for each implemented route and future callback handler. Do not infer full contract coverage from static validation.
6. **Q-005 and Q-006 — OPEN, P0.** Resolve the game slug-to-UUID/deep-link policy and provider/category semantics, then record exact versioned BigBang/WinHouse agent specifications and matching fixtures/hashes before adapter work. The existence of an uploaded file alone is not closure evidence until its version and normative details are reviewed and recorded.
7. **Q-009 — OPEN, P0 for TND provider routing.** TND=3 decimal places is the internal currency registry configuration, not proof that any provider supports millimes. No rounding, truncation, or TND real-money routing without per-provider written scale and golden vectors.
8. **Q-011 and feature-specific gates remain controlling.** The recorded controlled exception is for local Phase 4 identity work only; it does not authorize provider integration/callbacks or deployment. Q-013 CSP/frame/host policy and applicable compliance/KYC/RG gates must be satisfied before the relevant launch/payment capability is enabled.
9. No assertion of a staging deployment, restore readiness, production provider credentials, real-money funds, or money-movement activation is made by this reconciliation.

## Next

1. Keep Phase 5 exit blocked until Q-010's application idempotency/posting contract and tests are complete and Q-011's isolated base+WAL restore, integrity checks, independent alerts, and measured RPO/RTO are evidenced.
2. Resolve Q-005 with explicit game route/slug/UUID/alias and provider/category semantics, with test fixtures; resolve Q-006 by recording the exact approved BigBang and WinHouse agent-spec versions/hashes and matching authentication, paging, error, and signature fixtures.
3. Do not call an external provider or implement/enable provider integration under the local-only Q-011 exception. Once the restore gate and any required owner authorization are formally satisfied, start Phase 6 catalogue synchronization with server-only credentials, bounded paging/retries, validation, last-good preservation after incomplete sync, and DB-backed browse/search/filter that makes no provider call per player request.
4. Phase 7 demo launch follows successful catalogue acceptance and its own frame/CSP/host allowlist checks. Demo must use a virtual balance and must never attach a real wallet account ID.
5. Keep all real-money wallet postings, deposits/withdrawals, wagers, and provider callbacks disabled until the relevant Q-009/Q-010/Q-011/vendor/security/compliance gates pass.

