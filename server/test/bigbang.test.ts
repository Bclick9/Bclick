import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

import { buildApp } from '../src/app.js';
import { BigBangApiClient } from '../src/bigbang/client.js';
import { BigBangCatalogService, CatalogSyncFault } from '../src/bigbang/catalog.js';
import { PgIdentityRepository } from '../src/identity/repository.js';
import { BigBangApiError, type BigBangGame } from '../src/bigbang/types.js';
import { resolveSandboxLocalDatabaseUrl } from '../src/bigbang/local-database.js';

type RawGame = Record<string, unknown>;
type FixtureEnvelope = {
  success: boolean;
  data: RawGame[];
  pagination: { total: number; limit: number; offset: number };
};

const fixturePath = fileURLToPath(new URL('./fixtures/bigbang-games-page-1.json', import.meta.url));
const documentedFixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureEnvelope;
const SANDBOX_KEY = 'ek_test_catalogue_test_key';

function jsonResponse(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function responseFor(data: RawGame[], total: number, limit: number, offset: number): FixtureEnvelope {
  return { success: true, data, pagination: { total, limit, offset } };
}

function fetchStub(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    return handler(new URL(String(input)), init);
  }) as typeof fetch;
}

function documentedGame(overrides: Record<string, unknown> = {}): RawGame {
  return { ...documentedFixture.data[0], ...overrides };
}

function expectCode(code: string) {
  return (error: unknown): boolean => error instanceof BigBangApiError && error.code === code;
}

test('BigBang client accepts the published standard-game envelope and sends only a sandbox server key', async () => {
  assert.equal(documentedFixture.success, true);
  assert.equal(documentedFixture.data.length, 1);
  assert.equal(documentedFixture.pagination.total, documentedFixture.data.length);

  let receivedUrl: URL | null = null;
  let receivedKey: string | undefined;
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub((url, init) => {
      receivedUrl = url;
      receivedKey = (init?.headers as Record<string, string>)['X-API-Key'];
      return jsonResponse(documentedFixture);
    }),
  });

  const snapshot = await client.listAllStandardGames();
  assert.equal(snapshot.totalReported, 1);
  assert.equal(snapshot.games.length, 1);
  assert.equal(snapshot.games[0]?.id, 4821);
  assert.equal(snapshot.games[0]?.name, 'SGHotHotFruit');
  assert.equal(snapshot.games[0]?.gameType, 'slot');
  assert.equal(snapshot.games[0]?.thumbnail?.startsWith('https://bigbangcasino.bet/'), true);
  assert.ok(receivedUrl);
  assert.equal(receivedUrl.pathname, '/api/v1/games');
  assert.equal(receivedUrl.searchParams.get('type'), 'standard');
  assert.equal(receivedUrl.searchParams.get('limit'), '5000');
  assert.equal(receivedUrl.searchParams.get('offset'), '0');
  assert.equal(receivedKey, SANDBOX_KEY);
});

test('BigBang client accepts canonical decimal strings in provider pagination metadata', async () => {
  const payload = {
    ...documentedFixture,
    pagination: { total: 1, limit: '5000', offset: '0' },
  };
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub(() => jsonResponse(payload)),
  });

  const snapshot = await client.listAllStandardGames();
  assert.equal(snapshot.totalReported, 1);
  assert.equal(snapshot.games.length, 1);
  assert.equal(snapshot.games[0]?.id, 4821);
});

test('BigBang client rejects non-canonical string pagination integers', async () => {
  const cases = [
    { label: 'exponent notation', pagination: { total: 1, limit: '5e3', offset: '0' } },
    { label: 'whitespace', pagination: { total: 1, limit: '5000', offset: ' 0' } },
    { label: 'fractional text', pagination: { total: '1.0', limit: '5000', offset: '0' } },
    { label: 'leading zero', pagination: { total: 1, limit: '05000', offset: '0' } },
  ];

  for (const item of cases) {
    const client = new BigBangApiClient({
      apiKey: SANDBOX_KEY,
      fetcher: fetchStub(() => jsonResponse({
        ...documentedFixture,
        pagination: item.pagination,
      })),
    });
    await assert.rejects(
      () => client.listAllStandardGames(),
      expectCode('BIGBANG_PAGINATION_INVALID'),
      item.label,
    );
  }
});

