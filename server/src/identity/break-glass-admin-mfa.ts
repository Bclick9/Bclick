import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import { normalizeEmail } from './crypto.js';

export const BREAK_GLASS_ACKNOWLEDGEMENT = 'RESET ADMIN MFA AND REVOKE ALL ADMIN SESSIONS';
const BREAK_GLASS_SCOPE = 'sole-admin-out-of-band';

export interface AdminMfaBreakGlassRequest {
  targetEmail: string;
  confirmTargetEmail: string;
  databaseTarget: string;
  confirmDatabaseTarget: string;
  requesterIdentity: string;
  approverIdentity: string;
  incidentTicket: string;
  identityGateApprovalReference: string;
  deploymentGateApprovalReference: string;
  identityRunbookApproved: boolean;
  deploymentGateApproved: boolean;
  scope: typeof BREAK_GLASS_SCOPE;
  acknowledgement: string;
}

export interface AdminMfaBreakGlassResult {
  adminSessionsRevoked: number;
  mfaChallengesInvalidated: number;
  recoveryCodesInvalidated: number;
  requestId: string;
}

export class BreakGlassOperationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'BreakGlassOperationError';
  }
}

function safeLabel(value: string, field: string, maxLength = 200): string {
  const normalized = value.trim();
  if (normalized.length < 2 || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new BreakGlassOperationError('INVALID_' + field.toUpperCase());
  }
  return normalized;
}

function requireIdentityApproval(request: AdminMfaBreakGlassRequest): {
  targetEmail: string;
  databaseTarget: string;
  requesterIdentity: string;
  approverIdentity: string;
  incidentTicket: string;
  identityGateApprovalReference: string;
  deploymentGateApprovalReference: string;
} {
  const targetEmail = normalizeEmail(request.targetEmail);
  if (targetEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    throw new BreakGlassOperationError('INVALID_TARGET_EMAIL');
  }
  if (normalizeEmail(request.confirmTargetEmail) !== targetEmail) {
    throw new BreakGlassOperationError('TARGET_CONFIRMATION_MISMATCH');
  }
  const databaseTarget = safeLabel(request.databaseTarget, 'database_target', 512);
  if (safeLabel(request.confirmDatabaseTarget, 'confirm_database_target', 512) !== databaseTarget) {
    throw new BreakGlassOperationError('DATABASE_TARGET_CONFIRMATION_MISMATCH');
  }
  if (request.acknowledgement !== BREAK_GLASS_ACKNOWLEDGEMENT) {
    throw new BreakGlassOperationError('ACKNOWLEDGEMENT_REQUIRED');
  }
  if (request.scope !== BREAK_GLASS_SCOPE) {
    throw new BreakGlassOperationError('SOLE_ADMIN_SCOPE_REQUIRED');
  }
  if (request.identityRunbookApproved !== true) {
    throw new BreakGlassOperationError('IDENTITY_RUNBOOK_APPROVAL_REQUIRED');
  }
  if (request.deploymentGateApproved !== true) {
    throw new BreakGlassOperationError('DEPLOYMENT_GATE_APPROVAL_REQUIRED');
  }

  const requesterIdentity = safeLabel(request.requesterIdentity, 'requester_identity');
  const approverIdentity = safeLabel(request.approverIdentity, 'approver_identity');
  if (requesterIdentity.toLowerCase() === approverIdentity.toLowerCase()) {
    throw new BreakGlassOperationError('REQUESTER_AND_APPROVER_MUST_DIFFER');
  }
  if (approverIdentity.toLowerCase() === targetEmail) {
    throw new BreakGlassOperationError('TARGET_CANNOT_APPROVE_OWN_RECOVERY');
  }

  const incidentTicket = safeLabel(request.incidentTicket, 'incident_ticket', 120);
  if (!/^[A-Za-z][A-Za-z0-9._:-]{1,119}$/.test(incidentTicket)) {
    throw new BreakGlassOperationError('INVALID_INCIDENT_TICKET');
  }
  const identityGateApprovalReference = safeLabel(request.identityGateApprovalReference, 'identity_approval_reference', 300);
  const deploymentGateApprovalReference = safeLabel(request.deploymentGateApprovalReference, 'deployment_approval_reference', 300);

  return {
    targetEmail,
    databaseTarget,
    requesterIdentity,
    approverIdentity,
    incidentTicket,
    identityGateApprovalReference,
    deploymentGateApprovalReference,
  };
}

