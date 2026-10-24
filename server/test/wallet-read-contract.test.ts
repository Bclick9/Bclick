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
  BCLICK_AGE_POLICY_VERSION: 'ci-age-v1',
}, 'test');

function noServiceCalls(): IdentityService {
  return new Proxy({}, {
    get(_target, property) {
      if (property === 'repository') return undefined;
      throw new Error('Invalid wallet-read input must be rejected before IdentityService access: ' + String(property));
    },
  }) as unknown as IdentityService;
}

function assertValidationEnvelope(
  response: { statusCode: number; headers: Record<string, unknown>; json(): any },
  requestId: string,
): void {
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error, {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  });
  assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
  assert.equal(response.json().requestId, requestId);
  assert.equal(response.headers['x-request-id'], requestId);
}

test('Q-020 wallet balance/statement reject malformed path and query inputs with safe validation envelope before authentication or DB access', async () => {
  assert.ok(identityConfig);
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    identity: noServiceCalls(),
    identityConfig,
  });

  const cases = [
    {
      name: 'lowercase currency path is rejected',
      url: '/api/v1/wallets/tnd/balance',
      requestId: 'q020-wallet-balance-currency',
    },
    {
      name: 'currency longer than three characters is rejected',
      url: '/api/v1/wallets/TNDD/balance',
      requestId: 'q020-wallet-balance-length',
    },
    {
      name: 'unknown statement query key is rejected',
      url: '/api/v1/wallets/TND/statement?unexpected=value',
      requestId: 'q020-wallet-statement-query',
    },
    {
      name: 'statement page size above 100 is rejected',
      url: '/api/v1/wallets/TND/statement?limit=101',
      requestId: 'q020-wallet-statement-limit',
    },
    {
      name: 'malformed statement date-time is rejected',
      url: '/api/v1/wallets/TND/statement?from=not-a-date',
      requestId: 'q020-wallet-statement-date',
    },
  ];

  try {
    for (const item of cases) {
      const response = await app.inject({
        method: 'GET',
        url: item.url,
        headers: { 'x-request-id': item.requestId },
      });
      assertValidationEnvelope(response, item.requestId);
    }
  } finally {
    await app.close();
  }
});
