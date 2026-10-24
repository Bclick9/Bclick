import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { parseIdentityConfig } from '../src/identity/config.js';
import type { IdentityService } from '../src/identity/service.js';

const identityConfig = parseIdentityConfig({
  BCLICK_IDENTITY_ENABLED: 'true',
  BCLICK_SESSION_HASH_KEY: randomBytes(32).toString('hex'),
  BCLICK_CSRF_SIGNING_KEY: randomBytes(32).toString('hex'),
  BCLICK_TOTP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  BCLICK_PLAYER_ALLOWED_ORIGINS: 'https://localhost:5173',
  BCLICK_ADMIN_ALLOWED_ORIGINS: 'https://localhost:5174',
  BCLICK_TERMS_VERSION: 'ci-terms-v1',
  BCLICK_AGE_POLICY_VERSION: 'ci-age-v1',
}, 'test');

test('Q-020b login and player/admin session responses are non-cacheable on validation and authentication failures', async () => {
  assert.ok(identityConfig);
  const identity = { resolveSession: async () => null } as unknown as IdentityService;
  const app = buildApp({ database: null, logLevel: 'silent', identity, identityConfig });
  try {
    const loginValidation = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      headers: { origin: 'https://localhost:5173', 'x-request-id': 'q020b-login-invalid-body' },
      payload: {},
    });
    assert.equal(loginValidation.statusCode, 400, loginValidation.body);
    assert.deepEqual(loginValidation.json(), {
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
      requestId: 'q020b-login-invalid-body',
    });
    assert.equal(loginValidation.headers['x-request-id'], 'q020b-login-invalid-body');
    assert.equal(loginValidation.headers['cache-control'], 'no-store');

    const playerSession = await app.inject({
      method: 'GET', url: '/api/v1/auth/session',
      headers: { 'x-request-id': 'q020b-player-session-anon' },
    });
    assert.equal(playerSession.statusCode, 401, playerSession.body);
    assert.deepEqual(playerSession.json(), {
      error: { code: 'UNAUTHORIZED', message: 'A valid player session is required' },
      requestId: 'q020b-player-session-anon',
    });
    assert.equal(playerSession.headers['x-request-id'], 'q020b-player-session-anon');
    assert.equal(playerSession.headers['cache-control'], 'no-store');

    const adminSession = await app.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { 'x-request-id': 'q020b-admin-session-anon' },
    });
    assert.equal(adminSession.statusCode, 401, adminSession.body);
    assert.deepEqual(adminSession.json(), {
      error: { code: 'UNAUTHORIZED', message: 'A valid administrator session is required' },
      requestId: 'q020b-admin-session-anon',
    });
    assert.equal(adminSession.headers['x-request-id'], 'q020b-admin-session-anon');
    assert.equal(adminSession.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});
