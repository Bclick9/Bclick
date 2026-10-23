import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { parseIdentityConfig } from '../src/identity/config.js';
import type { IdentityService } from '../src/identity/service.js';

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

function createService(calls: Array<{ method: string; args: unknown[] }>): IdentityService {
  return new Proxy({}, {
    get(_target, property) {
      if (property === 'requestPasswordReset' || property === 'confirmPasswordReset') {
        return async (...args: unknown[]) => {
          calls.push({ method: String(property), args });
        };
      }
      throw new Error('Unexpected IdentityService method invoked by password-reset contract test: ' + String(property));
    },
  }) as unknown as IdentityService;
}

function assertValidationEnvelope(response: { statusCode: number; headers: Record<string, unknown>; json(): any }, requestId: string): void {
  assert.equal(response.statusCode, 400);
  const body = response.json() as { error?: { code?: string; message?: string; details?: unknown }; requestId?: string };
  assert.deepEqual(body.error, {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  });
  assert.deepEqual(Object.keys(body).sort(), ['error', 'requestId']);
  assert.equal(body.requestId, requestId);
  assert.equal(response.headers['x-request-id'], requestId);
}

test('Q-020 password-reset request has positive, schema-negative, and Origin-negative route evidence', async () => {
  assert.ok(identityConfig);
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    identity: createService(calls),
    identityConfig,
  });

  try {
    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/request',
      headers: {
        origin: 'https://localhost:5173',
        'x-request-id': 'q020-reset-request-ok',
      },
      payload: { email: 'player@example.test' },
    });
    assert.equal(success.statusCode, 202);
    assert.equal(success.headers['x-request-id'], 'q020-reset-request-ok');
    assert.deepEqual(calls, [{
      method: 'requestPasswordReset',
      args: ['player@example.test', '127.0.0.1'],
    }]);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/request',
      headers: {
        origin: 'https://localhost:5173',
        'x-request-id': 'q020-reset-request-invalid',
      },
      payload: {},
    });
    assertValidationEnvelope(invalid, 'q020-reset-request-invalid');
    assert.equal(calls.length, 1, 'invalid body must not reach the service');

    const blockedOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/request',
      headers: {
        origin: 'https://attacker.example',
        'x-request-id': 'q020-reset-request-origin',
      },
      payload: { email: 'player@example.test' },
    });
    assert.equal(blockedOrigin.statusCode, 403);
    assert.equal(blockedOrigin.json().error.code, 'ORIGIN_INVALID');
    assert.equal(calls.length, 1, 'an untrusted Origin must not reach the service');
  } finally {
    await app.close();
  }
});

test('Q-020 password-reset confirm has positive, schema-negative, and Origin-negative route evidence', async () => {
  assert.ok(identityConfig);
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    identity: createService(calls),
    identityConfig,
  });

  try {
    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      headers: {
        origin: 'https://localhost:5173',
        'x-request-id': 'q020-reset-confirm-ok',
      },
      payload: {
        token: 't'.repeat(64),
        newPassword: 'CI-Only-Strong-Password-123!',
      },
    });
    assert.equal(success.statusCode, 204);
    assert.equal(success.headers['x-request-id'], 'q020-reset-confirm-ok');
    assert.deepEqual(calls, [{
      method: 'confirmPasswordReset',
      args: ['t'.repeat(64), 'CI-Only-Strong-Password-123!'],
    }]);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      headers: {
        origin: 'https://localhost:5173',
        'x-request-id': 'q020-reset-confirm-invalid',
      },
      payload: { token: 'short', newPassword: 'short' },
    });
    assertValidationEnvelope(invalid, 'q020-reset-confirm-invalid');
    assert.equal(calls.length, 1, 'invalid token/password must not reach the service');

    const blockedOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      headers: {
        origin: 'https://attacker.example',
        'x-request-id': 'q020-reset-confirm-origin',
      },
      payload: {
        token: 't'.repeat(64),
        newPassword: 'CI-Only-Strong-Password-123!',
      },
    });
    assert.equal(blockedOrigin.statusCode, 403);
    assert.equal(blockedOrigin.json().error.code, 'ORIGIN_INVALID');
    assert.equal(calls.length, 1, 'an untrusted Origin must not reach the service');
  } finally {
    await app.close();
  }
});
