# Bclick provider evidence index — TND precision

## Accepted decision

- Bclick's accepted TND accounting/API scale is **2 decimal places**: `0.01 TND = 10 millimes`.
- **BigBang Casino:** an amount with more than two fractional digits is rounded half away from zero to `0.01 TND` before sending; a movement whose rounded amount is zero is not sent.
- **WinHouse Sportsbook:** a stake with more than two fractional digits is rejected as `invalid_stake_precision` and nothing is debited; payouts are rounded to `0.01 TND`.
- **Aggregator is not covered by this confirmation.** Its integer `amount`/`balance` wire scale remains a separate open gate; do not infer it from BigBang/WinHouse.

## Canonical evidence files

- Vendor-supplied source JSON is preserved in the Project Library at `/Bclick/provider-evidence/tnd-2dp-vendor-fixtures.json`.
- The canonical executable repository fixture is [`server/test/fixtures/tnd-wallet-provider-vectors.json`](../../server/test/fixtures/tnd-wallet-provider-vectors.json).
- Signature, balance, precision and refusal tests are in [`server/test/provider-tnd-fixtures.test.ts`](../../server/test/provider-tnd-fixtures.test.ts).
- Accepted decision: [`docs/notes/2026-10-22-Q009-tnd-precision-decision.md`](../notes/2026-10-22-Q009-tnd-precision-decision.md).
- Reconciliation checkpoint: [`docs/notes/2026-10-24-Q009-precision-and-phase11-reconciliation.md`](../notes/2026-10-24-Q009-precision-and-phase11-reconciliation.md).

The source JSON explicitly labels `dummy_secret` as a test fixture. Never use it in a real environment. Do not create another copy of the provider fixture in a new folder: update the canonical test fixture and its signature tests together when a vendor supplies a new authoritative vector, and record source date/revision plus review outcome in the Q-009 note.

## Evidence boundary

These vectors prove only the sample bet/win signatures, balances, and stated precision/rounding/refusal behavior. They do **not** settle every callback type, conflicting duplicate handling, idempotency, refunds/cashouts, player/session mapping, source/game eligibility, sandbox reconciliation, or production readiness.

Keep Q-006, Q-010, Q-011, Q-013, Q-004, applicable compliance, and deployment/release approval independent. Passing these fixtures must not enable a live callback, wager, payment, FX, wallet posting, or other real-money path.
