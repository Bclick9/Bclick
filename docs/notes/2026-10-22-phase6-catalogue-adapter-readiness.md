# Phase 6 — BigBang Catalogue Adapter Readiness

**Date:** 2026-10-22  
**Status:** planning/reconciliation only — not authorization to perform provider integration  
**Target branch:** main, via review  
**Precedence:** the shared planning bundle and open-question register remain canonical. This repository note records the immediate decisions and controls needed to prepare Phase 6.

## 1. Verified current boundary

- Migration 006, wallet read APIs, and the player wallet view are present on main.
- There is no approved BigBang catalogue sync implementation in the current Phase 5 increment.
- The current wallet API is read-only. There is no authorization here for payment movement, provider wallet callbacks, wagers, real-money launch, or production activation.
- The Q-011 record explicitly says its controlled exception permits local Phase 4 identity work only and does not authorize provider integration/callbacks. Therefore this note authorizes specification review and synthetic-fixture planning only. It does not authorize external provider calls, use of provider credentials, or adapter implementation before the restore gate/owner authorization is resolved.

## 2. P0 decisions before adapter implementation

### Q-005 — game route identity and categories (OPEN)

The approved decision needs to settle all of the following, rather than leaving behavior implicit in the UI:

1. How an incoming public game slug resolves to the canonical internal game UUID and provider game identity.
2. Whether slugs are globally unique or scoped; how collisions, aliases, retired games, changed provider IDs, and old/deep-linked URLs behave.
3. Which provider identity is required on a game record and how it is returned to the frontend.
4. The full meaning of provider categories[]: multiple category assignment, ordering if significant, unknown/retired categories, empty arrays, normalization, and preservation of original provider values.
5. The approved fixture set covering valid mappings, duplicate slugs, missing IDs/categories, provider rename/retirement, and old URL resolution.

**Exit evidence:** a written owner decision plus mapping/category fixtures and tests. Do not invent a mapping while implementing catalogue routes.

### Q-006 — versioned BigBang/WinHouse agent specifications (OPEN)

For each provider independently, record:

- The exact complete specification filename/version and official source or delivery date.
- SHA-256 of the reviewed file and who reviewed/approved it. If a user-supplied file is authoritative, hash and review that exact artifact rather than relying on a similarly named or partial extract.
- Normative authentication headers, endpoint paths, pagination/cursors, rate limits/timeouts, error and retry semantics, response schemas, launch/demo contract, and any signature/canonicalization rules relevant to later money flows.
- Sanitized golden fixtures for success, empty result, next page, malformed payload, authentication failure, rate-limit response, server error, and documented retry cases. Signature vectors must use test-only secrets and must never contain credentials.
- Explicitly unresolved vendor behavior, with a named gate rather than a guessed default.

**Exit evidence:** version/hash record and reviewed fixtures for the provider before that provider's adapter is scoped. BigBang evidence does not close WinHouse evidence, or vice versa.

## 3. Intended Phase 6 scope after the gates are authorized

1. **Server-only vendor client.** Keep credentials in server configuration/secrets; never expose them in browser bundles, generated client types, API responses, commits, or logs. Bound connection/read timeouts and retries. Redact authorization headers and provider query tokens.
2. **Validated catalogue ingestion.** Schema-validate each page; follow vendor pagination to completion; track run ID, timestamps, cursors/page count, received/upserted/rejected counts, and terminal status without recording credentials or unnecessary raw personal data.
3. **Local persistence.** Persist canonical provider/game identifiers, reviewed slug/category mappings, and sync run status. Use deterministic uniqueness constraints and idempotent upserts. Do not add speculative fields without mapping them to the reviewed provider contract.
4. **Last-good protection.** A timeout, invalid page, duplicate canonical identity, or incomplete pagination must fail the run without publishing a partial catalogue over the last-good version. Define an explicit complete/success boundary and test recovery after a failed run.
5. **DB-backed browsing.** The player's catalogue listing, search, categories, and filters read the local database only. A player browse/search request must issue **zero provider API calls**; provider traffic occurs only in a bounded synchronization task/admin-controlled operation.
6. **No launch/wallet coupling in this phase.** Catalogue sync does not create a provider session, wallet movement, provider user identity, callback endpoint, wager, or real-money launch route.

## 4. Acceptance tests required before calling Phase 6 catalogue sync complete

- A complete multi-page fixture produces the expected canonical game/provider counts and all pages are traversed.
- Repeating the same complete sync is idempotent and does not create duplicate games or categories.
- Duplicate slugs, missing provider identifiers, malformed categories, invalid schema, or an incomplete later page fail closed and preserve the previous last-good catalogue.
- A recorded run gives truthful start/end/status and counts; failed sync is distinguishable from successful empty catalogue.
- Catalogue browsing/search/filter reads only local persistence and makes zero vendor requests.
- API credentials and signed/request tokens never appear in logs, responses, frontend build artifacts, or committed fixtures.
- Unknown provider fields and vendor errors cannot cause a partial sync to be marked successful.
- Tests do not use real provider secrets and do not post or simulate a real-money ledger movement.

## 5. Dependency order and release boundaries

1. Resolve and record Q-005; resolve and hash/review Q-006 separately for each provider.
2. Complete Q-011's isolated base-backup + WAL restore, integrity/projection checks, independent archive/failure monitoring, and measured RPO/RTO. The currently documented local-only exception is not a waiver. Obtain explicit owner authorization before any provider integration or external-provider call.
3. Only then implement and test the Phase 6 catalogue adapter/sync job against the approved provider contract.
4. Proceed to Phase 7 demo launch only after catalogue acceptance and the relevant CSP/frame/host allowlist and vendor demo/session policies are approved and tested. Demo must use virtual balance only and must never attach a real wallet account ID.
5. Phase 8 seamless wallet remains separately blocked by Q-009 per-provider TND precision/signature contract and Q-010 application-level idempotency/posting tests, in addition to all provider/security/compliance gates.

## 6. Decision log

- No Q-005 or Q-006 gate is marked closed by this note.
- Q-010 remains **partially evidenced but OPEN**: DB-level concurrent debit/ledger invariants are tested, but application-level exact replay and conflicting-payload idempotency semantics are not.
- Q-011 remains **NOT RUN / OPEN / P0** per infra/restore-drill/last-drill.md.
- This document grants no deployment, provider credential, callback, payment, wallet posting, or real-money authorization.
