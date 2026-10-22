import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';
import { parseServerConfig } from '@bclick/config';
import { resolveSandboxLocalDatabaseUrl } from './local-database.js';

const MIGRATION_006 = '1793016000000_wallet_ledger_foundation_006';
const MIGRATION_007 = '1793102400000_bigbang_catalogue_007';

const EXPECTED_BEFORE_007 = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
  '1792584000000_identity_domain_migration_001',
  '1792670400000_identity_sessions_split_002',
  '1792756800000_identity_player_credentials_003',
  '1792843200000_player_profile_details_004',
  '1792929600000_player_public_number_reconcile_005',
  MIGRATION_006,
] as const;

const EXPECTED_AFTER_007 = [...EXPECTED_BEFORE_007, MIGRATION_007] as const;

function assertSandboxConfirmation(): void {
  const key = process.env.BIGBANG_SANDBOX_API_KEY?.trim();
  if (!key) throw new Error('BIGBANG_SANDBOX_API_KEY is required.');
  if (!key.startsWith('ek_test_') || key.length < 12) {
    throw new Error('This command accepts only a BigBang sandbox key prefixed ek_test_.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The Phase 6 catalogue migration refuses production runtime configuration.');
  }
  if (process.env.BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM !== 'YES') {
    throw new Error('Set BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM=YES to confirm this local sandbox-only migration.');
  }
}

function migrationName(value: string): string {
  return value.replace(/\.sql$/i, '');
}

async function main(): Promise<void> {
  assertSandboxConfirmation();
  const databaseUrl = resolveSandboxLocalDatabaseUrl(process.env);
  const config = parseServerConfig({ ...process.env, DATABASE_URL: databaseUrl });
  if (config.nodeEnv === 'production') {
    throw new Error('The Phase 6 catalogue migration refuses production runtime configuration.');
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 5_000,
    application_name: 'bclick-bigbang-catalogue-migration',
  });

  try {
    const table = await pool.query<{ exists: boolean }>(
      "SELECT to_regclass('public.pgmigrations') IS NOT NULL AS exists",
    );
    if (table.rows[0]?.exists !== true) {
      throw new Error('Migration history is missing. First initialize the local database through the approved migration bootstrap.');
    }

    const history = await pool.query<{ name: string }>(
      'SELECT name FROM public.pgmigrations ORDER BY id ASC',
    );
    const applied = history.rows.map((row) => migrationName(row.name));

    if (applied.includes(MIGRATION_007)) {
      if (JSON.stringify(applied) !== JSON.stringify(EXPECTED_AFTER_007)) {
        throw new Error('Migration history differs from the reviewed Phase 6 local sequence; refusing to continue.');
      }
      process.stdout.write(JSON.stringify({ status: 'already-applied', migration: MIGRATION_007, target: 'loopback-postgresql' }) + '\n');
      return;
    }

    if (!applied.includes(MIGRATION_006)
        || JSON.stringify(applied) !== JSON.stringify(EXPECTED_BEFORE_007)) {
      throw new Error('Expected the reviewed local migration history through Migration 006 before applying only Migration 007.');
    }

    const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations');
    await runner({
      databaseUrl: config.databaseUrl,
      dir: migrationsDirectory,
      direction: 'up',
      count: 1,
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });

    const after = await pool.query<{ name: string }>(
      'SELECT name FROM public.pgmigrations ORDER BY id ASC',
    );
    const appliedAfter = after.rows.map((row) => migrationName(row.name));
    if (JSON.stringify(appliedAfter) !== JSON.stringify(EXPECTED_AFTER_007)) {
      throw new Error('Migration 007 verification failed; inspect the local migration history before retrying.');
    }

    process.stdout.write(JSON.stringify({ status: 'applied', migration: MIGRATION_007, target: 'loopback-postgresql' }) + '\n');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code)
    : 'SANDBOX_MIGRATION_REFUSED';
  process.stderr.write('[bclick] BigBang sandbox catalogue migration failed (' + code + '). No credential or database URL was logged.\n');
  process.exitCode = 1;
});
