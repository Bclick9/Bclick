# Bclick — Initial Architecture Review

- **Task ID:** IR-001
- **Date:** 2026-10-20
- **Scope:** Phase 0.5 — Contract hardening / pre-implementation review, with repository discovery observations from Phase 1.
- **Status:** Review note only. No application code, API contract, ADR, or open-question gate was changed. No provider adapter or real-money flow was enabled.

## Executive result

The 15 planning files are present in the shared ChatGPT Library under `/docs/planning/`: 13 Markdown files and two OpenAPI 3.1 YAML contracts. That shared Library package is the source supplied for this review. These documents describe a planned system, not an implemented backend; the existing `frontend/` and `backend/` are client SPAs, with `backend/` being the Backoffice/CMS rather than the API server.

**Separate repository observation:** GitHub `main` (checked at `b0c850eaa37c9711f3b7ec6b184b4459eb6af002`) contains neither `docs/planning/` nor `docs/notes/`. This is a gap in the checked-in GitHub copy, not an absence of the planning files from the shared Library, and it does not prevent using the shared files as the review source. The note is on a separate branch because the notes directory did not yet exist in the repository.

**Provider-source status:** Aggregator’s official `/docs` and its linked Balance, Credit and Debit, and Validation pages were accessible. The specified BigBang and WinHouse `agent.md` URLs could not be retrieved by the available browser fetcher (unsupported `text/markdown` content type). Their agent specifications are **not verified** in this review; the HTML pages are not treated as substitutes. Q-006 remains a blocker for those adapters.

## 1. Two-line summary for each planning file

### 00-overview.md
- Defines the planning package, reading order, source map, current repository prototype context and planning-only status.
- Distinguishes the active 13 Markdown packages plus two OpenAPI contracts from implementation evidence; none of the planned backend is established by these documents alone.

### 01-architecture-decisions.md
- Records proposed architecture decision records, including TypeScript/Fastify modular monolith, PostgreSQL, currency-safe ledger principles and provider/bonus decisions.
- ADR status and stated approval gates still matter: a recommendation in the bundle is not permission to invent a new architecture or silently treat an unapproved decision as accepted.

### 02-system-design.md
- Describes module boundaries, database/schema sketches, wallet and currency rules, transaction processing, outbox work and provider-routing constraints.
- Financial source of truth is the immutable double-entry ledger with exact amounts and currency-scoped accounts; schemas are design material, not executable migrations, and direct balance edits are prohibited.

### 03-provider-integrations.md
- Documents the integration model for BigBang casino, WinHouse sportsbook and Aggregator Network, including currency/account boundaries, catalogue mapping, launch and callback expectations.
- Provider wire behaviour must be grounded in the approved vendor sources and fixtures; Q-006 to Q-009 leave material API-authentication, retry/idempotency and TND precision matters unresolved.

### 04-api-contracts.md
- Sets the proposed Bclick API conventions: internal REST under `/api/v1`, provider callback paths unversioned, standard envelopes, request IDs, sessions, CSRF, RBAC and idempotency.
- Exact decimal strings and currency codes are required for internal money; callback bodies and statuses must follow their respective provider contracts rather than the Bclick error envelope.

### 05-security.md
- Defines the threat model and testable controls for identity, sessions, admin MFA/RBAC, callback authenticity/replay, account isolation, file handling, financial posting and auditing.
- Security acceptance includes raw-payload/signature correctness, redaction, least privilege, CSRF/Origin validation, fail-closed scanning and separation of duties—not just frontend restrictions.

### 06-operations-and-cost.md
- Proposes the initial single-VPS topology with Docker Compose, Caddy, private PostgreSQL and encrypted off-host database/WAL backups, plus monitoring and operational runbooks.
- Compose is not high availability; backup readiness must be demonstrated by a restore drill with measured recovery objectives and independent off-host-backup monitoring.

### 07-implementation-roadmap.md
- Establishes the delivery order beginning with Phase 0.5 contract hardening, Phase 1 repository audit and Phase 2 architecture/data-model approval, then backend skeleton, CI and restore drill before dependent features.
- The later identity, ledger, provider, payments, reporting and production phases have dependencies and acceptance gates; estimates are planning estimates, not commitments or evidence that implementation has started.

