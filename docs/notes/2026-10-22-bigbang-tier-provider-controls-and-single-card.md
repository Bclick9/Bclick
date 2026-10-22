# BigBang Standard/Premium controls, provider availability, and single-card catalogue

**Date:** 2026-10-22  
**Status:** Architecture decision / current-state gap review. No runtime code, database rows, or provider configuration changed by this note.  
**Related gates:** Q-005 OPEN/P0, Q-006 OPEN/P0, Q-013 OPEN/P0, Q-020 OPEN/P0. Phase 8 remains NOT STARTED.

## 1. Decision summary

Bclick should expose one canonical game card per accepted Bclick game identity, not one card per launch mode. Standard/Premium is a source/availability choice controlled by an authorized administrator; Demo/Play is a player action against the one displayed game.

These are separate axes:

- **Provider tier:** Standard or Premium — determines which BigBang source/tier is selected for catalogue sync and whether the game is eligible to be listed/launched.
- **Provider availability:** whether the provider is enabled for Bclick. This is Bclick's own operational kill switch; it must not depend on whether the provider remains enabled in BigBang's external console.
- **Game availability:** whether a particular canonical game is enabled for Bclick.
- **Player launch mode:** Demo or Real/Play. Demo is the currently implemented Sandbox-only launch. Real/Play is not implemented/authorized for BigBang and must remain unavailable.

Do not conflate these switches. Disabling a provider in Bclick must immediately suppress its games from catalogue responses and block launches server-side, even if the external provider still reports the games. If BigBang disables/removes a provider, the next successful, complete sync must mark that source unavailable and the effective catalogue must also suppress it. A failed or incomplete sync must not accidentally deactivate the catalogue; it must retain the last known snapshot and clearly report stale sync state.

## 2. Standard/Premium: proposed admin workflow

A tier selector belongs in the real BigBang provider settings page of Bclick Admin, not in the player catalogue and not as a separate card toggle per game.

Recommended operator workflow:

1. Admin opens **Integrations → BigBang** and sees the configured environment/key label (secret never shown), last successful sync time, current tier, catalogue count, and sync status.
2. An authorized admin selects **Standard** or **Premium**, sees a confirmation describing the scope change, then explicitly starts a sync for that one tier.
3. Backend validates the credential/environment against the requested tier, fetches a complete single-tier snapshot, validates `mode` and `is_premium` on every row, and publishes that tier transactionally. Mixed-tier snapshots are rejected. The operation is audited with actor, tier, counts, outcome, timestamp and safe error code; never log the API secret.
4. Before publication, show a preview of additions, updates, and games/sources that would become unavailable. Tier changes must not silently retarget legacy aliases or merge records by title.
5. The admin confirms publication. Rollback should be a reviewed catalogue operation, not an automatic switch that reactivates stale provider IDs.

**Important current limitation:** The current client is Sandbox-only, requires an `ek_test_` key and requests Standard. Migration 010 only makes source identity tier-aware; it does not implement a Premium client, live-key configuration, Premium sync, or a tier-selection API. Therefore a Standard/Premium selector would currently be a misleading control. Implement the control only alongside approved backend support, authorization, audit trail, tier-specific validation, tests and Owner acceptance. Until then, the admin must not offer a working Premium switch.

A tier switch is also not necessarily a simple Boolean on each provider. The same named provider can expose different game sets, provider labels and entitlements in Standard and Premium. Store the selected tier explicitly at integration/source level and scope sync, visibility and launch to that tier.

## 3. Provider disable in Bclick versus BigBang

### Required Bclick behavior

The Bclick admin provider enabled/disabled setting must be authoritative for Bclick's storefront and launch API:

- Disabled provider → its games do not appear in catalogue, provider filters, search results, game detail/slug routes or promotional entry points.
- Disabled provider → launch endpoint rejects the request server-side before calling BigBang.
- Re-enable → only makes the provider eligible again; a source/game must also be present and available in the last accepted snapshot and pass the selected tier policy.
- The admin action must persist in the backend database and have authorization, audit history and a clear current state. A local React-only toggle is not a real control.

### Required response to external BigBang disable

A complete successful sync should compare the selected tier's latest provider/game snapshot with previously stored source rows. Sources absent from that successful snapshot should be marked unavailable for that tier; they should not be deleted or have their canonical UUID/slug reused. Provider-level external availability must be stored explicitly if the provider API actually exposes it; do not infer a provider-level disable from a missing game in a partial response.

An external console change is not a push event unless BigBang documents and Bclick implements such a webhook. Until then, Bclick learns of the change at the next successful sync. Admin UI should show the last sync timestamp/staleness so the user understands this propagation delay.

### Current-state finding from repository review

- `backend/pages/cms/Providers.tsx` is a local UI preview backed by `useState` and five hard-coded sample providers. Reordering, badge toggling and reset are local preview operations; it is not connected to the BigBang database/API and has no enabled/disabled provider switch.
- The current BigBang catalogue schema has provider records, per-game `available`, and per-source `available`, but no persisted integration-level selected tier or Bclick-owned provider enable/disable setting.
- The catalogue API filters on game and source availability, but it does not join an authoritative provider-enabled setting because none exists.
- The Sandbox demo-launch route verifies canonical game availability and Standard source availability. It does not yet check a Bclick-owned provider enabled flag because that flag is not implemented.
- The catalogue sync has a tier-scoped source identity foundation and a Standard sync, but this is not yet a complete admin-controlled tier/availability lifecycle.

