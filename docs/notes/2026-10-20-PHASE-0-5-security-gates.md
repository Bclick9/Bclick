# Phase 0.5 — Security and API Contract Gate Status

**Date:** 2026-10-20  
**Branch:** `feature/BE-001-api-skeleton`  
**Review PR:** [#54](https://github.com/Bclick9/Bclick/pull/54), stacked on Phase 2 review PR [#53](https://github.com/Bclick9/Bclick/pull/53)  
**Status:** In progress — Phase 0.5 exit criteria are **not met**.

## 1. Verified change in this increment

### `X-Request-Id` contract — mismatch reconciled

The canonical planning OpenAPI file and the repository mirror now express the intended behavior without contradictory request validation:

- The optional request parameter accepts a string without schema length/pattern constraints, because the contract requires invalid supplied values to be replaced instead of causing a validation response.
- The response header requires 8–128 characters matching `^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$`.
- Fastify applies the same response-ID rule. Invalid, too-short, or overlong client values are replaced with a server-generated UUID.
- Unit tests cover the shortest valid value and malformed, too-short, and overlong values.
- The temporary Schemathesis `negative_data_rejection` exclusion was removed. The generated client declarations were brought back in sync with OpenAPI.
- GitHub Actions run [39423227939](https://github.com/Bclick9/Bclick/actions/runs/39423227939) passed on commit `b46342161d31425a3578b612a709100f2a8b90f9`: OpenAPI lint/client generation/drift check and API typecheck, tests, build, migration, health startup and Schemathesis all passed. A subsequent commit also pins explicit Redocly structural, unresolved-reference, unique-operationId and unique-parameter rules; run [39423555201](https://github.com/Bclick9/Bclick/actions/runs/39423555201) passed these checks and the API test job.

This resolves only the request-ID inconsistency. It is not evidence that the complete API contract or security design has been accepted.

## 2. P0 security and API gates

The statuses below are implementation/evidence statuses for this repository increment, not replacements for the canonical open-question register. Project Owner Bclick9 accepted Q-001 and Q-002 and accepted Q-003 with the CSRF cookie-separation amendment on 2026-10-20. OpenAPI and planning documents now declare distinct CSRF names and their lifecycles; route implementation/runtime security tests remain pending. No external provider evidence or compliance decision is inferred.

| Gate | Status in this increment | Required evidence before the blocked capability is enabled |
|---|---|---|
| Q-001 — admin session and permissions | **Owner decision accepted; implementation/evidence open.** The skeleton has no admin authentication/session handler or server-side authorization tests; current OpenAPI still allows status/MFA values outside the accepted full-session semantics. | Reconcile successful response schema and runtime acceptance tests for 200 active+MFA, 401 unauthenticated/incomplete session, 403 locked/disabled, and server-derived permissions. |
| Q-002 — admin MFA lifecycle/bootstrap/recovery | **Owner decision accepted; implementation/evidence open.** No MFA implementation or admin operational flow exists. | Make conditional enrollment-cookie behavior and challenge/browser binding explicit; test TOTP, single-use recovery, expiry/rate limits, three-principal reset and one-admin out-of-band recovery. |
| Q-003 — player/admin cookie CSRF | **Accepted with amendment; implementation/evidence open.** Planning contracts and OpenAPI specify `__Host-bclick_player_csrf`, `__Host-bclick_admin_csrf`, and `__Host-bclick_admin_enrollment_csrf` with separate lifecycle rules. Runtime middleware and handlers do not exist. | Browser runtime tests: cross-context tokens return 403; successful TOTP invalidates enrollment CSRF and issues admin CSRF; player/admin logout is independent; exact Origin and cookie flags pass in secure-local HTTPS. |
| Q-004 — CMS media storage/scanning/quarantine | **Open.** A choice of object storage and scanner/quarantine flow is not implemented. | Platform/CMS decision; 10 MiB cap, MIME and magic-byte checks, safe raster decoding/re-encoding, pixel bounds, quarantine, malware scanner outage failure tests. Upload remains disabled. |
| Q-005 — game slug/provider/category semantics | **Open.** The skeleton contains no catalogue implementation. | Approved slug/UUID resolution and uniqueness policy; required provider and complete `categories[]` semantics; mapping/integration fixtures. |
| Q-013 — CSP/frame/host-header policy | **Open.** Example proxy configuration is not deployed header evidence. | Approved player/admin/provider-frame policy; header and allowed-origin matrix tested in staging, including `frame-ancestors` and provider allowlists. |
| Q-020 — required contract CI | **Partially implemented; still open.** Both OpenAPI documents are linted; generation/drift and client typecheck run; Health operations pass Schemathesis with all checks enabled. Redocly explicitly configures structural validation, unresolved-reference, unique-operationId and unique-parameter rules. New `scripts/verify_openapi_contracts.py` adds duplicate-YAML-key detection, local `$ref` resolution, cross-spec operationId uniqueness, per-scope parameter uniqueness, representative 400/401/403/422 `ErrorResponse` fixtures, and Aggregator callback response fixtures. It is wired into CI with pinned `PyYAML`, `jsonschema`, and Schemathesis versions. A local smoke run against the supplied planning specs passed (1,393 refs; 177 operationIds; error/callback fixtures). Four negative canaries also prove that the guard rejects duplicate YAML keys, unresolved refs, duplicate operationIds and duplicate parameters. GitHub Actions runs [39425591791](https://github.com/Bclick9/Bclick/actions/runs/39425591791) and [39426289876](https://github.com/Bclick9/Bclick/actions/runs/39426289876) passed with the guard enabled, including the negative canaries, and both jobs succeeded. This remains static contract/fixture evidence: runtime 400/401/403/422 behavior and vendor callbacks are not proven because those routes are not implemented and vendor fixtures remain open. | Keep runtime 400/401/403/422 tests as an implementation acceptance requirement for the future route handlers, and add callback runtime tests only once approved vendor contract fixtures and handler paths exist. CI passing for Health and schema fixtures is not whole-platform runtime contract coverage. |
| Q-006 — BigBang/WinHouse agent specs | **Open / vendor-blocked.** | Exact versioned agent documents or approved hashes and matching fixtures before either adapter is implemented. |
| Q-007/Q-008 — Aggregator integrity and retry ID | **Open / risk and vendor evidence required.** | Written decision whether to keep real-money routing disabled or accept documented residual risk; same-ID replay and conflicting-payload fixtures. |
| Q-009 — TND precision | **Open / per-provider evidence required.** | Written scale contract and millime fixtures for balance, debit, credit, refund, history and reconciliation. No TND route without proof. |
| Q-010 — ledger concurrency/idempotency | **Open.** No wallet ledger exists in this increment. | Agreed uniqueness scope, same/different-payload replay cases, concurrent posting/debit tests and DB-enforced balanced-journal invariants before wallet posting. |
| Q-011 — staging restore drill | **NOT RUN; controlled exception accepted for local Phase 4 only (Project Owner, 2026-10-20).** No measured recovery evidence. | Isolated base + WAL restore, key recovery, reconciliation, measured RPO/RTO and independent off-host archive freshness alerts; remains P0 and blocks real deployment/provider integration. |
| Q-015/Q-016/Q-017/Q-023/Q-024/Q-025 — launch compliance, PSP, PCI, KYC/RG and status rules | **Open / owner, provider or assessor decision required.** | Signed jurisdiction/compliance decision, PSP contract, PCI scope determination, eligibility gate tests and approved status-transition matrices before payment/real-money activation. |

## 3. Safe implementation boundaries

Until the corresponding gates close, do not enable admin mutations, CMS media upload/publish, wallet movements, payment acceptance, provider real-money callbacks or launch routes. A schema placeholder or passing lint is not a substitute for authorization, integration tests, vendor fixtures or signed decisions.

## 4. Phase 0.5 exit decision

**Not approved for exit.** The request-ID discrepancy is fixed, and OpenAPI lint, generated-client drift, the static CSRF lifecycle/collision guard, API tests/migration and Health contract checks are green in [run 39450975081](https://github.com/Bclick9/Bclick/actions/runs/39450975081). Q-020 remains open because static guards and Health-route Schemathesis do not prove future handler behavior. Q-001–Q-003 owner decisions are recorded, and the CSRF cookie-separation amendment is applied to the planning contracts and OpenAPI mirror; runtime cross-context CSRF tests still await actual handlers. Q-004, Q-005, Q-013 and other feature-specific P0 gates remain open. Phase 2 remains partially open due to owner/date assignments. This is not security or release readiness.

## 5. Next work item

1. Add runtime 400/401/403/422 contract cases as the corresponding route handlers are implemented. Do not treat Health-only runtime coverage as complete API coverage.
2. The owner decisions and CSRF separation amendment for Q-001–Q-003 are recorded in [issue #55](https://github.com/Bclick9/Bclick/issues/55), and the static OpenAPI/generated-client/guard CI run is green. Add runtime tests alongside each implemented handler; before auth/CSRF middleware or unsafe cookie-authenticated routes are merged, include the cross-context CSRF and cookie-lifecycle tests listed in the amendment note.
3. Resolve Q-004 and Q-005 with the Platform/CMS and Catalogue/API owners before connecting those frontends.
4. Keep vendor-/risk-/compliance-dependent routes disabled until their listed evidence is supplied.
