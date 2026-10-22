# Phase 6 — BigBang Catalogue Adapter Readiness

**Date:** 2026-10-22  
**Status:** implementation authorized for local development / BigBang Sandbox only on 2026-10-22; Production remains blocked  
**Target branch:** main, via review  
**Precedence:** the shared planning bundle and open-question register remain canonical. This repository note records the immediate decisions and controls needed to prepare Phase 6.

## 1. Verified current boundary

- Migration 006, wallet read APIs, and the player wallet view are present on main.
- The Phase 6 branch now contains Migration 007, a server-only BigBang client, local catalogue persistence/sync service, read-only database-backed catalogue routes, a sandbox-only CLI, and regression tests. These are proposed changes on `feat/phase6-bigbang-catalogue-sandbox`, not yet merged to `main`.
- On 2026-10-22, the Project Owner explicitly authorized continuing Phase 6 implementation and testing in local development / BigBang Sandbox only. This does not close Q-011 or authorize Production, payment movement, provider wallet callbacks, wagers, or launch routes.
- The CLI requires an `ek_test_` key, an explicit `BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM=YES` confirmation, a non-production runtime and loopback PostgreSQL (`localhost`, `127.0.0.1`, or `::1`). No live provider credential or provider request was used while writing this code.
- The documented Q-011 exception remains a Production/release blocker: Q-011 is still NOT RUN / OPEN / P0. This phase-specific owner approval is limited to sandbox catalogue work and does not widen the financial or deployment boundary.

## 2. P0 decisions that remain open for acceptance and release

### Q-005 — game route identity and categories (OPEN)

The approved decision needs to settle all of the following, rather than leaving behavior implicit in the UI:

1. How an incoming public game slug resolves to the canonical internal game UUID and provider game identity.
2. Whether slugs are globally unique or scoped; how collisions, aliases, retired games, changed provider IDs, and old/deep-linked URLs behave.
3. Which provider identity is required on a game record and how it is returned to the frontend.
4. The full meaning of provider categories[]: multiple category assignment, ordering if significant, unknown/retired categories, empty arrays, normalization, and preservation of original provider values.
5. The approved fixture set covering valid mappings, duplicate slugs, missing IDs/categories, provider rename/retirement, and old URL resolution.

**Current sandbox-only provisional behavior:** the adapter creates a slug from title + provider and adds a `-bb-<external-id>` suffix on a collision; it maps the provider `game_type` to `slot-games`, `live-casino`, or `crash-games`, while preserving the original provider category/category title on the source row. This provisional mapping is tested only for sandbox catalogue persistence. It is **not** the Q-005 owner decision; old frontend slugs/deep links are not migrated, and the frontend is not switched to this API yet.

**Exit evidence:** a written owner decision plus mapping/category fixtures and tests before declaring Q-005 closed or switching player routes to the database-backed catalogue.

### Q-006 — versioned BigBang/WinHouse agent specifications (OPEN)

For each provider independently, record:

- The exact complete specification filename/version and official source or delivery date.
- SHA-256 of the reviewed file and who reviewed/approved it. If a user-supplied file is authoritative, hash and review that exact artifact rather than relying on a similarly named or partial extract.
- Normative authentication headers, endpoint paths, pagination/cursors, rate limits/timeouts, error and retry semantics, response schemas, launch/demo contract, and any signature/canonicalization rules relevant to later money flows.
- Sanitized golden fixtures for success, empty result, next page, malformed payload, authentication failure, rate-limit response, server error, and documented retry cases. Signature vectors must use test-only secrets and must never contain credentials.
- Explicitly unresolved vendor behavior, with a named gate rather than a guessed default.

**Evidence reviewed for the current sandbox implementation:** the public [BigBang API documentation](https://api.bigbangcasino.bet/docs/) was checked on 2026-10-22 for `GET /api/v1/games`, the `success/data/pagination` envelope, the fields used by the adapter, the `limit`/`offset` scheme, and `X-API-Key` sandbox authentication. The test fixture is the published documentation example, not a captured live API response. Pagination and failure test responses are synthetic test doubles derived from that documented schema.

**Q-006 remains OPEN:** the exact complete, versioned `BIGBANG_AGENT.md` artifact and its SHA-256/reviewer record were not found in the current repository/library inventory, so this public page does not substitute for that required artifact. WinHouse is a separate specification and is not covered by this BigBang adapter.

## 3. Sandbox-only Phase 6 implementation scope

1. **Server-only vendor client (implemented on the Phase 6 branch).** Only `ek_test_` keys are accepted; the client sends `X-API-Key` server-side, bounds request timeouts/retries and response size, validates response schemas and pagination, rejects Premium games, and does not log provider payloads or credentials.
2. **Validated catalogue ingestion (implemented; CI evidence pending).** The sync fetches the complete paginated snapshot before opening the publish transaction. Duplicate provider IDs, changing totals, wrong page offsets/limits, malformed fields, and incomplete pages fail closed.
3. **Local persistence (implemented provisionally for Sandbox).** Migration 007 stores providers, canonical game rows, provider source metadata, category slugs and sync-run status. Idempotent upserts maintain one mapping for each BigBang external ID. Q-005 slug/category behavior is still provisional.
4. **Last-good protection (implementation and regression coverage added).** A provider failure or invalid snapshot does not publish partial rows; a zero-game response cannot replace a previously non-empty catalogue; publication changes and the successful sync status commit in one database transaction.
5. **DB-backed browsing (implemented on the branch).** Games, categories, providers, filters and slug/UUID detail routes read local persistence only. Tests assert that browsing does not call the vendor. These routes return `demo=false` and `real=false`; no launch endpoint or admin sync endpoint is added by this branch.
6. **No launch/wallet coupling.** No provider session, user provisioning, wallet movement, payment, callback, wager, real-money launch, or Production deployment is included. The static React casino UI is not switched to this new API while Q-005 remains open.

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

1. Keep Q-005 open until the owner signs the slug/UUID/category mapping and legacy URL behavior; keep Q-006 open until the exact BigBang agent artifact/version/hash is reviewed. The current mappings and docs-derived fixtures are only for controlled Sandbox work.
2. Complete Q-011's isolated base-backup + WAL restore, integrity/projection checks, independent archive/failure monitoring, and measured RPO/RTO before any Production deployment or production provider integration. The 2026-10-22 Phase 6 Sandbox approval does not waive this gate.
3. Run the branch CI and PostgreSQL rehearsal, review the result, and obtain PR approval before merging the sandbox catalogue code. No external request has been made by the implementation work to date.
4. Proceed to Phase 7 demo launch only after Phase 6 acceptance, Q-005/Q-006 and the relevant CSP/frame/host allowlist and vendor demo/session policies are approved and tested. Demo must use virtual balance only and must never attach a real wallet account ID.
5. Phase 8 seamless wallet remains separately blocked by Q-009 per-provider TND precision/signature contract and Q-010 application-level idempotency/posting tests, in addition to all provider/security/compliance gates.

## 6. Decision log

- No Q-005 or Q-006 gate is marked closed by this note.
- Q-010 remains **partially evidenced but OPEN**: DB-level concurrent debit/ledger invariants are tested, but application-level exact replay and conflicting-payload idempotency semantics are not.
- Q-011 remains **NOT RUN / OPEN / P0** per infra/restore-drill/last-drill.md.
- The Project Owner's 2026-10-22 authorization is limited to local development / BigBang Sandbox catalogue implementation and tests. It grants no Production deployment, live provider credentials, callback, payment, wallet posting, wager, launch, or real-money authorization.
- Current branch CI has not yet been asserted as passing in this note; report only actual GitHub Actions results after they complete.
