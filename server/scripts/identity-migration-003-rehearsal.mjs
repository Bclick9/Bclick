import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const target = process.env.BCLICK_M003_REHEARSAL_TARGET;
const databaseUrl = process.env.DATABASE_URL;
const phase = process.argv[2];

if (process.env.CI !== 'true' || target !== 'ci-disposable') {
  throw new Error('Refusing to run: Migration 003 rehearsal is restricted to disposable GitHub Actions CI.');
}
if (!databaseUrl) throw new Error('Refusing to run: DATABASE_URL is required.');
const parsedUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname) || databaseName !== 'bclick_ci') {
  throw new Error('Refusing to run: Migration 003 rehearsal must use localhost database bclick_ci only.');
}
if (!['seed', 'post-up', 'poison-credential', 'assert-down-guarded', 'post-down', 'cleanup-fixtures'].includes(phase)) {
  throw new Error('Usage: node identity-migration-003-rehearsal.mjs <seed|post-up|poison-credential|assert-down-guarded|post-down|cleanup-fixtures>');
}

const pool = new Pool({ connectionString: databaseUrl, max: 2 });
const previousMigrations = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
  '1792584000000_identity_domain_migration_001',
  '1792670400000_identity_sessions_split_002',
];
const migration003 = '1792756800000_identity_player_credentials_003';
const fullMigrations = [...previousMigrations, migration003];
const fixtures = [
  {
    id: '00000000-0000-4000-8000-000000003031',
    email: 'm003-credential-a@example.test',
    hash: '$ci-only$m003-hash-a-not-a-real-credential',
    displayName: 'M003 Credential Fixture A',
    dob: '1990-01-01',
  },
  {
    id: '00000000-0000-4000-8000-000000003032',
    email: 'm003-credential-b@example.test',
    hash: '$ci-only$m003-hash-b-not-a-real-credential',
    displayName: 'M003 Credential Fixture B',
    dob: '1992-02-02',
  },
];

async function assertHistory(expected) {
  const result = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
  assert.deepEqual(result.rows.map((row) => row.name), expected, 'Unexpected pgmigrations inventory');
}

