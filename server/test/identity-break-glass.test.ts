import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import testFn from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

import {
  BREAK_GLASS_ACKNOWLEDGEMENT,
  BreakGlassOperationError,
  assertBreakGlassDatabaseTarget,
  executeAdminMfaBreakGlassReset,
  parseBreakGlassRequest,
  type AdminMfaBreakGlassRequest,
} from '../src/identity/break-glass-admin-mfa.js';

function validRequest(targetEmail: string): AdminMfaBreakGlassRequest {
  return {
    targetEmail,
    confirmTargetEmail: targetEmail,
    databaseTarget: 'db.example.test:5432/bclick_prod',
    confirmDatabaseTarget: 'db.example.test:5432/bclick_prod',
    requesterIdentity: 'incident-commander@example.test',
    approverIdentity: 'independent-security-approver@example.test',
    incidentTicket: 'INC-2046',
    identityGateApprovalReference: 'identity-runbook-review-2046',
    deploymentGateApprovalReference: 'deployment-gate-review-2046',
    identityRunbookApproved: true,
    deploymentGateApproved: true,
    scope: 'sole-admin-out-of-band',
    acknowledgement: BREAK_GLASS_ACKNOWLEDGEMENT,
  };
}


testFn('break-glass matches typed database target to the connection URL and refuses a mismatch', () => {
  const url = 'postgresql://operator:secret@db.example.test:5432/bclick_prod?sslmode=require';
  assert.equal(assertBreakGlassDatabaseTarget(url, 'db.example.test:5432/bclick_prod'), 'bclick_prod');
  assert.throws(
    () => assertBreakGlassDatabaseTarget(url, 'other-db.example.test:5432/bclick_prod'),
    { code: 'DATABASE_TARGET_MISMATCH' },
  );
  assert.throws(
    () => assertBreakGlassDatabaseTarget(url, 'db.example.test:5432/other_db'),
    { code: 'DATABASE_TARGET_MISMATCH' },
  );
  assert.throws(
    () => assertBreakGlassDatabaseTarget('https://db.example.test/bclick_prod', 'db.example.test:443/bclick_prod'),
    { code: 'INVALID_DATABASE_URL' },
  );
});

testFn('break-glass command refuses development, missing attestations, and target self-approval', () => {
  const targetEmail = 'sole-admin@example.test';
  const request = validRequest(targetEmail);
  const env: Record<string, string> = {
    BCLICK_BREAK_GLASS_EXECUTION: 'EXECUTE',
    BCLICK_BREAK_GLASS_APPROVAL_VERIFIED: 'YES',
    BCLICK_BREAK_GLASS_DEPLOYMENT_GATE_VERIFIED: 'YES',
    BCLICK_BREAK_GLASS_TARGET_EMAIL: targetEmail,
    BCLICK_BREAK_GLASS_CONFIRM_TARGET_EMAIL: targetEmail,
    BCLICK_BREAK_GLASS_DATABASE_TARGET: request.databaseTarget,
    BCLICK_BREAK_GLASS_CONFIRM_DATABASE_TARGET: request.confirmDatabaseTarget,
    BCLICK_BREAK_GLASS_REQUESTER_IDENTITY: request.requesterIdentity,
    BCLICK_BREAK_GLASS_APPROVER_IDENTITY: request.approverIdentity,
    BCLICK_BREAK_GLASS_INCIDENT_TICKET: request.incidentTicket,
    BCLICK_BREAK_GLASS_IDENTITY_APPROVAL_REF: request.identityGateApprovalReference,
    BCLICK_BREAK_GLASS_DEPLOYMENT_APPROVAL_REF: request.deploymentGateApprovalReference,
    BCLICK_BREAK_GLASS_SCOPE: 'sole-admin-out-of-band',
    BCLICK_BREAK_GLASS_ACKNOWLEDGEMENT: BREAK_GLASS_ACKNOWLEDGEMENT,
  };

  assert.throws(() => parseBreakGlassRequest(env, 'development'), { code: 'SHARED_ENVIRONMENT_ONLY' });
  assert.throws(() => parseBreakGlassRequest({ ...env, BCLICK_BREAK_GLASS_APPROVAL_VERIFIED: 'NO' }, 'production'),
    { code: 'OUT_OF_BAND_APPROVAL_NOT_ATTESTED' });
  assert.throws(() => parseBreakGlassRequest({ ...env, BCLICK_BREAK_GLASS_DEPLOYMENT_GATE_VERIFIED: 'NO' }, 'staging'),
    { code: 'DEPLOYMENT_GATE_NOT_ATTESTED' });
  assert.throws(() => parseBreakGlassRequest({
    ...env,
    BCLICK_BREAK_GLASS_APPROVER_IDENTITY: targetEmail,
  }, 'production'), { code: 'TARGET_CANNOT_APPROVE_OWN_RECOVERY' });
  assert.throws(() => parseBreakGlassRequest({
    ...env,
    BCLICK_BREAK_GLASS_REQUESTER_IDENTITY: targetEmail,
  }, 'production'), { code: 'TARGET_CANNOT_REQUEST_OWN_RECOVERY' });
  assert.throws(() => parseBreakGlassRequest({
    ...env,
    BCLICK_BREAK_GLASS_ACKNOWLEDGEMENT: 'yes',
  }, 'production'), { code: 'ACKNOWLEDGEMENT_REQUIRED' });
  assert.throws(() => parseBreakGlassRequest({
    ...env,
    BCLICK_BREAK_GLASS_CONFIRM_DATABASE_TARGET: 'other-db.example.test:5432/bclick_prod',
  }, 'production'), { code: 'DATABASE_TARGET_CONFIRMATION_MISMATCH' });
});

