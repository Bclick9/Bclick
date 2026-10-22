import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { BigBangApiClient } from '../src/bigbang/client.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';
const PLAYER_ORIGIN = 'http://localhost:5173';
const SANDBOX_KEY = 'ek_test_demo_launch_test_key';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function testIdentityConfig() {
  return {
    nodeEnv: 'development' as const,
    sessionHashKey: 'a'.repeat(64),
    csrfSigningKey: 'b'.repeat(64),
    totpEncryptionKey: 'c'.repeat(64),
    playerOrigins: [PLAYER_ORIGIN],
    adminOrigins: ['http://localhost:5174'],
    mailSinkPath: '.local-mail-sink.jsonl',
    termsVersion: 'test-terms-v1',
    agePolicyVersion: 'test-age-v1',
  };
}

function databaseFor(source?: Record<string, unknown>) {
  let queryCount = 0;
  const database = {
    query: async () => {
      queryCount += 1;
      return { rows: source ? [source] : [], rowCount: source ? 1 : 0 };
    },
  } as unknown as SqlExecutor;
  return { database, get queryCount() { return queryCount; } };
}

function sandboxClient(onRequest: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  return new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      return onRequest(new URL(String(input)), init);
    }) as typeof fetch,
  });
}

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    external_game_id: '4821',
    source_mode: 'standard',
    is_premium: false,
    source_available: true,
    game_available: true,
    provider_bclick_enabled: true,
    game_bclick_enabled: true,
    ...overrides,
  };
}

test('sandbox demo route launches only the selected Standard catalogue game', async () => {
  let requestedUrl: URL | null = null;
  let receivedKey = '';
  let receivedPayload: Record<string, unknown> | null = null;
  const source = databaseFor(sourceRow());
  const client = sandboxClient((url, init) => {
    requestedUrl = url;
    receivedKey = (init?.headers as Record<string, string>)['X-API-Key'];
    receivedPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return jsonResponse({
      success: true,
      demo: true,
      game_id: 4821,
      game_name: 'Hot Hot Fruit',
      game_url: 'https://bigbangcasino.bet/demo/launch/Habanero/SGHotHotFruit?currency=EUR',
    });
  });
  const app = buildApp({
    database: null,
    catalogDatabase: source.database,
    identityConfig: testIdentityConfig(),
    sandboxDemoClient: client,
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/casino/games/' + GAME_ID + '/demo-launch',
      headers: { origin: PLAYER_ORIGIN },
      payload: { language: 'en' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.demo, true);
    assert.equal(response.json().data.gameName, 'Hot Hot Fruit');
    assert.equal(response.json().data.gameUrl.startsWith('https://bigbangcasino.bet/demo/launch/'), true);
    assert.ok(requestedUrl);
    assert.equal(requestedUrl.pathname, '/api/v1/games/launch');
    assert.equal(receivedKey, SANDBOX_KEY);
    assert.deepEqual(receivedPayload, { game_id: 4821, demo: true, language: 'en' });
  } finally {
    await app.close();
  }
});

test('sandbox demo route rejects unapproved Origins before database/provider access', async () => {
  const source = databaseFor(sourceRow());
  let providerCalls = 0;
  const client = sandboxClient(() => {
    providerCalls += 1;
    return jsonResponse({
      success: true,
      demo: true,
      game_id: 4821,
      game_name: 'Hot Hot Fruit',
      game_url: 'https://bigbangcasino.bet/demo/launch/Habanero/SGHotHotFruit?currency=EUR',
    });
  });
  const app = buildApp({
    database: null,
    catalogDatabase: source.database,
    identityConfig: testIdentityConfig(),
    sandboxDemoClient: client,
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/casino/games/' + GAME_ID + '/demo-launch',
      headers: { origin: 'http://evil.example' },
      payload: { language: 'en' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'ORIGIN_INVALID');
    assert.equal(source.queryCount, 0);
    assert.equal(providerCalls, 0);
  } finally {
    await app.close();
  }
});

test('sandbox demo route refuses Premium or unavailable games', async () => {
  for (const item of [
    { label: 'premium', source: sourceRow({ source_mode: 'premium', is_premium: true }) },
    { label: 'unavailable source', source: sourceRow({ source_available: false }) },
    { label: 'unavailable game', source: sourceRow({ game_available: false }) },
    { label: 'disabled provider in Bclick', source: sourceRow({ provider_bclick_enabled: false }) },
    { label: 'disabled game in Bclick', source: sourceRow({ game_bclick_enabled: false }) },
  ]) {
    let providerCalls = 0;
    const source = databaseFor(item.source);
    const app = buildApp({
      database: null,
      catalogDatabase: source.database,
      identityConfig: testIdentityConfig(),
      sandboxDemoClient: sandboxClient(() => {
        providerCalls += 1;
        return jsonResponse({
          success: true,
          demo: true,
          game_id: 4821,
          game_name: 'Hot Hot Fruit',
          game_url: 'https://bigbangcasino.bet/demo/launch/Habanero/SGHotHotFruit?currency=EUR',
        });
      }),
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/casino/games/' + GAME_ID + '/demo-launch',
        headers: { origin: PLAYER_ORIGIN },
        payload: { language: 'en' },
      });
      assert.equal(response.statusCode, item.label === 'premium' ? 403 : 404);
      assert.equal(providerCalls, 0);
    } finally {
      await app.close();
    }
  }
});
