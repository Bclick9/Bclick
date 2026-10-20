import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, type DatabaseProbe } from '../src/app.js';

test('liveness is public, minimal, and includes a server request ID', async () => {
  const database: DatabaseProbe = { query: async () => ({ rows: [{ ready: 1 }] }) };
  const app = buildApp({ database, logLevel: 'silent' });

  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health/live' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
    assert.match(String(response.headers['x-request-id']), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
  } finally {
    await app.close();
  }
});

test('valid client request IDs are preserved and invalid IDs are replaced', async () => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logLevel: 'silent',
  });

  try {
    const valid = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: { 'x-request-id': 'integration-test:health-01' },
    });
    assert.equal(valid.headers['x-request-id'], 'integration-test:health-01');

    const invalid = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
      headers: { 'x-request-id': 'bad id with spaces' },
    });
    assert.equal(invalid.statusCode, 200);
    assert.notEqual(invalid.headers['x-request-id'], 'bad id with spaces');
    assert.match(String(invalid.headers['x-request-id']), /^[0-9a-f-]{36}$/i);
  } finally {
    await app.close();
  }
});

test('readiness checks PostgreSQL and never exposes dependency diagnostics', async () => {
  let queriedSql = '';
  const app = buildApp({
    database: {
      query: async (sql: string) => {
        queriedSql = sql;
        return { rows: [{ ready: 1 }] };
      },
    },
    logLevel: 'silent',
  });

  try {
    const ready = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });
    assert.equal(ready.statusCode, 200);
    assert.deepEqual(ready.json(), { status: 'ok' });
    assert.equal(queriedSql, 'SELECT 1');
  } finally {
    await app.close();
  }

  const failingApp = buildApp({
    database: {
      query: async () => {
        throw new Error('postgres://private-user:secret@db:5432/private');
      },
    },
    logLevel: 'silent',
  });

  try {
    const notReady = await failingApp.inject({ method: 'GET', url: '/api/v1/health/ready' });
    assert.equal(notReady.statusCode, 503);
    assert.deepEqual(notReady.json(), { status: 'not_ready' });
    assert.equal(notReady.body.includes('secret'), false);
    assert.equal(notReady.body.includes('private-user'), false);
  } finally {
    await failingApp.close();
  }
});

test('readiness fails closed when no database probe is available', async () => {
  const app = buildApp({ database: null, logLevel: 'silent' });

  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { status: 'not_ready' });
  } finally {
    await app.close();
  }
});

test('returns 405 with Allow for undeclared methods on health endpoints', async () => {
  const app = buildApp({ database: null, logLevel: 'silent' });

  try {
    const response = await app.inject({
      method: 'TRACE',
      url: '/api/v1/health/live',
    });

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.allow, 'GET, HEAD');
    assert.equal(response.json().statusCode, 405);

    const queryMethod = await app.inject({
      method: 'QUERY',
      url: '/api/v1/health/ready',
    });
    assert.equal(queryMethod.statusCode, 405);
    assert.equal(queryMethod.headers.allow, 'GET, HEAD');
  } finally {
    await app.close();
  }
});

test('returns 404 for unknown paths without exposing request query values', async () => {
  const app = buildApp({ database: null, logLevel: 'silent' });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/not-a-route?token=must-not-appear',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.includes('must-not-appear'), false);
  } finally {
    await app.close();
  }
});
