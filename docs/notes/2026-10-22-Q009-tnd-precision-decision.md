# Q-009 — TND provider precision decision

**Decision date:** 2026-10-22  
**Decision owner:** Project Owner  
**Gate status:** **Decision accepted; implementation/rehearsal pending.** This is not authorization to enable live betting or provider wallet callbacks.

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

- [ ] Shared money package accepts two decimals for TND and rejects three decimals without rounding.
- [ ] Wallet balance/statement API tests assert canonical two-decimal TND values.
- [ ] Migration 008 updates the seeded TND exponent to 2 on a clean, fully migrated database.
- [ ] Migration 008 demonstrably refuses to run when TND ledger history exists and leaves TND exponent at 3.
- [ ] CI passes build, TypeScript, API/migration, OpenAPI and migration-guard tests.
- [ ] Before applying to any existing database, separately verify the migration's preconditions and review the target environment. Do not run this migration against Neon or Production as part of this development change set.

Q-009 may be marked implementation-verified only after the acceptance evidence above passes. Production TND routing remains gated by Q-006's outstanding provider event contract, Q-010 wallet posting/idempotency tests, Q-011 restore evidence, and all applicable security/compliance/release gates.
