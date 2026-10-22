# Phase 6 — BigBang Catalogue Adapter Readiness

**Date:** 2026-10-22  
**Status:** implementation authorized for local development / BigBang Sandbox only on 2026-10-22; Production remains blocked  
**Target branch:** main, via review  
**Precedence:** the shared planning bundle and open-question register remain canonical. This repository note records the immediate decisions and controls needed to prepare Phase 6.

## 1. Verified current boundary

- Migration 006, wallet read APIs, and the player wallet view are present on main.
- PR #92 merged Migration 007, the server-only BigBang client, local catalogue persistence/sync service, read-only database-backed catalogue routes, the sandbox-only CLI, and regression tests to `main`. Migration 007 has not been applied to Neon or Production.
- On 2026-10-22, the Project Owner explicitly authorized continuing Phase 6 implementation and testing in local development / BigBang Sandbox only. This does not close Q-011 or authorize Production launch, real-money launch, payment movement, provider wallet callbacks, wagers, or any production provider route.
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

**Current sandbox-only provisional behavior:** the adapter creates a slug from title + provider and adds a `-bb-<external-id>` suffix on a collision; it maps the provider `game_type` to `slot-games`, `live-casino`, or `crash-games`, while preserving the original provider category/category title on the source row. This provisional mapping is tested only for sandbox catalogue persistence. It is **not** the Q-005 owner decision; old frontend slugs/deep links have no persistent alias map. PR #92 already switched Casino listing/search/pagination/detail and Sandbox demo launch to the database-backed API; curated legacy display cards still use an exact title/provider fallback and fail safely if the match is missing or ambiguous.

**Exit evidence:** a written owner decision plus mapping/category fixtures and tests before declaring Q-005 closed or switching player routes to the database-backed catalogue.

### Q-006 — versioned BigBang/WinHouse agent specifications (OPEN; exact artifacts fingerprinted)

The complete agent-spec artifacts supplied by the Project Owner on 2026-10-22 were hashed and reviewed. A provider-support written response and test vectors were then supplied on 2026-10-22; the vector attachment is fingerprinted and its BigBang/WinHouse bet/win HMACs are regression-tested. Exact artifacts, hashes, current code comparison, precision decision, and remaining questions are recorded in [Q-006 Provider Specification Review](./2026-10-22-Q006-provider-spec-review.md).

- **BigBang:** `BIGBANG_AGENT.md`, docs v1.10 dated 2026-09-20, canonical source `https://api.bigbangcasino.bet/docs/agent.md`, 20,552 bytes, SHA-256 `60b7b046dd1f56cbd4cf3577b349fe9f1ffbde3b2df1538d6ece7c2368b59b74`.
- **WinHouse:** `WINHOUSE_AGENT.md`, version dated 2026-09-20, canonical source `https://iframe.winhouse.bet/docs/agent.md`, 23,021 bytes, SHA-256 `00de9e66c76627eee31af1f9ccba93371432abfffebff39d026d512e53dc2d6b`.
- **Reviewer:** AI coding-agent source-to-code review on 2026-10-22 of the exact uploaded bytes. **Project Owner/vendor acceptance is not recorded.** A future file, even from the same URL, must be re-hashed and separately reviewed.

**Code comparison:** the merged BigBang Sandbox catalog client matches the documented `X-API-Key`, `type=standard`, `limit/offset`, and `success/data/pagination` flow. Its sample success fixture is taken from the published example and its pagination/failure cases are synthetic—not vendor-originated golden responses. The current code does not call the documented `GET /categories`; provider records are currently synthesized from game-level provider names, so exact vendor provider-slug parity has not been established. The merged launch path remains demo-only. The WinHouse page uses `embed.js`, but the repository has no Model B launch-token endpoint, `user-data` or `balance-change` handler. No real-money callbacks have been built.

**Q-006 remains OPEN/P0.** The supplied support vectors establish and verify the signing algorithms for the example BigBang and WinHouse bet/win requests, but do not test wallet handlers or cover the full provider event matrix. BigBang round-close/replay/conflict and header applicability remain open; WinHouse cashout/cancellation/refund/out-of-order semantics remain open; owner acceptance is still pending. Q-009 (TND precision compatibility), Q-010 (application idempotency/posting), and Q-011 (real base+WAL restore) remain separate blockers.
## 3. Sandbox-only Phase 6 implementation scope