### 08-frontend-integration.md
- Requires gradual integration into the existing player and Backoffice React/Vite applications while preserving their current screen and route structure.
- OpenAPI-generated types and a shared API client are the intended contract source; `backend/` remains the admin SPA, money is not calculated in the browser, and the actual Fastify server belongs in a distinct workspace.

### 09-domain-specifications.md
- Consolidates KYC, responsible-gambling, legal/compliance, notifications and settlement-currency/provider/payment-routing specifications.
- Eligibility must be enforced server-side and fail closed where material state is unknown; legal thresholds, jurisdiction approval, KYC policy and currency/provider availability remain subject to explicit evidence and sign-off.

### 10-payments-and-settlement.md
- Defines manual payment rails separately from future automated PSP processing, including intents, proof handling, independent evidence/reconciliation, human decisions, holds and audit history.
- Payment proof alone is not settlement; use the existing double-entry ledger, immutable references, private scanned evidence, exact currency arithmetic, authorization and four-eyes controls; USDT and real-money methods remain gated.

### 11-reporting-and-analytics.md
- Specifies 11 Backoffice reports: four sportsbook, four casino and three financial, including their sources, filters, permissions, freshness and exports.
- Every report is scoped to one currency with exact decimal-string money, UTC cutoffs and an explicit `asOf`; exports are bounded, idempotent and audited, and historical requests must not be fabricated when source history cannot reconstruct them.

### 12-open-questions.md
- Is the consolidated gate register for P0/P1/P2 questions, owners, proposed target dates, required closure evidence and affected implementation phases.
- Target dates are proposals rather than commitments; each P0 route/feature remains blocked until the stated written decision and/or reproducible evidence exists, and this review closes or changes no gate.

### openapi.yaml
- The canonical proposed Bclick OpenAPI 3.1 contract describes internal player, wallet, casino, sportsbook, CMS, Backoffice, security, payment, reporting and callback surfaces.
- It explicitly is not the BigBang or WinHouse outbound contract and has no implemented handlers; its route, schema, permission and callback details must not be edited without the owner’s prior approval.

### openapi-aggregator-callbacks.yaml
- A planning-only OpenAPI addendum proposes one unversioned GET callback for Aggregator balance/debit/credit actions with query fields such as player, currency, action, `call_id`, timestamp and key.
- It proposes the vendor’s HTTP 200 JSON `error`/`balance` response and a freshness check, while documenting unresolved registered-path, payload integrity, retry identity and TND integer-scale questions; it is not production authorization.

## 2. Blocking gates

### Phase 0.5 / before dependent implementation
- **Q-001:** Final admin-session response and server-derived permissions.
- **Q-002:** Admin MFA lifecycle, recovery codes and first-admin bootstrap/recovery procedure.
- **Q-003:** Signed, session-bound double-submit CSRF and Origin controls for player/admin cookie sessions.
- **Q-004:** CMS media object storage plus scanner/quarantine and fail-closed validation before upload UI connects.
- **Q-005:** Stable game-slug-to-UUID resolution and complete `categories[]` semantics before casino API migration.
- **Q-006:** Obtain and record the exact current BigBang and WinHouse agent specifications before implementing either provider adapter.
- **Q-010:** Normative idempotency scope plus wallet-ledger locking/concurrency tests.
- **Q-013:** Confirm and test CSP, frame, host-header and provider iframe policies.
- **Q-020 / API-01:** Make OpenAPI lint, generated-client compilation and Schemathesis checks required CI gates.

