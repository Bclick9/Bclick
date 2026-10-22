# Phase 5 — Wallet & Ledger Foundation

**Status:** read-only wallet foundation merged to main; formal Phase 5 exit BLOCKED by Q-010/Q-011  
**Date:** 2026-10-21  
**Branch:** `feat/phase5-wallet-ledger`  
**Scope:** Migration 006, PostgreSQL rehearsal, and read-only wallet endpoints. This is not authorization to activate payments, provider callbacks, wagers, or real-money flows.

## 1. Purpose and source of truth

PostgreSQL's append-only journal and ledger entries are the authoritative financial record. `account_balances` is a rebuildable, transactionally maintained projection only. The browser must never calculate or fabricate a balance from UI state or statement history.

The current product policy is one immutable settlement currency per player account, taken from `players.settlement_currency`. The ledger is currency-capable, but the player may not query another currency wallet merely by changing a path parameter. Currency exponent is read from the existing `currencies` registry (TND=3, EUR=2, USD=2); it must never be inferred from a symbol or changed after postings.

## 2. Migration 006 schema

Migration `1793016000000_wallet_ledger_foundation_006.sql` is an additive migration with an exact precondition requiring the approved seven-migration history ending at Migration 005. It does not rewrite previous migration history and does not connect to Neon.

It creates:
- `wallet_accounts`: immutable account identity, owner, account code, currency, account kind and lifecycle status. Player accounts are tied to the owning player and currency; internal balancing accounts are separately typed. Account currency and identity must not change after ledger entries exist.
- `account_balances`: one row per wallet account, integer minor-unit projection and ledger watermark/sequence. This is a cache that can be checked/rebuilt from the ledger, not the source of truth.
- `journal_transactions`: a posted-only journal header with movement type, optional source/reference, paired idempotency scope/key, canonical request digest and optional compensating-reversal link. There is no draft/partially posted state.
- `ledger_entries`: immutable, signed `BIGINT` minor-unit amounts, journal/account references, currency and entry sequence. A composite foreign key enforces that an entry currency equals its account currency.

The registry `currencies` already exists from Migration 001 and is verified rather than duplicated. Migration 006 provisions a zero-balance `player-available` and `held` account for every existing player. Future registration must create the same two accounts in the same transaction as player creation. System balancing accounts are provisioned separately; this does not represent a deposit or credit to a player.

## 3. Database invariants

1. Every committed journal has at least two entries and each currency represented in that journal sums exactly to zero.
2. A journal and its entries must be inserted in one database transaction. Later attempts to append entries to an already-posted journal are rejected.
3. `journal_transactions` and `ledger_entries` reject UPDATE and DELETE. Correction/reversal is a new journal referencing the original; posted history is never edited.
4. A player's `player-available` and `held` accounts cannot finish a transaction with a negative ledger-derived balance. Validation serializes on affected account rows in stable ID order to reduce concurrent-debit races, verifies the authoritative ledger total, and maintains the projection in the same transaction.
5. Unique idempotency scope/key pairs cannot be reused. Request digest is stored with the pair so application service logic can distinguish an exact replay from a conflicting payload; that full replay contract remains a Phase 5 posting-service gate, not claimed by these read endpoints.
6. Entry/account currency mismatch, duplicate entry sequence, zero-value entries, unknown currencies and invalid account kinds are rejected by database constraints.

No money-moving endpoint is implemented in this work batch. The invariants are tested through disposable PostgreSQL rehearsals before being used by any posting service.

## 4. Read API contract

### `GET /api/v1/wallets/{currency}/balance`

- Requires a currently valid player session; anonymous requests return 401.
- Resource ownership derives only from the authenticated session, never a player ID supplied by the client.
- Requested currency must match the player's stored settlement currency; unknown and mismatched wallet resources return a non-disclosing 404.
- Returns exact decimal strings and the currency exponent from the existing registry. `balance = available + held`; bonus-restricted value remains separate and is returned as null until a bonus wallet is enabled.
- Uses `Cache-Control: no-store`. No UI or server floating-point money arithmetic.

### `GET /api/v1/wallets/{currency}/statement`