test('BigBang client refuses a live key before any network request', () => {
  assert.throws(
    () => new BigBangApiClient({ apiKey: 'ek_live_not_for_phase6' }),
    /requires a BigBang sandbox key/,
  );
});

test('sandbox local database URL derives from local Postgres settings and rejects remote database URLs', () => {
  const derived = resolveSandboxLocalDatabaseUrl({
    POSTGRES_USER: 'bclick_dev',
    POSTGRES_PASSWORD: 'local_only_change_me',
    POSTGRES_DB: 'bclick',
    POSTGRES_PORT: '5432',
  });
  assert.equal(derived, 'postgresql://bclick_dev:local_only_change_me@127.0.0.1:5432/bclick');

  assert.equal(
    resolveSandboxLocalDatabaseUrl({ DATABASE_URL: 'postgresql://user:pw@localhost:5432/bclick' }),
    'postgresql://user:pw@localhost:5432/bclick',
  );
  assert.throws(
    () => resolveSandboxLocalDatabaseUrl({ DATABASE_URL: 'postgresql://user:pw@ep-example.neon.tech/neondb' }),
    /only loopback PostgreSQL/,
  );
  assert.throws(
    () => resolveSandboxLocalDatabaseUrl({ POSTGRES_USER: 'bclick_dev', POSTGRES_DB: 'bclick' }),
    /POSTGRES_PASSWORD/,
  );
  assert.throws(
    () => resolveSandboxLocalDatabaseUrl({
      POSTGRES_PASSWORD: 'local_only_change_me',
      POSTGRES_PORT: '70000',
    }),
    /between 1 and 65535/,
  );
});

test('BigBang client follows every offset page and returns only a complete snapshot', async () => {
  const firstGame = documentedGame();
  const secondGame = documentedGame({
    id: 99001,
    name: 'SyntheticSecondGame',
    title: 'Synthetic Second Game',
    provider: 'Test Provider',
    game_type: 'crash',
  });
  const requestedOffsets: number[] = [];
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    pageLimit: 1,
    fetcher: fetchStub((url) => {
      const offset = Number(url.searchParams.get('offset'));
      requestedOffsets.push(offset);
      return jsonResponse(responseFor([offset === 0 ? firstGame : secondGame], 2, 1, offset));
    }),
  });

  const snapshot = await client.listAllStandardGames();
  assert.deepEqual(requestedOffsets, [0, 1]);
  assert.deepEqual(snapshot.games.map((game) => game.id), [4821, 99001]);
  assert.equal(snapshot.totalReported, 2);
});

test('BigBang client rejects incomplete required fields and unknown game types', async () => {
  const cases = [
    { label: 'missing numeric id', overrides: { id: undefined } },
    { label: 'missing launch name', overrides: { name: '' } },
    { label: 'missing category', overrides: { category: '' } },
    { label: 'unknown game type', overrides: { game_type: 'roulette' } },
  ];

  for (const item of cases) {
    const client = new BigBangApiClient({
      apiKey: SANDBOX_KEY,
      fetcher: fetchStub(() => jsonResponse(responseFor([documentedGame(item.overrides)], 1, 5000, 0))),
    });
    await assert.rejects(
      () => client.listAllStandardGames(),
      (error: unknown) => error instanceof BigBangApiError && error.code === 'BIGBANG_SCHEMA_INVALID',
      item.label,
    );
  }
});

test('BigBang client fails closed when the reported catalogue total changes between pages', async () => {
  const firstGame = documentedGame();
  const secondGame = documentedGame({ id: 99002, name: 'SyntheticChangingTotal', title: 'Synthetic Changing Total' });
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    pageLimit: 1,
    fetcher: fetchStub((url) => {
      const offset = Number(url.searchParams.get('offset'));
      return offset === 0
        ? jsonResponse(responseFor([firstGame], 2, 1, 0))
        : jsonResponse(responseFor([secondGame], 3, 1, 1));
    }),
  });
  await assert.rejects(() => client.listAllStandardGames(), expectCode('BIGBANG_CATALOG_CHANGED'));
});