async function tableNames() {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function playerCount() {
  const result = await pool.query('SELECT count(*)::int AS count FROM public.players');
  return result.rows[0].count;
}

async function assertReferenceTuple(expectedPlayerCount) {
  const result = await pool.query(
    'SELECT ' +
      '(SELECT count(*)::int FROM public.players) AS players, ' +
      '(SELECT count(*)::int FROM public.admin_users) AS admins, ' +
      '(SELECT count(*)::int FROM public.roles) AS roles, ' +
      '(SELECT count(*)::int FROM public.role_permissions) AS role_permission_links, ' +
      '(SELECT count(*)::int FROM public.admin_role_assignments) AS admin_role_links, ' +
      '(SELECT count(*)::int FROM public.permissions) AS permissions, ' +
      '(SELECT count(*)::int FROM public.player_sessions) AS player_sessions, ' +
      '(SELECT count(*)::int FROM public.admin_sessions) AS admin_sessions',
  );
  const row = result.rows[0];
  assert.deepEqual(
    [row.players, row.admins, row.roles, row.role_permission_links, row.admin_role_links, row.permissions],
    [expectedPlayerCount, 0, 1, 5, 0, 5],
    'Reference tuple changed (players/admins/roles/role-permission links/admin-role links/permissions)',
  );
  assert.equal(row.player_sessions, 0, 'Disposable rehearsal should have no leftover player sessions');
  assert.equal(row.admin_sessions, 0, 'Disposable rehearsal should have no leftover admin sessions');
}

async function assertKycAndV2Columns(expectAlias) {
  const result = await pool.query(
    "SELECT column_name, is_nullable, is_generated " +
      "FROM information_schema.columns WHERE table_schema='public' AND table_name='players'",
  );
  const columns = new Map(result.rows.map((row) => [row.column_name, row]));
  const required = [
    'date_of_birth',
    'terms_accepted_at',
    'age_confirmation_at',
    'preferred_language',
    'kyc_tier',
    'kyc_lock',
    'deposit_kyc_override',
    'deposit_kyc_override_expires_at',
  ];
  for (const name of required) assert.ok(columns.has(name), 'Missing existing v2/KYC column players.' + name);
  for (const name of ['date_of_birth', 'terms_accepted_at', 'age_confirmation_at', 'preferred_language']) {
    assert.equal(columns.get(name).is_nullable, 'NO', 'Existing v2 field unexpectedly nullable: ' + name);
  }
  assert.equal(columns.has('age_confirmed_at'), expectAlias, 'Unexpected age_confirmed_at compatibility alias state');
  if (expectAlias) {
    assert.equal(columns.get('age_confirmed_at').is_generated, 'ALWAYS');
    const mismatch = await pool.query(
      'SELECT count(*)::int AS count FROM public.players WHERE age_confirmed_at IS DISTINCT FROM age_confirmation_at',
    );
    assert.equal(mismatch.rows[0].count, 0, 'Generated age confirmation alias differs from source');
  }
}

async function assertMirrorData(expectedCount) {
  const sourceCount = await playerCount();
  assert.equal(sourceCount, expectedCount, 'Unexpected player source count');
  const names = await tableNames();
  assert.ok(names.has('player_profiles'), 'player_profiles is missing');
  assert.ok(names.has('player_credentials'), 'player_credentials is missing');
  const counts = await pool.query(
    'SELECT (SELECT count(*)::int FROM public.player_profiles) AS profiles, ' +
      '(SELECT count(*)::int FROM public.player_credentials) AS credentials',
  );
  assert.deepEqual(counts.rows[0], { profiles: expectedCount, credentials: expectedCount });

  const mismatch = await pool.query(
    'SELECT count(*)::int AS count ' +
      'FROM public.players p ' +
      'LEFT JOIN public.player_profiles pp ON pp.player_id=p.id ' +
      "LEFT JOIN public.player_credentials pc ON pc.player_id=p.id AND pc.kind='email_password' " +
      'WHERE pp.player_id IS NULL ' +
      'OR pp.display_name IS DISTINCT FROM p.display_name ' +
      'OR pp.created_at IS DISTINCT FROM p.created_at ' +
      'OR pp.updated_at IS DISTINCT FROM p.updated_at ' +
      'OR pc.player_id IS NULL ' +
      'OR pc.identifier IS DISTINCT FROM p.email ' +
      'OR pc.identifier_norm IS DISTINCT FROM p.email_normalized ' +
      'OR pc.password_hash IS DISTINCT FROM p.password_hash ' +
      'OR pc.password_changed_at IS NOT NULL',
  );
  assert.equal(mismatch.rows[0].count, 0, 'Profile or credential mirror differs from the legacy source');

  const extra = await pool.query(
    'SELECT ' +
      '(SELECT count(*)::int FROM public.player_profiles pp LEFT JOIN public.players p ON p.id=pp.player_id WHERE p.id IS NULL) AS orphan_profiles, ' +
      "(SELECT count(*)::int FROM public.player_credentials pc LEFT JOIN public.players p ON p.id=pc.player_id WHERE p.id IS NULL OR pc.kind <> 'email_password') AS orphan_or_unknown_credentials",
  );
  assert.deepEqual(extra.rows[0], { orphan_profiles: 0, orphan_or_unknown_credentials: 0 });

  // Assert the actual password-hash values match by row without printing them.
  const fixtureResult = await pool.query(
    'SELECT p.id, p.password_hash IS NOT DISTINCT FROM pc.password_hash AS hash_equal, ' +
      'pc.identifier_norm=p.email_normalized AS identifier_equal ' +
      'FROM public.players p JOIN public.player_credentials pc ON pc.player_id=p.id AND pc.kind=$1 ' +
      'WHERE p.id = ANY($2::uuid[]) ORDER BY p.id',
    ['email_password', fixtures.map((fixture) => fixture.id)],
  );
  assert.equal(fixtureResult.rows.length, 2, 'Both controlled CI fixtures must have credential rows');
  assert.ok(fixtureResult.rows.every((row) => row.hash_equal && row.identifier_equal));
  assert.deepEqual(await pool.query('SELECT count(*)::int AS count FROM public.players WHERE email_normalized <> lower(btrim(email))').then((v) => v.rows[0].count), 0);
  return counts.rows[0];
}

async function seedFixtures() {
  await assertHistory(previousMigrations);
  const names = await tableNames();
  assert.ok(!names.has('player_profiles') && !names.has('player_credentials'), 'M003 target tables already exist');
  await assertKycAndV2Columns(false);
  await assertReferenceTuple(0);
  assert.equal(await playerCount(), 0, 'M003 seed phase requires the exact empty player baseline');

  for (const fixture of fixtures) {
    await pool.query(
      'INSERT INTO public.players ' +
        '(id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,' +
        'language,preferred_display_currency,status,verification_status,email_verification_status,' +
        'date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,' +
        'preferred_language,created_at,updated_at) ' +
        "VALUES ($1,$2,$2,$3,$4,'TN','TND','en','EUR','pending','pending','pending',$5::date,now(),'ci-terms-v1',now(),'ci-age-policy-v1','en',now(),now())",
      [fixture.id, fixture.email, fixture.hash, fixture.displayName, fixture.dob],
    );
  }
  assert.equal(await playerCount(), fixtures.length);
  await assertReferenceTuple(fixtures.length);
  console.log(JSON.stringify({
    phase: 'seed',
    target: 'ci-disposable',
    fixturePlayerCount: fixtures.length,
    sourceCredentialValuesPrepared: true,
    realOrProductionCredentialsUsed: false,
  }, null, 2));
  console.log('MIGRATION_003_SEED=PASS');
}

async function postUp() {
  await assertHistory(fullMigrations);
  const identity = await pool.query(
    "SELECT current_database() AS database_name, current_setting('server_version') AS server_version",
  );
  assert.equal(identity.rows[0].database_name, 'bclick_ci');
  assert.match(identity.rows[0].server_version, /^18\./);
  await assertKycAndV2Columns(true);
  const counts = await assertMirrorData(fixtures.length);
  await assertReferenceTuple(fixtures.length);

  const expectedCredentialColumns = [
    'id','player_id','kind','identifier','identifier_norm','password_hash',
    'password_changed_at','created_at','updated_at',
  ];
  const credentialColumns = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='player_credentials' ORDER BY column_name",
  );
  const observedCredentialColumns = new Set(credentialColumns.rows.map((row) => row.column_name));
  for (const name of expectedCredentialColumns) assert.ok(observedCredentialColumns.has(name), 'Missing player_credentials.' + name);
  assert.ok(!observedCredentialColumns.has('password_plaintext'), 'A plaintext password field must never exist');

  const credentialConstraints = await pool.query(
    "SELECT conname, contype, pg_get_constraintdef(oid) AS definition " +
      "FROM pg_constraint WHERE conrelid='public.player_credentials'::regclass ORDER BY conname",
  );
  const namedConstraints = new Set(credentialConstraints.rows.map((row) => row.conname));
  for (const name of [
    'player_credentials_player_id_fkey',
    'player_credentials_player_kind_key',
    'player_credentials_kind_identifier_norm_key',
  ]) assert.ok(namedConstraints.has(name), 'Missing player credential constraint ' + name);
  const checkRows = credentialConstraints.rows.filter((row) => row.contype === 'c');
  const checkDefinitions = checkRows.map((row) => String(row.definition)).join(' ');
  assert.ok(checkRows.length >= 4, 'Expected all four player_credentials CHECK constraints');
  for (const column of ['kind', 'identifier', 'identifier_norm', 'password_hash']) {
    assert.ok(checkDefinitions.includes(column), 'Missing CHECK definition for player_credentials.' + column);
  }

  console.log(JSON.stringify({
    phase: 'post-up',
    database: identity.rows[0].database_name,
    serverVersion: identity.rows[0].server_version,
    migrationHistoryCount: fullMigrations.length,
    fixturePlayerCount: fixtures.length,
    profileRows: counts.profiles,
    credentialRows: counts.credentials,
    passwordHashesChanged: false,
    plaintextPasswordColumnPresent: false,
    v2FieldsValidated: ['date_of_birth','terms_accepted_at','age_confirmed_at','preferred_language'],
    kycFieldsValidated: ['kyc_tier','kyc_lock','deposit_kyc_override','deposit_kyc_override_expires_at'],
    ageConfirmedAliasMatchesExistingServerField: true,
    referenceTupleWithDisposableFixtures: [fixtures.length,0,1,5,0,5],
  }, null, 2));
  console.log('MIGRATION_003_POSTCHECK=PASS');
}


