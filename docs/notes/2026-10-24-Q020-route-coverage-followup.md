# Q-020 route-coverage follow-up — 2026-10-24

**Status: Q-020 remains OPEN. PR #140 is not merged.** The provider-cursor contract mismatch and a Schemathesis-discovered control-character input failure have been corrected, and an exact positive response-contract test was added for `GET /api/v1/casino/display-categories`. Current-head commit [`64df669`](https://github.com/Bclick9/Bclick/commit/64df669c4e5435e22cc6e02717321a2d464342b7) passed all required CI; details are below. This record is a checkpoint, not a closure declaration.

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
8. Added a positive route-level contract assertion for `GET /api/v1/casino/display-categories`, verifying the complete representative category and nested-game response, stable custom-icon URL, `Cache-Control: no-store`, `X-Request-Id`/body request-ID parity and expected SQL binding. It remains partial until representative empty/error cases and full OpenAPI response-schema comparison are covered.
9. Reconciled a stale contract-only API: removed `PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder` (`reorderCmsSkinGame`) because there was no matching server handler or current UI consumer and its skin-specific `If-Match` request model contradicted the implemented catalog-order API. Updated the generic CMS description and generated client; required CI must verify the contract/client alignment before merge.

10. Reconciled the apparent Q-009 precision discrepancy against the current GitHub decision record: docs/notes/2026-10-22-Q009-tnd-precision-decision.md records the Owner-approved TND exponent 2, provider-support evidence, golden fixtures and Migration 008 acceptance. The shared Library 10-payments-and-settlement.md and 12-open-questions.md retain older conflicting language and should be synchronized separately; Q-020 does not reopen the accepted currency-scale decision. This alone does not authorize non-local migrations or live provider routing; Q-006, Q-010, Q-011, Q-013 and deployment/compliance gates remain.

## Historical CI checkpoint — commit `e9bc94e9ab3101b5ff7ada118fd0d57de269f640` (superseded for current-head verification)

- [API skeleton, tests, OpenAPI contract and Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40076157243) — **passed**. The job reports **93 tests, 93 passed, 0 failed**.
- Schemathesis Health baseline: 2 selected operations; **68 generated cases passed**.
- Schemathesis controlled extension: 8 supported operations selected out of 198; **432 generated cases passed**, with no issues reported. Selection covers the public catalogue reads and the two password-reset operations; identity test configuration and allowed Origin are explicitly provided. This is staged coverage, not broad runtime coverage of all 49 operations.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40076157223) — **passed**.
- [Fresh local-Compose database/migrations/Identity smoke and PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40076157230) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40076157225) — **passed**. This is a disposable CI database rehearsal only, not owner-local or staging migration evidence.

The earlier API run at `510f5b2` exposed a faulty test-fixture assumption (SQL parameter arrays were retained by reference). It was corrected by recording a copied array. The final `e9bc94e` API run is green; the earlier failed run is superseded by the successful run linked above.

## Previous code CI checkpoint — commit `06b90459f1e0ee7e5c6e639903075fe0502495b2` (superseded by the additional display-category test)

- [API skeleton, tests, OpenAPI/client and bounded Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40080037726) — **passed**. The API job reports **97 tests, 97 passed, 0 failed**; Health baseline: **68/68** generated cases; bounded Q-020 Schemathesis: **464/464** generated cases across eight selected, implemented operations, including the previously failing Stateful phase.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40080037731) — **passed**.
- [Local Compose database/migrations/Identity smoke and Windows PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40080037724) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40080037759) — **passed**; disposable CI only.
- The preceding run at commit `9498685` exposed a reproducible `500` for a NUL-containing `displayCategory` filter. The aligned Fastify/OpenAPI patterns and four regression cases were then added on `06b9045`; all selected Schemathesis cases passed after the change.

## Current-head CI evidence — commit `64df669c4e5435e22cc6e02717321a2d464342b7`

- [API skeleton, tests, OpenAPI/client and bounded Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40080411978) — **passed**; **98/98 API tests**. Health baseline: **68/68** generated cases. Bounded Q-020 Schemathesis: **472/472** generated cases across eight selected implemented operations (8 capability cases, 8 fuzzing cases and 22 stateful checks), with no issues reported.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40080411967) — **passed**.
- [Local Compose database/migrations/Identity smoke and Windows PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40080411945) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40080411984) — **passed**; this is a disposable CI database only.
- This head includes the operation-specific positive response-contract test for `GET /api/v1/casino/display-categories`. The earlier `06b9045` evidence of 97 API tests and 464 generated Q-020 cases is superseded by this run.

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

