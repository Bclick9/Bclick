import assert from 'node:assert/strict';
import { Pool } from 'pg';

const target = process.env.BCLICK_M001_TARGET;
const phase = process.env.BCLICK_M001_PHASE;
const databaseUrl = process.env.DATABASE_URL;

const targetMarker = 'copabet365-neondb-frankfurt';
const ciTargetMarker = 'ci-disposable';
const databaseExpected = target === ciTargetMarker ? 'bclick_ci' : 'neondb';

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Refusing to run: this gate is intended only for GitHub Actions.');
}
if (![targetMarker, ciTargetMarker].includes(target ?? '')) {
  throw new Error('Refusing to run: BCLICK_M001_TARGET does not match an allowed target marker.');
}
if (!['pre', 'post'].includes(phase ?? '')) {
  throw new Error('Usage: set BCLICK_M001_PHASE to pre or post.');
}
if (!databaseUrl) throw new Error('Refusing to run: DATABASE_URL is required.');

const parsed = new URL(databaseUrl);
const parsedDatabase = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
if (parsedDatabase !== databaseExpected) {
  throw new Error(`Refusing to run: database name did not match the expected target (${databaseExpected}).`);
}
if (target === ciTargetMarker) {
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
const canonicalTables = [
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
const expectedMigrations = phase === 'pre'
  ? [
      '1792497600000_api_skeleton_baseline',
      '1792512000000_identity_sessions',
    ]
  : [
      '1792497600000_api_skeleton_baseline',
      '1792512000000_identity_sessions',
      '1792584000000_identity_domain_migration_001',
    ];
const legacyCodes = [
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
  'admin.session.read',
];
const canonicalCodes = [
  'players.read',
  'players.status.write',
  'players.profile.sensitive.read',
  'wallet.read',
  'wallet.adjust.request',
  'wallet.adjust.approve',
  'wallet.status.manage',
  'kyc.review',
  'kyc.documents.read',
  'rg.case.read',
  'rg.case.manage',
  'payments.review',
  'payments.approve',
  'payments.execute',
  'payments.methods.manage',
  'payments.reconcile',
  'payments.audit',
  'reports.read',
  'reports.export',
  'catalog.read',
  'catalog.sync',
  'cms.write',
  'cms.approve',
  'cms.publish',
  'cms.media.write',
  'bonuses.manage',
  'bonuses.grant',
  'bonuses.grant.approve',
  'admin.users.read',
  'admin.users.write',
  'admin.roles.read',
  'admin.roles.write',
  'admin.mfa.manage',
  'audit.read',
  'ops.read',
  'ops.provider.replay',
];

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 });

async function inventory() {
  const result = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [[...sourceTables, ...canonicalTables, 'currencies', 'pgmigrations']],
  );
  return result.rows.map((row) => row.table_name);
}

async function counts(canonical) {
  const n = canonical
    ? { players: 'players', admins: 'admin_users', roles: 'roles', links: 'role_permissions', assignments: 'admin_role_assignments', permissions: 'permissions', sessions: 'auth_sessions' }
    : { players: 'identity_players', admins: 'identity_admins', roles: 'identity_admin_roles', links: 'identity_admin_role_permissions', assignments: 'identity_admin_account_roles', permissions: 'identity_admin_permissions', sessions: 'identity_sessions' };
  const result = await pool.query(
    'SELECT ' +
      '(SELECT COUNT(*)::int FROM public.' + n.players + ') AS player_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.admins + ') AS admin_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.roles + ') AS role_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.links + ') AS role_permission_link_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.assignments + ') AS admin_role_assignment_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.permissions + ') AS permission_count, ' +
      '(SELECT COUNT(*)::int FROM public.' + n.sessions + ') AS session_count',
  );
  const row = result.rows[0];
  return {
    tuple: [row.player_count, row.admin_count, row.role_count, row.role_permission_link_count, row.admin_role_assignment_count, row.permission_count],
    counts: row,
  };
}