**Conclusion:** Your observed behavior is not correct for the intended production admin contract. Disabling a provider in a local/mock admin table cannot affect the real catalogue. This must be implemented as a backend-backed setting and enforced both at read and launch boundaries. This note records a code-review finding; it does not claim a live running instance was toggled or reproduced during this review.

## 4. One card, Demo and Play

The target UI should follow this logical model:

- One canonical Bclick game record/card.
- Card image/title/provider/categories are sourced from the canonical record and selected, accepted provider identity.
- **Demo** invokes only the authorized demo endpoint for that same canonical UUID. Current BigBang implementation is Sandbox-only.
- **Play** invokes a future real-mode endpoint for the same canonical UUID. It must remain disabled/hidden until real launch, player session/token, provider contracts, CSP and wallet/ledger gates are accepted.
- Demo and Play are actions/buttons on the same card, not two catalogue entries.
- Do not create separate cards merely because Standard and Premium return similarly named records. If evidence establishes two genuinely distinct products, preserve separate canonical product identities; if the same game is available through both tiers, a reviewed source-selection policy must select one eligible source and return one canonical card. Never decide equivalence from title substring alone.

The current catalogue API returns one row per canonical `casino_games.id` with `modes: { demo, real }`, and the current demo endpoint accepts that UUID. However, `frontend/pages/CasinoPlay.tsx` still resolves old static display entries through `resolveLegacyGame(title, provider)`: if no exact provider match exists but exactly one title match exists, it returns that candidate anyway. This is an unsafe cross-provider fallback and conflicts with Q-005's exact identity contract; remove it in a separately tested frontend change and use the persistent alias/canonical UUID API only. The page also deliberately locks `mode=real`, so a real Play flow does not exist yet. The source identity schema now allows tier-distinct source rows, so the next design must explicitly define how one canonical game can relate to multiple BigBang sources without duplicate cards. Do not add a Premium row to an existing game just because its title matches. Do not enable `real_available` as a UI-only change.

### Required source-selection contract before Premium import

Before implementing Premium import, document and test:
1. Whether a canonical game can have multiple BigBang source rows (one per tier) and how the selected source is chosen.
2. Which tier is authoritative for listing and demo launch when both tiers offer the same accepted product.
3. What happens when the selected tier loses the game but another tier still has it: keep the canonical card available only if policy explicitly allows fallback; never silently switch tiers or provider identity.
4. How a legacy alias pins to a canonical product independently of source tier. Migration 009 currently stores one alias-to-one game UUID; it must not become an implicit tier-routing mechanism.
5. Unique API response semantics and tests proving no duplicate canonical card even if two source rows exist.
6. Admin authorization, confirmation, audit log, preview/dry run, complete-snapshot validation, stale-sync handling and safe failure behavior.

## 5. Work sequence and gates

1. Keep Q-005 open. Complete Owner review of the 59 alias dispositions, canonical identity/category contract, and 3,802 versus 3,639 count discrepancy.
2. Keep Q-006 open until BigBang/WinHouse event and launch contracts are accepted.
3. Review OpenAPI and runtime contracts under Q-020 for provider settings, tier switch, provider disable, game disable, catalogue visibility and launch rejection.
4. Design a separate reviewed migration for Bclick-owned provider/integration settings and tier configuration. Do not edit Migration 010 after it has been merged; create a new migration with safe preconditions/down behavior.
5. Implement backend authorization/audit and enforcement first; then wire the admin UI to real endpoints; then add route/integration tests; only after that consider frontend card wiring.
6. Keep Q-013 CSP/frame/host-header review and Q-011 restore drill open.
7. Do not start Phase 8, provider callbacks, wallet posting, Premium/live-key sync or real-money Play until all required gates and explicit authorization are met.

## 6. Acceptance checklist

- [ ] Admin Standard/Premium control is only shown when backend supports the selected tier; no secret exposure.
- [ ] Tier sync is single-tier, complete-snapshot, transactional and auditable.
- [ ] Admin provider disable persists and immediately hides all provider games.
- [ ] Disabled provider/game cannot launch via a direct API request.
- [ ] External provider removal is applied only after a successful complete sync; failed sync preserves last known catalogue.
- [ ] Provider and source availability are distinguishable and visible to admins.
- [ ] One canonical card is returned when one accepted game has one or more eligible tier sources.
- [ ] Demo action uses Sandbox/demo only; Play stays disabled until its real-mode contract and gates are approved.
- [ ] Legacy aliases never silently retarget across tiers.
- [ ] Tests cover tier collision, disabled provider/game, failed sync, stale sync, duplicate-card prevention and launch denial.
- [ ] Q-005, Q-006, Q-013 and Q-020 are reviewed; Q-011 and Q-010 remain independent blockers for Production/real-money operations.

**No implementation, Premium import, live key use, frontend cutover, Phase 8 or real-money operation is authorized by this note.**
