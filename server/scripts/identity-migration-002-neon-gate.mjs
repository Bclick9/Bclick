import assert from 'node:assert/strict';
import { Pool } from 'pg';

const target = process.env.BCLICK_M002_TARGET;
const phase = process.env.BCLICK_M002_PHASE;
const databaseUrl = process.env.DATABASE_URL;

const neonTarget = 'copabet365-neondb-frankfurt';
const ciTarget = 'ci-disposable';
const databaseExpected = target === ciTarget ? 'bclick_ci' : 'neondb';

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Refusing to run: this gate is intended only for GitHub Actions.');
}
if (![neonTarget, ciTarget].includes(target ?? '')) {
  throw new Error('Refusing to run: BCLICK_M002_TARGET does not match an allowed target marker.');
}
if (!['pre', 'post'].includes(phase ?? '')) {
  throw new Error('Usage: set BCLICK_M002_PHASE to pre or post.');
}
if (!databaseUrl) throw new Error('Refusing to run: DATABASE_URL is required.');

const parsed = new URL(databaseUrl);
const parsedDatabase = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
if (parsedDatabase !== databaseExpected) {
  throw new Error('Refusing to run: database name did not match the expected target (' + databaseExpected + ').');
}
if (target === ciTarget) {
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname) || parsedDatabase !== 'bclick_ci') {
    throw new Error('Refusing to run: CI gate is restricted to the local disposable bclick_ci database.');
  }
} else {
  if (!parsed.hostname.endsWith('.eu-central-1.aws.neon.tech')) {
    throw new Error('Refusing to run: target host is not a Neon endpoint in the expected Frankfurt region.');
  }
  if (parsedDatabase !== 'neondb') {
    throw new Error('Refusing to run: target database is not neondb.');
  }
}

const allCanonicalTables = [
  'players',
  'admin_users',
  'auth_sessions',
  'admin_mfa_challenges',
  'admin_mfa_recovery_codes',
  'player_one_time_tokens',
  'rate_limits',
  'audit_events',
  'roles',
  'permissions',
  'role_permissions',
  'admin_role_assignments',
];
const sourceTables = [
  'identity_players',
  'identity_admins',
  'identity_sessions',
  'identity_admin_auth_challenges',
  'identity_admin_recovery_codes',
  'identity_one_time_tokens',
  'identity_rate_limits',
  'identity_security_audit_events',
  'identity_admin_roles',
  'identity_admin_permissions',
  'identity_admin_role_permissions',
  'identity_admin_account_roles',
];
const splitTables = ['player_sessions', 'admin_sessions'];
const expectedPreMigrations = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
  '1792584000000_identity_domain_migration_001',
];
const expectedPostMigrations = [...expectedPreMigrations, '1792670400000_identity_sessions_split_002'];
const legacyCodes = [
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
  'admin.session.read',
];

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 });

async function tableInventory() {
  const result = await pool.query(
    'SELECT table_name FROM information_schema.tables ' +
      "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ANY($1::text[]) " +
      'ORDER BY table_name',
    [[...sourceTables, ...allCanonicalTables, ...splitTables, 'currencies', 'pgmigrations']],
  );
  return result.rows.map((row) => row.table_name);
}

async function assertTargetIdentity() {
  const result = await pool.query(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version, current_schema() AS schema_name",
  );
  assert.equal(result.rows[0].database_name, databaseExpected, 'Unexpected database name');
  assert.match(result.rows[0].server_version, /^18\.6\b/, 'Unexpected PostgreSQL version');
  assert.equal(result.rows[0].schema_name, 'public', 'Unexpected schema');
  return result.rows[0];
}

async function assertHistory(expected) {
  assert.ok((await tableInventory()).includes('pgmigrations'), 'pgmigrations table is missing');
  const result = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(result.rows.map((row) => row.name), expected, 'Migration history differs from the exact approved checkpoint');
  return result.rows.map((row) => row.name);
}

async function assertReferenceTuple(sessionTable) {
  const result = await pool.query(
    'SELECT ' +
      '(SELECT COUNT(*)::int FROM public.players) AS player_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_users) AS admin_count, ' +
      '(SELECT COUNT(*)::int FROM public.roles) AS role_count, ' +
      '(SELECT COUNT(*)::int FROM public.role_permissions) AS role_permission_link_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_role_assignments) AS admin_role_assignment_count, ' +
      '(SELECT COUNT(*)::int FROM public.permissions) AS permission_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + sessionTable + ') AS session_count',
  );
  const row = result.rows[0];
  assert.deepEqual(
    [row.player_count, row.admin_count, row.role_count, row.role_permission_link_count,
      row.admin_role_assignment_count, row.permission_count],
    [0, 0, 1, 5, 0, 5],
    'Reference tuple changed (players/admins/roles/role-permission links/admin-role links/permissions)',
  );
  assert.equal(row.session_count, 0, 'No sessions are expected on the approved migration baseline');
  return {
    tuple: [row.player_count, row.admin_count, row.role_count, row.role_permission_link_count, row.admin_role_assignment_count, row.permission_count],
    counts: row,
  };
}

