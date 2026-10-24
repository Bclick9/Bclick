import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { parseIdentityConfig } from '../src/identity/config.js';
import type { IdentityService, AuthSession } from '../src/identity/service.js';

const identityConfig = parseIdentityConfig({
  BCLICK_IDENTITY_ENABLED: 'true',
  BCLICK_SESSION_HASH_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  BCLICK_CSRF_SIGNING_KEY: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  BCLICK_TOTP_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  BCLICK_PLAYER_ALLOWED_ORIGINS: 'https://localhost:5173',
  BCLICK_ADMIN_ALLOWED_ORIGINS: 'https://localhost:5174',
  BCLICK_TERMS_VERSION: 'ci-terms-v1',
  BCLICK_AGE_POLICY_VERSION: 'ci-age-policy-v1',
}, 'test');

const PLAYER_SESSION_COOKIE = '__Host-bclick_session';
const PLAYER_CSRF_COOKIE = '__Host-bclick_player_csrf';
const ADMIN_SESSION_COOKIE = '__Host-bclick_admin_session';
const ADMIN_CSRF_COOKIE = '__Host-bclick_admin_csrf';
const PLAYER_TOKEN = 'player-session-token-012345678901234567890';
const PLAYER_CSRF = 'player-csrf-token-01234567890123456789';
const ADMIN_TOKEN = 'admin-session-token-0123456789012345678901';
const ADMIN_CSRF = 'admin-csrf-token-012345678901234567890';

type Call = { method: string; args: unknown[] };

const playerSession: AuthSession = {
  id: 'player-session-id',
  type: 'player',
  principalId: 'player-principal-id',
  version: 3,
  authenticatedAt: '2026-10-24T07:00:00.000Z',
  expiresAt: '2026-10-25T07:00:00.000Z',
  status: 'active',
  player: { id: 'player-principal-id', settlement_currency: 'TND', email: 'player@example.test' },
  mfaVerified: false,
};

const adminSession: AuthSession = {
  id: 'admin-session-id',
  type: 'admin',
  principalId: 'admin-principal-id',
  version: 4,
  authenticatedAt: '2026-10-24T07:00:00.000Z',
  expiresAt: '2026-10-24T15:00:00.000Z',
  status: 'active',
  admin: { id: 'admin-principal-id', status: 'active', mfa_enabled: true },
  roles: ['owner'],
  permissions: ['admin.auth.mfa.manage'],
  mfaVerified: true,
};

function createService(calls: Call[]): IdentityService {
  return new Proxy({}, {
    get(_target, property) {
      if (property === 'resolveSession') {
        return async (type: 'player' | 'admin', rawToken?: string) => {
          if (type === 'player' && rawToken === PLAYER_TOKEN) return playerSession;
          if (type === 'admin' && rawToken === ADMIN_TOKEN) return adminSession;
          return null;
        };
      }
      if (property === 'verifyCsrfForSession') {
        return (session: AuthSession, token: string) =>
          token === (session.type === 'player' ? PLAYER_CSRF : ADMIN_CSRF);
      }
      if (property === 'requestEmailVerification'
        || property === 'confirmEmailVerification'
        || property === 'regenerateRecoveryCodes') {
        return async (...args: unknown[]) => {
          calls.push({ method: String(property), args });
          if (property === 'regenerateRecoveryCodes') {
            return { codes: ['one-time-code-a', 'one-time-code-b'], createdAt: '2026-10-24T07:00:00.000Z' };
          }
        };
      }
      if (property === 'repository') return undefined;
      throw new Error('Unexpected IdentityService method invoked by Q-020 contract test: ' + String(property));
    },
  }) as unknown as IdentityService;
}

function validationEnvelope(response: { statusCode: number; headers: Record<string, unknown>; json(): any }, requestId: string): void {
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error, {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  });
  assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
  assert.equal(response.json().requestId, requestId);
  assert.equal(response.headers['x-request-id'], requestId);
}

function playerHeaders(options: { csrf?: boolean; origin?: string; requestId?: string } = {}): Record<string, string> {
  return {
    cookie: `${PLAYER_SESSION_COOKIE}=${PLAYER_TOKEN}; ${PLAYER_CSRF_COOKIE}=${PLAYER_CSRF}`,
    ...(options.csrf === false ? {} : { 'x-csrf-token': PLAYER_CSRF }),
    origin: options.origin ?? 'https://localhost:5173',
    ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
  };
}

function adminHeaders(options: { csrf?: boolean; origin?: string; requestId?: string } = {}): Record<string, string> {
  return {
    cookie: `${ADMIN_SESSION_COOKIE}=${ADMIN_TOKEN}; ${ADMIN_CSRF_COOKIE}=${ADMIN_CSRF}`,
    ...(options.csrf === false ? {} : { 'x-csrf-token': ADMIN_CSRF }),
    origin: options.origin ?? 'https://localhost:5174',
    ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
  };
}

