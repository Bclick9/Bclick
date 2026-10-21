import assert from 'node:assert/strict';
import { Pool } from 'pg';

const target = process.env.BCLICK_M002_REHEARSAL_TARGET;
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
if (!['post-up', 'install-rollback-fixtures', 'verify-rollback-guard', 'post-down'].includes(phase)) {
  throw new Error('Usage: node identity-migration-002-rehearsal.mjs <post-up|install-rollback-fixtures|verify-rollback-guard|post-down>');
}

const pool = new Pool({ connectionString: databaseUrl, max: 2 });
const migrationNames = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
  '1792584000000_identity_domain_migration_001',
  '1792670400000_identity_sessions_split_002',
];
const priorMigrationNames = migrationNames.slice(0, 3);
const legacyCodes = [
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
  'admin.session.read',
];
const fixture = {
  playerId: '00000000-0000-4000-8000-000000002201',
  adminId: '00000000-0000-4000-8000-000000002202',
  playerSessionId: '00000000-0000-4000-8000-000000002203',
  adminSessionId: '00000000-0000-4000-8000-000000002204',
  rejectedAdminSessionId: '00000000-0000-4000-8000-000000002205',
};

async function tableNames() {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  return result.rows.map((row) => row.table_name);
}

async function assertHistory(expected) {
  const result = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(result.rows.map((row) => row.name), expected, 'Unexpected pgmigrations history');
}

async function assertReferenceState() {
  const result = await pool.query(
    'SELECT ' +
    '(SELECT count(*)::int FROM public.players) AS players, ' +
    '(SELECT count(*)::int FROM public.admin_users) AS admins, ' +
    '(SELECT count(*)::int FROM public.roles) AS roles, ' +
    '(SELECT count(*)::int FROM public.role_permissions) AS role_links, ' +
    '(SELECT count(*)::int FROM public.admin_role_assignments) AS admin_links, ' +
    '(SELECT count(*)::int FROM public.permissions) AS permissions',
  );
  assert.deepEqual(
    [result.rows[0].players, result.rows[0].admins, result.rows[0].roles,
      result.rows[0].role_links, result.rows[0].admin_links, result.rows[0].permissions],
    [0, 0, 1, 5, 0, 5],
    'Reference tuple changed (players/admins/roles/role-permission links/admin-role links/permissions)',
  );
}

async function assertRbacAndCurrencies() {
  const roles = await pool.query('SELECT code, display_name FROM public.roles ORDER BY code');
  assert.deepEqual(roles.rows, [{ code: 'project-admin', display_name: 'Project Administrator' }]);
  const permissions = await pool.query('SELECT code FROM public.permissions ORDER BY code');
  assert.deepEqual(permissions.rows.map((row) => row.code), legacyCodes);
  const links = await pool.query(
    'SELECT r.code AS role_code, p.code AS permission_code ' +
    'FROM public.role_permissions rp ' +
    'JOIN public.roles r ON r.id = rp.role_id ' +
    'JOIN public.permissions p ON p.id = rp.permission_id ORDER BY p.code',
  );
  assert.deepEqual(links.rows, legacyCodes.map((code) => ({ role_code: 'project-admin', permission_code: code })));
  const currency = await pool.query('SELECT code, decimal_places::int AS decimal_places FROM public.currencies ORDER BY code');
  assert.deepEqual(currency.rows, [
    { code: 'EUR', decimal_places: 2 },
    { code: 'TND', decimal_places: 3 },
    { code: 'USD', decimal_places: 2 },
  ]);
}

