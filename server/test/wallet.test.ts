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
import { formatMinorAmount } from '../src/wallet/service.js';

type Entry = {
  accountId: string;
  currency: string;
  amount: bigint;
  sequence: number;
};

function cookiesFrom(headers: string | string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  const items = headers === undefined ? [] : Array.isArray(headers) ? headers : [headers];
  for (const item of items) {
    const first = item.split(';', 1)[0] ?? '';
    const index = first.indexOf('=');
    if (index > 0) result[first.slice(0, index)] = first.slice(index + 1);
  }
  return result;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([name, value]) => name + '=' + value).join('; ');
}

async function postJournal(
  pool: Pool,
  input: { movementType: string; reference: string; entries: Entry[]; scope?: string; key?: string },
): Promise<string> {
  const client = await pool.connect();
  const journalId = randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO journal_transactions
        (id,movement_type,reference,idempotency_scope,idempotency_key,request_digest)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      journalId,
      input.movementType,
      input.reference,
      input.scope ?? null,
      input.key ?? null,
      input.scope === undefined ? null : 'a'.repeat(64),
    ]);
    for (const entry of input.entries) {
      await client.query(`
        INSERT INTO ledger_entries
          (id,journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [
        randomUUID(), journalId, entry.accountId, entry.currency, entry.amount.toString(), entry.sequence,
      ]);
    }
    await client.query('COMMIT');
    return journalId;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

test('Phase 5 wallet ledger rehearsal: double entry, immutable posting, no overdraft and read APIs', {
  timeout: 180_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl, max: 8, application_name: 'bclick-wallet-test' });
  const config = parseIdentityConfig({
    BCLICK_IDENTITY_ENABLED: 'true',
    BCLICK_SESSION_HASH_KEY: randomBytes(32).toString('hex'),
    BCLICK_CSRF_SIGNING_KEY: randomBytes(32).toString('hex'),
    BCLICK_TOTP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    BCLICK_PLAYER_ALLOWED_ORIGINS: 'https://localhost:5173',
    BCLICK_ADMIN_ALLOWED_ORIGINS: 'https://localhost:5174',
    BCLICK_TERMS_VERSION: 'wallet-test-terms-v1',
    BCLICK_AGE_POLICY_VERSION: 'wallet-test-age-v1',
  }, 'test');
  assert.ok(config);
  const app = buildApp({
    database: pool,
    logLevel: 'silent',
    identity: new IdentityService(new PgIdentityRepository(pool), config),
    identityConfig: config,
  });

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });

    const migrationCount = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM pgmigrations');
    assert.equal(migrationCount.rows[0]?.count, '14', 'wallet, catalogue, TND precision, legacy-alias, tier identity, provider controls, and Skin Games presentation migrations must apply in order');
    const tndCurrency = await pool.query<{ decimal_places: number }>(
      "SELECT decimal_places FROM public.currencies WHERE code='TND'",
    );
    assert.equal(tndCurrency.rows[0]?.decimal_places, 2, 'Migration 008 must configure TND to two decimal places');

    const anonymousBalance = await app.inject({ method: 'GET', url: '/api/v1/wallets/TND/balance' });
    assert.equal(anonymousBalance.statusCode, 401);
    const anonymousStatement = await app.inject({ method: 'GET', url: '/api/v1/wallets/TND/statement' });
    assert.equal(anonymousStatement.statusCode, 401);

    const email = 'wallet-' + randomUUID() + '@example.test';
    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: {
        email,
        username: 'Wallet.' + randomUUID().replaceAll('-', '').slice(0, 12),
        password: 'Local-Wallet-Test-Password-123!',
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
    const cookies = cookiesFrom(registered.headers['set-cookie']);
    assert.ok(cookies['__Host-bclick_session'], 'registration establishes the player session');

    const emptyWallet = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/balance',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(emptyWallet.statusCode, 200, emptyWallet.body);
    assert.equal(emptyWallet.headers['cache-control'], 'no-store');
    assert.deepEqual(emptyWallet.json().data, {
      currency: 'TND',
      balance: '0.00',
      available: '0.00',
      held: '0.00',
      bonusRestrictedBalance: null,
      asOf: emptyWallet.json().data.asOf,
    });
    assert.ok(Number.isFinite(Date.parse(emptyWallet.json().data.asOf)));

    const crossCurrency = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/EUR/balance',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(crossCurrency.statusCode, 404);
    const emptyStatement = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/statement',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(emptyStatement.statusCode, 200, emptyStatement.body);
    assert.deepEqual(emptyStatement.json().data, []);
    assert.equal(emptyStatement.json().page.pageSize, 25);

    const accountResult = await pool.query<{ id: string; account_kind: string }>(`
      SELECT id,account_kind FROM wallet_accounts
       WHERE player_id=$1 AND currency_code='TND'
       ORDER BY account_kind
    `, [playerId]);
    const available = accountResult.rows.find((row) => row.account_kind === 'player-available');
    const held = accountResult.rows.find((row) => row.account_kind === 'held');
    assert.ok(available);
    assert.ok(held);
    const systemResult = await pool.query<{ id: string }>(`
      SELECT id FROM wallet_accounts
       WHERE owner_type='system' AND account_kind='operator-equity' AND currency_code='TND'
    `);
    const operatorEquity = systemResult.rows[0];
    assert.ok(operatorEquity);

    const creditJournalId = await postJournal(pool, {
      movementType: 'deposit_confirmed',
      reference: 'wallet-ci-credit',
      scope: 'wallet-ci',
      key: randomUUID(),
      entries: [
        { accountId: available.id, currency: 'TND', amount: 1_234n, sequence: 1 },
        { accountId: operatorEquity.id, currency: 'TND', amount: -1_234n, sequence: 2 },
      ],
    });

    const creditedWallet = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/balance',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(creditedWallet.statusCode, 200, creditedWallet.body);
    assert.equal(creditedWallet.json().data.balance, '12.34');
    assert.equal(creditedWallet.json().data.available, '12.34');
    assert.equal(creditedWallet.json().data.held, '0.00');

    const creditedStatement = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/statement?limit=1',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(creditedStatement.statusCode, 200, creditedStatement.body);
    assert.equal(creditedStatement.json().data.length, 1);
    assert.equal(creditedStatement.json().data[0].id, creditJournalId);
    assert.equal(creditedStatement.json().data[0].amount, '12.34');
    assert.equal(creditedStatement.json().data[0].status, 'posted');
    assert.equal(creditedStatement.json().data[0].reference, 'wallet-ci-credit');

    await assert.rejects(
      postJournal(pool, {
        movementType: 'wallet_adjustment',
        reference: 'wallet-ci-one-entry',
        entries: [{ accountId: available.id, currency: 'TND', amount: 1n, sequence: 1 }],
      }),
      /WALLET_JOURNAL_UNBALANCED/,
      'a one-entry journal must fail at commit',
    );
    await assert.rejects(
      postJournal(pool, {
        movementType: 'wallet_adjustment',
        reference: 'wallet-ci-unbalanced',
        entries: [
          { accountId: available.id, currency: 'TND', amount: 100n, sequence: 1 },
          { accountId: operatorEquity.id, currency: 'TND', amount: -99n, sequence: 2 },
        ],
      }),
      /WALLET_JOURNAL_UNBALANCED/,
      'an unbalanced journal must fail at commit',
    );

    await assert.rejects(
      pool.query('UPDATE ledger_entries SET amount_minor=amount_minor+1 WHERE journal_id=$1', [creditJournalId]),
      /WALLET_LEDGER_APPEND_ONLY/,
    );
    await assert.rejects(
      pool.query('DELETE FROM journal_transactions WHERE id=$1', [creditJournalId]),
      /WALLET_LEDGER_APPEND_ONLY/,
    );

    // A journal is closed at its first commit: entries added in another
    // transaction are not accepted even if their net sum is zero.
    {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`
          INSERT INTO ledger_entries
            (journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence)
          VALUES ($1,$2,'TND',1,3),($1,$3,'TND',-1,4)
        `, [creditJournalId, available.id, operatorEquity.id]);
        await assert.rejects(client.query('COMMIT'), /WALLET_JOURNAL_CLOSED/);
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        client.release();
      }
    }

    // Currency on an entry must match the currency of its wallet account.
    {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const journalId = randomUUID();
        await client.query('INSERT INTO journal_transactions(id,movement_type,reference) VALUES ($1,$2,$3)',
          [journalId, 'wallet_adjustment', 'wallet-ci-currency-mismatch']);
        await assert.rejects(client.query(`
          INSERT INTO ledger_entries(journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence)
          VALUES ($1,$2,'EUR',1,1)
        `, [journalId, available.id]), /ledger_entries_account_currency_fk/);
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        client.release();
      }
    }

    await assert.rejects(
      postJournal(pool, {
        movementType: 'bet_debit',
        reference: 'wallet-ci-overdraft',
        entries: [
          { accountId: available.id, currency: 'TND', amount: -1_235n, sequence: 1 },
          { accountId: operatorEquity.id, currency: 'TND', amount: 1_235n, sequence: 2 },
        ],
      }),
      /WALLET_OVERDRAFT/,
      'ledger-derived player available balance must never go negative',
    );

    // Two individually plausible concurrent debits must not jointly overdraw.
    const concurrent = await Promise.allSettled([
      postJournal(pool, {
        movementType: 'bet_debit', reference: 'wallet-ci-concurrent-a',
        entries: [
          { accountId: available.id, currency: 'TND', amount: -700n, sequence: 1 },
          { accountId: operatorEquity.id, currency: 'TND', amount: 700n, sequence: 2 },
        ],
      }),
      postJournal(pool, {
        movementType: 'bet_debit', reference: 'wallet-ci-concurrent-b',
        entries: [
          { accountId: available.id, currency: 'TND', amount: -700n, sequence: 1 },
          { accountId: operatorEquity.id, currency: 'TND', amount: 700n, sequence: 2 },
        ],
      }),
    ]);
    assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1, 'concurrent debit results: ' + JSON.stringify(concurrent.map((result) => result.status === 'fulfilled' ? { status: result.status } : { status: result.status, message: String(result.reason), code: (result.reason as { code?: string }).code })));
    assert.equal(concurrent.filter((result) => result.status === 'rejected').length, 1);
    const rejected = concurrent.find((result) => result.status === 'rejected');
    assert.ok(rejected && rejected.status === 'rejected');
    assert.match(String(rejected.reason), /WALLET_OVERDRAFT/);

    const projection = await pool.query<{ balance_minor: string; ledger_total: string }>(`
      SELECT ab.balance_minor::text,
             COALESCE((SELECT sum(le.amount_minor) FROM ledger_entries le WHERE le.wallet_account_id=wa.id),0)::text AS ledger_total
        FROM wallet_accounts wa
        JOIN account_balances ab ON ab.wallet_account_id=wa.id
       WHERE wa.id=$1
    `, [available.id]);
    assert.deepEqual(projection.rows[0], { balance_minor: '534', ledger_total: '534' });

    const firstPage = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/statement?limit=1',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(firstPage.statusCode, 200, firstPage.body);
    assert.equal(firstPage.json().data.length, 1);
    assert.ok(firstPage.json().page.nextCursor);
    const cursor = encodeURIComponent(String(firstPage.json().page.nextCursor));
    const secondPage = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/statement?limit=1&cursor=' + cursor,
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(secondPage.statusCode, 200, secondPage.body);
    assert.equal(secondPage.json().data.length, 1);
    assert.notEqual(firstPage.json().data[0].id, secondPage.json().data[0].id);
    assert.equal(secondPage.json().page.nextCursor, null);

    const badCursor = await app.inject({
      method: 'GET',
      url: '/api/v1/wallets/TND/statement?cursor=not-a-valid-cursor',
      headers: { cookie: cookieHeader(cookies) },
    });
    assert.equal(badCursor.statusCode, 400);

    assert.equal(formatMinorAmount('1', 3), '0.001');
    assert.equal(formatMinorAmount('-12345', 3), '-12.345');
    assert.equal(formatMinorAmount('1', 2), '0.01');
    assert.equal(formatMinorAmount('123', 0), '123');
  } finally {
    await app.close();
    await pool.end();
    await container.stop();
  }
});