- Requires a valid player session and the same settlement-currency/ownership checks.
- Reads only posted journal/ledger data associated with that player's accounts; pending payment intents and provider zero-money notifications are not statement transactions.
- Stable keyset pagination ordered by `(posted_at DESC, id DESC)`, a maximum page size of 100, optional inclusive `from` and exclusive `to` timestamps, exact decimal string amounts and a validated opaque cursor.
- Never reveals account IDs, another player's data, session secrets or raw provider payloads. No statement write endpoint is included.

## 5. CI and local rehearsal

A CI rehearsal uses a disposable PostgreSQL 18 database only and applies all migrations from empty. It must prove:
- The six existing migration history is preserved and Migration 006 is recorded as the eighth migration.
- Existing and newly registered players receive exactly one available and one held account in their settlement currency with zero starting projection.
- A two-entry balanced journal commits; an unbalanced journal and a one-entry journal fail at commit.
- An entry using the wrong currency, a duplicate entry sequence, UPDATE/DELETE of posted records, and an append attempt in a later transaction fail.
- A player debit that would overdraw is rejected, including two concurrent debits whose combined amount exceeds the available balance; the projection never ends below zero.
- Projection totals equal ledger-derived totals, and rejected posting attempts leave neither partial journals nor changed balances.
- Authenticated balance/statement responses are correct; anonymous and cross-currency requests disclose no wallet data; amounts format correctly for TND(3), EUR(2), USD(2); cursor and date filters are bounded and deterministic.

## 6. Safety gates and non-goals

The Phase 3 isolated restore drill remains open in the planning register. Phase 5 code may be rehearsed locally and in disposable CI, but Phase 5 cannot exit and no real-money wallet/provider/payment route may activate until a base backup plus WAL restore is demonstrated, integrity and projection checks pass after restore, independent archive/failure alerts work, and measured RPO/RTO are recorded.

Out of scope: deposits, withdrawals, transfers, payment intents, provider callbacks, wagers, bonus credits, FX execution, admin wallet operations, and real-money activation. No wallet is funded with demo or fabricated money. No production/shared database is migrated. **Neon must not be accessed by the local workflow or CI rehearsal.**

## 7. Exit checklist

- [x] Migration 006 passes the disposable PostgreSQL rehearsal in CI; the test verifies the migration history contains eight migrations.
- [x] Build, typecheck, API tests, OpenAPI lint and generated-client drift checks passed in the merged CI increments.
- [ ] A separate local Docker migration acceptance log has been recorded. The CI/Testcontainers rehearsal is not relabeled as a local Docker result.
- [x] Browser/API checks passed for authenticated balance and statement reads; anonymous reads return 401, currency mismatch does not disclose a wallet, and the empty wallet/statement displays no fabricated movement.
- [x] DB rehearsal tests cover balanced double entry, append-only records, account-currency matching, overdraft rejection, projection-vs-ledger totals, and two concurrent debits with only one successful commit.
- [x] Owner review and merge were completed for [PR #86](https://github.com/Bclick9/Bclick/pull/86) and [PR #87](https://github.com/Bclick9/Bclick/pull/87).
- [ ] Q-010 application-level idempotency scope, exact replay, conflicting-payload rejection, and posting-service tests. Unique DB constraints alone are not sufficient.
- [ ] Q-011 isolated base-backup + WAL restore, restored ledger/projection checks, independent archive/failure alerts, and measured RPO/RTO.
- [ ] Phase 5 exit approval. Read-only endpoints and UI are delivered, but no money-moving route is implemented or authorized.

## 8. Post-merge evidence reconciliation — 2026-10-22

The merged implementation comprises Migration 006, the append-only double-entry schema, read-only player balance/statement endpoints, and the player wallet UI. The wallet test in server/test/wallet.test.ts directly exercises DB-level journal rules and concurrent overdraw protection; it does **not** establish the application idempotency/replay contract because no money-movement posting endpoint/service is included in this scope.

The Project Owner's browser acceptance for PR #87 confirmed a zero TND balance with no fabricated statement lines, unauthenticated redirect to login, working error/retry behavior, and deposit/withdraw previews only. Those previews remain informational UI; they create no intent, transaction, or ledger entry.

**Phase 5 cannot exit yet.** Keep Q-010 and Q-011 open. Do not activate deposits, withdrawals, transfers, wagers, bonus credits, provider callbacks, or real-money routes. A restore runbook, migration test, browser acceptance, or passing CI job is not a substitute for the separate restore evidence and idempotency/posting tests.
