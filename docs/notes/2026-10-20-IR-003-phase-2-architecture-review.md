# IR-003 — Phase 2 Architecture and Data Model Review

**Date:** 2026-10-20  
**Roadmap phase:** Phase 2 — Architecture and data model approval  
**Branch:** `feature/IR-003-phase2-architecture-review`  
**Status:** Technical review completed; recommended baseline recorded; Tech Lead sign-off still required. This note does **not** claim that proposed ADRs have already been approved.

## 1. Purpose and outcome

This review cross-checked the proposed architecture and data-model baseline in the supplied planning bundle against each other and against the repository audit (`IR-002`). It makes no changes to source planning documents, ADRs, OpenAPI contracts, database schemas, or application behavior.

**Recommended architecture baseline:** retain the storefront and Backoffice/CMS as separate React/Vite clients; add a distinct TypeScript/Fastify modular-monolith API in `server/`; use self-hosted PostgreSQL as the only primary database; use reviewed SQL migrations, a typed SQL query layer, OpenAPI-first REST contracts, server-side opaque sessions, and a database-enforced immutable double-entry ledger. Keep workers in the same deployable API workspace at the start. Do not introduce microservices, a hosted database, a second ledger, or a rename of `backend/`.

These choices are the direction recommended by the planning documents, not a record of owner approval. The roadmap says Phase 2 exits when architecture decisions are signed off, remaining decisions have an owner/date, and the API/database/wallet documents do not contradict each other.

## 2. Proposed baseline for Tech Lead review

