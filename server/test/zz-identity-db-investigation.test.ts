import assert from 'node:assert/strict';
import { Pool } from 'pg';
import test from 'node:test';

// Temporary evidence collector for the one-off, disposable GitHub Actions
// PostgreSQL investigation. It deliberately emits counts and permission codes
// only, never account rows, emails, hashes, tokens, or MFA material. Do not run
// this report against production. It is skipped outside CI.
const REQUIRED_TABLES = [
  'identity_players',
  'identity_admins',
  'identity_admin_roles',
  'identity_admin_permissions',
  'identity_admin_account_roles',
  'identity_admin_role_permissions',
] as const;

const LEGACY_CODES = [
  'admin.session.read',
  'admin.players.read',
  'admin.players.write',
  'admin.security.audit.read',
  'admin.security.manage',
] as const;

const CANONICAL_CODES = [
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

test('CI Identity DB investigation: report disposable PostgreSQL seed state', {
  skip: process.env.CI !== 'true' || !process.env.DATABASE_URL,
}, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

  try {
    const db = await pool.query<{ version: string; database: string }>(
      'SELECT current_setting(\'server_version\') AS version, current_database() AS database',
    );
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [REQUIRED_TABLES],
    );
    const foundTables = tables.rows.map((row) => row.table_name).sort();
    assert.deepEqual(foundTables, [...REQUIRED_TABLES].sort(), 'all expected identity inventory tables must exist');

    const counts = await pool.query<{
      player_count: number;
      admin_count: number;
      role_count: number;
      admin_role_assignment_count: number;
      permission_count: number;
      role_permission_link_count: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM identity_players) AS player_count,
        (SELECT COUNT(*)::int FROM identity_admins) AS admin_count,
        (SELECT COUNT(*)::int FROM identity_admin_roles) AS role_count,
        (SELECT COUNT(*)::int FROM identity_admin_account_roles) AS admin_role_assignment_count,
        (SELECT COUNT(*)::int FROM identity_admin_permissions) AS permission_count,
        (SELECT COUNT(*)::int FROM identity_admin_role_permissions) AS role_permission_link_count
    `);
    const roles = await pool.query<{ code: string; display_name: string }>(
      'SELECT code, display_name FROM identity_admin_roles ORDER BY code',
    );
    const adminAssignmentsByRole = await pool.query<{ role_code: string; assigned_admin_count: number }>(`
      SELECT r.code AS role_code, COUNT(ar.admin_id)::int AS assigned_admin_count
      FROM identity_admin_roles r
      LEFT JOIN identity_admin_account_roles ar ON ar.role_id = r.id
      GROUP BY r.code
      ORDER BY r.code
    `);
    const permissionLinksByRole = await pool.query<{ role_code: string; permission_link_count: number }>(`
      SELECT r.code AS role_code, COUNT(rp.permission_id)::int AS permission_link_count
      FROM identity_admin_roles r
      LEFT JOIN identity_admin_role_permissions rp ON rp.role_id = r.id
      GROUP BY r.code
      ORDER BY r.code
    `);
    const rolePermissionMapping = await pool.query<{ role_code: string; permission_code: string }>(`
      SELECT r.code AS role_code, p.code AS permission_code
      FROM identity_admin_role_permissions rp
      JOIN identity_admin_roles r ON r.id = rp.role_id
      JOIN identity_admin_permissions p ON p.id = rp.permission_id
      ORDER BY r.code, p.code
    `);
    const legacyRows = await pool.query<{ code: string; description: string; role_code: string | null }>(`
      SELECT p.code, p.description, r.code AS role_code
      FROM identity_admin_permissions p
      LEFT JOIN identity_admin_role_permissions rp ON rp.permission_id = p.id
      LEFT JOIN identity_admin_roles r ON r.id = rp.role_id
      WHERE p.code = ANY($1::text[])
      ORDER BY p.code, r.code
    `, [LEGACY_CODES]);
    const canonicalRows = await pool.query<{ code: string; description: string }>(`
      SELECT code, description
      FROM identity_admin_permissions
      WHERE code = ANY($1::text[])
      ORDER BY code
    `, [CANONICAL_CODES]);
    const migrations = await pool.query<{ name: string }>(
      'SELECT name FROM public.pgmigrations ORDER BY name',
    );

    const report = {
      scope: 'disposable GitHub Actions PostgreSQL only; not a developer-local database',
      database: db.rows[0],
      tables: foundTables,
      counts: counts.rows[0],
      roles: roles.rows,
      adminAssignmentsByRole: adminAssignmentsByRole.rows,
      permissionLinksByRole: permissionLinksByRole.rows,
      rolePermissionMapping: rolePermissionMapping.rows,
      legacyPermissionRowsAndLinks: legacyRows.rows,
      existingCanonicalPermissions: canonicalRows.rows,
      appliedMigrations: migrations.rows.map((row) => row.name),
    };
    console.log('IDENTITY_DB_INVESTIGATION_JSON=' + JSON.stringify(report, null, 2));

    // The test runs last and server tests are serialized, so account fixtures
    // created by identity.test.ts have completed cleanup before these checks.
    // These assertions validate the current clean CI baseline, not local data.
    assert.equal(report.counts.player_count, 0, 'CI baseline must have no player seed rows');
    assert.equal(report.counts.admin_count, 0, 'CI baseline must have no administrator seed rows');
    assert.equal(report.counts.role_count, 1, 'current baseline seeds one role');
    assert.equal(report.counts.admin_role_assignment_count, 0, 'migration must not seed an administrator assignment');
    assert.equal(report.counts.permission_count, 5, 'current baseline seeds five legacy permissions');
    assert.equal(report.counts.role_permission_link_count, 5, 'current baseline links project-admin to five legacy permissions');
    assert.equal(report.roles[0]?.code, 'project-admin');
    assert.equal(report.rolePermissionMapping.rows.length, 5);
    assert.equal(report.legacyPermissionRowsAndLinks.length, 5);
    assert.equal(report.existingCanonicalPermissions.length, 0, 'canonical permission registry has not been added yet');
  } finally {
    await pool.end();
  }
});
