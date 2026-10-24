# Q-020b wallet/session contract parity — 2026-10-24

**Scope:** the bounded player-login/session and wallet balance/statement read cohort in Issue #141. This does not reopen original Q-020 and is not a blanket approval of all routes.

## Implemented

- `POST /api/v1/auth/login`, `GET /api/v1/auth/session`, `GET /api/v1/admin/session`, and wallet `balance` / `statement` set `Cache-Control: no-store` in the request hook before route validation. This covers validation, authentication, authorization, not-found, rate-limit, success and unexpected-error paths rather than only successful handlers.
- Login/session and wallet OpenAPI operations now declare their supported error statuses and no-store headers. The generated API client is updated to the same declaration.
- Player response construction includes the OpenAPI-required `emailVerificationStatus`, `kycTier` and `kycLock` fields, and real-service SQL projections fetch those existing player columns for registration, login, session read and profile update.
- Removed misleading `page` / `pageSize` query parameters from the wallet statement OpenAPI contract: the implementation supports `cursor` / `limit`, and its returned page object is `{ nextCursor, pageSize }`. The route correctly rejects undocumented query keys.
- Tests assert exact 200/400/401/403/404/429/500 envelopes where applicable, request-ID header/body parity, no-store on successes and failures, no session cookie on rejected login, and response body projections against required OpenAPI fields.
- The real PostgreSQL wallet integration test asserts empty/credited balance and statements, unauthenticated reads, cross-settlement-currency denial, invalid/replayed cursor handling, and reversed date-range rejection.

## Current test evidence

This note is authored before CI for the new branch has completed; do not treat the claims above as accepted until the PR's API tests, OpenAPI lint/client generation and app build all pass on the final head. Any failure must be fixed or listed as a residual before merging.

## Remaining bounded work

- The route matrix stays at **Substantial, not contract sign-off** for these paths until all final-CI assertions are reviewed. Explicit active/inactive admin-session cache-header assertions and unexpected service-error cases can still be improved.
- Other admin mutations outside the already-tested provider/tier and icon/image cases remain in Q-020b's fixed scope and need their named Origin/CSRF/RBAC/no-side-effect assertions before Issue #141 is closed.
- Q-004 media quarantine/scanning and storage isolation, Phase 4 shared-environment break-glass recovery under Issue #55, Q-006, Q-010, Q-011, Q-013, production operations, compliance and deployment approval remain independent gates.

No wallet posting or real-money payment, deposit/withdrawal, wager, provider callback, FX-execution or Premium path is added or enabled by this cohort.
