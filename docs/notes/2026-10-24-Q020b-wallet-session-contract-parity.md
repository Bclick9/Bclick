# Q-020b wallet/session contract parity — 2026-10-24

**Status: merged in PR #145 and verified on current main.** This is a bounded cohort under Issue #141. It does not reopen original Q-020 and does not claim all 49 route declarations are fully contract-signed-off.

## Implemented

- POST /api/v1/auth/login, GET /api/v1/auth/session, GET /api/v1/admin/session and wallet balance/statement set Cache-Control: no-store in the early request hook, including validation, authentication, authorization, not-found, rate-limit, success and unexpected-error responses.
- OpenAPI and the generated TypeScript client declare the exact error responses and Cache-Control no-store response header for these operations. The generated client is checked against the actual generator in CI.
- Player response construction includes the OpenAPI-required emailVerificationStatus, kycTier and kycLock fields. The real-service SQL projections now fetch the existing columns for register/login/session/profile reads where used.
- Wallet statement OpenAPI now documents the actual cursor/limit contract and rejects the retired page/pageSize query parameters. The runtime response page object is { nextCursor, pageSize }.
- Real PostgreSQL-backed tests assert login success, malformed request, missing/hostile Origin, wrong password, rate-limit, safe unexpected error, active/anonymous player session, active/locked/disabled/expired admin session, wallet balance/statement success and denial, invalid/replayed cursor, date ordering, and invalid currency/cross-settlement-currency responses.
- The checks compare exact safe response bodies, request-ID header/body parity, cache headers, content type, and absence of session cookies on denied login.

## CI evidence

- [PR #145](https://github.com/Bclick9/Bclick/pull/145) merged as c192e3669efa2cc486860520260b5cbff4145b7c after all required final-head workflows passed.
- [Current-main API/OpenAPI/generated-client and contract tests](https://github.com/Bclick9/Bclick/actions/runs/40095341049), [Compose/Identity/PowerShell checks](https://github.com/Bclick9/Bclick/actions/runs/40095340984), and [application build](https://github.com/Bclick9/Bclick/actions/runs/40095340980) passed at main commit df0ba5734b1f12ae7ba24c70d08b87d279d5018a.

## Explicit residuals

- This cohort does not sign off all 49 routes. Other registration/logout/profile/email/password-reset/MFA operations and list/filter pagination, unsupported identifiers/modes, unknown resources and complete 404/500 response parity remain explicitly deferred in the broader route matrix.
- Issue #55 remains independent and OPEN until shared-environment sole-administrator break-glass recovery has an independently approved executable procedure and rehearsal.
- Q-004 media quarantine/scanning/storage isolation, Q-006 provider evidence, Q-010 wallet posting/idempotency, Q-011 backup/WAL restore RPO/RTO, Q-013 CSP/frame/host-header review and compliance/deployment approval remain separate gates.

No wallet posting, deposits/withdrawals, wager settlement, provider callbacks, FX execution, Premium activation, or real-money route is added or enabled.