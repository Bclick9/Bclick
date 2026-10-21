import assert from 'node:assert/strict';
import { Pool } from 'pg';

const target = process.env.BCLICK_M003_TARGET;
const phase = process.env.BCLICK_M003_PHASE;
const databaseUrl = process.env.DATABASE_URL;
const neonTarget = 'copabet365-neondb-frankfurt';
const ciTarget = 'ci-disposable';
const expectedDatabase = target === ciTarget ? 'bclick_ci' : 'neondb';

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Refusing to run: Migration 003 gate is intended only for GitHub Actions.');
}
if (![neonTarget, ciTarget].includes(target ?? '')) {
  throw new Error('Refusing to run: BCLICK_M003_TARGET does not match an allowed target marker.');
}
if (!['pre', 'post'].includes(phase ?? '')) {
  throw new Error('Usage: set BCLICK_M003_PHASE to pre or post.');
}
if (!databaseUrl) throw new Error('Refusing to run: DATABASE_URL is required.');

const parsed = new URL(databaseUrl);
const parsedDatabase = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
if (parsedDatabase !== expectedDatabase) {
  throw new Error('Refusing to run: database name does not match the selected target.');
}
if (target === ciTarget) {
  if (process.env.CI !== 'true' || !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname) || parsedDatabase !== 'bclick_ci') {
    throw new Error('Refusing to run: CI gate is restricted to local disposable PostgreSQL database bclick_ci.');
  }
} else {
  if (process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Refusing to run: live pre/postflight is permitted only from main.');
  }
  if (!parsed.hostname.endsWith('.eu-central-1.aws.neon.tech') || parsedDatabase !== 'neondb') {
    throw new Error('Refusing to run: target is not the approved Frankfurt-region Neon neondb endpoint.');
  }
}

const migrationsBefore = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
  '1792584000000_identity_domain_migration_001',
  '1792670400000_identity_sessions_split_002',
];
const migration003 = '1792756800000_identity_player_credentials_003';
const migrationsAfter = [...migrationsBefore, migration003];
const sourceColumns = [
  'email', 'email_normalized', 'password_hash', 'display_name', 'created_at', 'updated_at',
  'date_of_birth', 'terms_accepted_at', 'terms_version', 'age_confirmation_at',
  'age_policy_version', 'preferred_language', 'kyc_tier', 'kyc_lock',
  'deposit_kyc_override', 'deposit_kyc_override_expires_at',
];

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 });

async function targetIdentity() {
  const result = await pool.query(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version, current_schema() AS schema_name",
  );
  assert.equal(result.rows[0].database_name, expectedDatabase);
  assert.match(result.rows[0].server_version, /^18\.6\b/, 'Unexpected PostgreSQL version');
  assert.equal(result.rows[0].schema_name, 'public');
  return result.rows[0];
}

async function history(expected) {
  const result = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(result.rows.map((row) => row.name), expected, 'Migration history differs from exact approved checkpoint');
  return result.rows.map((row) => row.name);
}