1. **Server-only vendor client (merged to `main` in PR #92).** Only `ek_test_` keys are accepted; the client sends `X-API-Key` server-side, bounds request timeouts/retries and response size, validates response schemas and pagination, rejects Premium games, and does not log provider payloads or credentials.
2. **Validated catalogue ingestion (implemented and verified by disposable PostgreSQL CI on 2026-10-22; see Section 7).** The sync fetches the complete paginated snapshot before opening the publish transaction. Duplicate provider IDs, changing totals, wrong page offsets/limits, malformed fields, and incomplete pages fail closed.
3. **Local persistence (implemented provisionally for Sandbox).** Migration 007 stores providers, canonical game rows, provider source metadata, category slugs and sync-run status. Idempotent upserts maintain one mapping for each BigBang external ID. Q-005 slug/category behavior is still provisional.
4. **Last-good protection (implementation and regression coverage added).** A provider failure or invalid snapshot does not publish partial rows; a zero-game response cannot replace a previously non-empty catalogue; publication changes and the successful sync status commit in one database transaction.
5. **DB-backed browsing (merged to `main` in PR #92).** Games, categories, providers, filters and slug/UUID detail routes read local persistence only. Tests assert that browsing does not call the vendor. The catalogue routes remain read-only and return `demo=false` and `real=false`; a separate, sandbox-guarded `demo-launch` endpoint is present, and no public/admin catalogue-sync endpoint is exposed.
6. **No launch/wallet coupling beyond Sandbox demo.** PR #92 has switched the Casino page to database-backed browse/search/detail and the guarded BigBang `demo: true` launch path. No provider session provisioning for real play, wallet movement, payment, provider callback, wager, real-money launch, or Production deployment is included. Q-005 legacy-link/category acceptance remains open.

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

1. Keep Q-005 open until the owner signs the slug/UUID/category mapping and legacy URL behavior. For Q-006, retain the support-issued vectors as test-only evidence and keep the gate open until the remaining provider event/signature questions and owner acceptance recorded in `2026-10-22-Q006-provider-spec-review.md` are resolved. These are not wallet-handler or production tests.
2. Complete Q-011's isolated base-backup + WAL restore, integrity/projection checks, independent archive/failure monitoring, and measured RPO/RTO before any Production deployment or production provider integration. The 2026-10-22 Phase 6 Sandbox approval does not waive this gate.
3. PR #92 merged the Sandbox catalogue/demo implementation after the recorded CI and disposable PostgreSQL rehearsal. Migration 007 has not been applied to Neon or Production. Passing CI and local Sandbox sync do not close Q-005, Q-006, or Q-011.
4. The Phase 7 Sandbox demo-launch path is already merged and must remain `demo: true` with no real wallet account ID. Do not treat this as production launch acceptance; any deployment still requires Q-005/Q-006 and the relevant CSP/frame/host allowlist and vendor demo/session policies to be approved and tested.
5. Phase 8 seamless wallet remains blocked by Q-009's confirmed two-decimal TND limitation versus the current millime-level requirement, Q-010 application-level idempotency/posting tests, Q-011 restore evidence, and remaining Q-006 provider contract items, in addition to all security/compliance gates.

## 6. Decision log

- No Q-005 or Q-006 gate is marked closed by this note.
- Q-010 remains **partially evidenced but OPEN**: DB-level concurrent debit/ledger invariants are tested, but application-level exact replay and conflicting-payload idempotency semantics are not.
- Q-011 remains **NOT RUN / OPEN / P0** per infra/restore-drill/last-drill.md.
- The Project Owner's 2026-10-22 authorization is limited to local development / BigBang Sandbox catalogue implementation and tests. It grants no Production deployment, live provider credentials, callback, payment, wallet posting, wager, launch, or real-money authorization.
- The code/test head `668189d0223a4219b8095e34799b2e147bfb9aa5` passed the API/test, build, disposable PostgreSQL migration-rehearsal, and local Compose checks recorded in Section 7. The subsequent commit for this note is documentation-only; do not infer Production readiness or closure of any open question.


## 7. CI evidence checkpoint — 2026-10-22

**Tested code head:** `668189d0223a4219b8095e34799b2e147bfb9aa5` on `feat/phase6-bigbang-catalogue-sandbox`.

- `pnpm api:test`: 29 server tests passed, 0 failed; the same command also passed the 4 config tests and 4 money-package tests. The BigBang cases include malformed required fields/types, full pagination, cross-page total drift, duplicate IDs, incomplete pages, premium-tier rejection, bounded retries, invalid content type/JSON, declared response-size limit, Testcontainers migration rehearsal, idempotent sync, DB-only browsing, last-good preservation, slug suffix collisions, and provider-code collision rollback.
- `API skeleton and contract checks`: passed, including TypeScript/API tests, migration validation, health-contract checks, OpenAPI lint and generated-client drift.
- `Application builds`: passed for the player frontend and admin dashboard.
- Disposable PostgreSQL rehearsals for Migrations 001, 002 and 003 passed; Wallet Migration 006 rehearsal passed; Local Compose bootstrap smoke test passed, including Windows PowerShell 5.1 script parsing.
- The M001/M002/M003 workflow pre/postflight jobs also passed on their disposable PostgreSQL targets. In those workflows, the guarded live-Neon jobs were **skipped** because the runs were pull-request CI rehearsals. No Migration 007 was applied to Neon or Production.
- The initial M001/M002/M003 rehearsal attempts correctly failed closed because the CI inventory expected only M001–M006 while the branch added M007. Their **disposable-CI inventory lists only** were amended to include `1793102400000_bigbang_catalogue_007.sql`; M002/M003 also pin its blob hash `ee72b82a1ea300a7390dae37639063de3052d0f4`. The `neon:` jobs' stricter production migration allowlists remain unchanged and do not admit M007.

Evidence:
- [API skeleton and contract checks](https://github.com/Bclick9/Bclick/actions/runs/39765782841)
- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/39765782970)
- [Migration 001 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39765782947)
- [Migration 002 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39765782845)
- [Migration 003 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39765782934)
- [Wallet Migration 006 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39765782935)
- [Local Compose bootstrap smoke test](https://github.com/Bclick9/Bclick/actions/runs/39765782924)

**Gate status:** Phase 6 catalogue/Sandbox code is merged, but Q-005 and Q-006 remain open; Q-009 is blocked by the confirmed TND precision mismatch; Q-010 remains partially evidenced and open; Q-011 remains NOT RUN / OPEN / P0 and blocks Production. PR #92 includes a BigBang Sandbox demo-launch path, but no BigBang wallet callback or WinHouse Model B wallet endpoint is implemented. Catalogue/legacy-link acceptance, remaining provider event fixtures, the TND precision product decision, and CSP/frame/allowlist acceptance remain open. Wagers, payments, wallet posting, and real-money callbacks remain disabled.


## Local Sandbox runbook — 2026-10-22

The repository-root `.env` is loaded by both Phase 6 package commands using Node's built-in `--env-file=../.env` option from the `server/` workspace.

Required local variables:
- `BIGBANG_SANDBOX_API_KEY=ek_test_...` — the exact name expected by the CLI; the old `BIGBANG_API_KEY` variable is not read by this command.
- `DATABASE_URL=postgresql://...@127.0.0.1:5432/...` — optional if `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`, and `POSTGRES_PORT` are present; in that case the CLI builds a loopback URL from those Compose values. Any explicitly supplied remote `DATABASE_URL` is rejected.
- Set `BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM=YES` in the invoking shell to confirm the local-only action. Do not commit `.env`.

From repository-root PowerShell:

```powershell
$env:BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM = "YES"
pnpm --filter @bclick/server catalog:migrate:bigbang:sandbox
pnpm --filter @bclick/server catalog:sync:bigbang:sandbox
Remove-Item Env:BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM
```

The guarded migration command is a no-op only if Migration 007 is already the final migration in the exact reviewed chain. Otherwise it accepts only the exact eight-entry chain through Migration 006, then applies one migration and verifies Migration 007. Both migration and sync commands reject production runtime, non-`ek_test_` keys, and non-loopback databases.

BigBang's published documentation specifies the shared base URL `https://api.bigbangcasino.bet/api/v1/` for both key types; it does **not** document a separate sandbox hostname. Sandbox access is selected by the `ek_test_` key, which restricts this client to Standard games. The URL is fixed in code and not loaded from `.env`.

If the local database has not yet been initialized through Migration 006, first run `./start-bclick-local.ps1` in PowerShell and leave that terminal open; it starts local Compose PostgreSQL, applies the pending ordered migrations, and starts the API. This bootstrap can itself apply Migration 007, after which the guarded migration command reports `already-applied`. For a database already migrated through 006, start only the loopback PostgreSQL service with `docker compose --env-file .env -f infra/compose/compose.yaml up -d postgres`, then use the two guarded commands above.

The sync populates local database tables `casino_games`, `casino_game_sources`, `casino_providers` and `casino_game_categories`. The player-facing `/casino` route is not switched to these API endpoints in Phase 6 because Q-005's slug/category and legacy URL decision remains open; a successful sync alone therefore does not prove that `/casino` is displaying the database-backed catalog. This is a deliberate acceptance/review boundary, not a sync failure.