test('Q-020 email-verification request requires player session, exact Origin and valid CSRF before calling service', async () => {
  assert.ok(identityConfig);
  const calls: Call[] = [];
  const app = buildApp({ database: null, logLevel: 'silent', identity: createService(calls), identityConfig });

  try {
    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/request',
      headers: { ...playerHeaders({ requestId: 'q020-email-request-ok' }) },
    });
    assert.equal(success.statusCode, 202, success.body);
    assert.equal(success.headers['x-request-id'], 'q020-email-request-ok');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'requestEmailVerification');
    assert.equal((calls[0].args[0] as AuthSession).principalId, playerSession.principalId);

    const noSession = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/request',
      headers: { origin: 'https://localhost:5173' },
    });
    assert.equal(noSession.statusCode, 401);
    assert.equal(noSession.json().error.code, 'UNAUTHORIZED');
    assert.equal(calls.length, 1, 'anonymous request must not invoke email delivery');

    const blockedOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/request',
      headers: playerHeaders({ origin: 'https://attacker.example' }),
    });
    assert.equal(blockedOrigin.statusCode, 403);
    assert.equal(blockedOrigin.json().error.code, 'ORIGIN_INVALID');
    assert.equal(calls.length, 1, 'untrusted Origin must not invoke email delivery');

    const missingCsrf = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/request',
      headers: playerHeaders({ csrf: false }),
    });
    assert.equal(missingCsrf.statusCode, 403);
    assert.equal(missingCsrf.json().error.code, 'CSRF_INVALID');
    assert.equal(calls.length, 1, 'missing CSRF must not invoke email delivery');
  } finally {
    await app.close();
  }
});

test('Q-020 email-verification confirm validates body and Origin before calling service', async () => {
  assert.ok(identityConfig);
  const calls: Call[] = [];
  const app = buildApp({ database: null, logLevel: 'silent', identity: createService(calls), identityConfig });

  try {
    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/confirm',
      headers: { origin: 'https://localhost:5173', 'x-request-id': 'q020-email-confirm-ok' },
      payload: { token: 'v'.repeat(64) },
    });
    assert.equal(success.statusCode, 204, success.body);
    assert.equal(success.headers['x-request-id'], 'q020-email-confirm-ok');
    assert.deepEqual(calls, [{ method: 'confirmEmailVerification', args: ['v'.repeat(64)] }]);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/confirm',
      headers: { origin: 'https://localhost:5173', 'x-request-id': 'q020-email-confirm-invalid' },
      payload: { token: 'short' },
    });
    validationEnvelope(invalid, 'q020-email-confirm-invalid');
    assert.equal(calls.length, 1, 'invalid token shape must not reach the service');

    const blockedOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/email-verification/confirm',
      headers: { origin: 'https://attacker.example' },
      payload: { token: 'v'.repeat(64) },
    });
    assert.equal(blockedOrigin.statusCode, 403);
    assert.equal(blockedOrigin.json().error.code, 'ORIGIN_INVALID');
    assert.equal(calls.length, 1, 'untrusted Origin must not reach the service');
  } finally {
    await app.close();
  }
});

test('Q-020 recovery-code regeneration requires active MFA admin session, exact Origin, CSRF and valid step-up request shape', async () => {
  assert.ok(identityConfig);
  const calls: Call[] = [];
  const app = buildApp({ database: null, logLevel: 'silent', identity: createService(calls), identityConfig });

  try {
    const noSession = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/mfa/recovery-codes',
      headers: { origin: 'https://localhost:5174', 'content-type': 'application/json' },
      payload: { totpCode: '123456', reason: 'Owner verified recovery-code rotation' },
    });
    assert.equal(noSession.statusCode, 401);
    assert.equal(noSession.json().error.code, 'UNAUTHORIZED');
    assert.equal(calls.length, 0);

    const badOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/mfa/recovery-codes',
      headers: adminHeaders({ origin: 'https://attacker.example' }),
      payload: { totpCode: '123456', reason: 'Owner verified recovery-code rotation' },
    });
    assert.equal(badOrigin.statusCode, 403);
    assert.equal(badOrigin.json().error.code, 'ORIGIN_INVALID');
    assert.equal(calls.length, 0);

    const missingCsrf = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/mfa/recovery-codes',
      headers: adminHeaders({ csrf: false }),
      payload: { totpCode: '123456', reason: 'Owner verified recovery-code rotation' },
    });
    assert.equal(missingCsrf.statusCode, 403);
    assert.equal(missingCsrf.json().error.code, 'CSRF_INVALID');
    assert.equal(calls.length, 0);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/mfa/recovery-codes',
      headers: { ...adminHeaders(), 'x-request-id': 'q020-recovery-invalid' },
      payload: { totpCode: 'bad', reason: 'short' },
    });
    validationEnvelope(invalid, 'q020-recovery-invalid');
    assert.equal(calls.length, 0, 'malformed step-up body must not reach the service');

    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/mfa/recovery-codes',
      headers: { ...adminHeaders(), 'x-request-id': 'q020-recovery-ok' },
      payload: { totpCode: '123456', reason: 'Owner verified recovery-code rotation' },
    });
    assert.equal(success.statusCode, 200, success.body);
    assert.equal(success.headers['x-request-id'], 'q020-recovery-ok');
    assert.deepEqual(success.json().data, {
      codes: ['one-time-code-a', 'one-time-code-b'],
      createdAt: '2026-10-24T07:00:00.000Z',
    });
    assert.deepEqual(calls, [{
      method: 'regenerateRecoveryCodes',
      args: [adminSession, '123456', 'Owner verified recovery-code rotation', 'q020-recovery-ok'],
    }]);
  } finally {
    await app.close();
  }
});