export function parseBreakGlassRequest(
  env: Readonly<Record<string, string | undefined>>,
  nodeEnv: string,
): AdminMfaBreakGlassRequest {
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') {
    throw new BreakGlassOperationError('SHARED_ENVIRONMENT_ONLY');
  }
  if (env.BCLICK_BREAK_GLASS_EXECUTION !== 'EXECUTE') {
    throw new BreakGlassOperationError('EXPLICIT_EXECUTION_REQUIRED');
  }
  if (env.BCLICK_BREAK_GLASS_APPROVAL_VERIFIED !== 'YES') {
    throw new BreakGlassOperationError('OUT_OF_BAND_APPROVAL_NOT_ATTESTED');
  }
  if (env.BCLICK_BREAK_GLASS_DEPLOYMENT_GATE_VERIFIED !== 'YES') {
    throw new BreakGlassOperationError('DEPLOYMENT_GATE_NOT_ATTESTED');
  }

  const required = (name: string): string => {
    const value = env[name]?.trim() ?? '';
    if (!value) throw new BreakGlassOperationError('MISSING_' + name);
    return value;
  };
  const request: AdminMfaBreakGlassRequest = {
    targetEmail: required('BCLICK_BREAK_GLASS_TARGET_EMAIL'),
    confirmTargetEmail: required('BCLICK_BREAK_GLASS_CONFIRM_TARGET_EMAIL'),
    databaseTarget: required('BCLICK_BREAK_GLASS_DATABASE_TARGET'),
    confirmDatabaseTarget: required('BCLICK_BREAK_GLASS_CONFIRM_DATABASE_TARGET'),
    requesterIdentity: required('BCLICK_BREAK_GLASS_REQUESTER_IDENTITY'),
    approverIdentity: required('BCLICK_BREAK_GLASS_APPROVER_IDENTITY'),
    incidentTicket: required('BCLICK_BREAK_GLASS_INCIDENT_TICKET'),
    identityGateApprovalReference: required('BCLICK_BREAK_GLASS_IDENTITY_APPROVAL_REF'),
    deploymentGateApprovalReference: required('BCLICK_BREAK_GLASS_DEPLOYMENT_APPROVAL_REF'),
    identityRunbookApproved: true,
    deploymentGateApproved: true,
    scope: required('BCLICK_BREAK_GLASS_SCOPE') as typeof BREAK_GLASS_SCOPE,
    acknowledgement: required('BCLICK_BREAK_GLASS_ACKNOWLEDGEMENT'),
  };
  requireIdentityApproval(request);
  return request;
}


/**
 * Match a typed host:port/database confirmation to the actual connection string.
 * This is an operator-error guard, not proof of out-of-band approval.
 */
export function assertBreakGlassDatabaseTarget(databaseUrl: string, expectedTarget: string): string {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new BreakGlassOperationError('INVALID_DATABASE_URL');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new BreakGlassOperationError('INVALID_DATABASE_URL');
  }

  let databaseName = '';
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    throw new BreakGlassOperationError('INVALID_DATABASE_URL');
  }
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port || '5432';
  if (!host || !databaseName || databaseName.includes('/')) {
    throw new BreakGlassOperationError('INVALID_DATABASE_URL');
  }

  const canonicalTarget = `${host}:${port}/${databaseName}`;
  if (safeLabel(expectedTarget, 'database_target', 512) !== canonicalTarget) {
    throw new BreakGlassOperationError('DATABASE_TARGET_MISMATCH');
  }
  return databaseName;
}

interface AdminRow extends QueryResultRow {
  id: string;
  status: string;
  mfa_enabled: boolean;
  totp_secret_encrypted: string | null;
}

async function writeAudit(
  client: PoolClient,
  requestId: string,
  targetId: string | null,
  outcome: 'success' | 'denied',
  request: ReturnType<typeof requireIdentityApproval>,
  metadata: Record<string, unknown>,
): Promise<void> {
  await client.query(
    'INSERT INTO public.audit_events (id, action, actor_type, actor_id, subject_type, subject_id, outcome, request_id, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())',
    [
      randomUUID(),
      'admin.mfa.break_glass',
      'system',
      null,
      'admin',
      targetId,
      outcome,
      requestId,
      JSON.stringify({
        scope: BREAK_GLASS_SCOPE,
        databaseTarget: request.databaseTarget,
        incidentTicket: request.incidentTicket,
        requesterIdentity: request.requesterIdentity,
        approverIdentity: request.approverIdentity,
        identityGateApprovalReference: request.identityGateApprovalReference,
        deploymentGateApprovalReference: request.deploymentGateApprovalReference,
        ...metadata,
      }),
    ],
  );
}

/**
 * One-time out-of-band reset for an actually sole administrator.
 * The caller must independently verify the incident and approval references;
 * this routine records those attestations but does not validate an external ticketing system.
 */
