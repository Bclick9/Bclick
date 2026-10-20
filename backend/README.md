# Bclick Admin Dashboard UI

This directory contains the **administration UI only**. It is a React + TypeScript + Vite UI prototype; it is not the production API server and its forms/data remain local demo state until a real backend is integrated.

## Run locally

From the repository root:

- `pnpm --filter backend dev` — open the admin dashboard at `http://localhost:5174`
- `pnpm --filter backend build` — build the admin dashboard
- `pnpm --filter backend preview` — preview the built dashboard

## Structure

```text
backend/
  App.tsx                    # dashboard controller, page-state and shell composition
  main.tsx                   # React entry point and render error boundary
  components/
    ui.tsx                   # reusable shadcn-style UI primitives
    DashboardUI.tsx          # shared dashboard badges, cards, headings, and tables
    UserFormModal.tsx        # player creation modal
  data/
    backoffice.ts            # isolated demo seed data used by Backoffice
  lib/
    navigation.ts            # page keys, workspace navigation, titles and URL mapping
    types.ts                 # shared Backoffice domain/UI types
    utils.ts                 # shared class-name utility
  pages/
    backoffice/
      index.ts
      Overview.tsx
      Players.tsx
      PlayerProfile.tsx
      Bonuses.tsx
      Transactions.tsx
      Reports.tsx
      Settings.tsx
    cms/
      index.ts
      Banners.tsx
      Promotions.tsx
      Pages.tsx
      SkinGames.tsx
      Categories.tsx
      Providers.tsx
```

## Workspaces and routes

### Backoffice
- `/backoffice/overview`
- `/backoffice/players`
- `/backoffice/bonuses`
- `/backoffice/transactions`
- `/backoffice/deposits`
- `/backoffice/withdrawals`
- `/backoffice/reports`
- `/backoffice/settings`

### CMS
- `/cms/banners`
- `/cms/promotions`
- `/cms/pages`
- `/cms/skin-games`
- `/cms/categories`
- `/cms/providers`

Each page lives in its own module under the appropriate workspace directory. URL-to-page mapping and navigation metadata are centralized in `lib/navigation.ts`. Shared UI stays in `components/`; page-specific data and controls stay beside the page that owns them.

## Boundary with the public site

The `frontend/` workspace is reserved for the player-facing public website. Do not import dashboard pages or dashboard-only UI into `frontend/`. The `backend/` directory name is retained for compatibility with the current pnpm workspace and local development commands; it currently contains the dashboard frontend, not the financial/API backend.

## Prototype boundary

Players, bonuses, transactions, CMS content, reports, games and settings are still local demonstration data. No production database, authentication, wallet API, provider callbacks, or financial processing is connected.
