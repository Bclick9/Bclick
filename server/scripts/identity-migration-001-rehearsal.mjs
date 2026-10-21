import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const target = process.env.BCLICK_M001_REHEARSAL_TARGET;
const databaseUrl = process.env.DATABASE_URL;
const phase = process.argv[2];

if (process.env.CI !== 'true' || target !== 'ci-disposable') {
  throw new Error('Refusing to run: this script is restricted to the disposable GitHub Actions CI target.');
}
if (!databaseUrl) throw new Error('Refusing to run: DATABASE_URL is required.');
const parsedUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname) || databaseName !== 'bclick_ci') {
  throw new Error('Refusing to run: CI rehearsal must use localhost database bclick_ci only.');
}
if (!['post-up', 'install-rollback-fixture', 'verify-rollback-guard', 'post-down'].includes(phase)) {
  throw new Error('Usage: node identity-migration-001-rehearsal.mjs <post-up|install-rollback-fixture|verify-rollback-guard|post-down>');
}

const pool = new Pool({ connectionString: databaseUrl, max: 2 });
const migrationNames = [
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
const rollbackFixtureId = '00000000-0000-4000-8000-000000001001';

async function getTableNames() {
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  return result.rows.map((row) => row.table_name);
}

async function assertMigrationHistory(expectedNames) {
  const result = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(result.rows.map((row) => row.name), expectedNames, 'Unexpected pgmigrations contents');
}

async function assertRoleAndLegacyPermissionState(canonical) {
  const roleTable = canonical ? 'roles' : 'identity_admin_roles';
  const permissionTable = canonical ? 'permissions' : 'identity_admin_permissions';
  const linkTable = canonical ? 'role_permissions' : 'identity_admin_role_permissions';
  const roles = await pool.query('SELECT code, display_name FROM public.' + roleTable + ' ORDER BY code');
  assert.deepEqual(roles.rows, [{ code: 'project-admin', display_name: 'Project Administrator' }]);
  const permissions = await pool.query('SELECT code FROM public.' + permissionTable + ' ORDER BY code');
  assert.deepEqual(permissions.rows.map((row) => row.code), legacyCodes);
  const mapping = await pool.query(
    'SELECT r.code AS role_code, p.code AS permission_code ' +
    'FROM public.' + linkTable + ' rp ' +
    'JOIN public.' + roleTable + ' r ON r.id = rp.role_id ' +
    'JOIN public.' + permissionTable + ' p ON p.id = rp.permission_id ' +
    'ORDER BY p.code',
  );
  assert.deepEqual(mapping.rows, legacyCodes.map((code) => ({ role_code: 'project-admin', permission_code: code })));
}

async function assertTupleAndSessions(canonical) {
  const names = canonical
    ? { players: 'players', admins: 'admin_users', roles: 'roles', links: 'role_permissions', assignments: 'admin_role_assignments', permissions: 'permissions', sessions: 'auth_sessions' }
    : { players: 'identity_players', admins: 'identity_admins', roles: 'identity_admin_roles', links: 'identity_admin_role_permissions', assignments: 'identity_admin_account_roles', permissions: 'identity_admin_permissions', sessions: 'identity_sessions' };
  const result = await pool.query(
    'SELECT ' +
    '(SELECT COUNT(*)::int FROM public.' + names.players + ') AS player_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.admins + ') AS admin_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.roles + ') AS role_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.links + ') AS link_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.assignments + ') AS assignment_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.permissions + ') AS permission_count, ' +
    '(SELECT COUNT(*)::int FROM public.' + names.sessions + ') AS session_count',
  );
  const row = result.rows[0];
  assert.deepEqual(
    [row.player_count, row.admin_count, row.role_count, row.link_count, row.assignment_count, row.permission_count],
    [0, 0, 1, 5, 0, 5],
    'Reference tuple changed (players/admins/roles/role-permission links/admin-role links/permissions)',
  );
  assert.equal(row.session_count, 0, 'Fresh rehearsal baseline must not contain sessions');
}

async function expectSqlState(client, sql, values, expectedCode, description) {
  await client.query('SAVEPOINT m001_expected_failure');
  let observedError;
  try {
    await client.query(sql, values);
  } catch (error) {
    observedError = error;
  }
  await client.query('ROLLBACK TO SAVEPOINT m001_expected_failure');
  await client.query('RELEASE SAVEPOINT m001_expected_failure');
  assert.ok(observedError, description + ': statement unexpectedly succeeded');
  assert.equal(observedError.code, expectedCode, description + ': unexpected SQLSTATE');
}

