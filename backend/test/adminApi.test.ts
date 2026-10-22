import assert from 'node:assert/strict';
import test from 'node:test';

import { AdminApiError, getAdminCsrfHeaders, readCookie, requestAdminApi } from '../lib/adminApi.js';

test('admin API requests preserve same-origin cookies and disable cache', async () => {
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ data: { enabled: false } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await requestAdminApi<{ data: { enabled: boolean } }>(
    '/api/v1/admin/bigbang/providers/habanero',
    { method: 'PATCH', body: JSON.stringify({ enabled: false }), headers: { 'X-CSRF-Token': 'csrf-token' } },
    fetcher,
  );

  assert.equal(requestedUrl, '/api/v1/admin/bigbang/providers/habanero');
  assert.equal(requestInit?.credentials, 'same-origin');
  assert.equal(requestInit?.cache, 'no-store');
  assert.equal(new Headers(requestInit?.headers).get('accept'), 'application/json');
  assert.equal(new Headers(requestInit?.headers).get('content-type'), 'application/json');
  assert.equal(new Headers(requestInit?.headers).get('x-csrf-token'), 'csrf-token');
  assert.deepEqual(result, { data: { enabled: false } });
});

test('admin API exposes structured authorization errors to the UI', async () => {
  const fetcher = (async () => new Response(JSON.stringify({
    error: { code: 'CSRF_INVALID', message: 'CSRF validation failed' },
    requestId: 'request-1',
  }), { status: 403, headers: { 'content-type': 'application/json' } })) as typeof fetch;

  await assert.rejects(
    requestAdminApi('/api/v1/admin/bigbang/providers/habanero', { method: 'PATCH' }, fetcher),
    (error: unknown) => {
      assert.ok(error instanceof AdminApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, 'CSRF_INVALID');
      assert.equal(error.message, 'CSRF validation failed');
      return true;
    },
  );
});

test('admin API handles no-content logout responses', async () => {
  const fetcher = (async () => new Response(null, { status: 204 })) as typeof fetch;
  const result = await requestAdminApi<void>('/api/v1/admin/auth/logout', { method: 'POST' }, fetcher);
  assert.equal(result, undefined);
});

test('CSRF cookie reader handles multiple cookies and safely decodes values', () => {
  assert.equal(readCookie('__Host-bclick_admin_csrf', 'other=1; __Host-bclick_admin_csrf=csrf%2Btoken; final=3'), 'csrf+token');
  assert.equal(readCookie('__Host-bclick_admin_csrf', 'other=1; final=3'), null);
  assert.throws(() => getAdminCsrfHeaders('__Host-missing-cookie'), /CSRF cookie is unavailable/);
});
