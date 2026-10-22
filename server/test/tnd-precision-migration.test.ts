import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

test('Migration 008 fails closed when TND ledger history already exists', {
  timeout: 180_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl, max: 4, application_name: 'bclick-tnd-precision-migration-test' });
  const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));

  try {
    await runner({
      databaseUrl,
      dir: migrationsDir,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      count: 9,
      log: () => undefined,
    });

    const accountRows = await pool.query<{ id: string; account_code: string }>(`
      SELECT id,account_code
        FROM public.wallet_accounts
       WHERE owner_type='system'
         AND currency_code='TND'
         AND account_code IN ('providers','operator-equity')
       ORDER BY account_code
    `);
    const providerAccount = accountRows.rows.find((row) => row.account_code === 'providers');
    const equityAccount = accountRows.rows.find((row) => row.account_code === 'operator-equity');
    assert.ok(providerAccount);
    assert.ok(equityAccount);

    const journalId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO public.journal_transactions(id,movement_type,source_type,source_id,metadata)
        VALUES ($1,'provider_credit','test','tnd-precision-guard','{}'::jsonb)
      `, [journalId]);
      await client.query(`
        INSERT INTO public.ledger_entries(journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence)
        VALUES ($1,$2,'TND',1,1),($1,$3,'TND',-1,2)
      `, [journalId, providerAccount.id, equityAccount.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    const before = await pool.query<{ decimal_places: number }>(
      "SELECT decimal_places FROM public.currencies WHERE code='TND'",
    );
    assert.equal(before.rows[0]?.decimal_places, 3);

    await assert.rejects(
      runner({
        databaseUrl,
        dir: migrationsDir,
        direction: 'up',
        migrationsTable: 'pgmigrations',
        count: 1,
        log: () => undefined,
      }),
      /Migration 008 stopped: TND ledger history exists/,
    );

    const after = await pool.query<{ decimal_places: number; migrations: string }>(`
      SELECT c.decimal_places,
             (SELECT count(*)::text FROM public.pgmigrations) AS migrations
        FROM public.currencies c
       WHERE c.code='TND'
    `);
    assert.deepEqual(after.rows[0], { decimal_places: 3, migrations: '9' });
  } finally {
    await pool.end();
    await container.stop();
  }
});
