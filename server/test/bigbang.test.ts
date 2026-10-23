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

test('BigBang client launches demo with a sandbox key only and validates the provider URL', async () => {
  let requestedUrl: URL | null = null;
  let receivedKey: string | undefined;
  let requestBody: Record<string, unknown> | null = null;
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub((url, init) => {
      requestedUrl = url;
      receivedKey = (init?.headers as Record<string, string>)['X-API-Key'];
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return jsonResponse({
        success: true,
        demo: true,
        game_id: 4821,
        game_name: 'Hot Hot Fruit',
        game_url: 'https://bigbangcasino.bet/demo/launch/Habanero/SGHotHotFruit?currency=EUR',
      });
    }),
  });

  const launch = await client.launchDemoGame(4821, 'en');
  assert.ok(requestedUrl);
  assert.equal(requestedUrl.pathname, '/api/v1/games/launch');
  assert.equal(receivedKey, SANDBOX_KEY);
  assert.deepEqual(requestBody, { game_id: 4821, demo: true, language: 'en' });
  assert.equal(launch.gameId, 4821);
  assert.equal(launch.gameName, 'Hot Hot Fruit');
  assert.equal(launch.gameUrl.startsWith('https://bigbangcasino.bet/demo/launch/'), true);
});

test('BigBang client refuses unsafe demo launch URLs and never downgrades to HTTP', async () => {
  const client = new BigBangApiClient({
    apiKey: SANDBOX_KEY,
    fetcher: fetchStub(() => jsonResponse({
      success: true,
      demo: true,
      game_id: 4821,
      game_name: 'Hot Hot Fruit',
      game_url: 'https://evil.example/collect',
    })),
  });
  await assert.rejects(
    () => client.launchDemoGame(4821),
    expectCode('BIGBANG_LAUNCH_URL_INVALID'),
  );
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

  let games: BigBangGame[] = [
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
  // Deliberately reverse numeric ID order: first-time slug assignment must not depend on provider ordering.
  const slugCollisionGames: BigBangGame[] = [
    normalizedGame({ id: 4824, name: 'TwinGameTwo', title: 'Twin Game', provider: 'Twin Provider' }),
    normalizedGame({ id: 4823, name: 'TwinGameOne', title: 'Twin Game', provider: 'Twin Provider' }),
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
    assert.equal(migrationCount.rows[0]?.count, '17', 'The full migration chain through Migration 015 must apply in order');
    const retiredAliases = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.casino_game_legacy_slug_aliases');
    assert.equal(retiredAliases.rows[0]?.count, '0', 'Migration 014 must retire legacy storefront aliases');
    const displayCategoryTables = await pool.query<{ categories: string | null; assignments: string | null }>(`
      SELECT to_regclass('public.casino_display_categories')::text AS categories,
             to_regclass('public.casino_game_display_categories')::text AS assignments
    `);
    assert.deepEqual(displayCategoryTables.rows[0], {
      categories: 'casino_display_categories',
      assignments: 'casino_game_display_categories',
    }, 'Migration 015 must create separate Bclick-managed categories and UUID assignments');


    const controlSchema = await pool.query<{ provider_enabled: string | null; game_enabled: string | null; tier: string | null; permission_links: string }>(`
      SELECT
        (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_providers' AND column_name='bclick_enabled') AS provider_enabled,
        (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_games' AND column_name='bclick_enabled') AS game_enabled,
        (SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang') AS tier,
        (SELECT count(*)::text FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id JOIN public.permissions p ON p.id=rp.permission_id WHERE r.code='project-admin' AND p.code='casino.provider-settings.manage') AS permission_links
    `);
    assert.deepEqual(controlSchema.rows[0], {
      provider_enabled: 'bclick_enabled', game_enabled: 'bclick_enabled', tier: 'standard', permission_links: '1',
    });

    const skinGamesSchema = await pool.query<{ presentation_table: string | null; tier_settings_table: string | null; order_actor_column: string | null; custom_image_column: string | null; title_override_column: string | null }>(`
      SELECT
        to_regclass('public.casino_game_presentation')::text AS presentation_table,
        to_regclass('public.casino_provider_tier_settings')::text AS tier_settings_table,
        (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_game_presentation' AND column_name='order_updated_by') AS order_actor_column,
        (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_game_presentation' AND column_name='custom_image_key') AS custom_image_column,
        (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='casino_game_presentation' AND column_name='title_override') AS title_override_column
    `);
    assert.deepEqual(skinGamesSchema.rows[0], {
      presentation_table: 'casino_game_presentation',
      tier_settings_table: 'casino_provider_tier_settings',
      order_actor_column: 'order_updated_by',
      custom_image_column: 'custom_image_key',
      title_override_column: 'title_override',
    });

    const first = await service.sync();
    assert.equal(first.createdCount, 2);
    assert.equal(first.updatedCount, 0);
    assert.equal(first.receivedCount, 2);

    // New catalogue rows are opt-in after Migration 011; only an explicit admin approval
    // should make newly discovered providers/games visible. Enable the synthetic fixture
    // rows here to exercise the established browse/legacy-route behavior below.
    const newRowsHidden = await app.inject({ method: 'GET', url: '/api/v1/casino/games' });
    assert.equal(newRowsHidden.statusCode, 200, newRowsHidden.body);
    assert.equal(newRowsHidden.json().page.total, 0, 'newly synced rows default to hidden until Bclick enables them');
    await pool.query('UPDATE public.casino_providers SET bclick_enabled=true');
    await pool.query('UPDATE public.casino_games SET bclick_enabled=true');

    // The public browse API must honor the order managed in CMS → Skin Games,
    // not revert to alphabetical order. Put Lightning Roulette before Hot Hot Fruit.
    await pool.query(`
      UPDATE public.casino_game_presentation pres
         SET display_order=CASE s.external_game_id WHEN 4822 THEN 100 WHEN 4821 THEN 200 END
        FROM public.casino_game_sources s
       WHERE s.game_id=pres.game_id AND s.source_code='bigbang' AND s.source_mode='standard'
         AND s.external_game_id IN (4821,4822)
    `);
    const persistedOrder = await app.inject({ method: 'GET', url: '/api/v1/casino/games' });
    assert.equal(persistedOrder.statusCode, 200, persistedOrder.body);
    assert.deepEqual(persistedOrder.json().data.map((item: { title: string }) => item.title), ['Lightning Roulette', 'Hot Hot Fruit']);

    const canonicalRoute = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/lightning-roulette-evolution',
    });
    assert.equal(canonicalRoute.statusCode, 200, canonicalRoute.body);
    assert.match(canonicalRoute.json().data.id, /^[0-9a-f-]{36}$/i);
    assert.equal(canonicalRoute.json().data.slug, 'lightning-roulette-evolution');
    assert.equal(canonicalRoute.json().data.title, 'Lightning Roulette');

    const retiredRoute = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/lightning-roulette',
    });
    assert.equal(retiredRoute.statusCode, 404, retiredRoute.body);
    assert.equal(retiredRoute.json().error.code, 'NOT_FOUND');

    const second = await service.sync();
    assert.equal(second.createdCount, 0);
    assert.equal(second.updatedCount, 2);

    const stored = await pool.query<{ games: string; sources: string }>(
      "SELECT (SELECT count(*)::text FROM public.casino_games) AS games, (SELECT count(*)::text FROM public.casino_game_sources WHERE source_code='bigbang') AS sources",
    );
    assert.deepEqual(stored.rows[0], { games: '2', sources: '2' });

    const categoryEvidence = await pool.query<{
      external_game_id: string;
      source_category: string | null;
      source_category_title: string | null;
      game_type: string;
      categories: string[];
    }>(`
      SELECT s.external_game_id::text AS external_game_id,
             s.source_category,s.source_category_title,s.game_type,
             ARRAY(
               SELECT gc.category_slug
                 FROM public.casino_game_categories gc
                WHERE gc.game_id=s.game_id
                ORDER BY gc.category_slug
             ) AS categories
        FROM public.casino_game_sources s
       WHERE s.source_code='bigbang'
       ORDER BY s.external_game_id
    `);
    assert.deepEqual(categoryEvidence.rows, [
      {
        external_game_id: '4821',
        source_category: 'Habanero',
        source_category_title: 'Habanero',
        game_type: 'slot',
        categories: ['slot-games'],
      },
      {
        external_game_id: '4822',
        source_category: 'Live',
        source_category_title: 'Live Casino',
        game_type: 'live',
        categories: ['live-casino'],
      },
    ], 'provider category fields must remain source metadata, separate from Bclick categories[]');

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

    // Bclick-owned controls must suppress public listings/details immediately, without
    // changing source availability. Reset the switches after each isolated check.
    const canonicalGameId = String(detailBySlug.json().data.id);
    const canonicalProviderCode = String(detailBySlug.json().data.provider.code);
    await pool.query('UPDATE public.casino_providers SET bclick_enabled=false WHERE code=$1', [canonicalProviderCode]);
    const disabledProviderBrowse = await app.inject({ method: 'GET', url: '/api/v1/casino/games?provider=' + encodeURIComponent(canonicalProviderCode) });
    const disabledProviderDetail = await app.inject({ method: 'GET', url: '/api/v1/casino/games/' + canonicalGameId });
    const disabledProviderList = await app.inject({ method: 'GET', url: '/api/v1/casino/providers' });
    assert.equal(disabledProviderBrowse.json().page.total, 0);
    assert.equal(disabledProviderDetail.statusCode, 404);
    assert.ok(!disabledProviderList.json().data.some((item: { code: string }) => item.code === canonicalProviderCode));
    await pool.query('UPDATE public.casino_providers SET bclick_enabled=true WHERE code=$1', [canonicalProviderCode]);

    await pool.query('UPDATE public.casino_games SET bclick_enabled=false WHERE id=$1', [canonicalGameId]);
    const disabledGameBrowse = await app.inject({ method: 'GET', url: '/api/v1/casino/games?query=' + encodeURIComponent(String(detailBySlug.json().data.title)) });
    const disabledGameDetail = await app.inject({ method: 'GET', url: '/api/v1/casino/games/by-slug/' + slug });
    assert.equal(disabledGameBrowse.json().page.total, 0);
    assert.equal(disabledGameDetail.statusCode, 404);
    await pool.query('UPDATE public.casino_games SET bclick_enabled=true WHERE id=$1', [canonicalGameId]);

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

    const identityBeforeRename = await pool.query<{
      external_game_id: string;
      game_id: string;
      game_slug: string;
    }>(`
      SELECT s.external_game_id::text AS external_game_id,
             s.game_id::text AS game_id,g.game_slug
        FROM public.casino_game_sources s
        JOIN public.casino_games g ON g.id=s.game_id
       WHERE s.source_code='bigbang'
       ORDER BY s.external_game_id
    `);
    games = games.map((game) => ({ ...game, title: game.title + ' Revised' }));
    const renameSync = await service.sync();
    assert.equal(renameSync.createdCount, 0);
    assert.equal(renameSync.updatedCount, 2);
    const identityAfterRename = await pool.query<{
      external_game_id: string;
      game_id: string;
      game_slug: string;
    }>(`
      SELECT s.external_game_id::text AS external_game_id,
             s.game_id::text AS game_id,g.game_slug
        FROM public.casino_game_sources s
        JOIN public.casino_games g ON g.id=s.game_id
       WHERE s.source_code='bigbang'
       ORDER BY s.external_game_id
    `);
    assert.deepEqual(identityAfterRename.rows, identityBeforeRename.rows,
      'a title change for the same provider identity must retain canonical UUID and public slug');
    const renamedTitle = await pool.query<{ title: string }>(`
      SELECT g.title FROM public.casino_game_sources s
      JOIN public.casino_games g ON g.id=s.game_id
      WHERE s.source_code='bigbang' AND s.external_game_id=4821
    `);
    assert.equal(renamedTitle.rows[0]?.title, 'Hot Hot Fruit Revised');

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

    // A future live catalogue may reuse a numeric ID across tiers. The schema must
    // permit that as a distinct source identity, and Standard sync must preserve Premium state.
    const standardIdentity = await pool.query<{ game_id: string; provider_id: string }>(`
      SELECT s.game_id::text AS game_id, g.provider_id::text AS provider_id
        FROM public.casino_game_sources s
        JOIN public.casino_games g ON g.id=s.game_id
       WHERE s.source_code='bigbang'
         AND s.source_mode='standard'
         AND s.external_game_id=4821
       LIMIT 1
    `);
    assert.ok(standardIdentity.rows[0], 'the Standard fixture must still exist before the tier-collision check');
    const premiumGame = await pool.query<{ id: string }>(`
      INSERT INTO public.casino_games
        (game_slug,title,provider_id,image_url,game_type,available,demo_available,real_available)
      VALUES ('hot-hot-fruit-habanero-premium','Hot Hot Fruit Premium',$1,NULL,'slot',true,false,false)
      RETURNING id::text AS id
    `, [standardIdentity.rows[0]!.provider_id]);
    assert.ok(premiumGame.rows[0]);
    await pool.query(`
      INSERT INTO public.casino_game_sources
        (game_id,source_code,external_game_id,launch_name,source_provider_name,
         source_category,source_category_title,source_mode,is_premium,source_is_demo,game_type,available)
      VALUES ($1,'bigbang',4821,'HotHotFruitPremium','Habanero Premium',
              'Habanero Premium','Habanero Premium','premium',true,false,'slot',true)
    `, [premiumGame.rows[0]!.id]);
    await pool.query(
      'INSERT INTO public.casino_game_categories(game_id,category_slug) VALUES ($1,$2)',
      [premiumGame.rows[0]!.id, 'premium-only-test-category'],
    );

    scenario = 'success';
    games = [normalizedGame({ id: 4821, title: 'Hot Hot Fruit Revised', name: 'SGHotHotFruit', provider: 'Habanero' })];
    const standardReSync = await service.sync();
    assert.equal(standardReSync.createdCount, 0);
    assert.equal(standardReSync.updatedCount, 1);

    const tierIdentities = await pool.query<{
      source_mode: string;
      external_game_id: string;
      title: string;
      source_provider_name: string;
      source_available: boolean;
    }>(`
      SELECT s.source_mode,s.external_game_id::text AS external_game_id,
             g.title,s.source_provider_name,s.available AS source_available
        FROM public.casino_game_sources s
        JOIN public.casino_games g ON g.id=s.game_id
       WHERE s.source_code='bigbang' AND s.external_game_id=4821
       ORDER BY s.source_mode
    `);
    assert.deepEqual(tierIdentities.rows, [
      {
        source_mode: 'premium',
        external_game_id: '4821',
        title: 'Hot Hot Fruit Premium',
        source_provider_name: 'Habanero Premium',
        source_available: true,
      },
      {
        source_mode: 'standard',
        external_game_id: '4821',
        title: 'Hot Hot Fruit Revised',
        source_provider_name: 'Habanero',
        source_available: true,
      },
    ], 'a Standard re-sync must not overwrite or deactivate a Premium source that shares the external ID');

    const preservedPremiumCategory = await pool.query<{ category_slug: string }>(`
      SELECT category_slug
        FROM public.casino_game_categories
       WHERE game_id=$1
       ORDER BY category_slug
    `, [premiumGame.rows[0]!.id]);
    assert.deepEqual(preservedPremiumCategory.rows, [{ category_slug: 'premium-only-test-category' }],
      'a Standard category refresh must not delete Premium-only game categories');

    const premiumSlugRoute = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/hot-hot-fruit-habanero-premium',
    });
    assert.equal(premiumSlugRoute.statusCode, 404,
      'the current Standard catalogue API must not expose a future Premium-only source');
  } finally {
    await app.close();
    await pool.end();
    await container.stop();
  }
});
