import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

import { parseIdentityConfig } from '../src/identity/config.js';
import { PgIdentityRepository } from '../src/identity/repository.js';
import { IdentityService } from '../src/identity/service.js';
import { buildApp } from '../src/app.js';
import {
  WalletPostingFault,
  WalletPostingService,
  type WalletCurrencyCode,
  type WalletPostingRequest,
} from '../src/wallet/posting-service.js';

interface AccountRow {
  id: string;
  currency_code: WalletCurrencyCode;
  account_kind: string;
  account_code: string;
}

interface ProjectionRow {
  balance_minor: string;
  ledger_total: string;
}

function assertWalletFault(error: unknown, code: string): boolean {
  return error instanceof WalletPostingFault && error.code === code;
}

async function accountProjection(pool: Pool, accountId: string): Promise<ProjectionRow> {
  const result = await pool.query<ProjectionRow>(
    'SELECT ab.balance_minor::text AS balance_minor,COALESCE((SELECT sum(le.amount_minor) FROM public.ledger_entries le WHERE le.wallet_account_id=wa.id),0)::text AS ledger_total FROM public.wallet_accounts wa JOIN public.account_balances ab ON ab.wallet_account_id=wa.id WHERE wa.id=$1',
    [accountId],
  );
  const row = result.rows[0];
  assert.ok(row, 'account projection exists for ' + accountId);
  return row;
}

async function assertAllProjectionsMatchLedger(pool: Pool): Promise<void> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM public.wallet_accounts wa JOIN public.account_balances ab ON ab.wallet_account_id=wa.id WHERE ab.balance_minor <> COALESCE((SELECT sum(le.amount_minor) FROM public.ledger_entries le WHERE le.wallet_account_id=wa.id),0)',
  );
  assert.equal(result.rows[0]?.count, '0', 'every account projection equals its ledger-derived balance');
}