| Area | Baseline specified/recommended in the planning bundle | Review outcome |
|---|---|---|
| Deployment topology | TypeScript modular monolith; one Linux VPS initially; Caddy TLS/reverse proxy; static storefront + existing admin SPA; Fastify API; PostgreSQL; bounded in-workspace jobs/workers; encrypted off-host backups | Recommend accept. Choose one deploy mode before infrastructure work; ADR-009 favors Compose but leaves systemd as an Ops-owner alternative. |
| API workspace boundary | Add `server/`; keep `frontend/` player UI and `backend/` Backoffice/CMS UI unchanged | Accept as required boundary. Existing `backend/` is not the API server. |
| Database and query/migration layer | PostgreSQL primary; Kysely for typed SQL composition; `node-pg-migrate` for ordered reviewed SQL under `server/migrations/`; no auto-sync on application startup | Recommend accept per ADR-002/012/017. |
| API contract | Versioned REST JSON under `/api/v1`; OpenAPI 3.1 is canonical; generated TypeScript client checked by CI; inbound provider callback paths remain unversioned and provider-specific | Recommend accept per ADR-005/015/017. OpenAPI remains a contract, not evidence that handlers exist. |
| Domain architecture | Explicit in-process modules for identity/access, registration/provisioning, wallet/accounting, payments/settlement, bonus, casino catalogue/routing, sportsbook, CMS/localization, reporting/operations | Recommend accept; critical financial mutations share a DB transaction; external network calls occur outside long-running DB transactions. |
| Money/currency | Currency-capable ledger; TND exponent 3, EUR/USD exponent 2; integer minor units in PostgreSQL `BIGINT`; API exact decimal strings; never use JS `number` for money; reject unsupported precision rather than rounding/truncating | Recommend accept. This does not authorize a provider/currency route without that route's evidence. |
| Player settlement currency | Exactly one immutable settlement currency per player account, chosen at registration; `preferred_display_currency` remains presentation-only; no hidden FX or provider-currency fallback | Treat as a core product invariant. The ledger may support multiple currencies across accounts, but a player cannot have multiple cash settlement currencies under one player ID. |
| Ledger/source of truth | Bclick ledger owns wallet truth; balanced double-entry journals per currency; append-only posted entries; immutable correction-by-reversal; DB locks/unique idempotency constraints; account balances are rebuildable projections, not authority | Recommend accept; provider/ticket/payment views must never mutate a balance directly. |
| Wallet chart of accounts | Player available and held accounts; bonus-restricted account only for applicable grants; provider/payment/FX clearing and operator bonus clearing accounts as documented; each journal balances independently per currency | Recommend accept as the model baseline. The complete reviewed DDL/migration must retain the FK/uniqueness and journal-posting constraints in `02-system-design.md`. |
| Sessions and admin auth | Opaque server-side sessions with stored token hashes; secure HttpOnly host-only cookies; separate player/admin identities and session namespace; MFA for privileged admin; effective permissions come from server-side session/service; enforce RBAC server-side | Recommend accept. Q-001/Q-002 and related detailed lifecycle tests are still Phase 0.5/Phase 4 gates. |
| CSRF/security | Signed session-bound double-submit CSRF cookie + header, strict Origin checks, rate limits, audit events; least-privilege DB roles; secrets outside source/images/browser bundle; DB is private, not public | Contract direction is specified; Q-003/Q-013 and exact tests remain open until their closure evidence exists. |
| Data minimization / retention | Store minimal identity data; KYC evidence in approved encrypted specialist storage; no cascade deletion of ledger history; redact secrets/PII in logs; audit and legal-hold retention set with counsel | Principle can be accepted. Exact retention periods and deletion/legal-hold schedule are **not** approved in the supplied sources and must remain an explicit decision. |
| Recovery objectives | Off-host encrypted base backups + continuous WAL archive; point-in-time restore and isolated drills. Target RPO ≤15 minutes and RTO ≤8 hours only after measured proof | Recommend accept as acceptance objectives, not achieved SLAs. Phase 3 must record measured evidence before anyone claims readiness. |
| Budget | Planning estimate $89.80/mo base + $26.94 contingency = $116.74/mo envelope against a $200/mo infrastructure/technical-services cap; provider/GGR, payment, KYC/SMS and legal/licensing/compliance costs excluded | Use for planning only. Recheck prices and invoice estimates on purchase date; budget is not commercial approval. |
| Testing/CI | OpenAPI lint, generated-client compile, Schemathesis, lint/typecheck/tests; Testcontainers for PostgreSQL; deterministic provider fixtures; property tests for money/ledger; k6 load testing when appropriate | Must become required CI. Existing UI workflows only build UIs and use different pnpm versions (9 versus 10.4.1); Phase 3 must standardize and extend them. |

## 3. Data-model invariants to preserve before writing migrations

1. **Identity / account:** players have a stable UUID and public ID; normalized identity keys have defined uniqueness; player status is separate from wallet status; settlement currency is selected at registration and cannot be changed by a display/profile preference. No cascade-delete of financial history.
2. **Currencies / accounts:** `currencies` stores immutable currency exponent metadata (TND=3; EUR/USD=2 in the planning baseline). `wallet_accounts` are currency-denominated and include internal clearing accounts. Each wallet account has one `account_balances` projection row, updated with ledger posting.
3. **Journals / entries:** every posted journal has at least two entries and sums to zero **per currency**; a database posting constraint/routine enforces the rule. The account currency and entry currency must match through a composite FK. Posted ledger entries cannot be updated/deleted; corrections are new linked journals.
4. **Idempotency / concurrency:** vendor identity is scoped by provider + environment + provider transaction ID; canonical payload digest distinguishes exact replay from a conflicting duplicate; affected account/grant rows are locked and journal, transaction status, projection, and stored response commit together. Do not promise exactly-once delivery; promise at-most-once financial effect for an idempotent movement.
5. **Holds / payments:** a hold is a balanced journal moving money from available to held. `wallet_holds` and payment intent child tables are lifecycle metadata, not alternate ledgers. The common payment-intent status is authoritative for the API and must be transactionally mapped to direction-specific child status (Q-024 remains open).
6. **Provider mappings:** provider/currency routing and provider player IDs are internal-only and currency-bound. Missing, unverified or disabled currency routes fail closed. Provider provisioning jobs are durable/idempotent and run after the player + wallet transaction commits.
7. **Source-of-truth separation:** provider ticket status is a sportsbook read model, not proof of wallet movement; reports use immutable ledger/payment facts and reconciled provider read models; cached balance and static UI demo arrays are never the production authority.

