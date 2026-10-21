import assert from 'node:assert/strict';
import { resolve } from 'node:path';
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
      dir: resolve(process.cwd(), 'server/migrations'),
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
    }>(`
      SELECT
        to_regclass('public.players')::text AS players,
        to_regclass('public.player_profiles')::text AS player_profiles,
        to_regclass('public.player_credentials')::text AS player_credentials,
        to_regclass('public.player_sessions')::text AS player_sessions,
        to_regclass('public.admin_sessions')::text AS admin_sessions
    `);

    assert.deepEqual(schema.rows[0], {
      players: 'players',
      player_profiles: 'player_profiles',
      player_credentials: 'player_credentials',
      player_sessions: 'player_sessions',
      admin_sessions: 'admin_sessions',
    });

    const migrationHistory = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.pgmigrations',
    );
    assert.equal(migrationHistory.rows[0]?.count, '5');
  } finally {
    await pool.end();
    await container.stop();
  }
});
