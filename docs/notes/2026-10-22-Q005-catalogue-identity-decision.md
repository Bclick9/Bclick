# Q-005 — BigBang catalogue identity and category contract

**Date:** 2026-10-22  
**Status:** Technical proposal documented and persistent alias implementation delivered in PR #100; **Q-005 remains OPEN/P0 pending Owner acceptance and evidence**  
**Scope:** BigBang Standard Sandbox catalogue and future player-facing catalogue API. This note does not authorize a frontend API cutover, Premium import, Production deployment, wallet callbacks, or real-money operations.

## 1. Evidence inspected

- Current `main` before this PR is `0becbc705421df29d57ba8e0d5fce41429e3d91c` (PR #94).
- Migration 007 defines a globally unique `casino_games.game_slug`. Provider rows are unique by `(source_code, external_game_id)` and by `(source_code, game_id)`; `source_mode` is stored but is not part of the uniqueness key.
- `server/src/bigbang/catalog.ts` creates a slug from the first observed title + provider label, adding `-bb-<external_game_id>` for a collision. Existing external IDs reuse their existing UUID and slug. Source rows preserve the provider's `category`, `category_title`, `mode`, and `game_type`.
- BigBang's published API contract, reviewed 2026-10-22 at https://api.bigbangcasino.bet/docs/, describes each game with a numeric `id`, a launch `name`, a display `title`, `provider`, singular `category` and `category_title`, plus `mode`, `is_premium`, `game_type` (`slot`, `live`, or `crash`) and `is_demo`. The same page describes `GET /categories` as the providers/categories visible to the key. It does **not** define a provider `categories[]` array. Catalog visibility depends on the key's plan/shop configuration; Sandbox keys are restricted to Standard.
- The current example fixture is the published documentation example, not a captured live response. Synthetic pagination tests do not prove the size of this account's current catalogue. No provider credential or live catalogue request was used for this work.

## 2. Proposed contract

### Canonical identity and slugs

1. `casino_games.id` (UUID) is Bclick's canonical internal identity. It is the stable lookup identifier used between Bclick API layers; vendor numeric IDs must not become public canonical IDs.
2. For the currently supported Standard-only source, the mapping key is `(source_code='bigbang', external_game_id)`. Never deduplicate games by title or launch `name` alone; display-title/provider-name changes are not proof that two records are the same game.
3. Create a public slug once, from the first accepted title + provider label, and keep it unchanged when that source identity is renamed. Slugs remain globally unique and must fit the database's lower-kebab 120-character limit. For a first-time collision, process numeric BigBang IDs in ascending order; the first receives the base slug and subsequent collisions receive a deterministic `-bb-<id>` suffix. This avoids a daily shuffled provider response choosing different slug winners on a fresh database bootstrap.
4. If an external provider ID changes, do not automatically merge by matching title/name. Require explicit, reviewed alias/remapping evidence.
5. Keep retired/missing provider source records for traceability; mark them unavailable rather than deleting/reusing their canonical identity. The current detail routes intentionally return 404 for unavailable catalogue games.
6. Existing storefront URLs must not be rewritten by fuzzy title matching. The existing exact title + provider fallback is acceptable only while it returns exactly one match; zero or multiple matches must fail safely. Before switching the player frontend to the database API, introduce a persistent legacy-slug alias table with a globally unique alias and one canonical UUID target, seed it from the current curated storefront slugs, and test resolution of valid, missing and ambiguous aliases. That alias migration is not part of this PR, so player routes must not be cut over yet.

### Categories

1. `categories[]` in Bclick's catalogue API is a set-like array of **canonical Bclick category slugs**, not a direct copy of BigBang's singular `category` or `category_title` fields. Sort it lexicographically in API responses for deterministic output; array order has no business meaning.
2. Preserve BigBang's raw `category` and `category_title` in the source row for search/reconciliation and future mapping. Do not automatically present them as game categories: the published contract uses these fields for the provider/category dimension.
3. The current Sandbox mapping is intentionally conservative: `game_type=slot` → `slot-games`; `live` → `live-casino`; `crash` → `crash-games`. Under this proposal this is the complete current canonical taxonomy mapping, so each current provider record has one category. The array shape remains useful for future multi-category mapping.
4. Any future genre/subcategory such as classic slots, jackpots or table games needs an explicit versioned source-to-canonical mapping table and fixtures. Do not guess from title strings or silently convert provider names to categories. Unknown source categories remain preserved as source metadata and receive only the approved `game_type` fallback category until a mapping is approved.

### Standard versus Premium identity

The current Sandbox client requests `type=standard` and rejects any Premium record. The database uniqueness key omits `source_mode`; therefore it is **not yet safe to import Premium** unless BigBang confirms in writing that numeric IDs are globally unique across Standard and Premium. The default safe design before any Premium support is to migrate the identity key and sync lookup/upsert logic to include `source_mode`, then test same numeric ID in both tiers. No Premium import or migration is included here.

## 3. Count discrepancy: 3,802 versus 3,639

The project records an owner-reported Standard Sandbox sync of 3,639 games and a separately reported figure of 3,802. These numbers are not yet proven comparable. BigBang's documentation states that the catalog visible to a key depends on plan/shop configuration. Close this discrepancy only with either:

- redacted evidence from the same key/account, `type=standard`, identical filters, and a time-scoped complete pagination run whose `pagination.total` remains consistent across every page; or
- a written BigBang explanation naming the scope/entitlement difference.

Record timestamp, key label (never the secret), requested tier/filters, reported total and page offsets. Never commit API keys or full unredacted responses. A numeric difference alone is not proof that 163 particular games are missing.

## 4. Acceptance work in the Q-005 implementation (PR #100)

The earlier merged work in PRs #94 and #95 covers route shape, canonical category ordering, deterministic collision-slug assignment and stable UUID/slug behavior on provider title rename. The current review branch adds:

- Migration 009 creates `casino_game_legacy_slug_aliases` and seeds the exact 59 curated game slugs from `frontend/data/catalog.ts` with their original title/provider metadata. Promotional cards, jackpot widgets and payment IDs are not treated as game routes.
- A successful Standard Sandbox catalogue sync binds an unresolved alias only when exactly one available Standard BigBang record matches the stored title and provider after trimming outer whitespace and case-folding. The alias pins to the canonical UUID thereafter; unmatched records remain unresolved, and duplicate candidates are marked ambiguous. No fuzzy title matching is used.
- The by-slug API checks the persistent alias first. Resolved aliases return the canonical game; unresolved aliases return 404 and ambiguous aliases return 409 without falling through to another game's canonical slug.
- Route tests cover canonical slug resolution, a valid legacy alias, an unmatched alias, and an ambiguous alias. A PostgreSQL-backed catalogue-sync test verifies that the curated `lightning-roulette` route resolves to the UUID for the exact Standard record and returns that game's canonical slug.
- OpenAPI and generated client types include the 409 conflict response. The migration remains additive and does not change wallet or provider money-movement behavior.

The implementation is additive; review or merge does not itself authorize a storefront cutover or close Q-005.

## 5. What remains OPEN

Q-005 **is not closed by this PR**. Required next evidence/decisions:

- Owner acceptance or amendment of the proposed identity/category/legacy-link contract.
- PR #100 has merged the persistent alias implementation; its merge does not authorize frontend catalogue API cutover. Owner acceptance remains a separate gate, alongside the count discrepancy evidence and Standard/Premium identity scope.
- Same-key/same-scope evidence or a written vendor explanation for 3,802 versus 3,639.
- Written confirmation of cross-tier ID uniqueness, or a reviewed tier-inclusive identity migration before Premium support.

Q-006 remains separate: pin and review the exact normative BigBang and WinHouse agent artifacts and hash-matched fixtures. Q-010 and Q-011 remain P0 blockers for Phase 5 exit and all Phase 8 money movement. Nothing in this PR enables wallet posting, provider callbacks, payments, wagers, Premium games, or Production launch.
