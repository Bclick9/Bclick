# Skin Games — persistent catalogue management implementation checkpoint

**Date:** 2026-10-23  
**Implementation branch:** `feat/cms-skin-games-persistent-catalogue-management`  
**Pull request:** [#119 — feat(cms): persist Skin Games management and tier-aware controls](https://github.com/Bclick9/Bclick/pull/119)  
**Checkpoint:** CI passed for the implementation head. The Owner's local Sandbox preview is the next acceptance step after this change reaches `main`.

## Scope completed

1. **Canonical source-tier identity.** Skin Games reads real BigBang source rows using each canonical `casino_games.id` UUID, provider/source metadata, source numeric ID, `source_mode`, `is_premium`, source availability, Bclick availability, and stored display order. Matching titles across Standard and Premium are not merged or relabelled.
2. **Persistent presentation.** Migration 012 adds `casino_game_presentation` for description override, stable custom-image key, display order, update actor/time and separate order actor/time. Changes use protected server routes and administrator audit events. The existing provider/game availability flags remain authoritative; the migration does not add duplicate per-game enablement keys.
3. **Persistent images.** BigBang's source image is the default. A custom upload accepts validated PNG/JPEG/WebP image bytes, bounded size/dimensions, and a server-generated filename. The database stores a relative same-origin asset key, never a browser `blob:` URL. A named Docker Compose volume at `/var/lib/bclick/uploads` persists files across API-container replacements; the non-root runtime user has write access.
4. **Storefront ordering.** The public catalogue query now orders by persisted `display_order`, then deterministic title/UUID tie-breakers. A regression test sets an order differing from alphabetical order and asserts the public API returns that order.
5. **Provider-tier controls.** Providers remains responsible for provider-wide blocking and Standard/Premium source-tier settings. Skin Games owns individual game presentation, ordering and availability. Ordering is restricted to the chosen source tier.

## Standard / Premium decision

Standard and Premium are distinct BigBang source variants and therefore distinct canonical Bclick game rows/UUIDs when the provider supplies both. The list supports All, Standard and Premium filters. Dragging between tiers is refused; Premium rows remain read-only and server-side Premium mutations return a refusal while the integration is unavailable.

The current integration remains Standard Sandbox only. No Premium import/sync, Premium launch, live credentials, payment, wallet callback, wager, or real-money path was introduced or enabled.

## Migration and runtime boundaries

- Migration `1793534400000_casino_skin_games_presentation_012.sql` is forward-only by design because ordering, image references and admin edits are operator-owned state. Its down section refuses a casual rollback.
- CI applied the migration chain only to disposable PostgreSQL instances. This implementation work did not migrate the Owner's local database, a shared database, or Production.
- The Owner's local start script may apply Migration 012 on the next local run. Inspect errors/readiness locally; do not manually rerun or roll back the migration if startup reports a problem.
- A named Docker volume protects custom image files from normal container replacement, not from loss of the host or accidental volume deletion. Backups/restore for uploads must be included in Phase 3/Q-011 before Production acceptance.

## CI evidence for this implementation head

The following GitHub Actions runs reported success:

- [Application builds](https://github.com/Bclick9/Bclick/actions/runs/39939764193) — storefront and admin builds.
- [API types, tests, migration chain through 012, health contract, OpenAPI/generated client](https://github.com/Bclick9/Bclick/actions/runs/39939763207).
- [Backoffice UI build](https://github.com/Bclick9/Bclick/actions/runs/39939763251).
- [Fresh local database/Identity route and Windows PowerShell syntax](https://github.com/Bclick9/Bclick/actions/runs/39939763524).
- [Disposable PostgreSQL Migration 001 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39939763460).
- [Disposable PostgreSQL Migration 002 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39939763746).
- [Disposable PostgreSQL Migration 003 rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39939763773).
- [Wallet Migration 006 disposable rehearsal](https://github.com/Bclick9/Bclick/actions/runs/39939763603).
- [Read-only Migration 001 preflight](https://github.com/Bclick9/Bclick/actions/runs/39939763725).

Legacy workflows labelled Neon skipped their guarded external-database apply/postflight legs on the PR trigger. CI success is not evidence that any external database was changed.

## Owner's next local acceptance

Use the repository's local Docker Compose workflow, not Neon:

```powershell
git status -sb
git pull --ff-only origin main
git rev-parse --short HEAD
.\start-bclick-local.ps1
```

Check the output for clean migration completion and API readiness. Then sign in to the Backoffice and verify:

- Skin Games displays real UUIDs and source/provider metadata, with Standard/Premium filtering.
- A reversible Standard game block/enable is persisted after reloading, and the public catalogue follows the saved display order.
- A custom image upload, saved description and restore-to-BigBang-image action persist after reload and API restart.
- Providers exposes provider/master and tier controls, not a duplicate individual-game management table.
- Premium remains visibly locked and cannot be enabled.

Record the exact local result and commit hash before selecting the next task. If the working tree was already dirty at `git status -sb`, stop before pulling and inspect those local changes; do not discard them.

## Roadmap and open gates

This feature checkpoint does **not** close or waive:

- **Q-005:** source/count discrepancy (3,802 vs 3,639), provider identity/category and legacy-route semantics; full storefront cutover remains gated.
- **Q-006:** accepted BigBang/WinHouse provider event contracts and event-specific evidence.
- **Q-010:** application-level ledger posting/idempotency requirements.
- **Q-011:** base+WAL restore drill, RPO/RTO and off-host alerts; custom image backup/restore also needs explicit evidence.
- **Q-013:** CSP/frame/host-header review.
- **Q-020:** route-by-route runtime contract acceptance.

Phase 8 remains **NOT STARTED**. No Production migration, Premium activation, full storefront catalogue cutover or real-money flow is authorized by this change.
