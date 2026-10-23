# Storefront provider visibility, Skin Games CMS, and BigBang tier review

**Date:** 2026-10-23  
**Status:** Repository review and ordered implementation plan; this PR makes only the narrow Brands/provider-page and Lobby-shelf correction described below.  
**Release boundaries:** Standard Sandbox only. Q-005/Q-006/Q-010/Q-011/Q-013/Q-020 remain open. Phase 8 remains NOT STARTED.

## 1. Findings confirmed from the current repository

### Provider/game availability enforcement exists in the API

- `server/src/bigbang/routes.ts` already filters public categories, providers and games to rows where the source is BigBang Standard, the source row is available, `casino_games.available=true`, `casino_games.bclick_enabled=true`, and `casino_providers.bclick_enabled=true`.
- `GET /api/v1/casino/providers` already exists and returns only providers having at least one game which passes that effective visibility predicate.
- Game slug and UUID details also fail closed when a game or its provider is unavailable. The demo-launch route checks the persisted provider/game/source availability before invoking the Standard Sandbox client.
- Therefore, the provider-blocking control and its backend filter are not the missing piece on these API-backed routes.

### Why the storefront can still show apparently blocked games

`frontend/pages/Casino.tsx` contains two data sources:
- The API-backed catalogue calls (Lobby search, Slot Games, Live Casino, Crash Games and the canonical slug/detail/demo path) use the local catalogue endpoints, which apply the enablement checks.
- Several other UI shelves/pages still render the static `GAMES` array: the old Trending shelf, generic `GameGrid` category pages, Halloween banner cards, provider index, and provider detail page. These cards do not receive the current Bclick provider/game state from PostgreSQL. That is why a disabled provider can continue to appear in parts of the site even though the actual demo-launch request refuses to open it.

This is a **storefront data-source inconsistency**, not proof that the persisted provider-disable mutation failed. The screenshot/page check should distinguish the endpoint-backed list from the remaining static UI surfaces.

### Current CMS Skin Games is not an operational games editor

`backend/pages/cms/SkinGames.tsx` is fed from `INITIAL_CMS_SKIN_GAMES` in the React application state in `backend/App.tsx`. Its current six records are hard-coded sample games. Drag ordering, Active/Paused status, Edit Game fields and image upload all update only that browser state; the component itself says the changes are saved to a local preview and publishing is not connected. Image uploads use `URL.createObjectURL`, which is a temporary browser URL, not a persistent uploaded asset.

The screen includes speculative fields such as RTP, player count, certificate number, bet limits, skin, category expirations and game parameters. Most are not persisted in the BigBang catalogue schema, and the player-count/RTP values are demo data. We must not persist or present these fields as authoritative without a separate accepted data source and business contract.

### PR #112 created a temporary UX split

PR #112 connected the protected BigBang provider-and-game enablement controls to `CMS → Providers`. That made the operational toggle available, but the game management table is functionally in the wrong CMS home compared with the existing Skin Games design. `CMS → Providers` should become provider-level availability/metadata only; the per-game list, ordering, enable/disable and Edit Game presentation fields belong in `CMS → Skin Games`. This is a product/workflow inconsistency, not a missing authorization boundary: server routes still own authorization, CSRF checks, persistence and audit logging.

## 2. Narrow fix included in this PR

- `/casino/rng/brands` reads the existing active-provider API instead of `GAMES.map(...)`. Providers without an enabled, available Standard Sandbox game are omitted, including Bclick-disabled providers.
- `/casino/providers/:provider` resolves a current provider record and queries games using its exact stored Bclick provider code. It no longer builds a fake list from static `GAMES`.
- The Lobby's former “Trending Games” shelf no longer displays hard-coded sample cards. It renders a small set of current API-backed available games and fails closed rather than falling back to the demo list.
- The public `provider` filter is changed from substring matching to an exact stored provider code or exact display name. Search remains available via the separate `query` parameter. This avoids a provider detail page silently including a second provider whose name/code merely contains the same substring.
- Added tests around the provider directory API client and exact provider filter.
- This is intentionally **not** a claim that every static category/Halloween shelf has been migrated. The remaining surfaces are recorded below, to avoid silently crossing the Q-005 storefront-cutover gate.

## 3. Recommended CMS Skin Games contract

Use the canonical `casino_games.id` UUID as the stable identity in every admin mutation. A game in the table should include source/provider identity, title and slug, source availability, Bclick game availability, Bclick provider availability, default provider thumbnail, the effective display image/description/order, plus audit metadata. Keep disabled records visible to an authorized administrator so they can be re-enabled; omit them from public catalogue responses.

A separately reviewed migration (proposed Migration 012, not created in this PR) should add a presentation-override table keyed one-to-one by `casino_games.id`, rather than putting operator-edited content into provider-owned sync columns. Initial minimum fields:

- `game_id` primary key/foreign key to canonical game UUID;
- optional `custom_image_url` (null means use the provider thumbnail);
- optional/empty `description` override;
- `display_order` integer for deterministic ordering;
- `updated_by` foreign key to the admin user and `updated_at` timestamp.