async function assertSplitSchema() {
  const names = await tableNames();
  assert.ok(names.includes('player_sessions'), 'player_sessions is missing');
  assert.ok(names.includes('admin_sessions'), 'admin_sessions is missing');
  assert.ok(!names.includes('auth_sessions'), 'Mixed auth_sessions must be absent after Migration 002');
  const columns = await pool.query(
    "SELECT table_name, column_name, is_nullable FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name IN ('player_sessions','admin_sessions') ORDER BY table_name,column_name",
  );
  const observed = new Map(columns.rows.map((row) => [row.table_name + '.' + row.column_name, row.is_nullable]));
  for (const name of ['id','player_id','token_hash','session_version','created_at','authenticated_at','expires_at','revoked_at']) {
    assert.ok(observed.has('player_sessions.' + name), 'Missing player_sessions.' + name);
  }
  for (const name of ['id','admin_id','token_hash','session_version','created_at','authenticated_at','expires_at','revoked_at','mfa_verified']) {
    assert.ok(observed.has('admin_sessions.' + name), 'Missing admin_sessions.' + name);
  }
  assert.ok(!observed.has('player_sessions.principal_type'));
  assert.ok(!observed.has('player_sessions.principal_id'));
  assert.ok(!observed.has('admin_sessions.principal_type'));
  assert.ok(!observed.has('admin_sessions.principal_id'));
  assert.equal(observed.get('player_sessions.player_id'), 'NO');
  assert.equal(observed.get('admin_sessions.admin_id'), 'NO');
  assert.equal(observed.get('admin_sessions.mfa_verified'), 'NO');

  const constraints = await pool.query(
    "SELECT conname, contype FROM pg_constraint WHERE conrelid IN " +
    "('public.player_sessions'::regclass,'public.admin_sessions'::regclass) ORDER BY conname",
  );
  const constraintMap = new Map(constraints.rows.map((row) => [row.conname, row.contype]));
  assert.equal(constraintMap.get('player_sessions_player_id_fkey'), 'f');
  assert.equal(constraintMap.get('admin_sessions_admin_id_fkey'), 'f');
  assert.equal(constraintMap.get('admin_sessions_mfa_verified_check'), 'c');

  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('player_sessions','admin_sessions') ORDER BY indexname",
  );
  const indexNames = new Set(indexes.rows.map((row) => row.indexname));
  for (const name of [
    'player_sessions_pkey','player_sessions_token_hash_key','player_sessions_player_idx','player_sessions_expiry_idx',
    'admin_sessions_pkey','admin_sessions_token_hash_key','admin_sessions_admin_idx','admin_sessions_expiry_idx',
  ]) assert.ok(indexNames.has(name), 'Missing index ' + name);

  const countResult = await pool.query(
    'SELECT (SELECT count(*)::int FROM public.player_sessions) AS player_sessions, ' +
    '(SELECT count(*)::int FROM public.admin_sessions) AS admin_sessions',
  );
  assert.equal(countResult.rows[0].player_sessions, 0);
  assert.equal(countResult.rows[0].admin_sessions, 0);
}

async function assertPostUp() {
  const identity = await pool.query(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version, current_schema() AS schema_name",
  );
  assert.equal(identity.rows[0].database_name, 'bclick_ci');
  assert.match(identity.rows[0].server_version, /^18\./);
  assert.equal(identity.rows[0].schema_name, 'public');
  await assertHistory(migrationNames);
  await assertReferenceState();
  await assertRbacAndCurrencies();
  await assertSplitSchema();
  console.log(JSON.stringify({
    phase: 'post-up',
    database: identity.rows[0].database_name,
    serverVersion: identity.rows[0].server_version,
    sessionTables: ['player_sessions','admin_sessions'],
    mixedAuthSessionsPresent: false,
    playerSessionCount: 0,
    adminSessionCount: 0,
    referenceTuple: [0, 0, 1, 5, 0, 5],
    legacyPermissions: 5,
    currencies: ['TND:3','EUR:2','USD:2'],
    migrationHistoryCount: migrationNames.length,
  }, null, 2));
  console.log('MIGRATION_002_POSTCHECK=PASS');
}

async function installRollbackFixtures() {
  await pool.query(
    'INSERT INTO public.players ' +
    '(id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,language,preferred_display_currency,status,verification_status,date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,preferred_language) ' +
    "VALUES ($1,'m002-player-rollback-guard@example.test','m002-player-rollback-guard@example.test','ci-only-not-a-real-hash','M002 Player Fixture','TN','TND','en','EUR','active','verified','1990-01-01',now(),'ci-terms-v1',now(),'ci-age-policy-v1','en')",
    [fixture.playerId],
  );
  await pool.query(
    'INSERT INTO public.admin_users ' +
    '(id,email,email_normalized,display_name,password_hash,status,mfa_enabled,totp_secret_encrypted,created_at,updated_at) ' +
    "VALUES ($1,'m002-admin-rollback-guard@example.test','m002-admin-rollback-guard@example.test','M002 Admin Fixture','ci-only-not-a-real-hash','active',true,'ci-placeholder-encrypted-secret',now(),now())",
    [fixture.adminId],
  );
  await pool.query(
    'INSERT INTO public.player_sessions (id,player_id,token_hash,session_version,created_at,authenticated_at,expires_at) ' +
    "VALUES ($1,$2,'ci-m002-player-session-token-hash',1,now(),now(),now()+interval '1 day')",
    [fixture.playerSessionId, fixture.playerId],
  );

  // Prove that a password-only admin session cannot be represented in this table.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT m002_mfa_guard');
    let observedError;
    try {
      await client.query(
        'INSERT INTO public.admin_sessions (id,admin_id,token_hash,session_version,created_at,authenticated_at,expires_at,mfa_verified) ' +
        "VALUES ($1,$2,'ci-m002-rejected-admin-session-hash',1,now(),now(),now()+interval '1 day',false)",
        [fixture.rejectedAdminSessionId, fixture.adminId],
      );
    } catch (error) {
      observedError = error;
    }
    await client.query('ROLLBACK TO SAVEPOINT m002_mfa_guard');
    await client.query('RELEASE SAVEPOINT m002_mfa_guard');
    await client.query('COMMIT');
    assert.ok(observedError, 'Admin session with mfa_verified=false unexpectedly succeeded');
    assert.equal(observedError.code, '23514', 'Expected MFA check constraint SQLSTATE');
  } finally {
    client.release();
  }

  await pool.query(
    'INSERT INTO public.admin_sessions (id,admin_id,token_hash,session_version,created_at,authenticated_at,expires_at,mfa_verified) ' +
    "VALUES ($1,$2,'ci-m002-admin-session-token-hash',1,now(),now(),now()+interval '8 hours',true)",
    [fixture.adminSessionId, fixture.adminId],
  );
  console.log('MIGRATION_002_MFA_GUARD=PASS');
  console.log('MIGRATION_002_ROLLBACK_FIXTURES=INSTALLED');
}