testFn('break-glass reset atomically revokes admin state on disposable PostgreSQL and denies re-use', {
  timeout: 120_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const adminId = randomUUID();
  const email = 'sole-' + randomUUID() + '@example.test';
  const passwordHash = 'password-hash-must-remain-unchanged';
  const sessionId = randomUUID();
  const challengeId = randomUUID();
  const recoveryIds = [randomUUID(), randomUUID()];
  let pool: Pool | undefined;

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });
    pool = new Pool({ connectionString: databaseUrl, max: 4 });

    await pool.query(
      'INSERT INTO public.admin_users (id,email,email_normalized,display_name,password_hash,status,mfa_enabled,totp_secret_encrypted,totp_pending_secret_encrypted,totp_pending_challenge_id,totp_pending_expires_at,created_at,updated_at) VALUES ($1,$2,$2,$3,$4,$5,TRUE,$6,$7,$8,now()+interval \'5 minutes\',now(),now())',
      [adminId, email, 'Sole Administrator', passwordHash, 'active', 'encrypted-old-totp-seed', 'encrypted-pending-totp-seed', challengeId],
    );
    await pool.query(
      'INSERT INTO public.admin_sessions (id,admin_id,token_hash,session_version,created_at,authenticated_at,expires_at,mfa_verified) VALUES ($1,$2,$3,1,now(),now(),now()+interval \'1 hour\',TRUE)',
      [sessionId, adminId, 'hashed-session-' + randomBytes(8).toString('hex')],
    );
    await pool.query(
      'INSERT INTO public.admin_mfa_challenges (id,admin_id,status,browser_token_hash,enrollment_token_hash,expires_at,attempt_count,max_attempts,consumed_at,created_at) VALUES ($1,$2,\'enrollment_required\',$3,$4,now()+interval \'5 minutes\',0,5,NULL,now())',
      [challengeId, adminId, 'hashed-browser-token', 'hashed-enrollment-token'],
    );
    for (const id of recoveryIds) {
      await pool.query(
        'INSERT INTO public.admin_mfa_recovery_codes (id,admin_id,code_hash,created_at,consumed_at) VALUES ($1,$2,$3,now(),NULL)',
        [id, adminId, 'hashed-recovery-' + id],
      );
    }

    const reset = await executeAdminMfaBreakGlassReset(pool, validRequest(email));
    assert.equal(reset.adminSessionsRevoked, 1);
    assert.equal(reset.mfaChallengesInvalidated, 1);
    assert.equal(reset.recoveryCodesInvalidated, 2);

    const admin = await pool.query(
      'SELECT password_hash,status,mfa_enabled,totp_secret_encrypted,totp_pending_secret_encrypted,totp_pending_challenge_id,totp_pending_expires_at FROM public.admin_users WHERE id=$1',
      [adminId],
    );
    assert.deepEqual(admin.rows[0], {
      password_hash: passwordHash,
      status: 'active',
      mfa_enabled: false,
      totp_secret_encrypted: null,
      totp_pending_secret_encrypted: null,
      totp_pending_challenge_id: null,
      totp_pending_expires_at: null,
    }, 'only MFA material is reset; password and account status remain unchanged');

    const sessions = await pool.query('SELECT revoked_at FROM public.admin_sessions WHERE admin_id=$1', [adminId]);
    assert.equal(sessions.rowCount, 1);
    assert.ok(sessions.rows.every((row) => row.revoked_at !== null));
    const challenges = await pool.query('SELECT consumed_at FROM public.admin_mfa_challenges WHERE admin_id=$1', [adminId]);
    assert.equal(challenges.rowCount, 1);
    assert.ok(challenges.rows.every((row) => row.consumed_at !== null));
    const codes = await pool.query('SELECT consumed_at FROM public.admin_mfa_recovery_codes WHERE admin_id=$1', [adminId]);
    assert.equal(codes.rowCount, 2);
    assert.ok(codes.rows.every((row) => row.consumed_at !== null));

    const audit = await pool.query(
      'SELECT action,outcome,metadata FROM public.audit_events WHERE action=\'admin.mfa.break_glass\' AND subject_id=$1 ORDER BY created_at',
      [adminId],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(audit.rows[0]?.outcome, 'success');
    assert.equal(audit.rows[0]?.metadata.adminSessionsRevoked, 1);
    assert.equal(audit.rows[0]?.metadata.mfaChallengesInvalidated, 1);
    assert.equal(audit.rows[0]?.metadata.recoveryCodesInvalidated, 2);
    const auditDump = JSON.stringify(audit.rows);
    for (const sensitiveValue of ['encrypted-old-totp-seed', 'encrypted-pending-totp-seed', 'hashed-session-', 'hashed-browser-token', 'hashed-enrollment-token', 'hashed-recovery-']) {
      assert.equal(auditDump.includes(sensitiveValue), false, 'audit metadata must contain no credential or token material');
    }

    const repeatError = await executeAdminMfaBreakGlassReset(pool, validRequest(email)).then(
      () => null,
      (error: unknown) => error,
    );
    assert.ok(repeatError instanceof BreakGlassOperationError);
    assert.equal(repeatError.code, 'MFA_NOT_CURRENTLY_ENROLLED');
    const repeatedAudit = await pool.query(
      'SELECT outcome,metadata FROM public.audit_events WHERE action=\'admin.mfa.break_glass\' AND subject_id=$1 ORDER BY created_at',
      [adminId],
    );
    assert.deepEqual(repeatedAudit.rows.map((row) => row.outcome), ['success', 'denied']);
    assert.equal(repeatedAudit.rows[1]?.metadata.outcomeCode, 'MFA_NOT_CURRENTLY_ENROLLED');

    const secondAdminId = randomUUID();
    await pool.query(
      'INSERT INTO public.admin_users (id,email,email_normalized,display_name,password_hash,status,mfa_enabled,totp_secret_encrypted,created_at,updated_at) VALUES ($1,$2,$2,$3,$4,\'active\',TRUE,$5,now(),now())',
      [secondAdminId, 'second-admin-' + randomUUID() + '@example.test', 'Second Admin', passwordHash, 'encrypted-second-admin-seed'],
    );
    const multiAdminError = await executeAdminMfaBreakGlassReset(pool, validRequest(email)).then(
      () => null,
      (error: unknown) => error,
    );
    assert.ok(multiAdminError instanceof BreakGlassOperationError);
    assert.equal(multiAdminError.code, 'NOT_EXACTLY_ONE_ADMINISTRATOR');
    const secondAdmin = await pool.query('SELECT mfa_enabled,totp_secret_encrypted FROM public.admin_users WHERE id=$1', [secondAdminId]);
    assert.equal(secondAdmin.rows[0]?.mfa_enabled, true);
    assert.equal(secondAdmin.rows[0]?.totp_secret_encrypted, 'encrypted-second-admin-seed');
  } finally {
    await pool?.end().catch(() => undefined);
    await container.stop();
  }
});
