# Q-020 route-coverage follow-up — 2026-10-24

**Status: Increment passed CI; Q-020 remains OPEN. PR #140 is not merged.** This record is a checkpoint, not a closure declaration.

## Audited state and scope

- Repository: `Bclick9/Bclick`.
- `main` was verified at `cecd9a5d34b17005f2cdaa5d2253ce0e90a12c0d` before this continuation. The work in this record is on `docs/q020-disposition-matrix-2026-10-23`, currently at `e9bc94e9ab3101b5ff7ada118fd0d57de269f640`.
- Tracking: [Issue #56 — Q-020 route/OpenAPI reconciliation](https://github.com/Bclick9/Bclick/issues/56), remains open. [PR #140](https://github.com/Bclick9/Bclick/pull/140), remains in review.
- Baseline: 198 OpenAPI operation entries; 49 explicit method/path declarations in the audited route-registration modules, all matching an OpenAPI operation; 149 OpenAPI operations without an explicit matching declaration in those modules.
- The 149 contract-only operations are **classified for planning**, not treated as missing implementations to fill indiscriminately: 91 planned/unimplemented roadmap scope; 56 gate-blocked or dependent on later domain/vendor/owner decisions; 1 operation explicitly expected to remain absent in the current increment (`GET /api/v1/wallets`, whose existing integration test expects 404); and 1 potential stale-contract path to reconcile rather than duplicate (`PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder`). Do not turn any classification into automatic permission to implement a route.

## Work completed in this increment

1. Added `docs/notes/2026-10-23-Q020-operation-dispositions-and-route-matrix.md` and extended it with:
   - provisional disposition rows for all 149 contract-only operations;
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
6. Recorded a separate P0 financial-spec discrepancy under Q-009 in the route matrix: current wallet tests/Migration 008 assert TND precision 2, while the Library's `10-payments-and-settlement.md` requires a three-decimal TND exponent and `12-open-questions.md` Q-009 requires written provider agreements and third-decimal golden fixtures. Q-020 must not silently change money semantics. No TND routing for any provider is authorized until the Q-009 evidence/decision is closed.

## Latest CI evidence — commit `e9bc94e9ab3101b5ff7ada118fd0d57de269f640`

- [API skeleton, tests, OpenAPI contract and Schemathesis](https://github.com/Bclick9/Bclick/actions/runs/40076157243) — **passed**. The job reports **93 tests, 93 passed, 0 failed**.
- Schemathesis Health baseline: 2 selected operations; **68 generated cases passed**.
- Schemathesis controlled extension: 8 supported operations selected out of 198; **432 generated cases passed**, with no issues reported. Selection covers the public catalogue reads and the two password-reset operations; identity test configuration and allowed Origin are explicitly provided. This is staged coverage, not broad runtime coverage of all 49 operations.
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/40076157223) — **passed**.
- [Fresh local-Compose database/migrations/Identity smoke and PowerShell 5.1 parse](https://github.com/Bclick9/Bclick/actions/runs/40076157230) — **passed**.
- [Wallet Migration 006 disposable-PostgreSQL rehearsal](https://github.com/Bclick9/Bclick/actions/runs/40076157225) — **passed**. This is a disposable CI database rehearsal only, not owner-local or staging migration evidence.

The earlier API run at `510f5b2` exposed a faulty test-fixture assumption (SQL parameter arrays were retained by reference). It was corrected by recording a copied array. The final `e9bc94e` API run is green; the earlier failed run is superseded by the successful run linked above.

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
5. Reconcile the TND 2-vs-3 decimal contradiction through Q-009 / Finance / provider evidence before any provider-specific TND routing. Do not modify wallet precision or financial flows as an incidental Q-020 change.
6. Keep the contract-only operation list reconciled with the roadmap and Open Questions. Add tests for callback contracts only after corresponding handlers exist and the required Q-006/vendor decision is accepted.
7. Continue recording CI links and test names in Issue #56. **Do not close Issue #56 until the per-operation runtime evidence and the required conformance review are complete.**

## Safety boundary retained

No BigBang, WinHouse, PSP or aggregator callback handler was invented. No deposit/withdrawal execution, FX execution, wager settlement, wallet posting, Premium enablement or real-money launch was added or activated. Q-006, Q-009, Q-010, Q-011 and Q-013 remain independent gates. Passing CI does not close the Q-011 isolated base-backup/WAL restore drill or authorize deployment.