async function poisonCredentialMirror() {
  await assertHistory(fullMigrations);
  await assertMirrorData(fixtures.length);

  const updated = await pool.query(
    "UPDATE public.player_credentials SET password_hash = password_hash || $1 " +
      "WHERE player_id = $2 AND kind = 'email_password' RETURNING player_id",
    ['.m003-down-guard-probe', fixtures[0].id],
  );
  assert.equal(updated.rowCount, 1, 'Expected to modify exactly one synthetic credential mirror');

  const observed = await pool.query(
    "SELECT p.password_hash IS NOT DISTINCT FROM pc.password_hash AS hashes_match, " +
      "p.password_hash = $1 AS source_hash_preserved " +
      "FROM public.players p JOIN public.player_credentials pc " +
      "ON pc.player_id = p.id AND pc.kind = 'email_password' " +
      "WHERE p.id = $2",
    [fixtures[0].hash, fixtures[0].id],
  );
  assert.deepEqual(observed.rows, [{ hashes_match: false, source_hash_preserved: true }],
    'Guard probe must alter only the mirror and preserve the legacy source hash');
  console.log(JSON.stringify({
    phase: 'poison-credential',
    target: 'ci-disposable',
    alteredSyntheticCredentialMirrors: 1,
    legacySourceHashPreserved: true,
  }, null, 2));
  console.log('MIGRATION_003_ROLLBACK_GUARD_MUTATION=PASS');
}

