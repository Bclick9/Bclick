# Authenticated login redirect and catalogue caching decision

**Date:** 2026-10-23  
**Pull request:** PR #121 — authenticated /login redirects to /account  
**Base:** main after PR #120  
**Scope:** player navigation regression and future storefront read-performance planning only.

## Login redirect

The Owner clarified that an already authenticated player visiting the legacy /login route should be sent to /account rather than / (home). PR #121 changes the default redirect in frontend/lib/legacyAuthRoute.ts to /account. If a safe in-site returnTo was provided by a protected-page redirect, it continues to be honored. Tests verify the new account default and the valid return path.

This concerns a player who is already authenticated when opening /login or /register. The successful submit handler in the existing modal also navigates to returnTo or /account; local browser acceptance is still required.

## Why Lobby fetches the catalogue again on browser refresh

Inspection shows frontend/lib/casinoCatalog.ts explicitly requests /api/v1/casino/games with cache: 'no-store'. The corresponding API route in server/src/bigbang/routes.ts also sends Cache-Control: no-store; this is intentional to keep catalogue availability responsive to provider/game blocks. The storefront also triggers a refresh when it becomes visible again, which is useful after an administrator changes availability in another tab.

A full page refresh recreates the frontend application and necessarily requests fresh catalogue JSON under the current no-store contract. That is not by itself evidence that a provider catalogue sync is run on every refresh; the read route queries Bclick's local normalized database and does not call BigBang.

## Recommended caching approach — future measured task

Do not put an indefinite localStorage/cache layer in front of game availability now. That risks displaying stale availability after a game/provider is blocked, and Q-005 catalogue identity/cutover remains open. Once correctness and query timings are established, evaluate:
- bounded server-side caching or ETag/If-None-Match for normalized catalogue responses;
- a cache-version/generation updated transactionally with operator changes, plus a short fallback TTL;
- separate shorter freshness for provider/game availability than for stable game descriptions/identity;
- long-lived HTTP caching for images using immutable/versioned URLs (image assets are different from JSON catalogue state);
- server-side availability validation remains mandatory at the demo-launch endpoint, regardless of what the browser has cached.

Benchmark before choosing TTLs or a more elaborate cache. Keep admin control changes observable promptly. Do not conflate API-response caching with provider sync, and do not enable Premium or any real-money feature as part of performance work.

## Current blocker

The Owner's screenshot after PR #120 shows Providers working but Skin Games still displays its generic request failure with zero records. This means local Skin Games acceptance and drag-order verification remain **blocked**. The browser text alone is insufficient to infer the root cause. When the local API is running code from PR #120, inspect the API terminal's request-ID-correlated SQLSTATE/error entry for the failing GET /api/v1/admin/casino/skin-games request; share only the request ID plus the SQLSTATE and sanitized message, never session cookies or secrets. Do not manually rerun or roll back Migration 012. Q-005, Q-006, Q-010, Q-011, Q-013 and Q-020 remain open; Premium and all real-money paths remain blocked.