async function assertRbacAndCurrencies() {
  const roles = await pool.query('SELECT code, display_name FROM public.roles ORDER BY code');
  assert.deepEqual(roles.rows, [{ code: 'project-admin', display_name: 'Project Administrator' }]);
  const permissions = await pool.query('SELECT code FROM public.permissions ORDER BY code');
  assert.deepEqual(permissions.rows.map((row) => row.code), legacyCodes);
  const mapping = await pool.query(
    'SELECT r.code AS role_code, p.code AS permission_code ' +
      'FROM public.role_permissions rp ' +
      'JOIN public.roles r ON r.id = rp.role_id ' +
      'JOIN public.permissions p ON p.id = rp.permission_id ' +
      'ORDER BY r.code,p.code',
  );
  assert.deepEqual(
    mapping.rows,
    [...legacyCodes].sort().map((code) => ({ role_code: 'project-admin', permission_code: code })),
  );
  const currencies = await pool.query('SELECT code, decimal_places::int AS decimal_places FROM public.currencies ORDER BY code');
  assert.deepEqual(currencies.rows, [
    { code: 'EUR', decimal_places: 2 },
    { code: 'TND', decimal_places: 3 },
    { code: 'USD', decimal_places: 2 },
  ]);
  return {
    role: roles.rows[0],
    legacyPermissionCount: permissions.rows.length,
    legacyPermissionCodes: permissions.rows.map((row) => row.code),
    legacyRolePermissionLinks: mapping.rows.length,
    currencies: currencies.rows,
  };
}

async function preflight() {
  const identity = await assertTargetIdentity();
  const tables = await tableInventory();
  assert.deepEqual(
    tables.filter((name) => allCanonicalTables.includes(name)).sort(),
    [...allCanonicalTables].sort(),
    'All 12 Migration 001 canonical tables must exist before Migration 002',
  );
  assert.ok(!tables.includes('player_sessions'), 'player_sessions already exists; refusing');
  assert.ok(!tables.includes('admin_sessions'), 'admin_sessions already exists; refusing');
  assert.deepEqual(
    tables.filter((name) => sourceTables.includes(name)),
    [],
    'Legacy identity_* tables unexpectedly exist',
  );
  assert.ok(tables.includes('currencies'), 'currencies table is missing');

  const history = await assertHistory(expectedPreMigrations);
  const tuple = await assertReferenceTuple('auth_sessions');
  const rbac = await assertRbacAndCurrencies();

  const principalTypes = await pool.query(
    'SELECT principal_type, COUNT(*)::int AS session_count ' +
      'FROM public.auth_sessions GROUP BY principal_type ORDER BY principal_type',
  );
  assert.deepEqual(principalTypes.rows, [], 'Any session row or unknown principal type requires owner review');

  const report = {
    phase: 'pre-migration-002',
    targetMarker: target,
    database: identity,
    migrationHistory: history,
    migrationHistoryCount: history.length,
    canonicalTableCount: allCanonicalTables.length,
    sourceTableNamesRemaining: [],
    destinationTablesAlreadyPresent: [],
    referenceTupleOrder: ['players', 'admins', 'roles', 'role-permission links', 'admin-role links', 'permissions'],
    referenceTuple: tuple.tuple,
    counts: tuple.counts,
    authSessionsCount: tuple.counts.session_count,
    authSessionsByPrincipalType: principalTypes.rows,
    role: rbac.role,
    legacyPermissionCount: rbac.legacyPermissionCount,
    legacyPermissionCodes: rbac.legacyPermissionCodes,
    legacyRolePermissionLinks: rbac.legacyRolePermissionLinks,
    currencies: rbac.currencies,
  };
  console.log('IDENTITY_MIGRATION_002_PREFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_002_PREFLIGHT=PASS');
}