export async function executeAdminMfaBreakGlassReset(
  pool: Pool,
  unvalidatedRequest: AdminMfaBreakGlassRequest,
): Promise<AdminMfaBreakGlassResult> {
  const request = requireIdentityApproval(unvalidatedRequest);
  const requestId = randomUUID();
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('bclick-admin-mfa-break-glass-v1'))");

    // Match online MFA verification's challenge -> admin -> recovery-code -> session order.
    await client.query('LOCK TABLE public.admin_mfa_challenges IN EXCLUSIVE MODE');
    await client.query('LOCK TABLE public.admin_users IN EXCLUSIVE MODE');
    await client.query('LOCK TABLE public.admin_mfa_recovery_codes IN EXCLUSIVE MODE');
    await client.query('LOCK TABLE public.admin_sessions IN EXCLUSIVE MODE');

    const targetResult = await client.query<AdminRow>(
      'SELECT id, status, mfa_enabled, totp_secret_encrypted FROM public.admin_users WHERE email_normalized=$1',
      [request.targetEmail],
    );
    const target = targetResult.rows[0];
    const countResult = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM public.admin_users',
    );
    const adminCount = Number(countResult.rows[0]?.count ?? 0);

    let refusalCode: string | undefined;
    if (adminCount !== 1) refusalCode = 'NOT_EXACTLY_ONE_ADMINISTRATOR';
    else if (!target) refusalCode = 'TARGET_ADMINISTRATOR_NOT_FOUND';
    else if (target.status !== 'active') refusalCode = 'TARGET_ADMINISTRATOR_NOT_ACTIVE';
    else if (target.mfa_enabled !== true || !target.totp_secret_encrypted) refusalCode = 'MFA_NOT_CURRENTLY_ENROLLED';

    if (refusalCode) {
      await writeAudit(client, requestId, target ? String(target.id) : null, 'denied', request, {
        outcomeCode: refusalCode,
      });
      await client.query('COMMIT');
      committed = true;
      throw new BreakGlassOperationError(refusalCode);
    }

    const targetId = String(target!.id);
    const sessions = await client.query(
      'UPDATE public.admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE admin_id=$1 AND revoked_at IS NULL RETURNING id',
      [targetId],
    );
    const challenges = await client.query(
      'UPDATE public.admin_mfa_challenges SET consumed_at=COALESCE(consumed_at,now()) WHERE admin_id=$1 AND consumed_at IS NULL RETURNING id',
      [targetId],
    );
    const recoveryCodes = await client.query(
      'UPDATE public.admin_mfa_recovery_codes SET consumed_at=COALESCE(consumed_at,now()) WHERE admin_id=$1 AND consumed_at IS NULL RETURNING id',
      [targetId],
    );
    const updatedAdmin = await client.query(
      'UPDATE public.admin_users SET mfa_enabled=FALSE, totp_secret_encrypted=NULL, totp_pending_secret_encrypted=NULL, totp_pending_challenge_id=NULL, totp_pending_expires_at=NULL, updated_at=now() WHERE id=$1 AND status=\'active\' AND mfa_enabled=TRUE AND totp_secret_encrypted IS NOT NULL RETURNING id',
      [targetId],
    );
    if ((updatedAdmin.rowCount ?? 0) !== 1) {
      throw new BreakGlassOperationError('ADMIN_STATE_CHANGED_RETRY_REVIEWED_PROCEDURE');
    }

    const result: AdminMfaBreakGlassResult = {
      adminSessionsRevoked: sessions.rowCount ?? sessions.rows.length,
      mfaChallengesInvalidated: challenges.rowCount ?? challenges.rows.length,
      recoveryCodesInvalidated: recoveryCodes.rowCount ?? recoveryCodes.rows.length,
      requestId,
    };
    await writeAudit(client, requestId, targetId, 'success', request, {
      adminSessionsRevoked: result.adminSessionsRevoked,
      mfaChallengesInvalidated: result.mfaChallengesInvalidated,
      recoveryCodesInvalidated: result.recoveryCodesInvalidated,
      nextLoginRequiresTotpEnrollment: true,
      passwordChanged: false,
      adminStatusChanged: false,
      rolesChanged: false,
    });
    await client.query('COMMIT');
    committed = true;
    return result;
  } catch (error) {
    if (!committed) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  let pool: Pool | undefined;
  try {
    const request = parseBreakGlassRequest(process.env, process.env.NODE_ENV ?? '');
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new BreakGlassOperationError('DATABASE_URL_REQUIRED');
    const expectedDatabaseName = assertBreakGlassDatabaseTarget(databaseUrl, request.databaseTarget);
    pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 5_000,
      application_name: 'bclick-admin-mfa-break-glass',
    });
    const connectedDatabase = await pool.query<{ database_name: string }>('SELECT current_database() AS database_name');
    if (connectedDatabase.rows[0]?.database_name !== expectedDatabaseName) {
      throw new BreakGlassOperationError('CONNECTED_DATABASE_MISMATCH');
    }
    const result = await executeAdminMfaBreakGlassReset(pool, request);
    process.stdout.write(JSON.stringify({
      event: 'admin_mfa_break_glass_completed',
      adminSessionsRevoked: result.adminSessionsRevoked,
      mfaChallengesInvalidated: result.mfaChallengesInvalidated,
      recoveryCodesInvalidated: result.recoveryCodesInvalidated,
      requestId: result.requestId,
      nextStep: 'Sign in with the unchanged password and complete fresh TOTP enrollment; verify audit evidence independently.',
    }) + '\n');
  } catch (error) {
    const code = error instanceof BreakGlassOperationError ? error.code : 'EXECUTION_FAILED';
    process.stderr.write('Admin MFA break-glass refused or failed [' + code + ']. No password, token, cookie, database URL, or seed was logged.\n');
    process.exitCode = 1;
  } finally {
    await pool?.end().catch(() => undefined);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