test('Phase 5A: wallet posting service idempotency, state transitions, concurrency, reconciliation, and atomic rollback', {
  timeout: 240_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl, max: 10, application_name: 'bclick-phase5a-wallet-posting-test' });
  const config = parseIdentityConfig({
    BCLICK_IDENTITY_ENABLED: 'true',
    BCLICK_SESSION_HASH_KEY: randomBytes(32).toString('hex'),
    BCLICK_CSRF_SIGNING_KEY: randomBytes(32).toString('hex'),
    BCLICK_TOTP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    BCLICK_PLAYER_ALLOWED_ORIGINS: 'https://localhost:5173',
    BCLICK_ADMIN_ALLOWED_ORIGINS: 'https://localhost:5174',
    BCLICK_TERMS_VERSION: 'phase5a-wallet-test-terms-v1',
    BCLICK_AGE_POLICY_VERSION: 'phase5a-wallet-test-age-v1',
  }, 'test');
  assert.ok(config);
  const app = buildApp({
    database: pool,
    logLevel: 'silent',
    identity: new IdentityService(new PgIdentityRepository(pool), config),
    identityConfig: config,
  });
  const posting = new WalletPostingService(pool);

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });

    const migrationHistory = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.pgmigrations');
    assert.equal(migrationHistory.rows[0]?.count, '19', 'the test uses the current ordered migration chain rather than test-only wallet tables');

    const currencies = await pool.query<{ code: string; decimal_places: number }>(
      "SELECT code,decimal_places FROM public.currencies WHERE code IN ('TND','EUR','USD') ORDER BY code",
    );
    assert.deepEqual(currencies.rows, [
      { code: 'EUR', decimal_places: 2 },
      { code: 'TND', decimal_places: 2 },
      { code: 'USD', decimal_places: 2 },
    ]);

    const email = 'phase5a-' + randomUUID() + '@example.test';
    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: {
        email,
        username: 'P5A.' + randomUUID().replaceAll('-', '').slice(0, 12),
        password: 'Local-Phase5A-Test-Password-123!',
        countryCode: 'TN',
        settlementCurrency: 'TND',
        dateOfBirth: '1990-01-01',
        acceptTerms: true,
        acceptAgeConfirmation: true,
        preferredLanguage: 'en',
      },
    });
    assert.equal(registered.statusCode, 201, registered.body);
    const playerId = String(registered.json().data.player.id);

    const playerAccountsResult = await pool.query<AccountRow>(
      "SELECT id,currency_code,account_kind,account_code FROM public.wallet_accounts WHERE player_id=$1 AND currency_code='TND' ORDER BY account_kind",
      [playerId],
    );
    const available = playerAccountsResult.rows.find((row) => row.account_kind === 'player-available');
    const held = playerAccountsResult.rows.find((row) => row.account_kind === 'held');
    assert.ok(available, 'player available account exists from the existing wallet foundation');
    assert.ok(held, 'player held account exists from the existing wallet foundation');

    const systemAccountsResult = await pool.query<AccountRow>(
      "SELECT id,currency_code,account_kind,account_code FROM public.wallet_accounts WHERE owner_type='system' AND currency_code IN ('TND','EUR','USD') AND account_kind IN ('operator-equity','payment-clearing') ORDER BY currency_code,account_kind",
    );
    const systemAccount = (kind: string, currency: WalletCurrencyCode): AccountRow => {
      const account = systemAccountsResult.rows.find((row) => row.account_kind === kind && row.currency_code === currency);
      assert.ok(account, 'system account exists for ' + kind + ' ' + currency);
      return account;
    };
    const equityTnd = systemAccount('operator-equity', 'TND');
    const paymentsTnd = systemAccount('payment-clearing', 'TND');

    // Initial test fixture is deliberately a local, disposable accounting entry;
    // this code does not expose or invoke any production/financial route.
    const seedRequest: WalletPostingRequest = {
      movementType: 'wallet_adjustment',
      idempotencyScope: 'phase5a:' + playerId + ':seed',
      idempotencyKey: 'seed-001',
      reference: 'phase5a-seed',
      sourceType: 'phase5a-test-fixture',
      sourceId: playerId,
      actorType: 'system',
      metadata: { testFixture: true, currency: 'TND' },
      entries: [
        { walletAccountId: available.id, currencyCode: 'TND', amountMinor: 1_000n, entrySequence: 1 },
        { walletAccountId: equityTnd.id, currencyCode: 'TND', amountMinor: -1_000n, entrySequence: 2 },
      ],
    };
    const seed = await posting.post(seedRequest);
    assert.equal(seed.duplicate, false);
    const duplicateSeed = await posting.post({
      ...seedRequest,
      entries: [...seedRequest.entries].reverse(),
      metadata: { currency: 'TND', testFixture: true },
    });
    assert.equal(duplicateSeed.duplicate, true, 'canonical-equivalent entry order and JSON object key order return the original journal');
    assert.equal(duplicateSeed.journalId, seed.journalId);
    assert.deepEqual(duplicateSeed.entries, seed.entries);

    const journalCountAfterReplay = await pool.query<{ count: string; entry_count: string }>(
      'SELECT count(DISTINCT jt.id)::text AS count,count(le.id)::text AS entry_count FROM public.journal_transactions jt LEFT JOIN public.ledger_entries le ON le.journal_id=jt.id WHERE jt.idempotency_scope=$1 AND jt.idempotency_key=$2',
      [seedRequest.idempotencyScope, seedRequest.idempotencyKey],
    );
    assert.deepEqual(journalCountAfterReplay.rows[0], { count: '1', entry_count: '2' });

    await assert.rejects(
      posting.post({
        ...seedRequest,
        entries: [
          { walletAccountId: available.id, currencyCode: 'TND', amountMinor: 999n, entrySequence: 1 },
          { walletAccountId: equityTnd.id, currencyCode: 'TND', amountMinor: -999n, entrySequence: 2 },
        ],
      }),
      (error: unknown) => assertWalletFault(error, 'IDEMPOTENCY_CONFLICT'),
    );
    const balanceAfterSeed = await accountProjection(pool, available.id);
    assert.deepEqual(balanceAfterSeed, { balance_minor: '1000', ledger_total: '1000' });

    // A single journal may span currencies only when each currency independently balances.
    const multiCurrency = await posting.post({
      movementType: 'wallet_adjustment',
      idempotencyScope: 'phase5a:multi-currency',
      idempotencyKey: 'multi-currency-001',
      reference: 'phase5a-multi-currency',
      actorType: 'system',
      entries: ([
        ['TND', 11n, 1],
        ['EUR', 22n, 3],
        ['USD', 33n, 5],
      ] as const).flatMap(([currency, amount, sequence]) => [
        {
          walletAccountId: systemAccount('operator-equity', currency).id,
          currencyCode: currency,
          amountMinor: amount,
          entrySequence: sequence,
        },
        {
          walletAccountId: systemAccount('payment-clearing', currency).id,
          currencyCode: currency,
          amountMinor: -amount,
          entrySequence: sequence + 1,
        },
      ]),
    });
    assert.equal(multiCurrency.entries.length, 6);
    const currencyTotals = await pool.query<{ currency_code: string; total_minor: string }>(
      'SELECT currency_code,sum(amount_minor)::text AS total_minor FROM public.ledger_entries WHERE journal_id=$1 GROUP BY currency_code ORDER BY currency_code',
      [multiCurrency.journalId],
    );
    assert.deepEqual(currencyTotals.rows, [
      { currency_code: 'EUR', total_minor: '0' },
      { currency_code: 'TND', total_minor: '0' },
      { currency_code: 'USD', total_minor: '0' },
    ]);

    const reserveRequest = {
      playerId,
      currencyCode: 'TND' as const,
      amountMinor: 300n,
      idempotencyScope: 'phase5a:' + playerId + ':reserve',
      idempotencyKey: 'reserve-001',
      reference: 'phase5a-reserve',
      actorType: 'player' as const,
      actorId: playerId,
    };
    const reserved = await posting.reserve(reserveRequest);
    assert.equal(reserved.movementType, 'withdrawal_hold');
    const duplicateReserve = await posting.reserve(reserveRequest);
    assert.equal(duplicateReserve.duplicate, true);
    assert.equal(duplicateReserve.journalId, reserved.journalId);

    const afterReserveAvailable = await accountProjection(pool, available.id);
    const afterReserveHeld = await accountProjection(pool, held.id);
    assert.deepEqual(afterReserveAvailable, { balance_minor: '700', ledger_total: '700' });
    assert.deepEqual(afterReserveHeld, { balance_minor: '300', ledger_total: '300' });

    // Two concurrent debits each fit the pre-race balance, but they must not both post.
    const debit = (key: string, reference: string): WalletPostingRequest => ({
      movementType: 'bet_debit',
      idempotencyScope: 'phase5a:' + playerId + ':concurrent-debit',
      idempotencyKey: key,
      reference,
      actorType: 'player',
      actorId: playerId,
      entries: [
        { walletAccountId: available.id, currencyCode: 'TND', amountMinor: -500n, entrySequence: 1 },
        { walletAccountId: equityTnd.id, currencyCode: 'TND', amountMinor: 500n, entrySequence: 2 },
      ],
    });
    const concurrent = await Promise.allSettled([
      posting.post(debit('concurrent-a', 'phase5a-concurrent-a')),
      posting.post(debit('concurrent-b', 'phase5a-concurrent-b')),
    ]);
    assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1,
      'exactly one 500-minor debit can post with only 700 minor available');
    assert.equal(concurrent.filter((result) => result.status === 'rejected').length, 1);
    const rejectedDebit = concurrent.find((result) => result.status === 'rejected');
    assert.ok(rejectedDebit && rejectedDebit.status === 'rejected');
    assert.ok(rejectedDebit.reason instanceof WalletPostingFault);
    assert.equal(rejectedDebit.reason.code, 'INSUFFICIENT_FUNDS');

    const availableAfterRace = await accountProjection(pool, available.id);
    assert.deepEqual(availableAfterRace, { balance_minor: '200', ledger_total: '200' });

    const released = await posting.release({
      playerId,
      currencyCode: 'TND',
      amountMinor: 100n,
      idempotencyScope: 'phase5a:' + playerId + ':release',
      idempotencyKey: 'release-001',
      reference: 'phase5a-release',
      actorType: 'player',
      actorId: playerId,
    });
    assert.equal(released.movementType, 'withdrawal_released');
    assert.deepEqual(await accountProjection(pool, available.id), { balance_minor: '300', ledger_total: '300' });
    assert.deepEqual(await accountProjection(pool, held.id), { balance_minor: '200', ledger_total: '200' });

    const settled = await posting.settle({
      playerId,
      currencyCode: 'TND',
      amountMinor: 150n,
      clearingAccountId: paymentsTnd.id,
      idempotencyScope: 'phase5a:' + playerId + ':settle',
      idempotencyKey: 'settle-001',
      reference: 'phase5a-settle',
      actorType: 'player',
      actorId: playerId,
    });
    assert.equal(settled.movementType, 'withdrawal_settled');
    assert.deepEqual(await accountProjection(pool, held.id), { balance_minor: '50', ledger_total: '50' });
    assert.deepEqual(await accountProjection(pool, paymentsTnd.id), { balance_minor: '139', ledger_total: '139' });

    const reversalRequest = {
      originalJournalId: settled.journalId,
      idempotencyScope: 'phase5a:' + playerId + ':settle-reversal',
      idempotencyKey: 'settle-reversal-001',
      reference: 'phase5a-settle-reversal',
      actorType: 'system' as const,
      metadata: { reason: 'test reversal of settled hold' },
    };
    const reversed = await posting.reverse(reversalRequest);
    assert.equal(reversed.movementType, 'withdrawal_refund');
    assert.deepEqual(await accountProjection(pool, held.id), { balance_minor: '200', ledger_total: '200' });
    assert.deepEqual(await accountProjection(pool, paymentsTnd.id), { balance_minor: '-11', ledger_total: '-11' });
    const replayedReversal = await posting.reverse(reversalRequest);
    assert.equal(replayedReversal.duplicate, true);
    assert.equal(replayedReversal.journalId, reversed.journalId);

    await assert.rejects(
      posting.reverse({
        ...reversalRequest,
        idempotencyScope: 'phase5a:' + playerId + ':second-reversal',
        idempotencyKey: 'settle-reversal-002',
      }),
      (error: unknown) => assertWalletFault(error, 'REVERSAL_ALREADY_POSTED'),
    );

    // Assert failure on the second entry removes the journal, first entry and projection change.
    await pool.query(`
      CREATE FUNCTION public.phase5a_fail_second_entry() RETURNS trigger
      LANGUAGE plpgsql AS $phase5a_fail_second_entry$
      BEGIN
        IF NEW.entry_sequence=2 AND NEW.amount_minor=-19 THEN
          RAISE EXCEPTION 'PHASE5A_INJECTED_ENTRY_FAILURE';
        END IF;
        RETURN NEW;
      END
      $phase5a_fail_second_entry$;
      CREATE TRIGGER phase5a_fail_second_entry
      BEFORE INSERT ON public.ledger_entries
      FOR EACH ROW EXECUTE FUNCTION public.phase5a_fail_second_entry();
    `);
    const beforeEntryFailure = await accountProjection(pool, available.id);
    await assert.rejects(
      posting.post({
        movementType: 'wallet_adjustment',
        idempotencyScope: 'phase5a:' + playerId + ':entry-failure',
        idempotencyKey: 'entry-failure-001',
        reference: 'phase5a-entry-failure',
        actorType: 'system',
        entries: [
          { walletAccountId: available.id, currencyCode: 'TND', amountMinor: 19n, entrySequence: 1 },
          { walletAccountId: equityTnd.id, currencyCode: 'TND', amountMinor: -19n, entrySequence: 2 },
        ],
      }),
      (error: unknown) => assertWalletFault(error, 'POSTING_FAILED'),
    );
    await pool.query('DROP TRIGGER phase5a_fail_second_entry ON public.ledger_entries; DROP FUNCTION public.phase5a_fail_second_entry();');
    const rolledBackEntryJournal = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.journal_transactions WHERE idempotency_scope=$1 AND idempotency_key=$2',
      ['phase5a:' + playerId + ':entry-failure', 'entry-failure-001'],
    );
    assert.equal(rolledBackEntryJournal.rows[0]?.count, '0');
    assert.deepEqual(await accountProjection(pool, available.id), beforeEntryFailure);

    // Failure while writing the audit row must roll the journal and all entries back too.
    await pool.query(`
      CREATE FUNCTION public.phase5a_fail_posting_audit() RETURNS trigger
      LANGUAGE plpgsql AS $phase5a_fail_posting_audit$
      BEGIN
        IF NEW.action='wallet.journal.posted' AND NEW.metadata->>'reference' LIKE 'phase5a-audit-failure-%' THEN
          RAISE EXCEPTION 'PHASE5A_INJECTED_AUDIT_FAILURE';
        END IF;
        RETURN NEW;
      END
      $phase5a_fail_posting_audit$;
      CREATE TRIGGER phase5a_fail_posting_audit
      BEFORE INSERT ON public.audit_events
      FOR EACH ROW EXECUTE FUNCTION public.phase5a_fail_posting_audit();
    `);
    const beforeAuditFailure = await accountProjection(pool, available.id);
    await assert.rejects(
      posting.post({
        movementType: 'wallet_adjustment',
        idempotencyScope: 'phase5a:' + playerId + ':audit-failure',
        idempotencyKey: 'audit-failure-001',
        reference: 'phase5a-audit-failure-' + randomUUID(),
        actorType: 'system',
        entries: [
          { walletAccountId: available.id, currencyCode: 'TND', amountMinor: 23n, entrySequence: 1 },
          { walletAccountId: equityTnd.id, currencyCode: 'TND', amountMinor: -23n, entrySequence: 2 },
        ],
      }),
      (error: unknown) => assertWalletFault(error, 'POSTING_FAILED'),
    );
    await pool.query('DROP TRIGGER phase5a_fail_posting_audit ON public.audit_events; DROP FUNCTION public.phase5a_fail_posting_audit();');
    const rolledBackAuditJournal = await pool.query<{ count: string; audit_count: string }>(
      "SELECT (SELECT count(*) FROM public.journal_transactions WHERE idempotency_scope=$1 AND idempotency_key=$2)::text AS count,(SELECT count(*) FROM public.audit_events WHERE metadata->>'reference' LIKE 'phase5a-audit-failure-%')::text AS audit_count",
      ['phase5a:' + playerId + ':audit-failure', 'audit-failure-001'],
    );
    assert.deepEqual(rolledBackAuditJournal.rows[0], { count: '0', audit_count: '0' });
    assert.deepEqual(await accountProjection(pool, available.id), beforeAuditFailure);

    const allJournalsBalanced = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM (SELECT jt.id,le.currency_code,count(*) AS entry_count,sum(le.amount_minor) AS total_minor FROM public.journal_transactions jt JOIN public.ledger_entries le ON le.journal_id=jt.id GROUP BY jt.id,le.currency_code HAVING count(*)<2 OR sum(le.amount_minor)<>0) invalid_journals',
    );
    assert.equal(allJournalsBalanced.rows[0]?.count, '0', 'all posted journals balance independently per currency');
    await assertAllProjectionsMatchLedger(pool);

    // The service accepts a Pool only: it has no provider/payment client or
    // transaction callback parameter capable of issuing a network call mid-transaction.
    assert.equal(typeof (posting as unknown as { providerClient?: unknown }).providerClient, 'undefined');
    assert.equal(typeof (posting as unknown as { paymentClient?: unknown }).paymentClient, 'undefined');
  } finally {
    await app.close();
    await pool.end();
    await container.stop();
  }
});
