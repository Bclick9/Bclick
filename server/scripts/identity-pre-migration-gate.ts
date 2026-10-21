import assert from 'node:assert/strict';
import { Pool } from 'pg';

// Read-only Migration 001 gate for the disposable GitHub Actions PostgreSQL
// baseline. Deliberately refuses other targets so this CI helper cannot
// accidentally be repurposed against local, staging, or production databases.
const expectedTarget = 'ci-disposable';
if (process.env.BCLICK_PREFLIGHT_TARGET !== expectedTarget) {
  throw new Error(`Refusing to run: BCLICK_PREFLIGHT_TARGET must be "${expectedTarget}".`);
}
if (!process.env.DATABASE_URL) {
  throw new Error('Refusing to run: DATABASE_URL is required.');
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
] as const;

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
] as const;

const legacyCodes = [
  'admin.session.read',
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
] as const;

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
] as const;

const expectedMigrationNames = [
  '1792497600000_api_skeleton_baseline',
  '1792512000000_identity_sessions',
] as const;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

try {
  const connection = await pool.query<{
    database_name: string;
    server_version: string;
  }>(
    `SELECT current_database() AS database_name,
            current_setting('server_version') AS server_version`,
  );

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [[...sourceTables, ...destinationTables, 'pgmigrations']],
  );
  const presentTables = tables.rows.map((row) => row.table_name);
  const presentSourceTables = presentTables.filter((name) =>
    (sourceTables as readonly string[]).includes(name),
  ).sort();
  const presentDestinationTables = presentTables.filter((name) =>
    (destinationTables as readonly string[]).includes(name),
  ).sort();

  const countsResult = await pool.query<{
    player_count: number;
    admin_count: number;
    role_count: number;
    role_permission_link_count: number;
    admin_role_assignment_count: number;
    permission_count: number;
    session_count: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM identity_players) AS player_count,
      (SELECT COUNT(*)::int FROM identity_admins) AS admin_count,
      (SELECT COUNT(*)::int FROM identity_admin_roles) AS role_count,
      (SELECT COUNT(*)::int FROM identity_admin_role_permissions) AS role_permission_link_count,
      (SELECT COUNT(*)::int FROM identity_admin_account_roles) AS admin_role_assignment_count,
      (SELECT COUNT(*)::int FROM identity_admin_permissions) AS permission_count,
      (SELECT COUNT(*)::int FROM identity_sessions) AS session_count
  `);

  const rolesResult = await pool.query<{ code: string; display_name: string }>(
    'SELECT code, display_name FROM identity_admin_roles ORDER BY code',
  );
  const principalTypesResult = await pool.query<{
    principal_type: string;
    session_count: number;
  }>(
    `SELECT principal_type, COUNT(*)::int AS session_count
       FROM identity_sessions
      GROUP BY principal_type
      ORDER BY principal_type`,
  );
  const unknownPrincipalTypeResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM identity_sessions
      WHERE principal_type NOT IN ('player', 'admin')`,
  );
  const orphanSessionsResult = await pool.query<{
    orphan_player_sessions: number;
    orphan_admin_sessions: number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int
         FROM identity_sessions s
         LEFT JOIN identity_players p
           ON s.principal_type = 'player' AND p.id = s.principal_id
        WHERE s.principal_type = 'player' AND p.id IS NULL) AS orphan_player_sessions,
      (SELECT COUNT(*)::int
         FROM identity_sessions s
         LEFT JOIN identity_admins a
           ON s.principal_type = 'admin' AND a.id = s.principal_id
        WHERE s.principal_type = 'admin' AND a.id IS NULL) AS orphan_admin_sessions
  `);

  const rolePermissionMappingResult = await pool.query<{
    role_code: string;
    permission_code: string;
  }>(`
    SELECT r.code AS role_code, p.code AS permission_code
      FROM identity_admin_role_permissions rp
      JOIN identity_admin_roles r ON r.id = rp.role_id
      JOIN identity_admin_permissions p ON p.id = rp.permission_id
     ORDER BY r.code, p.code
  `);
  const legacyRowsResult = await pool.query<{
    code: string;
    description: string;
    role_code: string | null;
  }>(`
    SELECT p.code, p.description, r.code AS role_code
      FROM identity_admin_permissions p
      LEFT JOIN identity_admin_role_permissions rp ON rp.permission_id = p.id
      LEFT JOIN identity_admin_roles r ON r.id = rp.role_id
     WHERE p.code = ANY($1::text[])
     ORDER BY p.code, r.code
  `, [legacyCodes]);
  const canonicalRowsResult = await pool.query<{ code: string; description: string }>(
    `SELECT code, description
       FROM identity_admin_permissions
      WHERE code = ANY($1::text[])
      ORDER BY code`,
    [canonicalCodes],
  );
  const migrationResult = await pool.query<{ name: string }>(
    'SELECT name FROM public.pgmigrations ORDER BY name',
  );

  const report = {
    resultScope: 'read-only check against this disposable GitHub Actions target only',
    targetMarker: process.env.BCLICK_PREFLIGHT_TARGET,
    database: connection.rows[0],
    expectedPostM001SourceTables: sourceTables,
    observedSourceTables: presentSourceTables,
    destinationNameCollisions: presentDestinationTables,
    referenceTupleOrder: [
      'players',
      'admins',
      'roles',
      'role_permission_links',
      'admin_role_links',
      'permissions',
    ],
    referenceTuple: [
      countsResult.rows[0].player_count,
      countsResult.rows[0].admin_count,
      countsResult.rows[0].role_count,
      countsResult.rows[0].role_permission_link_count,
      countsResult.rows[0].admin_role_assignment_count,
      countsResult.rows[0].permission_count,
    ],
    counts: countsResult.rows[0],
    roles: rolesResult.rows,
    sessionPrincipalTypes: principalTypesResult.rows,
    unknownSessionPrincipalTypeCount: unknownPrincipalTypeResult.rows[0].count,
    orphanSessionCounts: orphanSessionsResult.rows[0],
    rolePermissionMapping: rolePermissionMappingResult.rows,
    legacyPermissionRowsAndLinks: legacyRowsResult.rows,
    preExistingCanonicalPermissions: canonicalRowsResult.rows,
    appliedMigrations: migrationResult.rows.map((row) => row.name),
  };

  // Safe inventory only: no account PII, password hashes, session token hashes,
  // MFA material, credentials, or DATABASE_URL is emitted.
  console.log('IDENTITY_MIGRATION_001_PREFLIGHT=' + JSON.stringify(report, null, 2));

  // Fail closed unless this is exactly the clean CI reference required by the
  // approved strategy. A mismatch is reported and no migration 001 is run.
  assert.equal(connection.rows[0]?.database_name, 'bclick_ci');
  assert.ok(connection.rows[0]?.server_version.startsWith('18.6'));
  assert.deepEqual(presentSourceTables, [...sourceTables].sort(), 'all 12 source tables must exist');
  assert.deepEqual(presentDestinationTables, [], 'destination-name collision detected');
  assert.deepEqual(countsResult.rows[0], {
    player_count: 0,
    admin_count: 0,
    role_count: 1,
    role_permission_link_count: 5,
    admin_role_assignment_count: 0,
    permission_count: 5,
    session_count: 0,
  });
  assert.deepEqual(rolesResult.rows, [
    { code: 'project-admin', display_name: 'Project Administrator' },
  ]);
  assert.equal(unknownPrincipalTypeResult.rows[0]?.count, 0);
  assert.deepEqual(orphanSessionsResult.rows[0], {
    orphan_player_sessions: 0,
    orphan_admin_sessions: 0,
  });
  assert.deepEqual(rolePermissionMappingResult.rows, [
    { role_code: 'project-admin', permission_code: 'admin.players.read' },
    { role_code: 'project-admin', permission_code: 'admin.players.write' },
    { role_code: 'project-admin', permission_code: 'admin.security.audit.read' },
    { role_code: 'project-admin', permission_code: 'admin.security.manage' },
    { role_code: 'project-admin', permission_code: 'admin.session.read' },
  ]);
  assert.equal(legacyRowsResult.rows.length, 5);
  assert.ok(legacyRowsResult.rows.every((row) => row.role_code === 'project-admin'));
  assert.deepEqual(canonicalRowsResult.rows, []);
  assert.deepEqual(
    migrationResult.rows.map((row) => row.name),
    [...expectedMigrationNames],
    'unexpected migration history; stop for owner review',
  );

  console.log('PREFLIGHT_GATE=PASS');
  console.log('MIGRATION_001_EXECUTED=false');
} finally {
  await pool.end();
}
