# Skin Games numeric ordering and player-facing title

**Date:** 2026-10-23  
**Pull request:** [#123 — numeric game order and player-facing title](https://github.com/Bclick9/Bclick/pull/123), merged as `093871d734b3b11ce1a5d1b5bd0172c9e1abf0f1`  
**Branch:** `feat/skin-games-numeric-order-and-display-title`  
**Starting point:** `main` at `3e982cf626122f9722b32496cb1b0472fd4fb3a9`  
**Local acceptance:** pending Owner verification; CI passed.

## Owner request

Drag-and-drop already works and correctly persists the casino public order, but moving games by repeatedly dragging rows through a 3,639-game Standard catalogue takes too long. The existing Edit Game modal should expose a numeric position. It should also allow changing the title players see, for example renaming “1Win Zeus the Thunderer Deluxe” to “Zeus the Thunderer Deluxe”, without changing provider/source identity.

## Implementation merged to main

### Numeric ordering

- Skin Games API derives each record's one-based position and total count in its full source tier, independently from current filter/pagination.
- The Edit Game modal includes an integer position input from 1 to the Standard tier's current record count.
- The new `PATCH /api/v1/admin/casino/skin-games/:gameId/order-position` validates the canonical UUID and bounds. Under the existing admin permission/MFA/Origin/CSRF guard, one SQL statement obtains the order advisory lock, shifts intervening records, writes the spaced `display_order` sequence, updates actor/time fields, and writes an audit event.
- Standard ordering only; the Premium action remains blocked.
- Drag-and-drop remains supported, and both UI flows share the same persisted `display_order` state.

### Player-facing title override

- Migration 013 adds `casino_game_presentation.title_override` as nullable bounded text.
- The Edit Game modal shows the original source title and a separate editable Bclick-facing title. Empty title resets to source title.
- The existing PATCH API writes the override with the same authenticated audit context. Provider/source title, canonical game UUID, external source ID, tier and route slug do not change. The override is not used in source sync, slug resolution or identity matching.
- Public catalogue list and game detail/by-slug endpoints display the override and the list API allows searches to match it. The stable canonical UUID/slug and provider stay unchanged.
- OpenAPI and generated client declarations are updated; API regression tests cover the override, numeric order, bounds, Premium denial, and Lobby response/search.

### Important behavior and limitations

Metadata, order and image upload are separate authenticated API requests in the existing Edit Game save flow, rather than one distributed transaction. If a later order/image request fails, earlier fields may already be saved; the UI reports that partial saves may have happened and refreshes the list. This avoids pretending independent file-system and database work is atomic. If this behavior proves confusing in acceptance, improve the editor feedback before expanding CMS scope.

The GET Skin Games query must use numbered PostgreSQL bind placeholders for LIMIT/OFFSET, with the placeholder numbers following any active filter parameters. It must not interpolate page-size/offset as literal integers while still passing bound values to node-postgres; that exact bug caused SQLSTATE 08P01 and was fixed in merged PR #122. This branch preserves the existing fix and the CI query-binding regression tests.

## Owner acceptance after merge

1. Open a Standard game in CMS → Skin Games → Edit Game.
2. Change position (e.g. 500 to 3), save and ensure rows between shift and ranks stay one-based and contiguous. Refresh and ensure the requested game is still at position 3.
3. Verify the casino Lobby shows the game at the same position. The provider catalogue sync must not reset the order.
4. Set the player-facing title to `Zeus the Thunderer Deluxe`. Verify it appears in Lobby/list/details/search; refresh and confirm persistence.
5. Confirm canonical UUID, external source ID, provider, tier and public slug stay the same; confirm Premium controls remain locked.
6. Ensure audit actor/time are updated and restore-to-source-title works by clearing the title input.

## Next project roadmap step

After local acceptance of this focused CMS feature, return to Q-005 (OPEN/P0): establish authoritative evidence explaining the 3,802 versus 3,639 Standard-game discrepancy and complete source/provider/category/legacy-route review. Do not merge games by title or start Phase 8. Q-006, Q-010, Q-011, Q-013 and Q-020 remain open, and all wallet callbacks, payment/wager execution, real-money flow and Premium activation remain blocked.
