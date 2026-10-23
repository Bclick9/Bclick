import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCasinoProviders } from '../lib/casinoCatalog';

test('provider directory reads only the same-origin active-catalogue API', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      data: [{ code: 'habanero', name: 'Habanero' }],
      page: { page: 1, pageSize: 100, total: 1, nextCursor: null },
      meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
      requestId: 'catalogue-request-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const page = await fetchCasinoProviders();
    assert.equal(requestedUrl, '/api/v1/casino/providers?pageSize=100');
    assert.equal(requestInit?.method, 'GET');
    assert.equal(requestInit?.credentials, 'same-origin');
    assert.equal(new Headers(requestInit?.headers).get('accept'), 'application/json');
    assert.deepEqual(page.data, [{ code: 'habanero', name: 'Habanero' }]);
    assert.equal(page.page.total, 1);
    assert.equal(page.meta.stale, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider directory rejects API payloads that cannot be trusted', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{ code: 'habanero' }],
    page: { page: 1, pageSize: 100, total: 1, nextCursor: null },
    meta: { resolvedLocale: 'en', stale: false, fetchedAt: null },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

  try {
    await assert.rejects(fetchCasinoProviders(), /invalid providers response/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider directory follows pagination and rejects partial/duplicate lists', async () => {
  const originalFetch = globalThis.fetch;
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    code: 'provider-' + String(index).padStart(3, '0'),
    name: 'Provider ' + index,
  }));
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === '/api/v1/casino/providers?pageSize=100') {
      return new Response(JSON.stringify({
        data: firstPage,
        page: { page: 1, pageSize: 100, total: 101, nextCursor: 'MTAw' },
        meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(url, '/api/v1/casino/providers?pageSize=100&cursor=MTAw');
    return new Response(JSON.stringify({
      data: [{ code: 'provider-100', name: 'Provider 100' }],
      page: { page: 2, pageSize: 100, total: 101, nextCursor: null },
      meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const page = await fetchCasinoProviders();
    assert.deepEqual(requestedUrls, [
      '/api/v1/casino/providers?pageSize=100',
      '/api/v1/casino/providers?pageSize=100&cursor=MTAw',
    ]);
    assert.equal(page.data.length, 101);
    assert.equal(page.page.total, 101);
    assert.equal(page.page.nextCursor, null);
    assert.equal(page.data[100]?.code, 'provider-100');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider directory fails closed when the API pagination is incomplete', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{ code: 'habanero', name: 'Habanero' }],
    page: { page: 1, pageSize: 100, total: 2, nextCursor: null },
    meta: { resolvedLocale: 'en', stale: false, fetchedAt: null },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

  try {
    await assert.rejects(fetchCasinoProviders(), /provider list is incomplete/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
