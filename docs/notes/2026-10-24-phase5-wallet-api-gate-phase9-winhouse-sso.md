# Phase 5 wallet API gate and Phase 9 WinHouse SSO token service

**Prepared:** 2026-10-24  
**Status:** Guarded route placeholders and the pure launch-token signer are implemented for review. This is not financial or provider integration acceptance.

## Phase 5 — deposit and withdrawal endpoints

- Added `POST /api/v1/payments/deposits` and `POST /api/v1/payments/withdrawals` as explicitly unavailable runtime endpoints.
- `ENABLE_WALLET_API` is strict boolean configuration and defaults to `false` in `.env.example` and local Compose.
- With the flag false, an application `onRequest` guard returns a safe `503 WALLET_API_DISABLED` before JSON body parsing, route validation, authentication, CSRF processing or service calls. Responses carry `Cache-Control: no-store`.
- If someone sets the flag true in a local/test environment, the endpoints still return `503 WALLET_API_NOT_READY`: the payment-intent/orchestration, PSP/manual rail, KYC/RG/AML, reconciliation and settlement services are not wired by this change. The startup config rejects `ENABLE_WALLET_API=true` in staging and production while the relevant gates remain unaccepted.
- The future 201 response contracts remain plans; this change creates no payment intents, ledger entries, withdrawal holds, provider calls or balance changes.
- Tests prove both paths remain rejected and that malformed JSON cannot bypass or change the closed-flag response.

## Phase 9 — WinHouse Model B launch token

- Added a standalone `createWinHouseLaunchToken` service matching the current public WinHouse guide: four dot-separated fields, HMAC-SHA256 over `player_id|expiry|session`, hexadecimal signature keyed by the server-only wallet API key, and epoch-millisecond expiry.
- Defaults to five minutes per mint and enforces a maximum expiry of ten minutes. Requires a stable opaque player ID and a non-empty current player-session ID so the provider-side wallet can associate actions with the Bclick login.
- Tests verify the official HMAC construction, expiry bounds, unsafe-field rejection and that the secret is not included in the returned token.
- Deliberately not exposed as an HTTP route yet. A later route must derive `player_id` and `session` from an authenticated, active Bclick player session, require exact Origin plus CSRF, mark responses no-store, never log the token/key, and remain unavailable until approved identity/security/provider prerequisites allow it.

## Provider and financial gates that remain separate

- WinHouse SSO current public source: https://iframe.winhouse.bet/docs and https://iframe.winhouse.bet/docs/agent.md.
- The launch signature uses `WINHOUSE_WALLET_API_KEY`, not the separate callback token. The callback `?token=` mechanism and `balance-change` HMAC are distinct contracts.
- Q-006 still requires tenant-specific seamless-wallet enablement, credential/key lifecycle evidence, relevant conflict/retry/refund behaviors, reconciliation and provider sandbox evidence.
- Q-010 and Phase 5A service acceptance remain separate. No WinHouse callback, provider wallet post, deposit, withdrawal, payment, wager, FX or other real-money route is enabled.
- Q-011's local recovery drill passing does not establish staging recovery. Its infrastructure acceptance remains deferred until Phase 14 resources and formal measured RPO/RTO evidence are available.
