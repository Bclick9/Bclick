import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const expectedTarget = 'copabet365-neondb-frankfurt';
const target = process.env.BCLICK_NEON_BASELINE_TARGET;
const phase = process.env.BCLICK_NEON_BASELINE_PHASE;
const databaseUrl = process.env.DATABASE_URL;

if (target !== expectedTarget) {
  throw new Error('Refusing to run: explicit Neon baseline target marker is missing or invalid.');
}
if (phase !== 'pre' && phase !== 'post') {
  throw new Error('Refusing to run: BCLICK_NEON_BASELINE_PHASE must be pre or post.');
}
if (!databaseUrl) {
  throw new Error('Refusing to run: DATABASE_URL is required.');
}

const expectedMigrationBlobs = {
  '1792497600000_api_skeleton_baseline.sql': 'd3b2e382f7522fc81ec0ecdb4812c33e4db7ea55',
  '1792512000000_identity_sessions.sql': 'e82d0af78853136a33321489847ab2b0ae1573d8',
};
const expectedMigrationNames = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
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
const destinationTables = [
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
const legacyCodes = [
  'admin.session.read',
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
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
const expectedPermissionMapping = [
  { role_code: 'project-admin', permission_code: 'admin.players.read' },
  { role_code: 'project-admin', permission_code: 'admin.players.write' },
  { role_code: 'project-admin', permission_code: 'admin.security.audit.read' },
  { role_code: 'project-admin', permission_code: 'admin.security.manage' },
  { role_code: 'project-admin', permission_code: 'admin.session.read' },
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(scriptDir, '../migrations');

async function verifyMigrationInventory() {
  const entries = (await readdir(migrationsDir, { withFileTypes: true }))
    .map((entry) => {
      assert.ok(entry.isFile(), 'Unexpected non-file entry in server/migrations.');
      return entry.name;
    })
    .sort();

  assert.deepEqual(
    entries,
    Object.keys(expectedMigrationBlobs).sort(),
    'Refusing to apply more than the two explicitly approved baseline files.',
  );

  const observed = {};
  for (const name of entries) {
    const content = await readFile(resolve(migrationsDir, name));
    // Verify the exact Git blob reviewed on main, not only its filename.
    const gitBlobHeader = Buffer.from('blob ' + content.byteLength + '\0', 'utf8');
    const blobOid = createHash('sha1')
      .update(gitBlobHeader)
      .update(content)
      .digest('hex');
    observed[name] = blobOid;
    assert.equal(
      blobOid,
      expectedMigrationBlobs[name],
      'Migration contents differ from the reviewed baseline: ' + name,
    );
  }
  return observed;
}

const connectionUrl = new URL(databaseUrl);
assert.ok(
  connectionUrl.protocol === 'postgres:' || connectionUrl.protocol === 'postgresql:',
  'DATABASE_URL must be a PostgreSQL URL.',
);
const regionMatches = connectionUrl.hostname.toLowerCase().endsWith('.eu-central-1.aws.neon.tech');
const urlDatabase = decodeURIComponent(connectionUrl.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
const migrations = await verifyMigrationInventory();
assert.equal(regionMatches, true, 'Refusing to connect: DATABASE_URL does not identify the approved Frankfurt Neon region.');
assert.equal(urlDatabase, 'neondb', 'Refusing to connect: DATABASE_URL does not identify the approved neondb database.');

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 });

try {
  const identityResult = await pool.query(
    'SELECT current_database() AS database_name, ' +
    "current_setting('server_version') AS server_version, " +
    "current_setting('server_version_num')::int AS server_version_num"
  );
  const identity = identityResult.rows[0];
  assert.equal(identity.database_name, 'neondb', 'Connected database does not match the approved target.');
  assert.ok(identity.server_version_num >= 180000 && identity.server_version_num < 190000,
    'Unexpected PostgreSQL major version; expected PostgreSQL 18.');

  const migrationTableResult = await pool.query(
    "SELECT to_regclass('public.pgmigrations') IS NOT NULL AS exists",
  );
  const migrationTableExists = migrationTableResult.rows[0].exists;

  const candidateTableNames = [...sourceTables, ...destinationTables];
  const tableResult = await pool.query(
    'SELECT table_name ' +
    'FROM information_schema.tables ' +
    "WHERE table_schema = 'public' " +
    'AND table_name = ANY($1::text[]) ' +
    'ORDER BY table_name',
    [candidateTableNames],
  );
  const observedTables = tableResult.rows.map((row) => row.table_name);
  const presentSourceTables = observedTables.filter((name) => sourceTables.includes(name)).sort();
  const presentDestinationTables = observedTables.filter((name) => destinationTables.includes(name)).sort();

  if (phase === 'pre') {
    const report = {
      phase: 'pre-migration',
      targetMarker: expectedTarget,
      database: identity.database_name,
      region: 'eu-central-1',
      regionMarkerVerified: regionMatches,
      serverVersion: identity.server_version,
      migrationFiles: migrations,
      migrationHistoryTableExists: migrationTableExists,
      preExistingSourceTables: presentSourceTables,
      destinationNameCollisions: presentDestinationTables,
      sixCountReference: 'not measurable before baseline; absent tables are not counted as zero',
      mutationsPerformedByGate: false,
    };
    console.log('NEON_BASELINE_PREFLIGHT=' + JSON.stringify(report, null, 2));

    assert.equal(migrationTableExists, false, 'Migration history already exists; stop for owner review.');
    assert.deepEqual(presentSourceTables, [], 'Identity source tables already exist; stop for owner review.');
    assert.deepEqual(presentDestinationTables, [], 'Destination-name collision detected; stop for owner review.');
    console.log('NEON_BASELINE_PRECHECK=PASS');
  } else {
    assert.equal(migrationTableExists, true, 'Migration history table is missing after baseline execution.');
    assert.deepEqual(presentSourceTables, [...sourceTables].sort(), 'All 12 identity tables must exist after baseline execution.');
    assert.deepEqual(presentDestinationTables, [], 'Destination-name collision detected.');

    const historyResult = await pool.query('SELECT name FROM public.pgmigrations ORDER BY name');
    const appliedMigrations = historyResult.rows.map((row) => row.name);

    const countsResult = await pool.query(
      'SELECT ' +
      '(SELECT COUNT(*)::int FROM identity_players) AS player_count, ' +
      '(SELECT COUNT(*)::int FROM identity_admins) AS admin_count, ' +
      '(SELECT COUNT(*)::int FROM identity_admin_roles) AS role_count, ' +
      '(SELECT COUNT(*)::int FROM identity_admin_role_permissions) AS role_permission_link_count, ' +
      '(SELECT COUNT(*)::int FROM identity_admin_account_roles) AS admin_role_assignment_count, ' +
      '(SELECT COUNT(*)::int FROM identity_admin_permissions) AS permission_count, ' +
      '(SELECT COUNT(*)::int FROM identity_sessions) AS session_count'
    );
    const counts = countsResult.rows[0];
    const tuple = [
      counts.player_count,
      counts.admin_count,
      counts.role_count,
      counts.role_permission_link_count,
      counts.admin_role_assignment_count,
      counts.permission_count,
    ];

    const rolesResult = await pool.query(
      'SELECT code, display_name FROM identity_admin_roles ORDER BY code',
    );
    const rolePermissionResult = await pool.query(
      'SELECT r.code AS role_code, p.code AS permission_code ' +
      'FROM identity_admin_role_permissions rp ' +
      'JOIN identity_admin_roles r ON r.id = rp.role_id ' +
      'JOIN identity_admin_permissions p ON p.id = rp.permission_id ' +
      'ORDER BY r.code, p.code'
    );
    const permissionsResult = await pool.query(
      'SELECT code FROM identity_admin_permissions ORDER BY code',
    );
    const canonicalResult = await pool.query(
      'SELECT code FROM identity_admin_permissions WHERE code = ANY($1::text[]) ORDER BY code',
      [canonicalCodes],
    );
    const principalTypesResult = await pool.query(
      'SELECT principal_type, COUNT(*)::int AS session_count ' +
      'FROM identity_sessions GROUP BY principal_type ORDER BY principal_type'
    );
    const unknownPrincipalResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM identity_sessions " +
      "WHERE principal_type NOT IN ('player', 'admin')"
    );
    const orphanSessionsResult = await pool.query(
      "SELECT " +
      "(SELECT COUNT(*)::int FROM identity_sessions s " +
      "LEFT JOIN identity_players p ON s.principal_type = 'player' AND p.id = s.principal_id " +
      "WHERE s.principal_type = 'player' AND p.id IS NULL) AS orphan_player_sessions, " +
      "(SELECT COUNT(*)::int FROM identity_sessions s " +
      "LEFT JOIN identity_admins a ON s.principal_type = 'admin' AND a.id = s.principal_id " +
      "WHERE s.principal_type = 'admin' AND a.id IS NULL) AS orphan_admin_sessions"
    );

    const report = {
      phase: 'post-migration',
      targetMarker: expectedTarget,
      database: identity.database_name,
      region: 'eu-central-1',
      regionMarkerVerified: regionMatches,
      serverVersion: identity.server_version,
      migrationFiles: migrations,
      referenceTupleOrder: [
        'players',
        'admins',
        'roles',
        'role_permission_links',
        'admin_role_links',
        'permissions',
      ],
      referenceTuple: tuple,
      allCounts: counts,
      expectedSourceTableCount: sourceTables.length,
      observedSourceTables: presentSourceTables,
      destinationNameCollisions: presentDestinationTables,
      roles: rolesResult.rows,
      permissionCodes: permissionsResult.rows.map((row) => row.code),
      rolePermissionMapping: rolePermissionResult.rows,
      preExistingCanonicalPermissions: canonicalResult.rows.map((row) => row.code),
      sessionPrincipalTypes: principalTypesResult.rows,
      unknownSessionPrincipalTypeCount: unknownPrincipalResult.rows[0].count,
      orphanSessionCounts: orphanSessionsResult.rows[0],
      appliedMigrations,
      adminAccountCreated: counts.admin_count > 0,
      walletOrPaymentMigrationsIncluded: false,
    };
    console.log('NEON_BASELINE_POSTCHECK=' + JSON.stringify(report, null, 2));

    assert.deepEqual(tuple, [0, 0, 1, 5, 0, 5], 'Baseline six-count reference mismatch.');
    assert.equal(counts.session_count, 0, 'A fresh baseline must not contain sessions.');
    assert.deepEqual(rolesResult.rows, [
      { code: 'project-admin', display_name: 'Project Administrator' },
    ]);
    assert.deepEqual(permissionsResult.rows.map((row) => row.code), [...legacyCodes].sort());
    assert.deepEqual(rolePermissionResult.rows, expectedPermissionMapping);
    assert.deepEqual(canonicalResult.rows, [], 'Canonical permissions must remain absent at this stage.');
    assert.deepEqual(principalTypesResult.rows, []);
    assert.equal(unknownPrincipalResult.rows[0].count, 0);
    assert.deepEqual(orphanSessionsResult.rows[0], {
      orphan_player_sessions: 0,
      orphan_admin_sessions: 0,
    });
    assert.deepEqual(appliedMigrations, expectedMigrationNames);
    console.log('NEON_BASELINE_POSTCHECK=PASS');
  }
} finally {
  await pool.end();
}
