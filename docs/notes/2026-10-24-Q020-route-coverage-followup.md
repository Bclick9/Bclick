# Q-020 route-coverage follow-up — 2026-10-24

**Status: Q-020 remains OPEN. PR #140 is not merged.** The provider-cursor contract mismatch and a Schemathesis-discovered control-character input failure have been corrected on this branch. Commit [`06b9045`](https://github.com/Bclick9/Bclick/commit/06b90459f1e0ee7e5c6e639903075fe0502495b2) passed API tests, OpenAPI/client checks, bounded Schemathesis, application build, Compose/Identity smoke, PowerShell parsing, and the disposable Migration 006 rehearsal. This record is a checkpoint, not a closure declaration.

## Audited state and scope

- Repository: `Bclick9/Bclick`.
- Contract reconciliation commits: [`580dbf8`](https://github.com/Bclick9/Bclick/commit/580dbf8e04dee2328f34798c5d46f0571a65c207) remove the stale operation and update the CMS description; [`89f671c`](https://github.com/Bclick9/Bclick/commit/89f671c216d4816edab28c62e0b84224ad722014) removes the same operation from generated declarations. the required OpenAPI/generated-client CI passed on commit `06b9045`; see the current-head evidence below. The earlier green `2da30eb` checkpoint predates this contract removal.
- Tracking: [Issue #56 — Q-020 route/OpenAPI reconciliation](https://github.com/Bclick9/Bclick/issues/56), remains open. [PR #140](https://github.com/Bclick9/Bclick/pull/140), remains in review.
- Baseline after contract reconciliation: **197** OpenAPI operation entries; 49 explicit method/path declarations in the audited route-registration modules, all matching an OpenAPI operation; **148** remaining OpenAPI operations without an explicit matching declaration in those modules.
- The 148 remaining contract-only operations are classified for planning: 91 planned/unimplemented roadmap scope; 56 gate-blocked or dependent on later domain/vendor/owner decisions; and 1 operation explicitly expected to remain absent in the current increment (`GET /api/v1/wallets`, whose existing integration test expects 404). The formerly flagged `PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder` was verified unused/unimplemented and removed from OpenAPI and the generated client; no duplicate handler was added. These classifications do not grant permission to implement future or blocked routes.

## Work completed in this increment

1. Added `docs/notes/2026-10-23-Q020-operation-dispositions-and-route-matrix.md` and extended it with:
   - provisional disposition rows for the 148 remaining contract-only operations;
   - the 49-operation source / OpenAPI / conditional registration / test-association matrix;
   - source-level schema and security guard-marker inventories;
   - an assertion-level crosswalk that records exact observed test behavior and remaining gaps per implemented route.
2. Corrected two validation response entries in `docs/planning/openapi.yaml` whose YAML indentation put the response in the wrong structure, then synchronized `packages/api-client/src/generated/openapi.d.ts`, including the documented bounded-router 414 response.
3. Repaired the Schemathesis invocation to use the installed CLI's global `--config-file` option and explicit path selection for eight supported operations. The runtime target remains limited to routes implemented and intentionally configured in the test environment; no contract-only route is probed as if it existed.
4. Added `server/test/identity-password-reset-contract.test.ts` and `server/test/identity-email-verification-recovery-contract.test.ts` to exercise verified request validation, exact-Origin rejection, session/CSRF guards, no service invocation after denied/invalid inputs, safe validation envelopes and request-ID parity. The latter file covers:
   - `POST /api/v1/auth/email-verification/request`;
   - `POST /api/v1/auth/email-verification/confirm`;
   - `POST /api/v1/admin/auth/mfa/recovery-codes`.
   These focused route tests use an explicit stub IdentityService. They do not prove real-service token expiry/replay, recovery-code replacement/consumption, or the Phase 4 runbook/audit-redaction controls tracked separately under Issue #55.
5. Located and closed a direct test-evidence gap for `GET /api/v1/admin/bigbang/games`: the new test checks authorized output, `no-store`, paging/filter SQL, anonymous 401 before DB access, missing-permission 403 with denial audit, and invalid `pageSize` rejection with request-ID parity before DB access. The test fixture now snapshots SQL parameter arrays so later query construction cannot mutate recorded evidence.
6. Fixed one demonstrated route-schema mismatch: `/api/v1/casino/providers` now uses the OpenAPI cursor maximum of 512 characters; `/api/v1/casino/categories` keeps its distinct 2048-character limit. Added a valid-encoding cursor >512 characters and assertions for a schema-layer `400 VALIDATION_ERROR`, request-ID parity, and no database calls.
7. Fixed the Schemathesis-discovered NUL/control-character failure in `GET /api/v1/casino/games`: `category`, `displayCategory`, `provider` and free-text `query` now reject ASCII control characters (U+0000–U+001F and U+007F) at Fastify schema validation. OpenAPI describes the same boundary. Four negative cases verify `400`, request-ID parity, and zero DB calls. Before the fix, Schemathesis reproduced a `500` from PostgreSQL's rejection of NUL in `displayCategory`; commit `06b9045` passes the same bounded run.
8. Reconciled a stale contract-only API: removed `PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder` (`reorderCmsSkinGame`) because there was no matching server handler or current UI consumer and its skin-specific `If-Match` request model contradicted the implemented catalog-order API. Updated the generic CMS description and generated client; required CI must verify the contract/client alignment before merge.

9. Reconciled the apparent Q-009 precision discrepancy against the current GitHub decision record: docs/notes/2026-10-22-Q009-tnd-precision-decision.md records the Owner-approved TND exponent 2, provider-support evidence, golden fixtures and Migration 008 acceptance. The shared Library 10-payments-and-settlement.md and 12-open-questions.md retain older conflicting language and should be synchronized separately; Q-020 does not reopen the accepted currency-scale decision. This alone does not authorize non-local migrations or live provider routing; Q-006, Q-010, Q-011, Q-013 and deployment/compliance gates remain.

## Historical CI checkpoint — commit `e9bc94e9ab3101b5ff7ada118fd0d57de269f640` (superseded for current-head verification)

- [API skeleton, tests, OpenAPI contract and Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40076157243) — **passed**. The job reports **93 tests, 93 passed, 0 failed**.
- Schemathesis Health baseline: 2 selected operations; **68 generated cases passed**.
- Schemathesis controlled extension: 8 supported operations selected out of 198; **432 generated cases passed**, with no issues reported. Selection covers the public catalogue reads and the two password-reset operations; identity test configuration and allowed Origin are explicitly provided. This is staged coverage, not broad runtime coverage of all 49 operations.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40076157223) — **passed**.
- [Fresh local-Compose database/migrations/Identity smoke and PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40076157230) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40076157225) — **passed**. This is a disposable CI database rehearsal only, not owner-local or staging migration evidence.