async function assertRbac(canonical) {
  const names = canonical
    ? { roles: 'roles', permissions: 'permissions', links: 'role_permissions' }
    : { roles: 'identity_admin_roles', permissions: 'identity_admin_permissions', links: 'identity_admin_role_permissions' };
  const roles = await pool.query('SELECT code, display_name FROM public.' + names.roles + ' ORDER BY code');
  assert.deepEqual(roles.rows, [{ code: 'project-admin', display_name: 'Project Administrator' }]);

  const permissions = await pool.query('SELECT code FROM public.' + names.permissions + ' ORDER BY code');
  assert.deepEqual(permissions.rows.map((row) => row.code), legacyCodes);

  const mapping = await pool.query(
    'SELECT r.code AS role_code, p.code AS permission_code ' +
    'FROM public.' + names.links + ' rp ' +
    'JOIN public.' + names.roles + ' r ON r.id = rp.role_id ' +
    'JOIN public.' + names.permissions + ' p ON p.id = rp.permission_id ' +
    'ORDER BY r.code, p.code',
  );
  assert.deepEqual(
    mapping.rows,
    legacyCodes.map((code) => ({ role_code: 'project-admin', permission_code: code })).sort((a, b) => a.permission_code.localeCompare(b.permission_code)),
  );

  const canonicalResult = await pool.query(
    'SELECT code FROM public.' + names.permissions + ' WHERE code = ANY($1::text[]) ORDER BY code',
    [canonicalCodes],
  );
  assert.deepEqual(canonicalResult.rows, [], 'Canonical permissions must remain a later migration.');
  return { role: roles.rows[0], legacyPermissionCodes: permissions.rows.map((row) => row.code), legacyRolePermissionLinks: mapping.rows.length, canonicalPermissionCount: canonicalResult.rows.length };
}

async function assertTuple(canonical) {
  const result = await counts(canonical);
  assert.deepEqual(result.tuple, [0, 0, 1, 5, 0, 5], 'Reference tuple differs from the approved baseline');
  assert.equal(result.counts.session_count, 0, 'Sessions must remain zero for this approved migration');
  return result;
}

async function preflight() {
  const identity = await pool.query(
    'SELECT current_database() AS database_name, current_setting(\'server_version\') AS server_version, current_schema() AS schema_name',
  );
  assert.equal(identity.rows[0].database_name, 'neondb');
  assert.match(identity.rows[0].server_version, /^18\.6\b/, 'Unexpected PostgreSQL version');
  assert.equal(identity.rows[0].schema_name, 'public');

  const present = await inventory();
  assert.deepEqual(present.filter((name) => sourceTables.includes(name)).sort(), [...sourceTables].sort(), 'All 12 legacy source tables must exist');
  assert.deepEqual(present.filter((name) => canonicalTables.includes(name) || name === 'currencies'), [], 'Canonical table or currencies collision exists');
  assert.ok(present.includes('pgmigrations'), 'pgmigrations table is missing');

  const history = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(history.rows.map((row) => row.name), expectedMigrations, 'Migration history is not exactly the approved two-row baseline');

  const tuple = await assertTuple(false);
  const rbac = await assertRbac(false);

  const report = {
    phase: 'pre-migration',
    targetMarker: target,
    database: identity.rows[0],
    sourceTableCount: sourceTables.length,
    sourceTables: sourceTables,
    canonicalDestinationCollisions: [],
    referenceTupleOrder: ['players', 'admins', 'roles', 'role_permission_links', 'admin_role_links', 'permissions'],
    referenceTuple: tuple.tuple,
    counts: tuple.counts,
    sessionCount: tuple.counts.session_count,
    role: rbac.role,
    legacyPermissionCodes: rbac.legacyPermissionCodes,
    legacyRolePermissionLinks: rbac.legacyRolePermissionLinks,
    canonicalPermissionCount: rbac.canonicalPermissionCount,
    migrationHistory: history.rows.map((row) => row.name),
    migrationHistoryCount: history.rows.length,
    migration001Executed: false,
  };
  console.log('IDENTITY_MIGRATION_001_PREFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_001_PREFLIGHT=PASS');
}

