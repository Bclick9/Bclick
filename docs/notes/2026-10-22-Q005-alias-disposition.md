# Q-005 — Legacy alias disposition from local Standard Sandbox audit

> **Historical note — superseded on 2026-10-23.** This file records the 2026-10-22 conservative alias decision only. The Project Owner later confirmed that the count discrepancy was explained and outdated links were removed. The current Q-005 branch retires runtime alias resolution, clears the alias inventory with forward-only Migration 014, and leaves canonical UUID/slug identities unchanged. Do not use the 59-row inventory below as current runtime policy or repeat the count investigation.

**Evidence date:** 2026-10-22  
**Source:** Project Owner-supplied output from `scripts/q005-catalogue-alias-audit.sql`, run against local Docker PostgreSQL after the reported 3,639-record Standard Sandbox sync.  
**Status:** Evidence inventory with Project Owner acceptance of the conservative per-alias disposition recorded on 2026-10-22. This acceptance preserves the 59 alias records and accepts only the three evidence-backed mappings; it does not resolve the 56 unmatched aliases, close Q-005, or authorize frontend cutover.

## 1. Summary

The audit returned all 59 seeded legacy aliases. Their stored statuses were 3 `resolved`, 56 `unmatched`, 0 `pending`, and 0 `ambiguous`.

| Audit evidence class | Count | Recommended treatment |
|---|---:|---|
| `already_resolved` | 3 | Preserve the established UUID and canonical slug |
| `title_found_provider_mismatch` | 10 | Keep unmatched; review source/provider/tier identity individually |
| `related_titles_only_manual_review` | 8 | Keep unmatched; similar wording does not prove game identity |
| `not_found_in_current_standard_catalogue` | 38 | Keep unmatched for this snapshot; do not infer a target |
| **Total** | **59** | No additional aliases are auto-resolved by this audit |

Among the 56 currently unmatched rows, the query found no exact title-and-provider identity candidate and no multiple exact identity candidate. This output supports the existing fail-closed resolver; it does not justify fuzzy matching or broad provider aliases.

## 2. Preserve the three confirmed aliases

| Legacy alias | Canonical slug | BigBang Standard external ID | Bclick game UUID |
|---|---|---:|---|
| `aviator` | `aviator-spribe` | 214488 | `ba8cf5c4-a3d6-4c17-bb99-15e51efc2c61` |
| `le-bandit` | `le-bandit-hacksaw` | 219364 | `8e2a70d7-efcd-4f92-93a8-fc78a399c11a` |
| `wanted-dead-or-a-wild` | `wanted-dead-or-a-wild-hacksaw` | 219363 | `e8deac01-2d0c-48a3-9c70-8ca785aa9a61` |

Recommendation: leave these UUID-pinned mappings untouched. A later provider rename should not automatically retarget them.

## 3. Exact title present, provider identity differs — 10 aliases

Each row below had one normalized exact-title candidate, zero exact title-plus-provider matches, and one title/provider mismatch in the current available Standard snapshot.

| Legacy alias | Legacy provider | Current Standard candidate provider | Canonical slug | External ID | Candidate Bclick UUID |
|---|---|---|---|---:|---|
| `auto-roulette` | Evolution | Iconic21 | `auto-roulette-iconic21` | 72924 | `41ff9c90-2b18-4f51-97ca-851343d713ba` |
| `big-bass-trophy-catch` | Pragmatic Play | Pragmatic | `big-bass-trophy-catch-pragmatic` | 234690 | `820d8bcb-b4cf-4644-a8a3-1c14d9e045f6` |
| `dragon-tiger` | Evolution | Iconic21 | `dragon-tiger-iconic21` | 72537 | `c3de132a-623a-4696-981b-45611803bf00` |
| `european-roulette` | Playtech | Amusnet Live | `european-roulette-amusnet-live` | 337301 | `2f3c8e9e-04b5-4a49-8cf9-61e859f0bf1a` |
| `gates-of-olympus` | Pragmatic Play | Pragmatic | `gates-of-olympus-pragmatic` | 214246 | `7dc9d028-ef68-4dbd-8f57-6c7b411a6bdc` |
| `lucky-ladys-charm` | Novomatic | Novamatic | `lucky-lady-s-charm-deluxe-novamatic` | 219644 | `61882e25-98d8-45d6-b1dd-1bcf354415e0` |
| `mega-joker` | Novomatic | GREENTUBE | `mega-joker-greentube` | 708053 | `5fa47f8a-486b-4c5c-8e77-ebc99092c367` |
| `sugar-rush` | Pragmatic Play | Pragmatic | `sugar-rush-pragmatic` | 214342 | `71ee7b0d-dabf-4b1c-9e8e-f2e2af346e40` |
| `sweet-bonanza` | Pragmatic Play | Pragmatic | `sweet-bonanza-pragmatic` | 214194 | `bbb1f6c7-350d-4acb-b81f-0f188f1cd165` |
| `wolf-gold` | Pragmatic Play | Pragmatic | `wolf-gold-pragmatic` | 214325 | `0ae40ac0-86cc-494c-a9bc-01a969a43350` |