The earlier API run at `510f5b2` exposed a faulty test-fixture assumption (SQL parameter arrays were retained by reference). It was corrected by recording a copied array. The final `e9bc94e` API run is green; the earlier failed run is superseded by the successful run linked above.

## Current-head CI evidence — commit `06b90459f1e0ee7e5c6e639903075fe0502495b2`

- [API skeleton, tests, OpenAPI/client and bounded Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40080037726) — **passed**. The API job reports **97 tests, 97 passed, 0 failed**; Health baseline: **68/68** generated cases; bounded Q-020 Schemathesis: **464/464** generated cases across eight selected, implemented operations, including the previously failing Stateful phase.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40080037731) — **passed**.
- [Local Compose database/migrations/Identity smoke and Windows PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40080037724) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40080037759) — **passed**; disposable CI only.
- The preceding run at commit `9498685` exposed a reproducible `500` for a NUL-containing `displayCategory` filter. The aligned Fastify/OpenAPI patterns and four regression cases were then added on `06b9045`; all selected Schemathesis cases passed after the change.

## Route-crosswalk result

- 49/49 explicit route rows have an assertion-level assessment and explicit remaining-evidence notes.
- 7 routes are marked **substantial, not contract sign-off**; 42 are **partial**; no route is marked fully signed off for OpenAPI conformance.
- The most material residual items include more explicit login/session and wallet validation/error-envelope assertions; hostile Origin, CSRF and permission-negative coverage across administrative mutations; upload MIME/size/path traversal cases; and real-service verification-token/recovery-code semantics.
- “Test file exists” is not counted as evidence unless an operation-specific request and relevant assertions were actually found. The crosswalk deliberately keeps uncovered status/envelope requirements open.

## Remaining work before Q-020 closure

1. Continue route-by-route tests for the documented success and applicable negative status/error/header contracts, focusing on the gaps called out in section 2C of the matrix.
2. Compare each implemented response body/header against the OpenAPI response schema, not just status code and service behavior; verify validation envelope and request-ID parity on negative paths.
3. Cover administrative authorization/Origin/CSRF/RBAC and audit behavior at route level without replacing real security controls with permissive fixtures.
4. Keep actual token expiry/replay and TOTP/recovery-code/audit/runbook requirements separate from stub-service route tests; coordinate the remaining Phase 4 acceptance with Issue #55.
5. Synchronize the older shared Library precision wording with the accepted Q-009 decision note; do not re-open or alter the TND=2 runtime decision as part of Q-020. Before any non-local migration, verify the target database's own history and TND ledger/projection state. Live provider routing remains blocked by Q-006, Q-010, Q-011, Q-013 and applicable deployment/compliance controls.
6. Keep the contract-only operation list reconciled with the roadmap and Open Questions. Add tests for callback contracts only after corresponding handlers exist and the required Q-006/vendor decision is accepted.
7. Continue recording CI links and test names in Issue #56. **Do not close Issue #56 until the per-operation runtime evidence and the required conformance review are complete.**

## Safety boundary retained

No BigBang, WinHouse, PSP or aggregator callback handler was invented. No deposit/withdrawal execution, FX execution, wager settlement, wallet posting, Premium enablement or real-money launch was added or activated. Q-006, Q-010, Q-011 and Q-013 remain independent release gates; Q-009's precision decision is accepted but is not deployment authorization. Passing CI does not close the Q-011 isolated base-backup/WAL restore drill or authorize deployment.