test('BigBang client rejects non-JSON, malformed JSON and oversized responses without retrying them', async () => {
  const cases: Array<{ code: string; response: Response }> = [
    {
      code: 'BIGBANG_CONTENT_TYPE_INVALID',
      response: new Response('<html>not JSON</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    },
    {
      code: 'BIGBANG_JSON_INVALID',
      response: new Response('{broken', { status: 200, headers: { 'content-type': 'application/json' } }),
    },
    {
      code: 'BIGBANG_RESPONSE_TOO_LARGE',
      response: new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': String(20 * 1024 * 1024 + 1),
        },
      }),
    },
  ];

  for (const item of cases) {
    let attempts = 0;
    const client = new BigBangApiClient({
      apiKey: SANDBOX_KEY,
      fetcher: fetchStub(() => {
        attempts += 1;
        return item.response;
      }),
    });
    await assert.rejects(() => client.listAllStandardGames(), expectCode(item.code));
    assert.equal(attempts, 1, item.code + ' must not be retried');
  }
});

test('BigBang client rejects inconsistent page limits instead of trusting provider pagination', async () => {
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    pageLimit: 1,
    fetcher: fetchStub(() => jsonResponse(responseFor([documentedGame()], 1, 5, 0))),
  });
  await assert.rejects(() => client.listAllStandardGames(), expectCode('BIGBANG_PAGINATION_INVALID'));
});

test('BigBang client rejects duplicate identifiers across pages', async () => {
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    pageLimit: 1,
    fetcher: fetchStub((url) => {
      const offset = Number(url.searchParams.get('offset'));
      return jsonResponse(responseFor([documentedGame()], 2, 1, offset));
    }),
  });
  await assert.rejects(() => client.listAllStandardGames(), expectCode('BIGBANG_DUPLICATE_GAME_ID'));
});

test('BigBang client fails closed if a later page is empty before the reported total is reached', async () => {
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    pageLimit: 1,
    fetcher: fetchStub((url) => {
      const offset = Number(url.searchParams.get('offset'));
      return jsonResponse(responseFor(offset === 0 ? [documentedGame()] : [], 2, 1, offset));
    }),
  });
  await assert.rejects(() => client.listAllStandardGames(), expectCode('BIGBANG_PAGINATION_INCOMPLETE'));
});

test('BigBang client rejects premium content even when a provider response is otherwise schema-valid', async () => {
  const premium = documentedGame({ mode: 'premium', is_premium: true });
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub(() => jsonResponse(responseFor([premium], 1, 5000, 0))),
  });
  await assert.rejects(() => client.listAllStandardGames(), expectCode('BIGBANG_SANDBOX_TIER_VIOLATION'));
});

test('BigBang client bounds retries for transient HTTP responses', async () => {
  let attempts = 0;
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub(() => {
      attempts += 1;
      if (attempts < 3) return jsonResponse({ error: 'temporarily unavailable' }, 429, { 'retry-after': '0' });
      return jsonResponse(documentedFixture);
    }),
  });
  const snapshot = await client.listAllStandardGames();
  assert.equal(attempts, 3);
  assert.equal(snapshot.games.length, 1);
});

function normalizedGame(overrides: Partial<BigBangGame>): BigBangGame {
  return {
    id: 4821,
    name: 'SGHotHotFruit',
    title: 'Hot Hot Fruit',
    provider: 'Habanero',
    category: 'Habanero',
    categoryTitle: 'Habanero',
    thumbnail: null,
    mode: 'standard',
    isPremium: false,
    gameType: 'slot',
    isDemo: false,
    ...overrides,
  };
}

