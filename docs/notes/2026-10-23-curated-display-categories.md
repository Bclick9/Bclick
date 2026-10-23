# Curated casino display categories — 2026-10-23

## Decision

Bclick needs two separate category concepts:
- Provider/source category membership is synchronized into `casino_game_categories`. It expresses the source catalogue’s metadata and must not be repurposed for operator-defined shelves.
- Curated display categories are owned by Bclick and represent intentional Lobby placements such as Trending Games. Membership is a many-to-many relation over canonical Bclick game UUIDs.

## Merged implementation

PR #130 is merged as `18172a7d9e4c6994e7376043ad98fb5b26fe25d5`.
- Migration 015 creates `casino_display_categories` and `casino_game_display_categories`.
- CMS → Categories creates, edits, orders, hides/shows and deletes persistent display categories through audited, authenticated admin APIs.
- CMS → Skin Games → Edit Game lets an admin assign a Standard game to one or multiple curated categories. Assignment uses the canonical game UUID and is persisted separately from provider categories.
- The public `GET /api/v1/casino/display-categories` route emits only visible categories with enabled and available Standard games; each shelf contains actual canonical game rows, never static fallback cards.
- Admin mutations require the existing `casino.provider-settings.manage` permission, MFA, CSRF and the existing audit mechanism. Premium category assignments remain disabled.
- The Edit Game `RotateCcw` render error is fixed by importing the icon used by the reset control.
- The OpenAPI contract and generated API-client types include the new routes and the admin Skin Games `displayCategoryIds` field.

## Acceptance gate

CI passed application builds, Backoffice build, API tests, OpenAPI/generated-client validation, local Compose bootstrap and disposable PostgreSQL migration rehearsals. This proves the checked-in implementation against CI fixtures, not that the Owner’s local database has applied Migration 015.

Do not apply migrations manually. Use `.\start-bclick-local.ps1` after a clean fast-forward pull to apply the migration chain. Verify local persistence and API/UI behavior using the steps recorded in `PROGRESS.md` before closing acceptance.

No canonical identity/source fields, provider sync behavior, Premium eligibility, wallet, payments, wagers or real-money operations changed. Q-006, Q-010, Q-011, Q-013 and Q-020 remain independent gates.
