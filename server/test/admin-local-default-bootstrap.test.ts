import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

import { parseIdentityConfig } from '../src/identity/config.js';
import { verifyPassword } from '../src/identity/crypto.js';
import { PgIdentityRepository } from '../src/identity/repository.js';
import { IdentityService } from '../src/identity/service.js';
import { buildApp } from '../src/app.js';

test('owner-requested default admin exists only in local development and is MFA-enrollment-gated', {
  timeout: 120_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const env = {
    BCLICK_IDENTITY_ENABLED: 'true',
    BCLICK_SESSION_HASH_KEY: randomBytes(32).toString('hex'),
    BCLICK_CSRF_SIGNING_KEY: randomBytes(32).toString('hex'),
    BCLICK_TOTP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    BCLICK_PLAYER_ALLOWED_ORIGINS: 'http://localhost:5173',
    BCLICK_ADMIN_ALLOWED_ORIGINS: 'http://localhost:5174',
    BCLICK_LOCAL_MAIL_SINK_PATH: '.local-mail-sink-test.jsonl',
    BCLICK_TERMS_VERSION: 'local-test-terms-v1',
    BCLICK_AGE_POLICY_VERSION: 'local-test-age-v1',
  };
  const identityConfig = parseIdentityConfig(env, 'development');
  assert.ok(identityConfig);
  let pool: Pool | undefined;
  let app: ReturnType<typeof buildApp> | undefined;

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });
    pool = new Pool({ connectionString: databaseUrl, max: 4 });
    const repository = new PgIdentityRepository(pool);
    const service = new IdentityService(repository, identityConfig);

    const nonDevelopmentService = new IdentityService(repository, { ...identityConfig, nodeEnv: 'test' });
    await assert.rejects(
      nonDevelopmentService.bootstrapLocalDefaultAdmin(),
      /permitted only in local development/,
    );

    assert.equal(await service.bootstrapLocalDefaultAdmin(), 'created');
    assert.equal(await service.bootstrapLocalDefaultAdmin(), 'already-present');

    const admins = await pool.query<{
      email_normalized: string;
      display_name: string;
      password_hash: string;
      mfa_enabled: boolean;
      status: string;
    }>(`SELECT email_normalized,display_name,password_hash,mfa_enabled,status
      FROM admin_users ORDER BY created_at`);
    assert.equal(admins.rows.length, 1, 'bootstrap must create exactly one administrator');
    assert.equal(admins.rows[0]?.email_normalized, 'admin@admin.com');
    assert.equal(admins.rows[0]?.display_name, 'Local Development Admin');
    assert.equal(admins.rows[0]?.status, 'active');
    assert.equal(admins.rows[0]?.mfa_enabled, false, 'first sign-in must enroll TOTP');
    assert.equal(await verifyPassword('admin', admins.rows[0]!.password_hash), true);
    assert.equal(await verifyPassword('not-admin', admins.rows[0]!.password_hash), false);

    const permissionRows = await pool.query<{ code: string }>(`SELECT DISTINCT p.code
      FROM admin_role_assignments ar
      JOIN roles r ON r.id=ar.role_id
      JOIN role_permissions rp ON rp.role_id=r.id
      JOIN permissions p ON p.id=rp.permission_id
      JOIN admin_users a ON a.id=ar.admin_id
      WHERE a.email_normalized='admin@admin.com'`);
    assert.ok(permissionRows.rows.some((row) => row.code === 'casino.provider-settings.manage'));

    app = buildApp({ database: pool, catalogDatabase: repository, identity: service, identityConfig, logLevel: 'silent' });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      headers: { origin: 'http://localhost:5174' },
      payload: { email: 'admin@admin.com', password: 'admin' },
    });
    assert.equal(login.statusCode, 202, login.body);
    assert.equal(login.json().data.status, 'enrollment_required');
    assert.ok(String(login.headers['set-cookie']).includes('__Host-bclick_admin_enrollment_csrf='));
    assert.equal(String(login.headers['set-cookie']).includes('__Host-bclick_admin_session='), false);

    const audit = await pool.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM audit_events WHERE action='admin.bootstrap.local-default'",
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0]?.metadata.ownerRequestedTemporaryDefaultCredential, true);
    assert.equal(audit.rows[0]?.metadata.localOnly, true);
  } finally {
    if (app) await app.close();
    if (pool) await pool.end();
    await container.stop();
  }
});
