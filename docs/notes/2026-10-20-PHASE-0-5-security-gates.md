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

The statuses below are implementation/evidence statuses for this repository increment, not replacements for the canonical open-question register. No owner sign-off, external provider evidence, or compliance decision is inferred.

| Gate | Status in this increment | Required evidence before the blocked capability is enabled |
|---|---|---|
| Q-001 — admin session and permissions | **Open.** The skeleton has no admin authentication/session handler or server-side authorization tests. | Reviewed `GET /api/v1/admin/session` response contract; identity and permissions loaded server-side; explicit 401/403 tests. |
| Q-002 — admin MFA lifecycle/bootstrap/recovery | **Open.** No MFA implementation or admin operational flow exists. | Approved challenge/TOTP/recovery and first-admin procedure; single-use recovery; rate limits and audited step-up; independent approval for sensitive reset; lifecycle tests. |
| Q-003 — player/admin cookie CSRF | **Design stated in the planning contract; implementation gate open.** No cookie-authenticated mutation handlers exist here. | Session-bound signed double-submit token, strict Origin checks, cookie/header failure matrix, rotation/logout tests. |
| Q-004 — CMS media storage/scanning/quarantine | **Open.** A choice of object storage and scanner/quarantine flow is not implemented. | Platform/CMS decision; 10 MiB cap, MIME and magic-byte checks, safe raster decoding/re-encoding, pixel bounds, quarantine, malware scanner outage failure tests. Upload remains disabled. |
| Q-005 — game slug/provider/category semantics | **Open.** The skeleton contains no catalogue implementation. | Approved slug/UUID resolution and uniqueness policy; required provider and complete `categories[]` semantics; mapping/integration fixtures. |
| Q-013 — CSP/frame/host-header policy | **Open.** Example proxy configuration is not deployed header evidence. | Approved player/admin/provider-frame policy; header and allowed-origin matrix tested in staging, including `frame-ancestors` and provider allowlists. |
| Q-020 — required contract CI | **Partially implemented; still open.** Both OpenAPI documents are linted; generation/drift and client typecheck run; Health operations pass Schemathesis with all checks enabled. Redocly explicitly configures structural validation, unresolved-reference, unique-operationId and unique-parameter rules. New `scripts/verify_openapi_contracts.py` adds duplicate-YAML-key detection, local `$ref` resolution, cross-spec operationId uniqueness, per-scope parameter uniqueness, representative 400/401/403/422 `ErrorResponse` fixtures, and Aggregator callback response fixtures. It is wired into CI with pinned `PyYAML`, `jsonschema`, and Schemathesis versions. A local smoke run against the supplied planning specs passed (1,393 refs; 177 operationIds; error/callback fixtures). GitHub Actions run [39425591791](https://github.com/Bclick9/Bclick/actions/runs/39425591791) passed with the additional guard enabled, and both jobs succeeded. This remains static contract/fixture evidence: runtime 400/401/403/422 behavior and vendor callbacks are not proven because those routes are not implemented and vendor fixtures remain open. | Keep runtime 400/401/403/422 tests as an implementation acceptance requirement for the future route handlers, and add callback runtime tests only once approved vendor contract fixtures and handler paths exist. CI passing for Health and schema fixtures is not whole-platform runtime contract coverage. |
| Q-006 — BigBang/WinHouse agent specs | **Open / vendor-blocked.** | Exact versioned agent documents or approved hashes and matching fixtures before either adapter is implemented. |
| Q-007/Q-008 — Aggregator integrity and retry ID | **Open / risk and vendor evidence required.** | Written decision whether to keep real-money routing disabled or accept documented residual risk; same-ID replay and conflicting-payload fixtures. |
| Q-009 — TND precision | **Open / per-provider evidence required.** | Written scale contract and millime fixtures for balance, debit, credit, refund, history and reconciliation. No TND route without proof. |
| Q-010 — ledger concurrency/idempotency | **Open.** No wallet ledger exists in this increment. | Agreed uniqueness scope, same/different-payload replay cases, concurrent posting/debit tests and DB-enforced balanced-journal invariants before wallet posting. |
| Q-011 — staging restore drill | **Not run.** Runbook only; no measured recovery evidence. | Isolated base + WAL restore, key recovery, reconciliation, measured RPO/RTO and independent off-host archive freshness alerts. |
| Q-015/Q-016/Q-017/Q-023/Q-024/Q-025 — launch compliance, PSP, PCI, KYC/RG and status rules | **Open / owner, provider or assessor decision required.** | Signed jurisdiction/compliance decision, PSP contract, PCI scope determination, eligibility gate tests and approved status-transition matrices before payment/real-money activation. |

## 3. Safe implementation boundaries

Until the corresponding gates close, do not enable admin mutations, CMS media upload/publish, wallet movements, payment acceptance, provider real-money callbacks or launch routes. A schema placeholder or passing lint is not a substitute for authorization, integration tests, vendor fixtures or signed decisions.

## 4. Phase 0.5 exit decision

**Not approved for exit.** The request-ID discrepancy is fixed and current CI is green; Q-020's static duplicate-key/reference/operationId/parameter and response-fixture guard now passes, but runtime 400/401/403/422 and callback handler tests remain future acceptance evidence. Q-001 through Q-005 and Q-013 and other feature-specific P0 gates remain open. The architecture review PR remains separate and still requires Tech Lead sign-off. Do not merge these stacked changes into `main` as a declaration of security or release readiness.

## 5. Next work item

1. Add runtime 400/401/403/422 contract cases as the corresponding route handlers are implemented. Do not treat Health-only runtime coverage as complete API coverage.
2. Resolve Q-001 to Q-003 through owner decisions tracked in [issue #55](https://github.com/Bclick9/Bclick/issues/55) before implementing session, MFA or cookie-authenticated mutations.
3. Resolve Q-004 and Q-005 with the Platform/CMS and Catalogue/API owners before connecting those frontends.
4. Keep vendor-/risk-/compliance-dependent routes disabled until their listed evidence is supplied.
