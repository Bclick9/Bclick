import assert from 'node:assert/strict';
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
    assert.equal(migrationHistory.rows[0]?.count, '6');
  } finally {
    await pool.end();
    await container.stop();
  }
});