test('Phase 6 sandbox catalogue sync is idempotent, browse routes are local-only, and failures preserve last-good data', {
  timeout: 180_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl, max: 8, application_name: 'bclick-bigbang-catalog-test' });
  const repository = new PgIdentityRepository(pool);
  const app = buildApp({ database: pool, catalogDatabase: repository, logLevel: 'silent' });

  const games: BigBangGame[] = [
    normalizedGame({ id: 4821, title: 'Hot Hot Fruit', name: 'SGHotHotFruit', provider: 'Habanero' }),
    normalizedGame({
      id: 4822,
      title: 'Lightning Roulette',
      name: 'LightningRoulette',
      provider: 'Evolution',
      category: 'Live',
      categoryTitle: 'Live Casino',
      gameType: 'live',
    }),
  ];
  const slugCollisionGames: BigBangGame[] = [
    normalizedGame({ id: 4823, name: 'TwinGameOne', title: 'Twin Game', provider: 'Twin Provider' }),
    normalizedGame({ id: 4824, name: 'TwinGameTwo', title: 'Twin Game', provider: 'Twin Provider' }),
  ];
  const providerCollisionGames: BigBangGame[] = [
    normalizedGame({ id: 4825, name: 'ProviderCollisionOne', title: 'Provider Collision One', provider: 'Same Provider' }),
    normalizedGame({ id: 4826, name: 'ProviderCollisionTwo', title: 'Provider Collision Two', provider: 'same-provider' }),
  ];
  let scenario: 'success' | 'offline' | 'empty' | 'slug-collision' | 'provider-collision' = 'success';
  let providerCalls = 0;
  const fakeClient = {
    async listAllStandardGames() {
      providerCalls += 1;
      if (scenario === 'offline') {
        throw new BigBangApiError('TEST_PROVIDER_OFFLINE', 'Synthetic provider outage used by a local regression test');
      }
      if (scenario === 'empty') return { games: [], totalReported: 0 };
      if (scenario === 'slug-collision') return { games: slugCollisionGames, totalReported: slugCollisionGames.length };
      if (scenario === 'provider-collision') return { games: providerCollisionGames, totalReported: providerCollisionGames.length };
      return { games, totalReported: games.length };
    },
  } as unknown as BigBangApiClient;
  const service = new BigBangCatalogService(repository, fakeClient);

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });
    const migrationCount = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM pgmigrations');
    assert.equal(migrationCount.rows[0]?.count, '9', 'Migration 007 must be applied after the existing migration chain');

    const first = await service.sync();
    assert.equal(first.createdCount, 2);
    assert.equal(first.updatedCount, 0);
    assert.equal(first.receivedCount, 2);

    const second = await service.sync();
    assert.equal(second.createdCount, 0);
    assert.equal(second.updatedCount, 2);

    const stored = await pool.query<{ games: string; sources: string }>(
      "SELECT (SELECT count(*)::text FROM public.casino_games) AS games, (SELECT count(*)::text FROM public.casino_game_sources WHERE source_code='bigbang') AS sources",
    );
    assert.deepEqual(stored.rows[0], { games: '2', sources: '2' });

    const firstPage = await app.inject({ method: 'GET', url: '/api/v1/casino/games?pageSize=1' });
    assert.equal(firstPage.statusCode, 200, firstPage.body);
    assert.equal(firstPage.json().data.length, 1);
    assert.equal(firstPage.json().page.total, 2);
    assert.ok(firstPage.json().page.nextCursor);
    assert.equal(firstPage.json().data[0].modes.demo, false);
    assert.equal(firstPage.json().data[0].modes.real, false);

    const cursor = encodeURIComponent(String(firstPage.json().page.nextCursor));
    const nextPage = await app.inject({ method: 'GET', url: '/api/v1/casino/games?pageSize=1&cursor=' + cursor });
    assert.equal(nextPage.statusCode, 200, nextPage.body);
    assert.equal(nextPage.json().data.length, 1);
    assert.notEqual(firstPage.json().data[0].id, nextPage.json().data[0].id);

    const search = await app.inject({ method: 'GET', url: '/api/v1/casino/games?query=Fruit' });
    assert.equal(search.statusCode, 200, search.body);
    assert.equal(search.json().data.length, 1);
    assert.equal(search.json().data[0].title, 'Hot Hot Fruit');

    const escapedSearch = await app.inject({ method: 'GET', url: '/api/v1/casino/games?query=%25' });
    assert.equal(escapedSearch.statusCode, 200, escapedSearch.body);

    const categories = await app.inject({ method: 'GET', url: '/api/v1/casino/categories' });
    assert.equal(categories.statusCode, 200, categories.body);
    assert.deepEqual(categories.json().data.map((item: { slug: string }) => item.slug), ['live-casino', 'slot-games']);
    assert.equal(categories.json().meta.resolvedLocale, 'en');

    const providers = await app.inject({ method: 'GET', url: '/api/v1/casino/providers' });
    assert.equal(providers.statusCode, 200, providers.body);
    assert.deepEqual(providers.json().data.map((item: { code: string }) => item.code), ['evolution', 'habanero']);

    const slug = String(firstPage.json().data[0].slug);
    const detailBySlug = await app.inject({ method: 'GET', url: '/api/v1/casino/games/by-slug/' + slug });
    assert.equal(detailBySlug.statusCode, 200, detailBySlug.body);
    assert.equal(detailBySlug.json().data.slug, slug);
    const detailById = await app.inject({ method: 'GET', url: '/api/v1/casino/games/' + detailBySlug.json().data.id });
    assert.equal(detailById.statusCode, 200, detailById.body);

    const demoGames = await app.inject({ method: 'GET', url: '/api/v1/casino/games?mode=demo' });
    assert.equal(demoGames.statusCode, 200, demoGames.body);
    assert.equal(demoGames.json().data.length, 0, 'catalogue-only phase must not enable launch modes');
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/casino/games?pageSize=0' })).statusCode, 400);
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/casino/games/by-slug/Bad%20Slug' })).statusCode, 400);
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/casino/games?cursor=not-valid' })).statusCode, 400);

    const callsBeforeBrowse = providerCalls;
    await app.inject({ method: 'GET', url: '/api/v1/casino/games' });
    await app.inject({ method: 'GET', url: '/api/v1/casino/categories' });
    await app.inject({ method: 'GET', url: '/api/v1/casino/providers' });
    assert.equal(providerCalls, callsBeforeBrowse, 'browse/search/filter routes must never call a provider');

    scenario = 'offline';
    await assert.rejects(
      () => service.sync(),
      (error: unknown) => error instanceof BigBangApiError && error.code === 'TEST_PROVIDER_OFFLINE',
    );
    const failedRun = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM public.casino_catalog_sync_runs WHERE status='failed' AND error_code='TEST_PROVIDER_OFFLINE'",
    );
    assert.equal(failedRun.rows[0]?.count, '1');
    const afterOutage = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.casino_games WHERE available=true');
    assert.equal(afterOutage.rows[0]?.count, '2', 'provider outage must preserve the last-good catalogue');

    scenario = 'empty';
    await assert.rejects(
      () => service.sync(),
      (error: unknown) => error instanceof CatalogSyncFault && error.code === 'BIGBANG_EMPTY_CATALOG_REJECTED',
    );
    const afterEmpty = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.casino_games WHERE available=true');
    assert.equal(afterEmpty.rows[0]?.count, '2', 'unexpected empty catalogue must not unpublish last-good data');

    scenario = 'slug-collision';
    const slugCollisionResult = await service.sync();
    assert.equal(slugCollisionResult.createdCount, 2);
    const slugCollisionRows = await pool.query<{ external_game_id: string; game_slug: string }>(
      `SELECT s.external_game_id::text AS external_game_id, g.game_slug
         FROM public.casino_game_sources s
         JOIN public.casino_games g ON g.id=s.game_id
        WHERE s.source_code='bigbang' AND s.external_game_id = ANY($1::bigint[])
        ORDER BY s.external_game_id`,
      [[4823, 4824]],
    );
    assert.deepEqual(slugCollisionRows.rows, [
      { external_game_id: '4823', game_slug: 'twin-game-twin-provider' },
      { external_game_id: '4824', game_slug: 'twin-game-twin-provider-bb-4824' },
    ]);

    scenario = 'provider-collision';
    await assert.rejects(
      () => service.sync(),
      (error: unknown) => error instanceof CatalogSyncFault && error.code === 'BIGBANG_PROVIDER_CODE_COLLISION',
    );
    const failedProviderCollision = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.casino_catalog_sync_runs
        WHERE status='failed' AND error_code='BIGBANG_PROVIDER_CODE_COLLISION'`,
    );
    assert.equal(failedProviderCollision.rows[0]?.count, '1');
    const afterProviderCollision = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.casino_games WHERE available=true',
    );
    assert.equal(afterProviderCollision.rows[0]?.count, '2', 'provider normalization collisions must not publish partial changes');
  } finally {
    await app.close();
    await pool.end();
    await container.stop();
  }
});