async function postflight() {
  const identity = await assertTargetIdentity();
  const tables = await tableInventory();

  assert.deepEqual(
    tables.filter((name) => splitTables.includes(name)).sort(),
    [...splitTables].sort(),
    'Both split session tables must exist',
  );
  assert.ok(!tables.includes('auth_sessions'), 'Mixed auth_sessions must be absent');
  assert.deepEqual(tables.filter((name) => sourceTables.includes(name)), [], 'Legacy identity_* table names unexpectedly exist');
  assert.ok(tables.includes('currencies'), 'currencies table is missing');
  assert.deepEqual(
    tables.filter((name) => allCanonicalTables.includes(name) && name !== 'auth_sessions').sort(),
    allCanonicalTables.filter((name) => name !== 'auth_sessions').sort(),
    'Unrelated canonical identity/domain table inventory changed',
  );

  const history = await assertHistory(expectedPostMigrations);
  const tuple = await assertReferenceTuple('player_sessions');
  const adminCount = await pool.query('SELECT COUNT(*)::int AS count FROM public.admin_sessions');
  assert.equal(adminCount.rows[0].count, 0, 'No admin sessions are expected after this migration');

  const playerColumns = await pool.query(
    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='player_sessions' ORDER BY column_name",
  );
  const playerColumnMap = new Map(playerColumns.rows.map((row) => [row.column_name, row.is_nullable]));
  for (const column of ['id', 'player_id', 'token_hash', 'session_version', 'created_at', 'authenticated_at', 'expires_at', 'revoked_at']) {
    assert.ok(playerColumnMap.has(column), 'Missing player_sessions.' + column);
  }
  assert.equal(playerColumnMap.get('player_id'), 'NO');

  const adminColumns = await pool.query(
    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_sessions' ORDER BY column_name",
  );
  const adminColumnMap = new Map(adminColumns.rows.map((row) => [row.column_name, row.is_nullable]));
  for (const column of ['id', 'admin_id', 'token_hash', 'session_version', 'created_at', 'authenticated_at', 'expires_at', 'revoked_at', 'mfa_verified']) {
    assert.ok(adminColumnMap.has(column), 'Missing admin_sessions.' + column);
  }
  assert.equal(adminColumnMap.get('admin_id'), 'NO');
  assert.equal(adminColumnMap.get('mfa_verified'), 'NO');

  const playerConstraints = await pool.query(
    "SELECT conname, contype FROM pg_constraint WHERE conrelid='public.player_sessions'::regclass ORDER BY conname",
  );
  const playerConstraintMap = new Map(playerConstraints.rows.map((row) => [row.conname, row.contype]));
  assert.equal(playerConstraintMap.get('player_sessions_player_id_fkey'), 'f');
  const adminConstraints = await pool.query(
    "SELECT conname, contype, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.admin_sessions'::regclass ORDER BY conname",
  );
  const adminConstraintMap = new Map(adminConstraints.rows.map((row) => [row.conname, row]));
  assert.equal(adminConstraintMap.get('admin_sessions_admin_id_fkey')?.contype, 'f');
  assert.equal(adminConstraintMap.get('admin_sessions_mfa_verified_check')?.contype, 'c');
  assert.match(String(adminConstraintMap.get('admin_sessions_mfa_verified_check')?.definition).toLowerCase(), /mfa_verified.*true/);

  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('player_sessions','admin_sessions') ORDER BY indexname",
  );
  const indexNames = new Set(indexes.rows.map((row) => row.indexname));
  for (const name of [
    'player_sessions_pkey', 'player_sessions_token_hash_key', 'player_sessions_player_idx', 'player_sessions_expiry_idx',
    'admin_sessions_pkey', 'admin_sessions_token_hash_key', 'admin_sessions_admin_idx', 'admin_sessions_expiry_idx',
  ]) assert.ok(indexNames.has(name), 'Missing session index ' + name);

  const counts = await pool.query(
    'SELECT (SELECT COUNT(*)::int FROM public.player_sessions) AS player_sessions_count, ' +
      '(SELECT COUNT(*)::int FROM public.admin_sessions) AS admin_sessions_count',
  );
  assert.deepEqual([counts.rows[0].player_sessions_count, counts.rows[0].admin_sessions_count], [0, 0]);

  const rbac = await assertRbacAndCurrencies();
  const report = {
    phase: 'post-migration-002',
    targetMarker: target,
    database: identity,
    migrationHistory: history,
    migrationHistoryCount: history.length,
    playerSessionsTablePresent: true,
    adminSessionsTablePresent: true,
    authSessionsTablePresent: false,
    requiredPlayerSessionForeignKeyPresent: true,
    requiredAdminSessionForeignKeyPresent: true,
    adminSessionMfaVerifiedMustBeTrue: true,
    playerSessionCount: counts.rows[0].player_sessions_count,
    adminSessionCount: counts.rows[0].admin_sessions_count,
    referenceTupleOrder: ['players', 'admins', 'roles', 'role-permission links', 'admin-role links', 'permissions'],
    referenceTuple: tuple.tuple,
    counts: tuple.counts,
    role: rbac.role,
    legacyPermissionCount: rbac.legacyPermissionCount,
    legacyPermissionCodes: rbac.legacyPermissionCodes,
    legacyRolePermissionLinks: rbac.legacyRolePermissionLinks,
    currencies: rbac.currencies,
    walletOrPaymentMigrationsIncluded: false,
  };
  console.log('IDENTITY_MIGRATION_002_POSTFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_002_POSTFLIGHT=PASS');
}

try {
  if (phase === 'pre') await preflight();
  else await postflight();
} finally {
  await pool.end();
}
