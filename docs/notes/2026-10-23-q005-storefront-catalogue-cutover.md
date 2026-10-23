# Q-005 storefront catalogue cutover — 2026-10-23

## Owner decisions carried forward

- The Owner confirms the earlier `3,802` versus `3,639` Standard count discrepancy was explained and obsolete links were removed. Do not repeat that investigation.
- The newest Owner decision supersedes the 2026-10-22 historical acceptance of 59 legacy aliases. Current runtime slug identity is canonical-only; no title/provider fuzzy matching or alias remapping is permitted.
- Standard Sandbox remains the only enabled BigBang tier; Premium remains read-only/locked and all real-money routes stay disabled.

## Implementation merged in PR #127

- `frontend/lib/casinoCatalog.ts` adds complete, paginated `fetchCasinoCategories()` with API schema validation, duplicate/cursor checks, no-store reads, and fail-closed incomplete-page behavior.
- `frontend/pages/Casino.tsx` builds the category strip from `GET /api/v1/casino/categories`. Every category grid and every card rail obtains game records from `GET /api/v1/casino/games`; static `GAMES`, `GameGrid`, and mock Halloween game assignments are removed. Top Picks/Halloween shelves render only if those slugs exist in the actual enabled API category set.
- Cards in these shelves use the canonical UUID/slug returned by the API. UI presentation labels/icons may remain static metadata, but no static array assigns a real game to a category.
- `server/src/bigbang/routes.ts` resolves `/api/v1/casino/games/by-slug/{slug}` against canonical `casino_games.game_slug` only. Old aliases are not queried; a retired slug that is not itself canonical returns 404.
- Migration 014 clears the old `casino_game_legacy_slug_aliases` inventory on local upgrade. Its down section refuses rollback so retired links cannot be silently restored from inferred titles/providers.
- OpenAPI and catalogue-route tests are updated; frontend tests cover category paging/completeness and guard against reintroducing static game-card/category fallbacks.

## Local acceptance gate

PR #127 merged as `bd530088332f59f388e315e24c716e9ec2055a3b`. Required CI checks for application build, API/OpenAPI/generated client, local Compose, and disposable migrations passed. Q-005 remains open until the Owner tests this merged revision locally:
1. Startup completes Migration 014 and API readiness is healthy.
2. Lobby and search show only enabled canonical rows and paging has no gaps/duplicates.
3. Categories shown in navigation are the API's actual categories; a category with no visible rows does not show mock games.
4. Any Top Picks/Halloween rails shown are backed by those exact API category memberships. If provider data has no such category, the rail is omitted rather than populated from a static list.
5. Provider pages, game details and demo launch continue to use canonical identity; retired legacy game slugs return 404.
6. Provider/game disable switches remove affected games from API-backed shelves after refresh.
7. Skin Games order and image upload still work; Premium remains locked.

No wallet/provider callback behavior, financial schema, provider sync identity, or source-tier eligibility changed. No production deployment or real-money activity is authorized. Q-006, Q-010, Q-011, Q-013 and Q-020 remain independent gates.