**Recommended disposition: unresolved/manual identity review for all 10.** These are candidate records, not accepted mappings. The audit does not establish that a similarly named game from a different provider is the same product as the original UI target.

In particular, the public BigBang contract explicitly distinguishes Standard provider `Pragmatic` from Premium provider `Pragmatic Play`; Sandbox keys only see Standard. Thus the five legacy `Pragmatic Play` entries above must not be auto-remapped to Standard merely because a title matches. Before any future Premium/live-key work, use the exact tier-specific provider/game identity evidence and agree whether the desired legacy route should target Standard, Premium, or a tier-aware product identity. The same no-synonym rule applies to Evolution/Iconic21, Playtech/Amusnet Live, Novomatic/Novamatic, and Novomatic/GREENTUBE.

## 4. Related titles only — 8 aliases

These had no exact title candidate. The single related-title candidate listed by the query is evidence for manual review only, not a redirect target.

| Legacy alias | Legacy title / provider | Related Standard candidate | Candidate external ID |
|---|---|---|---:|
| `blackjack-classic` | Blackjack Classic / Netent | Blackjack — Iconic21 (`blackjack-iconic21`) | 403306 |
| `blackjack-vip` | Blackjack VIP / Evolution | Blackjack — Iconic21 (`blackjack-iconic21`) | 403306 |
| `mega-wheel` | Mega Wheel / Pragmatic Play Live | Wheel — Inout (`wheel-inout`) | 215183 |
| `mental` | Mental / Nolimit City | Elemental Gems Megaways — Pragmatic (`elemental-gems-megaways-pragmatic`) | 236333 |
| `speed-baccarat` | Speed Baccarat A / Evolution | Speed Baccarat — Amusnet Live (`speed-baccarat-amusnet-live`) | 337112 |
| `super-sic-bo` | Super Sic Bo / Evolution | Sic Bo — Iconic21 (`sic-bo-iconic21`) | 403301 |
| `sweet-candyland` | Sweet Bonanza Candyland / Pragmatic Play Live | Sweet Bonanza — Pragmatic (`sweet-bonanza-pragmatic`) | 214194 |
| `zeus-vs-hades` | Zeus vs Hades: Gods of War / Pragmatic Play | Zeus — JILI (`zeus-jili`) | 550800 |

Recommendation: keep all eight unmatched unless the provider/operator supplies an authoritative identity mapping or the Owner explicitly accepts a replacement product after review. Do not map `Sweet Bonanza Candyland` to `Sweet Bonanza`, or any blackjack/roulette/table-game family to a generic sibling, by substring alone.

## 5. Not found in the current available Standard snapshot — 38 aliases

No exact title or related-title candidate was reported for these aliases in the current local Standard snapshot.