### Provider, money and release gates that must not be bypassed
- **Q-007:** Aggregator payload integrity risk decision. Official Validation documentation describes `md5(timestamp + saltkey)` and a 30-second timestamp window; that does not authenticate the amount/action/player/currency fields. IP allowlisting is defence in depth, not a payload signature.
- **Q-008:** Confirm Aggregator `call_id` uniqueness scope and repeat/retry behaviour with same-payload and conflicting-payload fixtures.
- **Q-009 / CUR-08:** Obtain written TND three-decimal/millime support and pass golden precision fixtures separately for every provider route. Do not infer the scale from a currency being listed.
- **Q-011:** Complete and record the isolated staging base-backup + WAL restore drill, validate journal/projection consistency and monitor off-host backups independently.
- **Q-015:** Obtain legal/licensing and jurisdiction-by-jurisdiction Compliance approval before a real-money or public gambling launch.
- **Q-016 / Q-017:** Select and contract a PSP, and obtain the required written PCI DSS scope/data-flow decision before any card-data path.
- **Q-023:** KYC/RG APIs and server-side deposit/withdrawal eligibility controls must be operational and tested before any manual payment activation.
- **Q-024 / Q-025:** Settle the canonical parent/child payment-intent state mapping and player-status versus wallet-status/closure policy before the corresponding migrations and lifecycle implementation.
- **Payment, currency and reporting gates:** PAY-01…PAY-15, CUR-01…CUR-08 and the report snapshot/movement-kind gates remain open until their recorded evidence and approvals are supplied. In particular, no implicit FX, no unsupported USDT posting, and no invented historical report totals.

This review records these gates as blockers; it does **not** amend or close `12-open-questions.md`.

## 3. Main risks

1. **Repository traceability gap:** The complete planning bundle exists in the shared Library and was used for this review, but it is not checked into `main/docs/planning/`; repo-level traceability to the exact reviewed version is therefore weaker.
2. **Unverified provider contracts:** The designated BigBang and WinHouse `agent.md` files were not retrievable in this session; coding against inferred/HTML-only behaviour could produce invalid signatures, responses or amount semantics.
3. **Aggregator callback integrity and retries:** The public MD5 check is timestamp-based rather than a signature over transaction fields, while `call_id` retry/conflict behaviour is not proven; accepting a movement under these conditions risks unauthorised or duplicate financial postings.
4. **Currency precision and routing:** TND's third fractional digit has to be preserved end-to-end per configured provider account/tenant. Silent rounding, scale assumptions or fallback into a different-currency route can corrupt settlement and reporting.
5. **Financial/operational launch readiness:** Double-entry, idempotency/concurrency, independently restored backups, compliance/KYC/RG and the required CI contract checks are release gates; a UI prototype or passing frontend build is not proof that these controls exist.

## 4. Repository observations, files and validation

- **Roadmap reference:** Phase 0.5 is the immediate hardening stage; the absence of the planning package in `main` is also a Phase 1 repository-audit finding.
- **Branch:** `feature/IR-001-initial-review`, created from `main` at `b0c850eaa37c9711f3b7ec6b184b4459eb6af002`.
- **Files intended for this documentation step:** `docs/notes/00-initial-review.md` and `docs/notes/PROGRESS.md` only. No application code, either OpenAPI file, ADR document, or `12-open-questions.md` is modified.
- **Validation performed:** Verified the shared Library listing contains all 15 named files under `/docs/planning/`; reviewed the planning Markdown files and both OpenAPI contracts by file sections; separately checked the repository root and confirmed `docs/planning/` and `docs/notes/` are absent on GitHub `main`; checked that no matching initial-review branch existed before creating this task branch; examined Aggregator’s official Getting Started, Balance, Credit and Debit, and Validation documentation.
- **Not performed / blocked:** No application tests were run because this commit contains documentation only and no runtime/API implementation was changed. No OpenAPI lint, code generation, Schemathesis, callback integration tests or restore drill are claimed as passed. BigBang and WinHouse `agent.md` content remains unverified due to fetcher content-type failure.
- **Files changed:** This note and the cumulative progress note only.
- **Test status:** Documentation/repository checks completed; application/contract test suites not run for this documentation-only step.
- **Remaining risks:** The shared Library source is not mirrored under `main/docs/planning/`, which limits repository-local traceability; BigBang/WinHouse agent specs remain unverified; P0 gates above remain open.
- **Deviation from plan:** No planning source, API contract, ADR, or open-question gate was changed. The GitHub path gap is documented separately from the available shared Library source; no files were inferred or recreated.

## 5. Proposed next step

**Question for the owner:** Do you want the exact 15 files from the shared Library copied verbatim into GitHub `docs/planning/` on a separate documentation-only branch, or should the shared Library remain the planning source while the repository note links/reference them? This is a repository traceability choice only; it does not question whether the files were shared. The provider-specific agent documents must still be verified from the mandated official sources before either adapter can start.