async function exactEighteenthBirthday(client, oneDayYounger = false) {
  const expression = oneDayYounger
    ? "SELECT ((CURRENT_DATE - INTERVAL '18 years')::date + 1) AS dob"
    : "SELECT (CURRENT_DATE - INTERVAL '18 years')::date AS dob";
  const result = await client.query(expression);
  return result.rows[0].dob;
}

async function assertPostMigration() {
  const identity = await pool.query(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version",
  );
  assert.equal(identity.rows[0].database_name, 'bclick_ci');
  assert.match(identity.rows[0].server_version, /^18\./);
  await assertMigrationHistory(migrationNames);
  const tableNames = await getTableNames();
  for (const name of canonicalTables) assert.ok(tableNames.includes(name), 'Missing canonical table ' + name);
  for (const name of sourceTables) assert.ok(!tableNames.includes(name), 'Legacy table name remains after rename: ' + name);
  assert.ok(tableNames.includes('currencies'));

  await assertTupleAndSessions(true);
  await assertRoleAndLegacyPermissionState(true);

  const currencies = await pool.query('SELECT code, decimal_places::int AS decimal_places FROM public.currencies ORDER BY code');
  assert.deepEqual(currencies.rows, [
    { code: 'EUR', decimal_places: 2 },
    { code: 'TND', decimal_places: 3 },
    { code: 'USD', decimal_places: 2 },
  ]);

  const expectedColumns = [
    'date_of_birth', 'terms_accepted_at', 'terms_version', 'age_confirmation_at',
    'age_policy_version', 'preferred_language', 'username', 'username_normalized',
    'phone_number_e164', 'email_verification_status', 'kyc_tier', 'kyc_lock',
    'kyc_lock_reason', 'deposit_kyc_override', 'deposit_kyc_override_expires_at',
    'deposit_kyc_override_reason', 'deposit_kyc_override_requested_by',
    'deposit_kyc_override_approved_by', 'deposit_kyc_override_set_at',
  ];
  const columns = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='players' ORDER BY column_name",
  );
  const observedColumns = new Set(columns.rows.map((row) => row.column_name));
  for (const column of expectedColumns) assert.ok(observedColumns.has(column), 'Missing players.' + column);

  const constraints = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conrelid='public.players'::regclass ORDER BY conname",
  );
  const observedConstraints = new Set(constraints.rows.map((row) => row.conname));
  for (const constraint of [
    'players_date_of_birth_adult_check',
    'players_terms_acceptance_pair_check',
    'players_age_confirmation_pair_check',
    'players_phone_number_e164_check',
    'players_kyc_tier_check',
    'players_deposit_kyc_override_check',
    'players_permanent_kyc_waiver_approval_check',
    'players_settlement_currency_fk',
    'players_preferred_display_currency_fk',
    'players_deposit_kyc_override_requested_by_fk',
    'players_deposit_kyc_override_approved_by_fk',
  ]) assert.ok(observedConstraints.has(constraint), 'Missing constraint ' + constraint);

  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='players' ORDER BY indexname",
  );
  const observedIndexes = new Set(indexes.rows.map((row) => row.indexname));
  assert.ok(observedIndexes.has('players_username_normalized_uidx'));
  assert.ok(observedIndexes.has('players_phone_number_e164_uidx'));

  // Run adversarial DML checks inside one transaction; ROLLBACK leaves no fixture rows.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const playerId = randomUUID();
    const insertPlayer = [
      'INSERT INTO public.players',
      '(id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,language,preferred_display_currency,status,verification_status,created_at,updated_at,date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,preferred_language,username,username_normalized,phone_number_e164)',
      "VALUES ($1,$2,$2,'ci-dummy-hash','Migration 001 Fixture','TN','TND','en','EUR','pending','pending',now(),now(),$3,now(),'ci-terms-v1',now(),'ci-age-policy-v1','en',$4,$5,$6)",
    ].join(' ');
    const exactDob = await exactEighteenthBirthday(client);
    await client.query(insertPlayer, [
      playerId, 'm001-' + playerId + '@example.test', exactDob,
      'm001-user-' + playerId, 'm001-user-' + playerId, '+15555550100',
    ]);

    await expectSqlState(client, insertPlayer, [
      randomUUID(), 'm001-dup-user@example.test', exactDob,
      'another-user', 'm001-user-' + playerId, '+15555550101',
    ], '23505', 'Partial unique username index');
    await expectSqlState(client, insertPlayer, [
      randomUUID(), 'm001-dup-phone@example.test', exactDob,
      'm001-user-phone', 'm001-user-phone', '+15555550100',
    ], '23505', 'Partial unique phone index');
    await expectSqlState(client, insertPlayer, [
      randomUUID(), 'm001-underage@example.test', await exactEighteenthBirthday(client, true),
      'm001-underage', 'm001-underage', '+15555550102',
    ], '23514', 'DOB adult boundary');

    await expectSqlState(client, [
      'INSERT INTO public.players',
      '(id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,language,status,verification_status,terms_accepted_at,terms_version)',
      "VALUES ($1,$2,$2,'ci-dummy-hash','Terms fixture','TN','TND','en','pending','pending',now(),NULL)",
    ].join(' '), [randomUUID(), 'm001-incomplete-terms@example.test'], '23514', 'Terms timestamp/version pair');

    await expectSqlState(client, "UPDATE public.players SET kyc_tier='not-a-tier' WHERE id=$1", [playerId], '23514', 'KYC tier check');
    await expectSqlState(client, "UPDATE public.players SET deposit_kyc_override='waive' WHERE id=$1", [playerId], '23514', 'Permanent waiver requires two distinct admin IDs');
    await expectSqlState(client,
      "UPDATE public.players SET deposit_kyc_override='require', deposit_kyc_override_set_at=now(), deposit_kyc_override_requested_by=$1 WHERE id=$2",
      [randomUUID(), playerId], '23503', 'KYC requester admin foreign key');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }

  console.log(JSON.stringify({
    phase: 'post-up',
    database: identity.rows[0].database_name,
    serverVersion: identity.rows[0].server_version,
    tuple: [0, 0, 1, 5, 0, 5],
    canonicalTables: canonicalTables.length,
    currencyRows: currencies.rows,
    adminAccountCreated: false,
    canonicalPermissionsAdded: false,
    schemaConstraintTests: 'PASS',
    transactionTestDataPersisted: false,
  }, null, 2));
  console.log('MIGRATION_001_POSTCHECK=PASS');
}

