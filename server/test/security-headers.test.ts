import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';

test('API responses carry a restrictive document policy and baseline security headers', async () => {
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    allowedHosts: ['bclick.example.test'],
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: { host: 'bclick.example.test' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-security-policy'], "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
  } finally {
    await app.close();
  }
});

test('an unapproved Host is rejected even if forwarded host headers claim an approved host', async () => {
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    allowedHosts: ['bclick.example.test'],
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: {
        host: 'attacker.example.test',
        'x-forwarded-host': 'bclick.example.test',
        forwarded: 'host=bclick.example.test;proto=https',
        'x-request-id': 'q013-host-reject-0001',
      },
    });

    assert.equal(response.statusCode, 421);
    assert.deepEqual(response.json(), {
      error: { code: 'HOST_INVALID', message: 'Request Host is not allowed' },
      requestId: 'q013-host-reject-0001',
    });
    assert.equal(response.headers['x-request-id'], 'q013-host-reject-0001');
  } finally {
    await app.close();
  }
});

test('untrusted forwarded host and Forwarded headers cannot override an approved original Host', async () => {
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    allowedHosts: ['bclick.example.test'],
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: {
        host: 'bclick.example.test',
        'x-forwarded-host': 'attacker.example.test',
        forwarded: 'host=attacker.example.test;proto=http',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  } finally {
    await app.close();
  }
});

test('Host allow-list matches the exact authority including port', async () => {
  const app = buildApp({
    database: null,
    logLevel: 'silent',
    allowedHosts: ['bclick.example.test:8443'],
  });

  try {
    const approved = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: { host: 'bclick.example.test:8443' },
    });
    assert.equal(approved.statusCode, 200);

    for (const host of [
      'bclick.example.test',
      'bclick.example.test:443',
      'bclick.example.test:8444',
      'bclick.example.test.attacker.invalid',
      'bclick.example.test,attacker.invalid',
    ]) {
      const rejected = await app.inject({
        method: 'GET',
        url: '/api/v1/health/live',
        headers: { host },
      });
      assert.equal(rejected.statusCode, 421, 'must reject Host authority ' + host);
    }
  } finally {
    await app.close();
  }
});

test('development compatibility allows hosts to remain unspecified only when no shared host policy is passed', async () => {
  const app = buildApp({ database: null, logLevel: 'silent' });

  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health/live' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-security-policy'], "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  } finally {
    await app.close();
  }
});
