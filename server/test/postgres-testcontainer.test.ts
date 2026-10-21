import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

test('checked-in identity migrations apply cleanly to an isolated PostgreSQL 18 Testcontainer', {
  timeout: 120_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const connectionString = container.getConnectionUri();
  const pool = new Pool({ connectionString, max: 2 });

  try {
    await runner({
      databaseUrl: connectionString,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      count: 7,
      log: () => undefined,
    });

    const schema = await pool.query<{
      players: string | null;
      player_profiles: string | null;
      player_credentials: string | null;
      player_sessions: string | null;
      admin_sessions: string | null;
      public_number_type: string | null;
      profile_details: number;
    }>(`
      SELECT
        to_regclass('public.players')::text AS players,
        to_regclass('public.player_profiles')::text AS player_profiles,
        to_regclass('public.player_credentials')::text AS player_credentials,
        to_regclass('public.player_sessions')::text AS player_sessions,
        to_regclass('public.admin_sessions')::text AS admin_sessions,
        (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='player_number') AS public_number_type,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name IN ('first_name','last_name','gender','city','address','postal_code')) AS profile_details
    `);

    assert.deepEqual(schema.rows[0], {
      players: 'players',
      player_profiles: 'player_profiles',
      player_credentials: 'player_credentials',
      player_sessions: 'player_sessions',
      admin_sessions: 'admin_sessions',
      public_number_type: 'bigint',
      profile_details: 6,
    });

    const playerNumberConstraints = await pool.query<{ is_unique: boolean; is_not_null: boolean }>(`
      SELECT
        EXISTS (
          SELECT 1 FROM pg_constraint
           WHERE conrelid='public.players'::regclass
             AND conname='players_player_number_key'
             AND contype='u'
        ) AS is_unique,
        (SELECT is_nullable='NO' FROM information_schema.columns
          WHERE table_schema='public' AND table_name='players' AND column_name='player_number') AS is_not_null
    `);
    assert.deepEqual(playerNumberConstraints.rows[0], { is_unique: true, is_not_null: true });

    const migrationHistory = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.pgmigrations',
    );
    assert.equal(migrationHistory.rows[0]?.count, '7');

    const playerNumberSequence = await pool.query<{ last_value: string; is_called: boolean }>(
      'SELECT last_value::text, is_called FROM public.player_public_number_seq',
    );
    assert.deepEqual(playerNumberSequence.rows[0], { last_value: '99999999', is_called: true });

    // Rehearse the earlier local Migration 004 namespace with a gap left by a
    // deleted account. Migration 005 must compact the surviving users by order.
    const legacyPlayerId = randomUUID();
    const legacyPlayerIdAfterGap = randomUUID();
    const insertLegacyPlayer = (id: string, email: string, displayName: string, username: string, usernameNormalized: string) =>
      pool.query(`
        INSERT INTO public.players
          (id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,
           language,preferred_language,preferred_display_currency,status,verification_status,email_verification_status,
           date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,
           username,username_normalized,phone_number_e164,created_at,updated_at)
        VALUES
          ($1,$2,$2,'test-hash',$3,'TN','TND','en','en',NULL,'pending','pending','pending',
           '1990-01-01',now(),'test-terms-v1',now(),'test-age-v1',$4,$5,NULL,now(),now())
      `, [id, email, displayName, username, usernameNormalized]);
    await insertLegacyPlayer(legacyPlayerId, 'migration-005-a@example.test', 'Migration Test A', 'Migration.TestA', 'migration.testa');
    await insertLegacyPlayer(legacyPlayerIdAfterGap, 'migration-005-b@example.test', 'Migration Test B', 'Migration.TestB', 'migration.testb');
    await pool.query('UPDATE public.players SET player_number=436222976 WHERE id=$1', [legacyPlayerId]);
    await pool.query('UPDATE public.players SET player_number=436222978 WHERE id=$1', [legacyPlayerIdAfterGap]);
    await pool.query("SELECT setval('public.player_public_number_seq',436222978,true)");
    await pool.query("DELETE FROM public.pgmigrations WHERE name='1792929600000_player_public_number_reconcile_005'");

    await runner({
      databaseUrl: connectionString,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      count: 1,
      log: () => undefined,
    });

    const rebasedPlayers = await pool.query<{ player_number: string }>(
      'SELECT player_number::text AS player_number FROM public.players WHERE id = ANY($1::uuid[]) ORDER BY player_number',
      [[legacyPlayerId, legacyPlayerIdAfterGap]],
    );
    assert.deepEqual(rebasedPlayers.rows.map((row) => row.player_number), ['100000000', '100000001']);

    const rebasedSequence = await pool.query<{ last_value: string; is_called: boolean }>(
      'SELECT last_value::text, is_called FROM public.player_public_number_seq',
    );
    assert.deepEqual(rebasedSequence.rows[0], { last_value: '100000001', is_called: true });

    const finalMigrationHistory = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.pgmigrations',
    );
    assert.equal(finalMigrationHistory.rows[0]?.count, '7');

    // Apply Migration 006 only after the sparse Migration 005 rehearsal above,
    // because Migration 005 intentionally requires the exact six-migration pre-state.
    await runner({
      databaseUrl: connectionString,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      count: 1,
      log: () => undefined,
    });

    const walletSchema = await pool.query<{
      wallet_accounts: string | null;
      account_balances: string | null;
      journal_transactions: string | null;
      ledger_entries: string | null;
      migration_count: string;
      player_account_count: string;
      missing_projection_count: string;
    }>(`
      SELECT
        to_regclass('public.wallet_accounts')::text AS wallet_accounts,
        to_regclass('public.account_balances')::text AS account_balances,
        to_regclass('public.journal_transactions')::text AS journal_transactions,
        to_regclass('public.ledger_entries')::text AS ledger_entries,
        (SELECT count(*)::text FROM public.pgmigrations) AS migration_count,
        (SELECT count(*)::text FROM public.wallet_accounts WHERE player_id IS NOT NULL) AS player_account_count,
        (SELECT count(*)::text FROM public.wallet_accounts wa LEFT JOIN public.account_balances ab ON ab.wallet_account_id=wa.id WHERE ab.wallet_account_id IS NULL) AS missing_projection_count
    `);
    assert.deepEqual(walletSchema.rows[0], {
      wallet_accounts: 'wallet_accounts',
      account_balances: 'account_balances',
      journal_transactions: 'journal_transactions',
      ledger_entries: 'ledger_entries',
      migration_count: '8',
      player_account_count: '4',
      missing_projection_count: '0',
    });
  } finally {
    await pool.end();
    await container.stop();
  }
});