async function verifyRollbackGuardAndRemoveFixtures() {
  await assertHistory(migrationNames);
  const player = await pool.query('SELECT player_id FROM public.player_sessions WHERE id=$1', [fixture.playerSessionId]);
  const admin = await pool.query('SELECT admin_id,mfa_verified FROM public.admin_sessions WHERE id=$1', [fixture.adminSessionId]);
  assert.deepEqual(player.rows, [{ player_id: fixture.playerId }], 'Player session did not survive failed rollback');
  assert.deepEqual(admin.rows, [{ admin_id: fixture.adminId, mfa_verified: true }], 'Admin session did not survive failed rollback');
  const names = await tableNames();
  assert.ok(names.includes('player_sessions') && names.includes('admin_sessions'));
  assert.ok(!names.includes('auth_sessions'));

  await pool.query('DELETE FROM public.player_sessions WHERE id=$1', [fixture.playerSessionId]);
  await pool.query('DELETE FROM public.admin_sessions WHERE id=$1', [fixture.adminSessionId]);
  await pool.query('DELETE FROM public.players WHERE id=$1', [fixture.playerId]);
  await pool.query('DELETE FROM public.admin_users WHERE id=$1', [fixture.adminId]);
  await assertReferenceState();
  console.log('MIGRATION_002_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS');
  console.log('MIGRATION_002_ROLLBACK_FIXTURES=CLEANED');
}

async function assertPostDown() {
  await assertHistory(priorMigrationNames);
  const names = await tableNames();
  assert.ok(names.includes('auth_sessions'), 'Rollback did not restore auth_sessions');
  assert.ok(!names.includes('player_sessions'), 'Rollback left player_sessions');
  assert.ok(!names.includes('admin_sessions'), 'Rollback left admin_sessions');
  const columns = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='auth_sessions' ORDER BY column_name",
  );
  assert.deepEqual(columns.rows.map((row) => row.column_name), [
    'authenticated_at','created_at','expires_at','id','mfa_verified','principal_id','principal_type','revoked_at','session_version','token_hash',
  ]);
  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='auth_sessions' ORDER BY indexname",
  );
  const indexNames = new Set(indexes.rows.map((row) => row.indexname));
  for (const name of ['auth_sessions_pkey','auth_sessions_token_hash_key','auth_sessions_principal_idx','auth_sessions_expiry_idx']) {
    assert.ok(indexNames.has(name), 'Rollback did not restore index ' + name);
  }
  const count = await pool.query('SELECT count(*)::int AS count FROM public.auth_sessions');
  assert.equal(count.rows[0].count, 0);
  await assertReferenceState();
  await assertRbacAndCurrencies();
  console.log(JSON.stringify({
    phase: 'post-down',
    mixedAuthSessionsRestored: true,
    sessionRows: count.rows[0].count,
    splitTablesPresent: false,
    migrationHistoryCount: priorMigrationNames.length,
    referenceTuple: [0, 0, 1, 5, 0, 5],
    legacyPermissions: 5,
    currencies: ['TND:3','EUR:2','USD:2'],
  }, null, 2));
  console.log('MIGRATION_002_ROLLBACK_POSTCHECK=PASS');
}

try {
  if (phase === 'post-up') await assertPostUp();
  else if (phase === 'install-rollback-fixtures') await installRollbackFixtures();
  else if (phase === 'verify-rollback-guard') await verifyRollbackGuardAndRemoveFixtures();
  else await assertPostDown();
} finally {
  await pool.end();
}
