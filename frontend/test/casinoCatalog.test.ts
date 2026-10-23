import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCasinoCategories, fetchCasinoDisplayCategories, fetchCasinoProviders } from '../lib/casinoCatalog';

test('lobby curated collections are loaded only from the same-origin public display-category API', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      data: [{
        id: '51abfb02-a08c-4c66-8866-2c22381d34c1',
        slug: 'trending-games',
        name: 'Trending Games',
        description: 'Picked by our team',
        icon: 'trending',
        iconUrl: null,
        displayOrder: 100,
        games: [{
          id: 'ebc75e97-68a5-40f8-8177-65db54ace749',
          slug: 'hot-hot-fruit-habanero',
          title: 'Hot Hot Fruit',
          provider: { code: 'habanero', name: 'Habanero' },
          categories: ['slot-games'],
          imageUrl: 'https://assets.example.test/hot-hot-fruit.webp',
          description: '',
          available: true,
          modes: { demo: false, real: false },
        }],
      }],
      requestId: 'display-categories-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const categories = await fetchCasinoDisplayCategories();
    assert.equal(requestedUrl, '/api/v1/casino/display-categories');
    assert.equal(requestInit?.method, 'GET');
    assert.equal(requestInit?.credentials, 'same-origin');
    assert.equal(requestInit?.cache, 'no-store');
    assert.equal(categories[0]?.name, 'Trending Games');
    assert.equal(categories[0]?.games[0]?.slug, 'hot-hot-fruit-habanero');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('lobby curated collection loader rejects a malformed game entry rather than rendering mock cards', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{
      id: '51abfb02-a08c-4c66-8866-2c22381d34c1',
      slug: 'trending-games',
      name: 'Trending Games',
      description: '',
      icon: 'trending',
      displayOrder: 100,
      games: [{ id: 'not-a-game-row' }],
    }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

  try {
    await assert.rejects(fetchCasinoDisplayCategories(), /invalid curated categories/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('casino category strip is sourced from the same-origin active-catalogue API', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      data: [{ slug: 'slot-games', title: 'Slots', icon: 'cherry' }],
      page: { page: 1, pageSize: 100, total: 1, nextCursor: null },
      meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
      requestId: 'categories-request-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const page = await fetchCasinoCategories();
    assert.equal(requestedUrl, '/api/v1/casino/categories?pageSize=100');
    assert.equal(requestInit?.method, 'GET');
    assert.equal(requestInit?.credentials, 'same-origin');
    assert.equal(requestInit?.cache, 'no-store');
    assert.equal(new Headers(requestInit?.headers).get('accept'), 'application/json');
    assert.deepEqual(page.data, [{ slug: 'slot-games', title: 'Slots', icon: 'cherry' }]);
    assert.equal(page.page.total, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('casino category loader follows all pages and rejects incomplete results', async () => {
  const originalFetch = globalThis.fetch;
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    slug: 'category-' + String(index).padStart(3, '0'),
    title: 'Category ' + index,
    icon: null,
  }));
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === '/api/v1/casino/categories?pageSize=100') {
      return new Response(JSON.stringify({
        data: firstPage,
        page: { page: 1, pageSize: 100, total: 101, nextCursor: 'MTAw' },
        meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(url, '/api/v1/casino/categories?pageSize=100&cursor=MTAw');
    return new Response(JSON.stringify({
      data: [{ slug: 'category-100', title: 'Category 100', icon: null }],
      page: { page: 2, pageSize: 100, total: 101, nextCursor: null },
      meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-23T08:00:00.000Z' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const page = await fetchCasinoCategories();
    assert.deepEqual(requestedUrls, [
      '/api/v1/casino/categories?pageSize=100',
      '/api/v1/casino/categories?pageSize=100&cursor=MTAw',
    ]);
    assert.equal(page.data.length, 101);
    assert.equal(page.page.total, 101);
    assert.equal(page.page.nextCursor, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('casino category loader fails closed when the API pagination is incomplete', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{ slug: 'slot-games', title: 'Slots', icon: 'cherry' }],
    page: { page: 1, pageSize: 100, total: 2, nextCursor: null },
    meta: { resolvedLocale: 'en', stale: false, fetchedAt: null },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

  try {
    await assert.rejects(fetchCasinoCategories(), /category list is incomplete/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

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
    assert.equal(requestInit?.cache, 'no-store');
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