async function postflight() {
  const identity = await pool.query(
    'SELECT current_database() AS database_name, current_setting(\'server_version\') AS server_version, current_schema() AS schema_name',
  );
  assert.equal(identity.rows[0].database_name, 'neondb');
  assert.match(identity.rows[0].server_version, /^18\.6\b/, 'Unexpected PostgreSQL version');
  assert.equal(identity.rows[0].schema_name, 'public');

  const present = await inventory();
  assert.deepEqual(present.filter((name) => canonicalTables.includes(name)).sort(), [...canonicalTables].sort(), 'All 12 canonical tables must exist');
  assert.deepEqual(present.filter((name) => sourceTables.includes(name)), [], 'Legacy table names remain after rename');
  assert.ok(present.includes('currencies'), 'currencies table is missing');

  const history = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(history.rows.map((row) => row.name), expectedMigrations, 'Migration history must contain exactly the three expected rows');

  const tuple = await assertTuple(true);
  const rbac = await assertRbac(true);

  const currencies = await pool.query('SELECT code, decimal_places::int AS decimal_places FROM public.currencies ORDER BY code');
  assert.deepEqual(currencies.rows, [
    { code: 'EUR', decimal_places: 2 },
    { code: 'TND', decimal_places: 3 },
    { code: 'USD', decimal_places: 2 },
  ], 'Currency seed rows or precision differ from the approved specification');

  const expectedColumns = [
    'date_of_birth', 'terms_accepted_at', 'terms_version', 'age_confirmation_at',
    'age_policy_version', 'preferred_language', 'username', 'username_normalized',
    'phone_number_e164', 'email_verification_status', 'kyc_tier', 'kyc_lock',
    'kyc_lock_reason', 'deposit_kyc_override', 'deposit_kyc_override_expires_at',
    'deposit_kyc_override_reason', 'deposit_kyc_override_requested_by',
    'deposit_kyc_override_approved_by', 'deposit_kyc_override_set_at',
  ];
  const columns = await pool.query(
    `SELECT column_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'players'
      ORDER BY column_name`,
  );
  const observedColumns = new Map(columns.rows.map((row) => [row.column_name, row.is_nullable]));
  for (const column of expectedColumns) assert.ok(observedColumns.has(column), 'Missing players.' + column);
  for (const column of ['date_of_birth', 'terms_accepted_at', 'terms_version', 'age_confirmation_at', 'age_policy_version']) {
    assert.equal(observedColumns.get(column), 'NO', 'Required registration evidence must be NOT NULL: ' + column);
  }

  const constraints = await pool.query(
    `SELECT conname
       FROM pg_constraint
      WHERE conrelid = 'public.players'::regclass AND contype = 'f'
      ORDER BY conname`,
  );
  const observedFks = new Set(constraints.rows.map((row) => row.conname));
  for (const fk of ['players_settlement_currency_fk', 'players_preferred_display_currency_fk', 'players_deposit_kyc_override_requested_by_fk', 'players_deposit_kyc_override_approved_by_fk']) {
    assert.ok(observedFks.has(fk), 'Missing foreign key ' + fk);
  }

  const report = {
    phase: 'post-migration',
    targetMarker: target,
    database: identity.rows[0],
    canonicalTableCount: canonicalTables.length,
    canonicalTables,
    legacySourceTableNamesRemaining: [],
    referenceTupleOrder: ['players', 'admins', 'roles', 'role_permission_links', 'admin_role_links', 'permissions'],
    referenceTuple: tuple.tuple,
    counts: tuple.counts,
    sessionCount: tuple.counts.session_count,
    role: rbac.role,
    legacyPermissionCodes: rbac.legacyPermissionCodes,
    legacyRolePermissionLinks: rbac.legacyRolePermissionLinks,
    canonicalPermissionCount: rbac.canonicalPermissionCount,
    currencies: currencies.rows,
    requiredPlayerColumns: expectedColumns,
    requiredRegistrationEvidenceNotNull: true,
    currencyAndKycForeignKeysPresent: true,
    migrationHistory: history.rows.map((row) => row.name),
    migrationHistoryCount: history.rows.length,
    adminAccountsCreated: false,
    walletOrPaymentMigrationsIncluded: false,
  };
  console.log('IDENTITY_MIGRATION_001_POSTFLIGHT=' + JSON.stringify(report, null, 2));
  console.log('MIGRATION_001_POSTFLIGHT=PASS');
}

try {
  if (phase === 'pre') await preflight();
  else await postflight();
} finally {
  await pool.end();
}