| Legacy alias | Legacy title | Legacy provider |
|---|---|---|
| `baccarat-pro` | Baccarat Pro | Netent |
| `blazing-coins` | Blazing Coins: Hold and Win | Popiplay |
| `book-of-dead` | Book of Dead | Play'n GO |
| `boom-city` | Boom City | Pragmatic Play Live |
| `coins-of-halloween` | Coins of Halloween: Hold & Win | Betsoft |
| `crazy-coin-flip` | Crazy Coin Flip | Evolution |
| `crazy-time` | Crazy Time | Evolution |
| `death-dominion` | Death Dominion | Pragmatic Play |
| `devils-feast` | Devil's Feast | Pateplay |
| `dream-catcher` | Dream Catcher | Evolution |
| `eggs-of-fortune` | Eggs of Fortune | Popiplay |
| `fire-in-the-hole` | Fire In The Hole | Nolimit City |
| `funky-time` | Funky Time | Evolution |
| `gates-of-hell` | Gates of Hell | Pateplay |
| `golden-wealth-baccarat` | Golden Wealth Baccarat | Evolution |
| `halloween-bonanza` | Halloween Bonanza | BGaming |
| `halloween-jack` | Halloween Jack | Netent |
| `haunted-coins` | Haunted Coins X1000 | Pateplay |
| `jetx` | JetX | SmartSoft |
| `lightning-dice` | Lightning Dice | Evolution |
| `lightning-roulette` | Lightning Roulette | Evolution |
| `live-casino-holdem` | Live Casino Hold’em | Evolution |
| `mega-ball` | Mega Ball | Evolution |
| `money-train-3` | Money Train 3 | Relax Gaming |
| `monopoly-big-baller` | Monopoly Big Baller | Evolution |
| `monopoly-live` | MONOPOLY Live | Evolution |
| `raptor-doublemax` | Raptor 2 Doublemax | Yggdrasil |
| `razor-shark` | Razor Shark | Push Gaming |
| `silver-coins` | Silver Coins | BF Games |
| `spaceman` | Spaceman | Pragmatic Play |
| `spooky-kabuki` | Spooky Kabuki | Yggdrasil |
| `starburst` | Starburst | Netent |
| `texas-holdem-bonus` | Texas Hold’em Bonus Poker | Evolution |
| `vamp-hunt` | Vamp Hunt | Pateplay |
| `wealth-bells-40` | Wealth Bells 40 | EvoPlay |
| `wild-clusters` | Wild Clusters | BGaming |
| `wolf-power-megaways` | Wolf Power Megaways | Playson |
| `xxxtreme-lightning-roulette` | XXXtreme Lightning Roulette | Evolution |

**Special case — `crazy-time`:** The Owner explicitly confirms BigBang does not provide Crazy Time. Keep this legacy route unmatched and do not search for or substitute an assumed equivalent.

For the other 37 entries, “not found” means only that this particular available Standard snapshot provided no candidate. It does not prove that every plan, shop, live key, or Premium catalogue lacks the title. Any later tier check must query the authorized live catalogue and provider list with the same recorded scope; do not use a live key in the Sandbox workflow.

## 6. Real-money readiness: a remaining route-contract question

Migration 010 makes source uniqueness tier-aware and the current browse/detail/demo path is Standard-only. However, Migration 009's alias table has one `alias_slug` and one pinned `game_id`; it cannot by itself express two different canonical game targets for the same legacy slug depending on Standard versus Premium.

Before any frontend cutover or real-money catalogue launch, decide and test one of these contracts:
1. the legacy slug points to one stable Bclick product identity whose tier-specific source is selected safely by the requested/authorized mode; or
2. the legacy slug has explicit tier-specific targets and the route validates the requested mode against player/session/launch policy.

Which design is correct depends on whether the provider confirms the Standard and Premium entries are the same underlying game identity or distinct products. Do not choose from titles alone. Provider-source identity, displayed provider name, launch ID, mode, availability, and permissions must remain consistent in responses and launch operations.

## 7. Project Owner disposition and explicit decisions (2026-10-22)

The Project Owner has accepted the conservative disposition of the current 59-row audit:

- Preserve all 59 legacy slugs as persistent compatibility records. Keep the three evidence-backed mappings pinned to their existing canonical UUIDs; do not retarget them after provider display-name changes.
- Keep the other 56 aliases unresolved until authoritative evidence proves a unique identity. Unresolved aliases must continue to fail closed (404); ambiguous aliases must return 409. Do not redirect them to a similar title or another provider.
- Do not add global provider-name synonyms, title-only/fuzzy matching, or cross-tier identity assumptions. The Owner confirms Crazy Time is not supplied by BigBang; keep `crazy-time` unmatched.
- Do not cut over the frontend to the database catalogue yet, import Premium, use a live key, or enable any real-money operation.
- This accepts the **current evidence-based alias disposition only**. Q-005 remains OPEN/P0 until the 3,802-versus-3,639 count discrepancy is evidenced/explained and the future tier/source/legacy-route contract is reviewed. Q-006, Q-010, Q-011, Q-013, Q-020, and all Phase 8 gates remain independent blockers.
