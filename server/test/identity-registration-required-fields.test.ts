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

test('registration rejects missing date of birth, terms acceptance, and age confirmation at the HTTP contract layer', async () => {
  assert.ok(identityConfig);

  // Every case is rejected by Fastify's request schema before any service or
  // database call can run. A Proxy makes accidental handler invocation fail.
  const unusedService = new Proxy({}, {
    get() {
      throw new Error('Registration handler must not run for an invalid request body');
    },
  }) as unknown as IdentityService;
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    identity: unusedService,
    identityConfig,
  });

  const validPayload: Record<string, unknown> = {
    email: 'm003-required-fields@example.test',
    username: 'm003-required',
    password: 'CI-Only-Strong-Password-123!',
    countryCode: 'TN',
    settlementCurrency: 'TND',
    dateOfBirth: '1990-01-01',
    acceptTerms: true,
    acceptAgeConfirmation: true,
    preferredLanguage: 'en',
  };

  try {
    const missingFields = ['dateOfBirth', 'acceptTerms', 'acceptAgeConfirmation'];
    for (const field of missingFields) {
      const payload = { ...validPayload };
      delete payload[field];
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          origin: 'https://localhost:5173',
          'x-request-id': 'registration-validation-' + field,
        },
        payload,
      });
      assert.equal(response.statusCode, 400, 'Missing required registration field must be rejected: ' + field);
      const errorBody = response.json() as { error?: { code?: string; message?: string }; requestId?: string };
      assert.deepEqual(errorBody.error, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      });
      assert.deepEqual(Object.keys(errorBody).sort(), ['error', 'requestId']);
      assert.equal(errorBody.requestId, response.headers['x-request-id']);
      assert.equal(response.headers['x-request-id'], 'registration-validation-' + field);
    }

    for (const [field, description] of [
      ['acceptTerms', 'Terms acceptance must be explicitly true'],
      ['acceptAgeConfirmation', 'Age confirmation must be explicitly true'],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          origin: 'https://localhost:5173',
          'x-request-id': 'registration-validation-' + field + '-false',
        },
        payload: { ...validPayload, [field]: false },
      });
      assert.equal(response.statusCode, 400, description);
      const errorBody = response.json() as { error?: { code?: string; message?: string }; requestId?: string };
      assert.deepEqual(errorBody.error, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      });
      assert.deepEqual(Object.keys(errorBody).sort(), ['error', 'requestId']);
      assert.equal(errorBody.requestId, response.headers['x-request-id']);
      assert.equal(response.headers['x-request-id'], 'registration-validation-' + field + '-false');
    }

    console.log('MIGRATION_003_REGISTRATION_REQUIRED_FIELDS=PASS');
  } finally {
    await app.close();
  }
});