These are design constraints from `02-system-design.md`, `09-domain-specifications.md`, `10-payments-and-settlement.md`, and the proposed ADRs. This note intentionally does not fabricate executable SQL or introduce new schema decisions.

## 4. Contracts and blockers that must not be mistaken for approval

Phase 2 review does not close these P0 gates. Phase 0.5 exit requires each contract blocker to have a written decision/evidence or its affected feature to remain explicitly disabled.

| Gate | What is required | Safe boundary until closure |
|---|---|---|
| Q-001 | Final `GET /api/v1/admin/session` schema; server-derived effective permissions; 401/403 tests | Backoffice authentication and mutations do not become live. |
| Q-002 | Admin MFA lifecycle, one-time recovery, rate limits, audited step-up, distinct-principal reset approvals and tested first-admin bootstrap/recovery runbook | No privileged admin operations. |
| Q-003 | Signed session-bound double-submit CSRF, strict Origin and negative/rotation/logout tests for both player/admin sessions | No unsafe cookie-authenticated mutations. |
| Q-004 | Private object storage, raster allowlist, type/magic-byte/decode/re-encode checks, 10 MiB cap, quarantine/scanning, fail-closed tests | CMS media upload stays disabled. |
| Q-005 | Stable game slug-to-UUID and full `categories[]` semantics/fixtures | Do not migrate casino UI to an ambiguous catalogue contract. |
| Q-006 | Exact versioned BigBang/WinHouse official agent files and confirmed fixture set | Do not implement the respective provider session/wallet adapter from inferred behavior. |
| Q-007/Q-008 | Written Aggregator payload-integrity risk decision and stable/replay-safe `call_id` tests across same and conflicting payloads | Aggregator real-money routing remains disabled. |
| Q-009 | Per-provider written TND precision confirmation and golden fixtures exercising the third decimal digit | Disable TND routing for each provider without evidence. |
| Q-010 | Normative idempotency scope plus lock/concurrency and duplicate-conflict tests | No real-money wallet/provider posting. |
| Q-011 | Isolated staging base+WAL restore, journal/projection reconciliation, measured RPO/RTO and independent freshness alerts | No claim of backup readiness or real-money launch. |
| Q-013 | Verified CSP/frame/host header policy with provider iframe allowlists and tests | Production hardening gate stays open. |
| Q-015..Q-017 | Jurisdiction/license and compliance approval; contracted PSP; written PCI scope/data-flow model | No public/real-money launch or card-data collection before the corresponding sign-offs. |
| Q-020 | Required CI for OpenAPI lint, generated-client compilation and Schemathesis representative 400/401/403/422 contract tests | Dependent API implementation must not merge without contract checks. |
| Q-023..Q-025 | KYC/RG gates, canonical parent/child payment state mapping, player-vs-wallet status and closure/residual-balance policy | Manual payments/wallet lifecycle stay disabled until the respective decisions and tests pass. |

Additional open decisions affecting later features include D-01..D-09 in `01-architecture-decisions.md`, payment/retention gates in `10-payments-and-settlement.md`, and currency-route evidence CUR-01..CUR-08/Q-029 in `12-open-questions.md`. Proposed due dates in the register are not commitments unless the owner confirms them.

## 5. Unresolved owner decisions to record explicitly