async function assertDownGuarded() {
  await assertHistory(fullMigrations);
  const names = await tableNames();
  assert.ok(names.has('player_profiles'), 'Failed Down unexpectedly removed player_profiles');
  assert.ok(names.has('player_credentials'), 'Failed Down unexpectedly removed player_credentials');
  await assertKycAndV2Columns(true);
  await assertReferenceTuple(fixtures.length);

  const observed = await pool.query(
    "SELECT p.id, p.password_hash IS NOT DISTINCT FROM pc.password_hash AS hashes_match, " +
      "p.password_hash = $1 AS source_hash_preserved " +
      "FROM public.players p JOIN public.player_credentials pc " +
      "ON pc.player_id = p.id AND pc.kind = 'email_password' " +
      "WHERE p.id = ANY($2::uuid[]) ORDER BY p.id",
    [fixtures[0].hash, fixtures.map((fixture) => fixture.id)],
  );
  assert.equal(observed.rows.length, fixtures.length, 'Both credential fixtures must remain after refused Down');
  assert.deepEqual(observed.rows.map((row) => row.hashes_match), [false, true],
    'A refused Down must preserve the changed mirror for investigation and not partially drop the schema');
  assert.ok(observed.rows.every((row) => row.source_hash_preserved),
    'The legacy source password hashes must remain untouched');

  const restored = await pool.query(
    "UPDATE public.player_credentials pc SET password_hash = p.password_hash " +
      "FROM public.players p WHERE pc.player_id = p.id AND pc.kind = 'email_password' " +
      "AND p.id = $1 AND pc.password_hash = p.password_hash || $2 RETURNING pc.player_id",
    [fixtures[0].id, '.m003-down-guard-probe'],
  );
  assert.equal(restored.rowCount, 1, 'Expected to restore only the intentionally altered synthetic mirror');
  await assertMirrorData(fixtures.length);
  console.log(JSON.stringify({
    phase: 'assert-down-guarded',
    migrationHistoryCount: fullMigrations.length,
    migrationStillAppliedAfterRefusedDown: true,
    newTablesPreservedAfterRefusedDown: true,
    legacySourceHashPreserved: true,
    syntheticMirrorRestored: true,
  }, null, 2));
  console.log('MIGRATION_003_ROLLBACK_GUARD_REFUSAL=PASS');
}

