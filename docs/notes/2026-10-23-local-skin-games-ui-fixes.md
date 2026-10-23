# Local Skin Games, Providers and player auth fixes

**Date:** 2026-10-23  
**Branch:** fix/skin-games-ui-and-auth-modal (merged to main)  
**Pull request:** [#120 — fix: restore Skin Games admin and keep player auth modal-only](https://github.com/Bclick9/Bclick/pull/120), merged as `12a438bca9dfa3bc7bb419ddc8a1c37b462fb6f8`  
**Starting point:** main at 7535185910df26fa60e00b44347df3babf0d868b

## Owner-reported symptoms

1. http://localhost:5174/cms/skin-games displays "The Skin Games request could not be completed".
2. http://localhost:5174/cms/providers crashes with Card is not defined.
3. Skin Games reordering could not be tested because the page did not load.
4. A logged-in player can still view http://localhost:5173/login; the desired account experience is exclusively the existing modal form.

## Code changes in PR #120

### Providers UI
Source inspection confirmed that Providers.tsx used Card and CardContent but imported only Badge, Button and Input. The missing UI imports are added. This is the confirmed cause of the reported component runtime error.

### Skin Games API diagnostic
The original GET /api/v1/admin/casino/skin-games handler returned a generic 500 for all unexpected errors. This obscured whether the local schema or another query assumption was failing. PR #120 preserves a generic browser response for unrelated failures, but logs the request ID and bounded SQLSTATE/message diagnostic server-side. SQLSTATE 3F000, 42P01 or 42703 now produces a safe 503 SKIN_GAMES_SCHEMA_NOT_READY response with a Migration 012 readiness hint. A regression test simulates a missing casino_game_presentation relation and ensures raw DB text is not returned to the browser.

**Important:** the exact root cause of the Owner's live 500 was not observable from the browser message alone. No assertion has been made that Migration 012 is definitely missing. Check the API diagnostic and local migration ledger after the update; do not manually rerun or roll back Migration 012.

### Modal-only player auth
The former full-page LoginPage/RegisterPage route components have been removed from App routing. Legacy paths /login, /register, and /signup now:
- wait for the initial player session check;
- redirect an already-authenticated player to a safe requested in-site path or the home page;
- dispatch an event to open the existing login or registration modal for an anonymous player and then replace the legacy URL with the home path;
- preserve a validated return path from protected pages, so successful login returns to the requested page.

The custom event is handled by one header instance only because the responsive desktop and mobile headers are mounted in parallel. Existing login/register header buttons keep using the existing modal.

Pure regression tests cover session-check waiting, signed-in redirect, modal mode/return-path choice and rejection of unsafe return targets. The API regression test covers safe schema diagnostics.

## Required local acceptance

Now that PR #120 is merged, inspect the working tree before pulling main, then use the repository's normal local workflow (Docker Compose PostgreSQL + host-side API, not Neon):

~~~powershell
git status -sb
git pull --ff-only origin main
git rev-parse --short HEAD
.\start-bclick-local.ps1
~~~

If git status shows local changes, stop and inspect them before pulling. Check startup output and API readiness. If SKIN_GAMES_SCHEMA_NOT_READY appears, verify local Migration 012 history/output; do not run migration CLI manually or roll it back. If it stays as generic 500, inspect API terminal logs for the same request ID and SQLSTATE; share only the SQLSTATE and sanitized message, never cookies/session tokens/API keys.

Then check:
1. Providers renders its metrics/settings and real source rows.
2. Skin Games loads actual canonical UUID/provider/source rows.
3. Select the Standard filter (reordering is intentionally disabled under All), drag one game before another, refresh, and confirm its stored order remains.
4. Confirm that public catalogue results reflect the persisted order.
5. Visit /login while signed in (should redirect away without an auth form). Sign out and visit it again (should open the login modal, not a full-page screen). Repeat for /register if appropriate.
6. Premium remains locked.

Owner acceptance of Skin Games ordering remains **pending** until these local checks actually pass. CI cannot validate the Owner's local database or UI.

## Roadmap guardrails

PR #120 is merged but does not close Q-005, Q-006, Q-010, Q-011, Q-013 or Q-020. Q-005 still blocks full catalogue cutover; Premium sync/launch and Phase 8 remain blocked. No payment, wager, wallet callback, ledger posting or other real-money feature is enabled.
