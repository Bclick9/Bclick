# Q-009 precision and Phase 11 contract reconciliation — 2026-10-24

## TND precision decision is evidence-based and provider-specific

Q-009's decision dated 2026-10-22 is based on the written WinHouse and BigBang support replies shared with the Project Owner and the associated golden vectors; it is not an assumption about ISO currency defaults.

- **Bclick accounting scale for TND:** 2 decimal places. Bclick API inputs with more than two decimals, such as `12.345 TND`, are rejected rather than silently rounded. `0.01 TND = 10 millimes`.
- **WinHouse:** its current tenant is TND-only. Stakes with more than two fractional digits return `invalid_stake_precision` without a debit; payouts are rounded to 0.01 TND.
- **BigBang:** TND uses the Dedicated Casino Shop/Shop-Level Currency arrangement. Amounts with more than two fractional digits are rounded half away from zero to 0.01 TND before sending; a movement rounded to zero is not sent.
- **Golden fixtures:** the user-supplied TND fixture payload records both providers' expected debits, credits, resulting balances, signature rules and edge behavior. The test fixtures and tests remain the reproducible source of executable evidence.

This decision does not enable live routing. Signature/payload integrity, idempotency/retry, player/session mapping, source/game eligibility, sandbox execution, reconciliation and release/compliance gates remain independent.

## Aggregator remains a separate blocked question

Do not transfer the BigBang/WinHouse two-decimal result to Aggregator. Its public integer `balance`/`amount` wording does not establish the TND integer unit scale. A-01 remains open until written confirmation and exact request/response fixtures establish the scale and rounding/refusal behavior. Aggregator TND routing remains disabled until that evidence and every other applicable gate pass. A requirement for millime preservation must not be retroactively imposed on the accepted BigBang/WinHouse contracts.

## Phase 11 skin ordering is preserved

The CMS/Backoffice roadmap still requires persistent skin ordering. The frontend `backend/pages/cms/SkinGames.tsx` uses the supported catalog operations:
- `PATCH /api/v1/admin/casino/skin-games/reorder`
- `PATCH /api/v1/admin/casino/skin-games/{gameId}/order-position`

Those operations persist ordering within source-tier boundaries and write audit evidence. The obsolete `PATCH /api/v1/admin/cms/skin-games/{gameId}/reorder` / `reorderCmsSkinGame` alias did not have a matching handler or current UI consumer and used a conflicting request model. Removing that alias is contract cleanup, not removal of the Phase 11 ordering capability; the code PR must keep these canonical routes and their tests.

## Q-020 transition

Original Q-020 Phase 0.5 exit criterion is complete as documented in [Issue #56](https://github.com/Bclick9/Bclick/issues/56). The broader 49-route assertion-level evidence is tracked with a finite stop rule in [Q-020b #141](https://github.com/Bclick9/Bclick/issues/141). Q-004 media quarantine/scanning/storage isolation and Issue #55 real Identity/MFA/token/recovery/runbook/audit-redaction acceptance are independent open gates. Neither is closed by this note or by CI green.