Use the existing `casino_games.bclick_enabled` for game enable/disable and existing `casino_providers.bclick_enabled` for provider enable/disable; do not create duplicate `active` flags. Use `casino_game_categories` for actual mapped category membership rather than the mock category list. The public API should apply the overrides without changing canonical source identity, provider identity or the provider launch slug.

A persistent image upload must be designed before enabling a file input: validate MIME type by bytes, size and dimensions, generate a server-side filename, save to the configured local asset store (or another explicitly accepted storage provider), enforce access and safe serving headers, and persist a stable same-origin URL. Never persist a `blob:` URL. Until that storage path is reviewed, use the provider thumbnail as the default and either an allowlisted existing image URL field or keep upload disabled.

The real `Edit Game` modal should initially persist only approved fields: custom image, description, display order and the separate availability switch. The screen may retain its useful layout and reordering UX, but do not show fake RTP/player counts, claim certificate data, or make unsupported bet-ladder/skin parameters writable. If featured/home placement is required in addition to a global order, specify and persist that as a distinct placement contract rather than inferring it from the mock `showOnPage` array.

## 4. Standard/Premium: do not add a per-game switch

The current BigBang docs identify Standard/Premium as provider-source tiers, not an arbitrary Bclick label. `GET /api/v1/games` accepts `type=standard` or `type=premium`; returned game rows include `mode` and `is_premium`. Providers/categories are also source-defined. A Sandbox key prefixed `ek_test_` sees Standard only and Premium is blocked; Premium access requires an eligible live key and a funded balance. See the official [API documentation](https://api.bigbangcasino.bet/docs/) and [service terms, especially §§2, 6 and 12](https://api.bigbangcasino.bet/terms/).

Consequences:
- Do not let an administrator toggle one game from Standard to Premium. That would relabel/retarget identity without changing the BigBang source, credentials, licence/plan entitlement or launch capability.
- The same studio/provider name can have distinct Standard and Premium source rows; Migration 010 made source identity tier-inclusive to prevent false deduplication. Keep `casino_games.id` canonical inside Bclick and retain `source_mode` in source identity.
- Current Migration 011 deliberately constrains `casino_integration_settings.selected_mode` to `standard`; the API client requires the Sandbox key and the launch route sends `demo: true`. No Premium sync client, credential setup, tier-selection mutation, or real-play path exists.
- If/when the Premium phase is explicitly approved, the switch belongs under an Integration/BigBang settings screen: choose the authorized source tier, validate the credential and access before sync, run a complete tier-scoped sync, validate every record's `mode/is_premium`, preview added/changed/unavailable records, publish transactionally after confirmation, and audit actor/tier/counts/outcome. It must not be a property on each Skin Games card. Keep Premium visibly unavailable/read-only until that whole path and its gates are implemented and accepted.

## 5. Ordered next work and gate audit

### A. Close the storefront identity/count gate before the broad cutover

**Q-005 remains OPEN/P0.** The current owner-evidenced Standard snapshot is 3,639, but the provenance of the separate 3,802 count has not been reconciled. Locate the original 3,802 measurement (time, key/shop label without any secret, requested tier/filter, pagination and total fields) or produce an equivalent same-scope complete probe / written BigBang explanation. Also reconcile provider identity from the documented `GET /api/v1/categories`: the current sync constructs local provider records from game display names rather than proving a complete source-provider list/slug match. Do not infer missing games or merge games from matching titles alone.

Once Q-005 accepts the count/source identity and category/legacy-route semantics, complete one reviewed storefront cutover across every surface: Lobby shelves, category grids, provider index/details, Halloween/Top Picks and search. Every visible card should correspond to one enabled canonical DB row and launch by the canonical slug/UUID contract. Add runtime tests for disabled provider/game omission from every collection/detail route and for pagination/category/provider/search combinations. Until then, don't mark the whole storefront migrated; the current PR only removes three clear static paths.

### B. Make Skin Games the single game-management workflow

After the presentation data contract is accepted, add Migration 012 and admin API endpoints for paged game list, reorder, and editing the supported presentation fields. Require the existing admin session + MFA, `casino.provider-settings.manage` (or a separately reviewed CMS permission), CSRF and audit events. Reorder should validate the entire requested ordered UUID list, reject foreign/non-Standard IDs, and persist atomically; edits must validate image/description/order lengths and never mutate vendor source identity. Then wire Skin Games to those APIs and remove the duplicate individual-game management table from Providers, leaving Providers provider-level only. Keep a reversible Sandbox test for each action.

### C. Keep phase boundaries explicit

- **Current completed:** Standard Sandbox source/catalog APIs, persisted provider/game availability flags, server-side filtering/launch rejection, and admin auth/CSRF/RBAC/audit foundations.
- **Current partial:** storefront still mixes API-backed catalogue views with static UI-data shelves; Brands/Provider detail and Lobby's shelf are being corrected here, but full cutover waits for Q-005. Skin Games is still a mock.
- **Not yet implemented:** persistent custom presentation/order management; provider/source official catalogue reconciliation; Premium sync/selection; real Play/wallet callbacks.
- **No phase skip allowed:** do not close Q-005/Q-006, Q-010/Q-011/Q-013/Q-020, do not begin Phase 8, and do not enable Premium import, live-key sync, payments, wagers or real-money flows from this UI work. Re-evaluate gates only with recorded evidence and Owner acceptance.