| Decision | Proposed disposition for this review | Accountable role / evidence needed |
|---|---|---|
| Compose vs systemd | Prefer the existing ADR-009 Compose direction for consistent environments, unless the Ops owner explicitly chooses systemd; standardize one only | Ops/DevOps owner records choice before Phase 3 infra files |
| Exact retention/deletion/legal hold | Do not invent periods from the draft examples; keep only minimization/redaction/no-delete-ledger invariants fixed | Business owner + counsel/privacy: approved schedule by data class and jurisdiction |
| Jurisdictions, licensing, age/KYC/AML/RG | No allowed-market assumption is made from repository locale or user location | Business owner + counsel/compliance: written jurisdiction readiness decision before real money |
| TND and alternate currency routing | TND=3-decimal ledger representation is fixed in the proposed design; provider route activation is separate and gated. No implicit FX. Do not assume EUR is a launch fallback without evidence | Finance + each provider: written contract and golden fixtures per account/tenant/currency |
| Provider security/retries | Keep unknown provider-specific behavior out of generic infrastructure decisions | Provider owner/vendor: exact agent files, signature/retry fixtures; Aggregator Q-007/Q-008 written risk/contract evidence |
| Payment thresholds/fees/limits and USDT model | Treat all displayed limits and example KYC/fee/confirmation rules as placeholders; USDT remains disabled pending a signed currency/conversion model | Finance + Compliance + risk/provider evidence |
| Actual deployment price and $200 cap | Keep current estimate as planning baseline only; no purchase or SLA claim from it | Ops/Finance verifies current invoices/quotes and separate provider/compliance budgets |

## 6. Phase 2 exit checklist

- [x] Read the roadmap Phase 2 acceptance definition and cross-reference the architecture, system design, API, security, operations, domain, payments and open-question packages.
- [x] Record a coherent recommended architecture/data-model baseline and map it to existing source decisions.
- [x] Record provider, legal, retention, money/security and CI blockers without resolving them by inference.
- [ ] **Tech Lead sign-off:** accept the baseline in Section 2 (or request explicit changes). No source ADR is marked as signed merely because this review recommends it.
- [ ] Assign named owners and confirmed dates to remaining decisions; role names in the source register are accountable roles, not assigned individuals.
- [ ] Confirm Phase 0.5 contract gate status and which feature/provider paths remain disabled before dependent implementation begins.

## 7. First code-building task after the gate is accepted

**BE-001 — API skeleton, environments, CI and restore drill**, following Phase 3 in `07-implementation-roadmap.md`.

Proposed scope after approval:
- Add separate `server/` workspace; leave the two existing UI workspaces intact.
- Fastify app with liveness/readiness response and schema-validated environment config; no business/financial endpoints in this first slice.
- PostgreSQL Compose service and first reviewed `node-pg-migrate` migration(s), respecting the approved schema boundary.
- Structured request IDs and safe logging/redaction.
- Harmonized pnpm/tooling and CI jobs for lint, typecheck, test, OpenAPI lint, generated-client compile and Schemathesis as specified by the plan.
- Staging backup/WAL restore drill plan and executable runbook; record measured RPO/RTO and reconciliation evidence before asserting readiness.
- Introduce `packages/api-client`, `packages/money`, `packages/config` and `infra/` in line with the approved package contracts—not as ad hoc alternatives.

Explicit exclusions in BE-001: identity/auth rollout, wallet posting, manual payments, CMS media upload, provider adapters/callbacks, production secrets, real-money routes and production deployment. Do not treat a successful health endpoint or initial migration as authorization to activate those features.

## 8. Verification

- Source reviewed: `01-architecture-decisions.md`, `02-system-design.md`, `04-api-contracts.md`, `05-security.md`, `06-operations-and-cost.md`, `07-implementation-roadmap.md`, `09-domain-specifications.md`, `10-payments-and-settlement.md`, `12-open-questions.md`.
- Cross-reference: `docs/notes/2026-10-20-IR-002-repository-audit.md`.
- Application code/schema/OpenAPI/ADR/open-question register: unchanged.
- Builds and tests: not run. This is a documentation review based on the supplied planning sources and repository source inspection.