async function tableInventory() {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' " +
      "AND table_name = ANY($1::text[]) ORDER BY table_name",
    [[
      'players', 'admin_users', 'roles', 'permissions', 'role_permissions', 'admin_role_assignments',
      'player_sessions', 'admin_sessions', 'currencies', 'pgmigrations',
      'player_profiles', 'player_credentials',
    ]],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function referenceTuple() {
  const result = await pool.query(
    'SELECT ' +
      '(SELECT COUNT(*)::int FROM public.players) AS player_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_users) AS admin_count, ' +
      '(SELECT COUNT(*)::int FROM public.roles) AS role_count, ' +
      '(SELECT COUNT(*)::int FROM public.role_permissions) AS role_permission_link_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_role_assignments) AS admin_role_assignment_count, ' +
      '(SELECT COUNT(*)::int FROM public.permissions) AS permission_count, ' +
      '(SELECT COUNT(*)::int FROM public.player_sessions) AS player_session_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_sessions) AS admin_session_count',
  );
  const row = result.rows[0];
  assert.deepEqual(
    [row.player_count, row.admin_count, row.role_count, row.role_permission_link_count, row.admin_role_assignment_count, row.permission_count],
    [0, 0, 1, 5, 0, 5],
    'Reference tuple differs from the owner-approved zero-player baseline',
  );
  assert.equal(row.player_session_count, 0, 'Unexpected player sessions on the migration checkpoint');
  assert.equal(row.admin_session_count, 0, 'Unexpected admin sessions on the migration checkpoint');
  return {
    tuple: [row.player_count, row.admin_count, row.role_count, row.role_permission_link_count, row.admin_role_assignment_count, row.permission_count],
    playerSessionCount: row.player_session_count,
    adminSessionCount: row.admin_session_count,
  };
}

async function assertCurrencies() {
  const result = await pool.query('SELECT code, decimal_places::int AS decimal_places FROM public.currencies ORDER BY code');
  assert.deepEqual(result.rows, [
    { code: 'EUR', decimal_places: 2 },
    { code: 'TND', decimal_places: 3 },
    { code: 'USD', decimal_places: 2 },
  ], 'Currency seed rows or precision changed');
  return result.rows;
}

async function assertSourceColumns() {
  const result = await pool.query(
    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='players'",
  );
  const columns = new Map(result.rows.map((row) => [row.column_name, row.is_nullable]));
  for (const column of sourceColumns) assert.ok(columns.has(column), 'Missing reviewed source column players.' + column);
  for (const column of ['date_of_birth', 'terms_accepted_at', 'terms_version', 'age_confirmation_at', 'age_policy_version', 'preferred_language']) {
    assert.equal(columns.get(column), 'NO', 'Required v2 registration evidence is not NOT NULL: ' + column);
  }
  return columns;
}

async function preflight() {
  const identity = await targetIdentity();
  const tables = await tableInventory();
  for (const name of ['players', 'admin_users', 'roles', 'permissions', 'role_permissions', 'admin_role_assignments', 'player_sessions', 'admin_sessions', 'currencies', 'pgmigrations']) {
    assert.ok(tables.has(name), 'Required canonical baseline table is missing: ' + name);
  }
  assert.ok(!tables.has('player_profiles'), 'player_profiles already exists; refusing to apply Migration 003 twice');
  assert.ok(!tables.has('player_credentials'), 'player_credentials already exists; refusing to apply Migration 003 twice');
  const columns = await assertSourceColumns();
  assert.ok(!columns.has('age_confirmed_at'), 'players.age_confirmed_at already exists; refusing');
  const appliedHistory = await history(migrationsBefore);
  const baseline = await referenceTuple();
  const currencies = await assertCurrencies();

  const report = {
    phase: 'pre-migration-003',
    targetMarker: target,
    database: identity,
    migrationHistory: appliedHistory,
    migrationHistoryCount: appliedHistory.length,
    expectedPlayerCount: 0,
    referenceTupleOrder: ['players', 'admins', 'roles', 'role_permission_links', 'admin_role_links', 'permissions'],
    referenceTuple: baseline.tuple,
    playerSessionCount: baseline.playerSessionCount,
    adminSessionCount: baseline.adminSessionCount,
    requiredV2AndKycSourceColumnsPresent: true,
    destinationTablesAlreadyPresent: [],
    currencies,
    migration003Executed: false,
  };
  console.log('IDENTITY_MIGRATION_003_PREFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_003_NEON_PREFLIGHT=PASS');
}

async function postflight() {
  const identity = await targetIdentity();
  const tables = await tableInventory();
  for (const name of ['players', 'admin_users', 'roles', 'permissions', 'role_permissions', 'admin_role_assignments', 'player_sessions', 'admin_sessions', 'currencies', 'pgmigrations', 'player_profiles', 'player_credentials']) {
    assert.ok(tables.has(name), 'Required post-migration table is missing: ' + name);
  }
  const appliedHistory = await history(migrationsAfter);
  const baseline = await referenceTuple();
  assert.equal(baseline.tuple[0], 0, 'No players should be present at this approved checkpoint');

  const columns = await assertSourceColumns();
  const alias = await pool.query(
    "SELECT is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='age_confirmed_at'",
  );
  assert.deepEqual(alias.rows, [{ is_generated: 'ALWAYS' }], 'Generated age confirmation compatibility alias is missing');

  const counts = await pool.query(
    'SELECT (SELECT COUNT(*)::int FROM public.player_profiles) AS profile_count, ' +
      '(SELECT COUNT(*)::int FROM public.player_credentials) AS credential_count, ' +
      '(SELECT COUNT(*)::int FROM public.players) AS player_count',
  );
  assert.deepEqual(counts.rows[0], { profile_count: 0, credential_count: 0, player_count: 0 },
    'New profile/credential tables and legacy source must remain empty at this approved checkpoint');

  const credColumns = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='player_credentials' ORDER BY column_name",
  );
  const observedCredColumns = new Set(credColumns.rows.map((row) => row.column_name));
  for (const name of ['id', 'player_id', 'kind', 'identifier', 'identifier_norm', 'password_hash', 'password_changed_at', 'created_at', 'updated_at']) {
    assert.ok(observedCredColumns.has(name), 'Missing player_credentials.' + name);
  }
  assert.ok(!observedCredColumns.has('password_plaintext'), 'Plaintext password storage must not be present');

  const constraints = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conrelid='public.player_credentials'::regclass ORDER BY conname",
  );
  const names = new Set(constraints.rows.map((row) => row.conname));
  for (const name of ['player_credentials_player_id_fkey', 'player_credentials_player_kind_key', 'player_credentials_kind_identifier_norm_key']) {
    assert.ok(names.has(name), 'Missing credential constraint ' + name);
  }

  const currencies = await assertCurrencies();
  const report = {
    phase: 'post-migration-003',
    targetMarker: target,
    database: identity,
    migrationHistory: appliedHistory,
    migrationHistoryCount: appliedHistory.length,
    referenceTupleOrder: ['players', 'admins', 'roles', 'role_permission_links', 'admin_role_links', 'permissions'],
    referenceTuple: baseline.tuple,
    playerSessionCount: baseline.playerSessionCount,
    adminSessionCount: baseline.adminSessionCount,
    profileCount: counts.rows[0].profile_count,
    credentialCount: counts.rows[0].credential_count,
    playerCount: counts.rows[0].player_count,
    generatedAgeAliasPresent: true,
    v2KycColumnsPreserved: true,
    credentialConstraintsPresent: true,
    currencies,
    migration003Applied: true,
    walletOrPaymentMigrationsIncluded: false,
  };
  console.log('IDENTITY_MIGRATION_003_POSTFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_003_NEON_POSTFLIGHT=PASS');
}

try {
  if (phase === 'pre') await preflight();
  else await postflight();
} finally {
  await pool.end();
}