async function postDown() {
  await assertHistory(previousMigrations);
  const names = await tableNames();
  assert.ok(!names.has('player_profiles'), 'Rollback left player_profiles');
  assert.ok(!names.has('player_credentials'), 'Rollback left player_credentials');
  await assertKycAndV2Columns(false);
  assert.equal(await playerCount(), fixtures.length, 'Rollback must preserve the source player rows');
  for (const fixture of fixtures) {
    const row = await pool.query(
      'SELECT email, password_hash, display_name, date_of_birth::text AS date_of_birth ' +
        'FROM public.players WHERE id=$1',
      [fixture.id],
    );
    assert.deepEqual(row.rows, [{
      email: fixture.email,
      password_hash: fixture.hash,
      display_name: fixture.displayName,
      date_of_birth: fixture.dob,
    }], 'Rollback changed a legacy source profile or password hash');
  }
  await assertReferenceTuple(fixtures.length);
  console.log(JSON.stringify({
    phase: 'post-down',
    migrationHistoryCount: previousMigrations.length,
    newTablesPresent: false,
    generatedAliasPresent: false,
    sourcePlayersPreserved: fixtures.length,
    sourcePasswordHashesPreserved: true,
    referenceTupleWithDisposableFixtures: [fixtures.length,0,1,5,0,5],
  }, null, 2));
  console.log('MIGRATION_003_ROLLBACK_POSTCHECK=PASS');
}

async function cleanupFixtures() {
  await assertHistory(fullMigrations);
  await assertMirrorData(fixtures.length);
  await pool.query('DELETE FROM public.players WHERE id = ANY($1::uuid[])', [fixtures.map((fixture) => fixture.id)]);
  assert.equal(await playerCount(), 0, 'Disposable Migration 003 fixtures were not removed');
  const names = await tableNames();
  assert.ok(names.has('player_profiles') && names.has('player_credentials'));
  const counts = await pool.query(
    'SELECT (SELECT count(*)::int FROM public.player_profiles) AS profiles, ' +
      '(SELECT count(*)::int FROM public.player_credentials) AS credentials',
  );
  assert.deepEqual(counts.rows[0], { profiles: 0, credentials: 0 });
  await assertReferenceTuple(0);
  await assertKycAndV2Columns(true);
  console.log(JSON.stringify({
    phase: 'cleanup-fixtures',
    database: 'bclick_ci',
    migrationHistoryCount: fullMigrations.length,
    remainingPlayerRows: 0,
    remainingProfileRows: 0,
    remainingCredentialRows: 0,
    referenceTupleRestored: [0,0,1,5,0,5],
  }, null, 2));
  console.log('MIGRATION_003_FIXTURE_CLEANUP=PASS');
}

try {
  if (phase === 'seed') await seedFixtures();
  else if (phase === 'post-up') await postUp();
  else if (phase === 'poison-credential') await poisonCredentialMirror();
  else if (phase === 'assert-down-guarded') await assertDownGuarded();
  else if (phase === 'post-down') await postDown();
  else await cleanupFixtures();
} finally {
  await pool.end();
}