## Icon upload/read continuation — code/test commit `7671ad6` (CI pending at this checkpoint)

- Synchronized the generated TypeScript client declarations with the OpenAPI contract for the category-icon upload/read routes: optional `X-Request-Id` request parameters, required response correlation headers, upload `413/415` error bodies, and the read route's `400 ValidationError` response.
- Added an explicit request larger than the 5 MiB content-parser limit. The current shared Fastify error handler should return the safe `413 REQUEST_REJECTED` envelope before the route handler; the test asserts body/header request-ID parity, zero database calls, no audit mutation and no upload files. Existing tests already cover undersized bytes (`413 IMAGE_SIZE_INVALID`), invalid image bytes (`415 IMAGE_TYPE_INVALID`), nonexistent category (`404` before file write), and invalid filename (`400` before database lookup).
- Updated the route matrix to correct the public-read security description and reflect observed coverage. Both routes remain partial: the upload route still needs a content-type mismatch case and explicit denied Origin/CSRF/RBAC evidence, and the media quarantine/scanner decision remains gated by Q-004; the read route still needs inactive-key/filesystem failure and fuller response-contract evidence.
- Code/test commit: [`7671ad6`](https://github.com/Bclick9/Bclick/commit/7671ad6301d0537885c54484ea8c10c6ff24a6ef). CI runs triggered for this commit: [API/OpenAPI/client/Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40081802869), [application builds](https://github.com/Bclick9/Bclick/actions/runs/40081802851), [Compose/Identity/PowerShell smoke](https://github.com/Bclick9/Bclick/actions/runs/40081802844), and [Migration 006 disposable PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40081802837). They were still running when this note was prepared; prior green results on `64df669` are not being reused as evidence for this increment.
- Q-020 remains OPEN. No callback, wallet posting, FX, deposit/withdrawal, wager-settlement, Premium or real-money route was added or enabled.


## Verified PR-head follow-up — 2026-10-24; head `d716dc4`

This entry supersedes the earlier `64df669` checkpoint when describing the current PR head. PR #140 remains open and unmerged; its current head is `d716dc4d009a2cef0220d4dff3781efe17978117`.

### Current-head CI evidence

- [API skeleton and contract checks](https://github.com/Bclick9/Bclick/actions/runs/40082019851) — passed. The API test run reports **101 tests, 101 passed, 0 failed**. Health baseline: **68/68 generated cases passed**. The controlled Q-020 Schemathesis profile selected eight implemented operations and reports **452/452 generated cases passed**.
- The same workflow passed OpenAPI duplicate-key/reference/operation checks and both OpenAPI lints; it regenerated `packages/api-client/src/generated/openapi.d.ts` and the committed-declaration drift check passed.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40082019856) — passed.
- [Local Compose bootstrap smoke, migrations/Identity, and PowerShell checks](https://github.com/Bclick9/Bclick/actions/runs/40082019869) — passed.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40082019872) — passed; this is disposable CI evidence only, not a staging restore or production migration approval.

### Icon upload coverage verified at the current head

The existing `display-category icon upload rejects undersized, oversized and invalid image bytes with request-id and error-envelope parity` test now covers:
- undersized payload → `413 IMAGE_SIZE_INVALID`;
- payload larger than 5 MiB → `413 REQUEST_REJECTED` from the bounded parser;
- invalid image bytes → `415 IMAGE_TYPE_INVALID`;
- for rejected uploads, response/body request-ID parity, zero catalogue lookup/update/audit-success SQL calls, and no file creation.

Additional current tests verify a missing category returns 404 before writing, and an invalid public icon filename returns 400 before database access. The positive case stores/audits a valid PNG and reads back the exact bytes with `nosniff`.

The intermediate `7671ad6` edit briefly produced a malformed generated-client declaration for the public icon path. Commit `d716dc4` repaired that declaration. **The current-head CI above, not an assumed CI result for the intermediate commit, is the validation evidence.** The generated-client regeneration/drift step passed on the repaired head.

### Q-020 status and next gap

The matrix already records the expanded upload test, but the icon upload route remains **Partial**, not signed off. Remaining evidence includes a distinct valid-image-bytes versus mismatched `Content-Type` case; route-level denied Origin/CSRF/RBAC behavior with real controls rather than only a stub Identity fixture; and the separate Q-004 quarantine/scan/storage safeguards. Public icon GET still needs explicit inactive/unknown-key and safe filesystem-failure/path-traversal coverage plus full OpenAPI response/header comparison.

Q-020 remains OPEN. No provider callback, wallet-posting, deposit/withdrawal, FX, wager-settlement, Premium, or real-money path was added or enabled by this increment.


## Current PR-head follow-up — 2026-10-24; `96a5885`

The matrix and existing upload rejection test now include an explicit valid-image/mismatched-header case: valid PNG bytes with `Content-Type: image/jpeg` must return `415 IMAGE_TYPE_INVALID`. The focused test passed in the current-head CI and continues to assert the request-ID/error envelope and absence of database, file, or audit-success side effects.

- [API, OpenAPI and Schemathesis checks](https://github.com/Bclick9/Bclick/actions/runs/40083380806) — passed: **101/101 API tests**, **68/68 Health generated cases**, **458/458 controlled Q-020 generated cases** across the eight selected operations. OpenAPI lint and generated-client regeneration/drift checks passed.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40083380808) — passed.
- [Compose/bootstrap, migrations/Identity and PowerShell checks](https://github.com/Bclick9/Bclick/actions/runs/40083380804) — passed.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40083380819) — passed; this is not a staging restore or production migration authorization.

The current code head for that validation was `96a58857c74300dfdc78d6454edaa47a15c2249e`. The category icon upload remains Partial because real-control Origin/CSRF/RBAC denial evidence, Q-004 quarantine/scanning/storage safeguards, and the public icon-read inactive-key/filesystem/path-traversal cases are still open. Q-020 remains OPEN; no callback or real-money execution route was enabled.



## Q-020 icon route security and response-contract verification — 2026-10-24

Validated implementation/test head: `a1d43e33a868805cff02967b7994aa530f3da4e6` on [PR #140](https://github.com/Bclick9/Bclick/pull/140). The PR remains open and unmerged; `main` was not changed.

- **Upload route** `POST /api/v1/admin/casino/display-categories/{categoryId}/icon`: focused tests cover 201 success and exact JSON key sets; malformed category ID 400 before DB/storage; missing administrator session 401; disallowed/missing Origin and missing, mismatched, or unsigned CSRF 403; missing `casino.provider-settings.manage` permission 403 with denial audit and no success mutation; missing category 404; 413 and 415 image/size cases; and generic 500 on a storage-root write failure with the existing storage sentinel preserved, no orphaned icon, no audit-success write, and no path disclosure.
- **Public read route** `GET /api/v1/assets/casino-display-categories/{categoryId}/{fileName}`: the 200 PNG body is byte-compared and asserts `Cache-Control`, `Content-Security-Policy`, `X-Content-Type-Options` and `X-Request-Id`. Malformed filenames and encoded path traversal return 400 before DB access; inactive/unreferenced keys and missing physical files return safe 404; non-ENOENT storage errors return a generic 500 envelope without leaking filesystem paths. The tested JSON errors assert exact top-level keys, error code/message, request-ID body/header parity, and JSON media type.
- **Security-test boundary:** the route's production Origin/RBAC guard paths and production `verifyCsrfToken` HMAC verifier are exercised with correctly signed and invalid CSRF values. The `IdentityService.resolveSession` result remains a test fixture; these tests do not claim to complete the separate real-session lifecycle, expiry, revocation, or replay evidence.
- **OpenAPI alignment:** both routes document the 500 `InternalError` envelope and `X-Request-Id`; public image 200 documents `Content-Security-Policy` alongside its other response headers. The committed generated TypeScript client matches fresh OpenAPI regeneration.

### Current-head CI evidence

- [API and contract checks](https://github.com/Bclick9/Bclick/actions/runs/40085094198) — passed: **109/109 API tests**, **68/68 Health cases**, and **450/450 controlled Q-020 Schemathesis cases** across the selected implemented operations. The contract guard passed (35 CSRF lifecycle/name/Origin checks, 16 Q-001/Q-002 checks, duplicate-key/ref/operationId checks); OpenAPI lint and generated-client drift checks passed.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40085094203) — passed.
- [Local Compose, fresh database/migrations/Identity route and PowerShell checks](https://github.com/Bclick9/Bclick/actions/runs/40085094206) — passed.
- [Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40085094215) — passed; this is not staging-restore evidence or production migration approval.

**Status remains Partial / OPEN.** This focused result does not close Q-020 or the wider route matrix. Q-004 media quarantine, scanning and storage-isolation requirements remain a separate gate. Issue #55 remains OPEN for identity-token expiry/reuse/replay, recovery-code single-use/replay and related MFA/runbook evidence. CI success does not close either gate. No wallet, provider-callback, payment, FX, wager-settlement, Premium or real-money route was enabled by this increment.