async function installRollbackFixture() {
  const sql = [
    'INSERT INTO public.players',
    '(id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,language,status,verification_status,date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,preferred_language,username,username_normalized,phone_number_e164)',
    "VALUES ($1,'m001-rollback-guard@example.test','m001-rollback-guard@example.test','ci-only-not-a-real-hash','Rollback Guard Fixture','TN','TND','en','pending','pending','1990-01-01',now(),'ci-terms-v1',now(),'ci-age-policy-v1','en','m001-rollback-guard','m001-rollback-guard','+15555550991')",
  ].join(' ');
  await pool.query(sql, [rollbackFixtureId]);
  console.log('MIGRATION_001_ROLLBACK_GUARD_FIXTURE=INSTALLED');
}

async function verifyRollbackGuardAndRemoveFixture() {
  const count = await pool.query('SELECT count(*)::int AS count FROM public.players WHERE id=$1', [rollbackFixtureId]);
  assert.equal(count.rows[0].count, 1, 'Down migration did not preserve the rollback guard fixture');
  await assertMigrationHistory(migrationNames);
  assert.ok((await getTableNames()).includes('currencies'), 'Down guard failure must not partially remove currencies');
  await pool.query('DELETE FROM public.players WHERE id=$1', [rollbackFixtureId]);
  console.log('MIGRATION_001_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS');
}

async function assertPostRollback() {
  await assertMigrationHistory(migrationNames.slice(0, 2));
  const tableNames = await getTableNames();
  for (const name of sourceTables) assert.ok(tableNames.includes(name), 'Rollback did not restore ' + name);
  for (const name of canonicalTables) assert.ok(!tableNames.includes(name), 'Rollback left canonical table ' + name);
  assert.ok(!tableNames.includes('currencies'), 'Rollback left the migration-owned currencies table');
  await assertTupleAndSessions(false);
  await assertRoleAndLegacyPermissionState(false);
  console.log(JSON.stringify({
    phase: 'post-down',
    tuple: [0, 0, 1, 5, 0, 5],
    restoredLegacyTables: sourceTables.length,
    currenciesTableExists: false,
    migrationHistoryRows: 2,
    legacyPermissionsPreserved: 5,
  }, null, 2));
  console.log('MIGRATION_001_ROLLBACK_POSTCHECK=PASS');
}

try {
  if (phase === 'post-up') await assertPostMigration();
  else if (phase === 'install-rollback-fixture') await installRollbackFixture();
  else if (phase === 'verify-rollback-guard') await verifyRollbackGuardAndRemoveFixture();
  else await assertPostRollback();
} finally {
  await pool.end();
}
