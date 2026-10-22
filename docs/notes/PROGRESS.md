# Bclick — Cumulative Progress and Roadmap Gate Checkpoint

**Updated:** 2026-10-22, after PR #92 merged to `main`  
**Purpose:** Current implementation status and explicit stop conditions. This file reconciles current code with the planning roadmap; it does not replace the shared Library's `docs/planning/12-open-questions.md`.

## Current verified position

- **Current `main`:** `7747d212a33f7765f429ef916dd623237265710d`, containing PR #92. PR #92 merged the BigBang Standard Sandbox catalogue adapter, Migration 007/catalogue persistence, database-backed browse routes, and Sandbox demo-launch path. The earlier catalogue-only PR #89 was superseded; PR #90 was not merged.
- **Owner-reported local acceptance:** the Standard Sandbox sync returned 3,639 records, and a repeat sync updated those rows without creating new rows. The Project Owner has also confirmed that the local BigBang Sandbox demo now launches successfully. These are local operator observations; CI mocks provider calls and does not prove that every physical browser/device or vendor-account entitlement works.
- **Player identity:** registration/login/session/logout and related server-side identity routes are present on `main`, with runtime tests in `server/test/identity.test.ts`. Mobile login over plain HTTP/LAN is deliberately deferred to the planned HTTPS VPS work; do not weaken Secure/host-only cookies to make HTTP LAN login appear to work.
- **Wallet foundation:** Migration 006, wallet balance/statement read endpoints and player wallet UI are merged (PRs #86 and #87). They are read-only. There is no accepted money-movement/posting service, deposit/withdrawal execution, wager settlement, or provider wallet callback.
- **Production boundary:** development/Sandbox approval for catalogue and demo work does not close Q-011 and does not authorize a production deployment, provider wallet callbacks, wallet posting, payments, wagers or real-money launch.

## Phase/acceptance ledger

| Roadmap area | Actual state | What must happen before it can be called complete / before dependent work |
|---|---|---|
| Phase 0.5 — contract hardening | **Open / partial.** OpenAPI lint, generated-client drift, static contract guards and Health-route Schemathesis checks exist in CI. Identity runtime tests now exist, but Q-020 is a platform-level obligation and is not closed by static fixtures alone. | Keep route inventory aligned to OpenAPI; cover implemented routes' validation/status/error/request-ID/authorization behavior; close applicable feature-specific P0 contract gates. |
| Phase 1 — provider due diligence | **Partial / provider evidence open.** The BigBang adapter and demo path are in the codebase, but the exact approved version/hash of the normative BigBang and WinHouse agent specs is not recorded as closed evidence. | Close Q-006 with exact reviewed specs/hashes and matching authentication, paging, error/signature and launch fixtures; confirm account entitlements where needed. |
| Phase 3 — environments and restore | **Blocked. Q-011 Open; restore drill not evidenced.** A runbook or disposable CI migration test is not a staging restore drill. | Restore a real base backup plus WAL in an isolated staging target; validate recovered state; test independent off-host archive-freshness/failure alerts; record measured RPO/RTO. |
| Phase 4 — identity/auth | **Core implementation and runtime tests present; formal acceptance remains partial.** Local identity is covered by the explicitly limited local-development exception while Q-011 stays open. | Reconcile all Q-001/Q-002/Q-003 acceptance items and recovery/bootstrap procedures with the tests and OpenAPI. Do not enable privileged production operations based on local tests alone. |
| Phase 5 — wallet/ledger | **Foundation only; exit blocked.** Read APIs and schema foundation exist; no accepted application posting service or movement API is enabled. Q-010 has partial DB/concurrency evidence, not the full idempotency/replay/conflicting-payload contract. | Complete Q-010's normative idempotency scope and application/DB posting tests, including same-key replay, conflicting payloads, concurrency/no-overdraft and balanced journals. Phase 5 does not exit while Q-010/Q-011 are open. |
| Phase 6 — BigBang catalogue/Sandbox | **Merged; acceptance partial.** Standard-only sync and DB-backed browse/search/filter are implemented. Owner-reported sync count is 3,639. The code rejects incomplete/mismatched snapshots before publication and retains the last published catalogue on a failed sync. | Q-005 slug/UUID/legacy-link/category semantics and Q-006 provider evidence remain open. Resolve the reported 3,802-vs-3,639 Standard-count difference with same-scope/same-key evidence or written vendor explanation. Do not import Premium from the current Sandbox key or deduplicate by title alone. |
| Phase 7 — BigBang demo | **Merged; owner-confirmed local Sandbox launch works.** The launch path uses `demo: true`, an `ek_test_` key, and a provider URL allowlist. Real mode remains disabled. | Complete the catalogue/identity contract and Q-013 CSP/frame/host-header review before considering deployment acceptance. No real wallet account ID or real-money launch. |
| Phase 8 — BigBang seamless wallet/reconciliation | **Not started; blocked.** | Do not begin provider callbacks or money posting until Phase 5 exit, Q-006 provider contract evidence, Q-010, Q-011, applicable TND precision/signature/idempotency gates and explicit owner authorization are satisfied. |

## Open gates that control the next work

- **Q-005 — P0, Open:** canonical game slug/UUID/deep-link and legacy mapping, uniqueness policy, provider DTO and full `categories[]` semantics need explicit tests and an accepted decision. Current sync maps each Standard game to one coarse Bclick category based on `gameType`; it does not establish a full, vendor-derived category taxonomy. Current legacy routes try a title/provider lookup and fail safely if the item cannot be uniquely resolved. Treat this behavior as provisional.
- **Q-006 — P0, Open:** exact versioned/hash-pinned `BIGBANG_AGENT.md` and `WINHOUSE_AGENT.md`, plus their applicable verified fixtures. An adapter being present is not a substitute for provider evidence.
- **Q-010 — P0, Open:** ledger lock/concurrency and normative idempotency scope, including same/different-payload replay and posting-service tests.
- **Q-011 — P0, Open:** isolated base+WAL restore, integrity checks, independent alert evidence and measured RPO/RTO. No restore result is assumed.
- **Q-013 — P0, Open:** CSP/frame/host-header policy and staging evidence for player/admin/provider iframe flows.
- **Q-020 — P0, Open:** runtime contract evidence for each implemented route, alongside static OpenAPI checks. A CI fixture for an unimplemented or unexercised operation does not close this gate.
- **Q-009 — P0 for TND routing:** internal TND precision configuration is not proof that a provider supports millimes. No TND real-money route without written provider precision evidence and golden fixtures.

## Immediate next task

1. Add route-level regression coverage for the catalogue's slug lookup, UUID lookup, invalid/missing deep links, parameterized category/search filters, pagination and preservation of the stored `categories[]`.
2. Use that evidence to finish Q-005's explicit decision. Keep the gate open until the *source-to-canonical* category mapping, legacy URL policy and slug uniqueness/migration expectations are resolved; route DTO tests alone are insufficient to close it.
3. Close Q-006 by recording the exact normative provider specs and fixtures. Do not guess provider behavior.
4. Plan Q-010 work and Q-011 restore execution without enabling posting/provider callbacks. Q-011 needs an actual isolated staging/off-host backup target and owner-operated restore evidence; a code-only PR cannot fabricate it.
5. Only after Phase 5 exit and the applicable catalogue/provider/security gates pass, proceed to Phase 8.

## Completed engineering work (historical)

- IR-001/IR-002/IR-003: reviewed the planning bundle and OpenAPI contracts, audited repository/workspace/CI, and recorded the architecture/data-model baseline.
- BE-001: added the separate Fastify `server/` workspace, validated configuration, health/readiness, request IDs/redacted logs, shared money/config packages, PostgreSQL Compose/migrations, generated API client and CI.
- OpenAPI/contract guard: static checks detect duplicate YAML keys, unresolved refs, duplicate operation IDs/parameters and validate representative error/callback fixtures. These checks are necessary but do not replace runtime route coverage.
- Phase 4: identity/session/MFA/CSRF routes and runtime tests were subsequently implemented. The older 2026-10-20 plan and gate note intentionally preserve the earlier historical state; this current progress file supersedes their old statements about handlers not existing.
- Phase 6/7: PR #92 merged the Sandbox Standard catalogue and demo launch path. The Project Owner reports successful local synchronization and demo launch; catalogue and production gates listed above remain open.
