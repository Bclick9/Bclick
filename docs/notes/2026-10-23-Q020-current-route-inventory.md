# Q-020 — Current API route inventory (audit baseline)

**Audit date:** 2026-10-23  
**Audited base:** `main` at [`13adc620240b68eecae2fc6bc4bdd73e1936fabf`](https://github.com/Bclick9/Bclick/commit/13adc620240b68eecae2fc6bc4bdd73e1936fabf)  
**Status:** Initial source-to-contract inventory complete; operation intent classification and runtime test mapping remain open. This is a source audit, not evidence that every route passed a runtime test.

## Findings

- The audited Fastify source has **49 explicit method/path declarations** across the six route-registration modules in the table below.
- `docs/planning/openapi.yaml` contains **198 operation entries**. All 49 source method/path pairs match an operation in that OpenAPI file; no source-only operation was found.
- **149 OpenAPI operations have no matching explicit route declaration** in the audited `server/src` files. These are not automatically bugs: classify each as planned/not implemented, intentionally disabled, obsolete/unsupported contract, or an unintended mismatch. Do not implement these routes merely to make counts equal.
- The runtime CI workflow runs Schemathesis against the `Health` tag only. Existing route-specific test suites provide useful behavior coverage, but they are not yet a complete per-operation OpenAPI conformance matrix.
- Registrations are conditional. `server/src/index.ts` composes identity routes when identity config/service is enabled, public catalogue routes when the catalogue DB is configured, admin catalogue routes when both DB and identity are configured, and demo launch only when the development Sandbox client/key conditions are met.

## Explicit route inventory

| Method | Path | Registration module | Existing route-test suite (coverage still needs per-operation verification) |
|---|---|---|---|
| `GET` | `/api/v1/health/live` | `server/src/app.ts` | `server/test/app.test.ts` |
| `GET` | `/api/v1/health/ready` | `server/src/app.ts` | `server/test/app.test.ts` |
| `POST` | `/api/v1/auth/register` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/login` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/auth/session` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/logout` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/player/profile` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `PATCH` | `/api/v1/player/profile` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/password-reset/request` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/password-reset/confirm` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/email-verification/request` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/auth/email-verification/confirm` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/login` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/mfa/verify` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/mfa/totp/setup` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/mfa/totp/verify` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/mfa/recovery-codes` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `POST` | `/api/v1/admin/auth/logout` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/admin/session` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/wallets/{currency}/balance` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/wallets/{currency}/statement` | `server/src/identity/routes.ts` | `server/test/identity.test.ts`<br>`server/test/identity-registration-required-fields.test.ts` |
| `GET` | `/api/v1/casino/categories` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/casino/display-categories` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/casino/providers` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/casino/games` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/casino/games/by-slug/{slug}` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/casino/games/{gameId}` | `server/src/bigbang/routes.ts` | `server/test/bigbang-catalog-routes.test.ts` |
| `GET` | `/api/v1/admin/bigbang/settings` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `GET` | `/api/v1/admin/bigbang/providers` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/bigbang/providers/{providerCode}` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/bigbang/providers/{providerCode}/tiers/{mode}` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `GET` | `/api/v1/admin/bigbang/games` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/bigbang/games/{gameId}` | `server/src/bigbang/admin-routes.ts` | `server/test/bigbang-admin-routes.test.ts` |
| `GET` | `/api/v1/admin/casino/display-categories` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `POST` | `/api/v1/admin/casino/display-categories` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `POST` | `/api/v1/admin/casino/display-categories/{categoryId}/icon` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `GET` | `/api/v1/assets/casino-display-categories/{categoryId}/{fileName}` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/casino/display-categories/{categoryId}` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `DELETE` | `/api/v1/admin/casino/display-categories/{categoryId}` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `GET` | `/api/v1/admin/casino/display-categories/{categoryId}/games` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PUT` | `/api/v1/admin/casino/display-categories/{categoryId}/games` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/casino/skin-games/{gameId}/display-categories` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `GET` | `/api/v1/admin/casino/skin-games` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/casino/skin-games/reorder` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/casino/skin-games/{gameId}/order-position` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `PATCH` | `/api/v1/admin/casino/skin-games/{gameId}` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `POST` | `/api/v1/admin/casino/skin-games/{gameId}/image` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `GET` | `/api/v1/assets/casino-games/{gameId}/{fileName}` | `server/src/bigbang/skin-games-admin-routes.ts` | `server/test/skin-games-admin-routes.test.ts` |
| `POST` | `/api/v1/casino/games/{gameId}/demo-launch` | `server/src/bigbang/demo-launch.ts` | `server/test/bigbang-demo-launch.test.ts`<br>`server/test/bigbang.test.ts` |

## OpenAPI operations with no matching explicit route declaration

**Classification status:** not implemented in the audited source; whether each operation is intentionally future scope, disabled, obsolete, or an accidental contract mismatch remains to be reconciled with the roadmap/Open Questions. A contract declaration is not proof of an active endpoint.

Counts by path family:
- **Admin:** 98
- **Authentication:** 4
- **Bonuses:** 1
- **Callbacks:** 5
- **Casino:** 2
- **CMS:** 7
- **KYC:** 4
- **Other:** 1
- **Payments:** 6
- **Player:** 12
- **Responsible gambling:** 4
- **Sportsbook:** 2
- **Wallet/FX:** 3

- `GET /api/v1/player/preferences` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/player/preferences` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/wallets` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/wallets/fx-quotes` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/wallets/fx-executions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/casino/games/{gameId}/launch` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/sportsbook/bootstrap` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/bet-slips` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/bet-slips/{ticketId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/banners` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/promotions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/pages/{slug}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/media` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/cms/{resource}/{resourceId}/preview` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/cms/{resource}/{resourceId}/submit-for-approval` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/cms/{resource}/{resourceId}/approval` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/players` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/providers/{providerCode}/catalog-sync` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /callbacks/bigbang/user-data` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /callbacks/bigbang/balance-change` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /callbacks/winhouse/user-data` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /callbacks/winhouse/balance-change` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/payments/deposits` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/payments/deposits/{paymentId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/payments/withdrawals` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/payments/withdrawals/{paymentId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/transactions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/bets` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/bonuses` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/bonuses` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/categories` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/providers` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/skins/{skin}/games` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/bonus-campaigns` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/bonus-campaigns` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/bonus-campaigns/{campaignCode}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/bonus-campaigns/{campaignCode}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/bonus-campaigns/{campaignCode}/publish` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/players/{playerId}/bonuses` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/bonus-grants/{grantId}/approval` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/players/{playerId}/status` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/transactions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/balance-reports` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/sportsbook/betting-activity` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/sportsbook/betting-activity` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/sportsbook/ticket-settlement` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/sportsbook/ticket-settlement` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/sportsbook/revenue` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/sportsbook/revenue` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/sportsbook/winhouse-transactions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/sportsbook/winhouse-transactions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/casino/game-performance` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/casino/game-performance` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/casino/provider-performance` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/casino/provider-performance` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/casino/round-activity` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/casino/round-activity` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/casino/revenue-rtp` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/casino/revenue-rtp` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/financial/ledger-movements` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/financial/ledger-movements` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/financial/payments-operations` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/financial/payments-operations` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reports/financial/balances-reconciliation` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/reports/financial/balances-reconciliation` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/wallet-adjustment-requests` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/wallet-adjustment-requests` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/wallet-adjustment-requests/{adjustmentId}/approve` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/cms/{resource}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/cms/{resource}/{resourceId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/cms/{resource}/{resourceId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/cms/{resource}/{resourceId}/publish` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/audit-events` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/provider-health` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/reconciliations` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/players/{playerId}/operational-summary` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/players/{playerId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/wallets` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/casino/sessions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/sportsbook/session` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/users` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/users` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/roles` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/roles` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/permissions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/wallet-adjustment-requests/{adjustmentId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/cms/skins` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /callbacks/psp/{providerCode}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /csp-report` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/payments/methods` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/payments/deposits/{paymentId}/proof` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payments/pending` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payments/{paymentId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/{paymentId}/review` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/{paymentId}/approve` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/{paymentId}/reject` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/{paymentId}/mark-settled` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payment-methods` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/payment-methods/{code}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payment-methods/{code}/country-rules` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payment-methods/{code}/country-rules` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/payment-methods/{code}/country-rules/{countryCode}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payment-destination-accounts` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/payment-destination-accounts/{accountId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payment-destination-accounts/{accountId}/rotate` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payments/reconciliation` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/reconciliation/import` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payments/reconciliation/{runId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/reconciliation/{runId}/resolve` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/reconciliation/{runId}/close` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/payments/reconciliation/{runId}/sign-off` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/payments/{paymentId}/proof-url` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/kyc/status` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/kyc/verifications` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/kyc/verifications/{verificationId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/kyc/verifications/{verificationId}/documents` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/kyc/queue` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/kyc/verifications/{verificationId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/kyc/verifications/{verificationId}/documents/{documentId}/access-url` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/kyc/verifications/{verificationId}/decision` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/responsible-gambling/summary` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/responsible-gambling/limits` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/responsible-gambling/limits` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/responsible-gambling/self-exclusion` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/responsible-gambling/cases` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/responsible-gambling/cases/{caseId}/decision` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/notifications/preferences` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/player/notifications/preferences` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/player/account/close` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/player/account/close/cancel` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/player/account/close/status` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/players/{playerId}/wallets/{currency}/status` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/users/{adminId}/mfa-reset` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/mfa-reset-requests/pending` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/mfa-reset-requests/{requestId}/approve` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/auth/logout-all` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/auth/login-history` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/auth/logout-all` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/providers/{providerCode}/replay-callback` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/settings` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/users/{adminId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `PATCH /api/v1/admin/roles/{roleId}` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/auth/sessions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/auth/sessions/{sessionId}/revoke` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/auth/password-reset/request` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/auth/password-reset/confirm` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `GET /api/v1/admin/auth/sessions` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.
- `POST /api/v1/admin/auth/sessions/{sessionId}/revoke` — no matching explicit handler declaration found in the audited server source; intent/status must be classified before testing or implementing it.

## Current runtime-test and contract-gate position

| Area | Existing evidence | Remaining Q-020 work |
|---|---|---|
| Health/readiness | `server/test/app.test.ts`; CI Schemathesis run filtered to `Health` | Keep current checks; make the scope restriction explicit and extend coverage only to supported implemented operations. |
| Player/admin Identity and MFA | `server/test/identity.test.ts`; `server/test/identity-registration-required-fields.test.ts`; merged PR [#82](https://github.com/Bclick9/Bclick/pull/82) | Map each implemented operation to OpenAPI success/error schemas, request IDs, Origin/CSRF/session behavior. Required-field tests currently assert status; this Q-020 branch adds envelope and request-ID assertions. Issue [#55](https://github.com/Bclick9/Bclick/issues/55) has separate outstanding recovery-code/runbook/audit-redaction work and remains independently open. |
| Public catalogue | `server/test/bigbang-catalog-routes.test.ts` | Confirm query/parameter validation, safe 400/404 envelopes and request IDs against each documented response. |
| Provider/game admin controls | `server/test/bigbang-admin-routes.test.ts` | Map each operation to anonymous/expired/permission/CSRF denial and valid mutation cases; preserve MFA/RBAC and audit controls. |
| Skin Games and curated categories | `server/test/skin-games-admin-routes.test.ts` | Map list/edit/order/category/upload operations to their documented response and negative cases; keep tests on disposable/local fixtures. |
| Demo launch | `server/test/bigbang-demo-launch.test.ts`, `server/test/bigbang.test.ts` | Keep launch explicitly Sandbox-only; verify documented validation/status behavior without enabling real launches. |
| Wallet reads | Read-only balance/statement route declarations exist in `identity/routes.ts`; `server/test/wallet.test.ts` also covers wallet-domain behavior | Verify that route-level tests (not only service/unit tests) cover success, unauthorized, unsupported currency, statement query validation and response schemas. Do not add posting or movement behavior. |
| Provider/payment callbacks and money movement | No matching current route declaration in audited source | No route-level callback test yet. Wait for actual handler plus current vendor specs, approved event-specific golden fixtures and the applicable provider decisions. No wallet posting/deposit/withdrawal/wager implementation in Q-020. |

The API CI workflow `.github/workflows/api-skeleton.yml` currently performs the static OpenAPI guard, Redocly lint, generated-client drift check, `pnpm api:typecheck`, `pnpm api:test`, API build and Health-only Schemathesis. The static verifier is `scripts/verify_openapi_contracts.py`; it checks structural properties and representative fixtures, not every running handler.

## Safety boundaries and open gates

- Start gap-fixing with implemented non-financial routes and tests that demonstrate a mismatch. Keep all new negative inputs synthetic.
- Do not test against imaginary endpoints or treat the 149 contract-only operations as implemented.
- The OpenAPI file includes callback/payment/sportsbook/administrative operations without current source handlers. Callback schema fixtures alone are not callback runtime evidence.
- Q-006 provider signature/event semantics, Q-010 ledger posting/idempotency, Q-011 the isolated base-backup + WAL restoration/alert drill, and Q-013 the CSP/frame/host-header review remain independent P0 gates. Phase 8, Premium activation, wallet callbacks and real-money operations remain blocked.

## Next audit tasks

1. Finish classifying every contract-only operation against its planned phase and open-question decision; mark obsolete/unsupported paths explicitly if the contract is too broad.
2. Build a method/path → OpenAPI operation → runtime test matrix for the 49 implemented route declarations, including registration conditions.
3. Add or strengthen positive/negative runtime assertions only where that matrix proves a gap; run the API CI workflow and record its exact run/job/test evidence before closing any Q-020 subtask.
