# Q-005 — local storefront/catalogue acceptance recorded

**Date:** 2026-10-23  
**Status:** Owner-reported local acceptance passed; implementation and CI evidence are recorded separately.  
**Implementation:** PR #127 (Migration 014), PR #130 (Migration 015), PR #132 (Migration 016), PR #137 (Migration 017 and shared type-scoped storefront), and PR #138 (reserved type-route aliases).

## Acceptance reported by the Project Owner

The Project Owner confirmed in the current ChatGPT conversation that the complete preceding local-acceptance checklist is resolved. For the current checkpoint, this is recorded as Owner-reported acceptance of:

- Local startup/migration acceptance for Migrations 014–017 through the repository's normal local workflow, with API readiness healthy.
- CMS → Categories: Casino / Live Casino / Crash Games Type selection persists; Select games is scoped to Standard games matching the selected Type; saved membership and Type changes remain correct after reload.
- Storefront: Lobby is the All Games view for its Type; curated category selection filters the main grid and pagination; the duplicate Lobby rails are absent.
- Routing: `/casino/slot-games` redirects to `/casino/lobby`; reserved `live-casino` / `crash-games` slugs route to their canonical Type pages; unknown categories do not incorrectly fall back from Live Casino or Crash Games to Casino.
- Skin Games: persistent ordering and player-facing presentation edits (image/title/description as applicable to the prior checklist) remain correct across reloads.
- Standard Sandbox stays the enabled source scope. Premium remains locked; no wallet callback, deposit, withdrawal, wager settlement, payment, or real-money path was enabled.

**Evidence boundary:** The Project Owner's confirmation is the acceptance evidence available for this note. The assistant did not independently attach to the Owner's local Windows/PostgreSQL process, capture its migration ledger, or replay the browser checks in this turn. No local commit hash or sanitized command transcript was supplied, so none is invented here. CI results prove the repository workflow only, not the local machine state.

## Outcome

Q-005's local acceptance gate is recorded as **passed by Owner report**. Do not repeat the resolved Standard catalogue count investigation or restore the retired aliases. Keep canonical UUID/provider identity on the game-launch path; that API's canonical lookup is distinct from storefront type/category routing.

This does **not** close independent gates Q-006 (provider event contract evidence), Q-010 (wallet posting/idempotency), Q-011 (backup + WAL restore drill and measured RPO/RTO), Q-013 (CSP/frame/host-header staging review), or Q-020 (runtime API contract coverage). Phase 8, Premium activation, provider wallet callbacks, and all real-money operations remain blocked.

## Next task — Q-020 current-route inventory and runtime contract audit

Reconcile Q-020 against the actual implementation on `main`; its older tracking issue incorrectly states that only Health handlers exist. Inventory the implemented routes in `server/src` and map each method/path to OpenAPI, auth/RBAC/CSRF/Origin requirements, validation and error responses, request IDs, and existing tests. Add route-level tests only for demonstrated gaps, starting with implemented non-financial routes and their positive/negative cases. Update [Issue #56](https://github.com/Bclick9/Bclick/issues/56) and this progress checkpoint with passing test/workflow evidence.

Do not invent tests for routes that do not exist. Provider callback tests remain gated by Q-006's approved event-specific fixtures; no wallet posting or real-money endpoint may be enabled as part of Q-020.
