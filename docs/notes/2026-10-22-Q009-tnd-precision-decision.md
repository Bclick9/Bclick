# Q-009 — TND provider precision decision

**Decision date:** 2026-10-22  
**Decision owner:** Project Owner  
**Gate status:** **Decision accepted; implementation verified in local development and CI.** Staging/Production target execution remains a separate environment-specific gate. This is not authorization to enable live betting or provider wallet callbacks.

## Decision

Bclick will use **two decimal places for TND** across its supported money model to match both contracted providers. One TND minor unit will mean **0.01 TND = 10 millimes**, not 0.001 TND.

The decision follows the written provider-support answer reviewed on 2026-10-22:

- **WinHouse:** the tenant is TND-only; stakes with more than two fractional digits are rejected with `invalid_stake_precision` without a debit. Payouts are rounded to 0.01 TND.
- **BigBang:** its Dedicated TND shop supports slots and other games but not Live Dealer tables; amounts with more than two fractional digits are rounded half away from zero to 0.01 TND, and a movement rounded to zero is not sent. Support will set a TND bet ladder.
- The supplied sample balances and signed bet/win vectors are retained in `server/test/fixtures/tnd-wallet-provider-vectors.json` and cryptographically checked by `server/test/provider-tnd-fixtures.test.ts`.

The current public WinHouse docs also confirm that the amount used in the wallet HMAC is stringified as sent on the wire; this does not change the currency-scale decision.

## Platform behavior

1. The shared money package and database currency registry will use `TND=2`, `EUR=2`, and `USD=2`.
2. The platform parser/API boundary rejects input such as `12.345 TND`; it must not silently round or truncate a user-supplied amount. `12.34 TND` is represented as 1,234 integer minor units.
3. Provider-specific rounding/refusal remains part of each adapter's documented contract. Do not implement a shared rounding rule that changes their behavior.
4. Wallet balance and statement representations should therefore be canonical two-decimal strings, such as `0.00 TND` and `12.34 TND`.
5. The historical migrations are not rewritten. Migration 008 changes the currency registry forward-only from TND exponent 3 to 2 only when no TND ledger entries exist and every TND projected wallet balance is zero. If either guard is violated, the migration must fail and a separate, reviewed balance-preserving conversion is required.

## Acceptance evidence

- [x] Shared money package accepts two decimals for TND and rejects three decimals without rounding; local api:test passed the money precision tests.
- [x] Wallet balance/statement API tests assert canonical two-decimal TND values; the Owner's local api:test passed.
- [x] Migration 008 sets the seeded TND exponent to 2 on a clean fully migrated PostgreSQL Testcontainer; the wallet test asserts decimal_places=2.
- [x] Migration 008 fails closed when TND ledger history exists; the regression test passed in the Owner's local output and the API CI workflow.
- [x] API TypeScript/tests/migration/OpenAPI CI passed on the PR #108 head: https://github.com/Bclick9/Bclick/actions/runs/39829151553.
- [ ] Before applying to any non-local existing database, separately verify that database's migration history, TND ledger entries, and projected TND balances in an approved non-production target. This note does not establish any staging/Production execution; do not run the migration against Neon or Production as part of this work.

**Implementation status:** Q-009's product decision and code/dev-test acceptance are satisfied. The Owner's local Docker PostgreSQL migration ledger records Migration 008 as id 10, named 1793188800000_tnd_provider_precision_008, with a 2026-10-22 application timestamp. This is local-development evidence only, not proof about any shared environment. Production TND routing remains gated by Q-006's outstanding provider event contract, Q-010 wallet posting/idempotency tests, Q-011 restore evidence, and all applicable security/compliance/release gates.
