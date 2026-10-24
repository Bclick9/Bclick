import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';
const GAME_SLUG = 'hot-hot-fruit-habanero';

const ROW = {
  id: GAME_ID,
  slug: GAME_SLUG,
  title: 'Hot Hot Fruit',
  provider_code: 'habanero',
  provider_name: 'Habanero',
  image_url: 'https://assets.example.test/hot-hot-fruit.webp',
  available: true,
  categories: ['classic-slots', 'slot-games'],
  demo_available: false,
  real_available: false,
};

interface QueryCall {
  sql: string;
  values: unknown[];
}

type LegacyAliasFixture = {
  alias_slug: string;
  resolution_status: 'pending' | 'resolved' | 'unmatched' | 'ambiguous';
  game_id: string | null;
};

function catalogDatabase(options: {
  readonly game?: typeof ROW | null;
  readonly alias?: LegacyAliasFixture | null;
  readonly listRows?: (typeof ROW)[];
  readonly categoryRows?: { slug: string }[];
  readonly total?: number;
} = {}) {
  const calls: QueryCall[] = [];
  const game = options.game === undefined ? ROW : options.game;
  const alias = options.alias ?? null;
  const listRows = options.listRows ?? [ROW];
  const categoryRows = options.categoryRows ?? [];
  const total = options.total ?? listRows.length;

  const database = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
      if (sql.includes('SELECT count(DISTINCT gc.category_slug)::text AS total')) {
        return { rows: [{ total: String(categoryRows.length) }], rowCount: 1 };
      }
      if (sql.includes('SELECT DISTINCT gc.category_slug AS slug')) {
        return { rows: categoryRows, rowCount: categoryRows.length };
      }
      if (sql.includes('SELECT count(DISTINCT p.id)::text AS total')) {
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes('SELECT DISTINCT p.code,p.name')) {
        return { rows: [{ code: ROW.provider_code, name: ROW.provider_name }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(DISTINCT g.id)::text AS total')) {
        return { rows: [{ total: String(total) }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_catalog_sync_runs')) {
        return { rows: [{ latest_status: 'succeeded', fetched_at: '2026-10-22T10:00:00.000Z' }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_game_legacy_slug_aliases')) {
        const rows = alias && alias.alias_slug === values[0]
          ? [{ resolution_status: alias.resolution_status, game_id: alias.game_id }]
          : [];
        return { rows, rowCount: rows.length };
      }
      if (sql.includes('WHERE g.game_slug=$1')) {
        return { rows: game && game.slug === values[0] ? [game] : [], rowCount: game && game.slug === values[0] ? 1 : 0 };
      }
      if (sql.includes('WHERE g.id=$1')) {
        return { rows: game && game.id === values[0] ? [game] : [], rowCount: game && game.id === values[0] ? 1 : 0 };
      }
      if (sql.includes('ORDER BY COALESCE(pres.display_order,0),lower(g.title),g.id')) {
        return { rows: listRows, rowCount: listRows.length };
      }
      throw new Error('Unexpected catalogue SQL in test: ' + sql);
    },
  } as unknown as SqlExecutor;

  return { database, calls };
}

function expectedGame() {
  return {
    id: GAME_ID,
    slug: GAME_SLUG,
    title: 'Hot Hot Fruit',
    provider: { code: 'habanero', name: 'Habanero' },
    categories: ['classic-slots', 'slot-games'],
    imageUrl: 'https://assets.example.test/hot-hot-fruit.webp',
    description: '',
    available: true,
    modes: { demo: false, real: false },
  };
}

test('slug lookup resolves the canonical UUID and preserves every stored category', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/' + GAME_SLUG,
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, expectedGame());
    assert.equal(fixture.calls.length, 1);
    assert.match(fixture.calls[0]!.sql, /WHERE g\.game_slug=\$1/);
    assert.match(fixture.calls[0]!.sql, /array_agg\(DISTINCT gc\.category_slug ORDER BY gc\.category_slug\)/);
    assert.deepEqual(fixture.calls[0]!.values, [GAME_SLUG]);
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});


test('player-facing title overrides are returned by canonical slug routes without changing the slug identity', async () => {
  const renamed = { ...ROW, title: 'Zeus the Thunderer Deluxe' };
  const fixture = catalogDatabase({ game: renamed });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/games/by-slug/' + GAME_SLUG });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.id, GAME_ID);
    assert.equal(response.json().data.slug, GAME_SLUG);
    assert.equal(response.json().data.title, 'Zeus the Thunderer Deluxe');
    assert.match(fixture.calls[0]!.sql, /COALESCE\(NULLIF\(pres\.title_override,''\),g\.title\) AS title/);
  } finally {
    await app.close();
  }
});

test('retired legacy slug is not resolved even when historical alias data exists', async () => {
  const fixture = catalogDatabase({
    alias: { alias_slug: 'lightning-roulette', resolution_status: 'resolved', game_id: GAME_ID },
  });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/lightning-roulette',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, 'NOT_FOUND');
    assert.equal(fixture.calls.length, 1);
    assert.match(fixture.calls[0]!.sql, /WHERE g\.game_slug=\$1/);
    assert.doesNotMatch(fixture.calls[0]!.sql, /casino_game_legacy_slug_aliases/);
    assert.deepEqual(fixture.calls[0]!.values, ['lightning-roulette']);
  } finally {
    await app.close();
  }
});

test('UUID lookup returns the same canonical game as slug lookup', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/' + GAME_ID,
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, expectedGame());
    assert.match(fixture.calls[0]!.sql, /WHERE g\.id=\$1/);
    assert.match(fixture.calls[0]!.sql, /array_agg\(DISTINCT gc\.category_slug ORDER BY gc\.category_slug\)/);
    assert.deepEqual(fixture.calls[0]!.values, [GAME_ID]);
  } finally {
    await app.close();
  }
});


test('Q-020 UUID game detail rejects malformed ids before DB access and returns a safe 404 for unknown ids', async () => {
  const invalidFixture = catalogDatabase();
  const invalidApp = buildApp({ database: null, catalogDatabase: invalidFixture.database, logLevel: 'silent' });

  try {
    const invalid = await invalidApp.inject({
      method: 'GET',
      url: '/api/v1/casino/games/not-a-uuid',
      headers: { 'x-request-id': 'q020-game-id-invalid' },
    });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json().error, {
      code: 'VALIDATION_ERROR',
      message: 'Game ID is invalid',
    });
    assert.equal(invalid.json().requestId, 'q020-game-id-invalid');
    assert.equal(invalid.headers['x-request-id'], 'q020-game-id-invalid');
    assert.equal(invalidFixture.calls.length, 0, 'invalid UUID must be rejected before catalogue DB access');
  } finally {
    await invalidApp.close();
  }

  const missingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const missingFixture = catalogDatabase({ game: null });
  const missingApp = buildApp({ database: null, catalogDatabase: missingFixture.database, logLevel: 'silent' });
  try {
    const missing = await missingApp.inject({
      method: 'GET',
      url: '/api/v1/casino/games/' + missingId,
      headers: { 'x-request-id': 'q020-game-id-missing' },
    });
    assert.equal(missing.statusCode, 404);
    assert.deepEqual(missing.json().error, {
      code: 'NOT_FOUND',
      message: 'Game not found',
    });
    assert.equal(missing.json().requestId, 'q020-game-id-missing');
    assert.equal(missing.headers['x-request-id'], 'q020-game-id-missing');
    assert.equal(missingFixture.calls.length, 1);
    assert.match(missingFixture.calls[0]!.sql, /WHERE g\.id=\$1/);
    assert.deepEqual(missingFixture.calls[0]!.values, [missingId]);
  } finally {
    await missingApp.close();
  }
});

test('invalid slug is rejected before any database query and unknown slug returns a safe 404', async () => {
  const invalidFixture = catalogDatabase();
  const invalidApp = buildApp({ database: null, catalogDatabase: invalidFixture.database });

  try {
    const invalid = await invalidApp.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/Hot%20Hot%20Fruit',
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, 'VALIDATION_ERROR');
    assert.equal(invalidFixture.calls.length, 0);
  } finally {
    await invalidApp.close();
  }

  const missingFixture = catalogDatabase({ game: null });
  const missingApp = buildApp({ database: null, catalogDatabase: missingFixture.database });
  try {
    const missing = await missingApp.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/unknown-game',
    });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, 'NOT_FOUND');
    assert.equal(missing.json().error.message, 'Game not found');
    assert.equal(missingFixture.calls.length, 1);
    assert.match(missingFixture.calls[0]!.sql, /WHERE g\.game_slug=\$1/);
    assert.deepEqual(missingFixture.calls[0]!.values, ['unknown-game']);
  } finally {
    await missingApp.close();
  }
});

test('catalogue category/search filters are parameterized and pagination retains the full categories array', async () => {
  const fixture = catalogDatabase({ listRows: [ROW], total: 2 });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games?category=slot-games&query=Hot&pageSize=1',
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, [expectedGame()]);
    assert.deepEqual(response.json().page, {
      page: 1,
      pageSize: 1,
      total: 2,
      nextCursor: 'MQ',
    });
    assert.equal(response.json().meta.stale, false);
    assert.equal(fixture.calls.length, 3);
    assert.match(fixture.calls[0]!.sql, /EXISTS \(SELECT 1 FROM public\.casino_game_categories/);
    assert.match(fixture.calls[1]!.sql, /array_agg\(DISTINCT gc\.category_slug ORDER BY gc\.category_slug\)/);
    assert.match(fixture.calls[1]!.sql, /ORDER BY COALESCE\(pres\.display_order,0\),lower\(g\.title\),g\.id/);
    assert.match(fixture.calls[0]!.sql, /g\.title ILIKE/);
    assert.deepEqual(fixture.calls[0]!.values, ['slot-games', '%Hot%']);
    assert.deepEqual(fixture.calls[1]!.values, ['slot-games', '%Hot%', 1, 0]);
  } finally {
    await app.close();
  }
});

test('game list uses only the database and never invokes an external provider adapter', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/games?pageSize=10' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.length, 1);
    assert.ok(fixture.calls.every((call) => call.sql.includes('public.casino_')));
    assert.ok(fixture.calls.every((call) => !/https?:\/\//i.test(call.sql)));
  } finally {
    await app.close();
  }
});


test('public catalogue list returns and searches by the player-facing title override', async () => {
  const renamed = { ...ROW, title: 'Zeus the Thunderer Deluxe' };
  const fixture = catalogDatabase({ listRows: [renamed], total: 1 });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games?query=Zeus&pageSize=10',
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data[0].id, GAME_ID);
    assert.equal(response.json().data[0].title, 'Zeus the Thunderer Deluxe');
    assert.match(fixture.calls[0]!.sql, /pres_search\.title_override/);
    assert.match(fixture.calls[0]!.sql, /ILIKE \$1/);
    assert.match(fixture.calls[1]!.sql, /COALESCE\(NULLIF\(pres\.title_override,''\),g\.title\) AS title/);
    assert.deepEqual(fixture.calls[0]!.values, ['%Zeus%']);
  } finally {
    await app.close();
  }
});

test('Q-020 category list matches the documented response envelope, metadata and request headers', async () => {
  const fixture = catalogDatabase({
    categoryRows: [{ slug: 'classic-slots' }, { slug: 'slot-games' }],
  });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  const requestId = 'q020-category-list-shape';

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/categories?page=1&pageSize=25',
      headers: { 'x-request-id': requestId },
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), {
      data: [
        { slug: 'classic-slots', title: 'Classic Slots', icon: null },
        { slug: 'slot-games', title: 'Slots', icon: 'cherry' },
      ],
      page: { page: 1, pageSize: 25, total: 2, nextCursor: null },
      meta: { resolvedLocale: 'en', stale: false, fetchedAt: '2026-10-22T10:00:00.000Z' },
      requestId,
    });
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(fixture.calls.length, 3);
    assert.match(fixture.calls[0]!.sql, /count\\(DISTINCT gc\\.category_slug\\)::text AS total/);
    assert.match(fixture.calls[1]!.sql, /ORDER BY gc\\.category_slug/);
    assert.deepEqual(fixture.calls[1]!.values, [25, 0]);
    assert.match(fixture.calls[2]!.sql, /casino_catalog_sync_runs/);
  } finally {
    await app.close();
  }
});

test('provider query is an exact Bclick provider identity, not a substring search', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games?provider=habanero&pageSize=10',
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, [expectedGame()]);
    assert.match(fixture.calls[0]!.sql, /\(p\.code = \$1 OR lower\(p\.name\) = lower\(\$1\)\)/);
    assert.doesNotMatch(fixture.calls[0]!.sql, /p\.code ILIKE|p\.name ILIKE/);
    assert.deepEqual(fixture.calls[0]!.values, ['habanero']);
  } finally {
    await app.close();
  }
});


test('public provider directory returns only enabled Standard providers and forbids caching', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/providers?pageSize=10',
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, [{ code: 'habanero', name: 'Habanero' }]);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.match(fixture.calls[0]!.sql, /p\.bclick_enabled=true/);
    assert.match(fixture.calls[0]!.sql, /g\.bclick_enabled=true/);
    assert.match(fixture.calls[1]!.sql, /s\.source_mode='standard'/);
    assert.match(fixture.calls[1]!.sql, /p\.bclick_enabled=true/);
  } finally {
    await app.close();
  }
});


test('Q-020 provider cursor schema enforces the OpenAPI 512-character maximum before route handling', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    logLevel: 'silent',
  });
  const cursor = Buffer.from('0'.repeat(400)).toString('base64url');
  const requestId = 'q020-provider-cursor-schema-limit';
  assert.ok(cursor.length > 512, 'fixture cursor must exceed the OpenAPI maximum');

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/providers?cursor=' + cursor,
      headers: { 'x-request-id': requestId },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.deepEqual(response.json().error, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
    });
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(fixture.calls.length, 0, 'oversized cursor must be rejected by route schema before database access');
  } finally {
    await app.close();
  }
});

test('Q-020 documents validation envelopes for malformed catalogue cursors and display type', async () => {
  const fixture = catalogDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    logLevel: 'silent',
  });

  const cases = [
    { url: '/api/v1/casino/categories?cursor=not-a-valid-cursor', requestId: 'q020-category-cursor' },
    { url: '/api/v1/casino/providers?cursor=not-a-valid-cursor', requestId: 'q020-provider-cursor' },
    { url: '/api/v1/casino/providers?cursor=' + Buffer.from('0'.repeat(400)).toString('base64url'), requestId: 'q020-provider-cursor-too-long' },
    { url: '/api/v1/casino/games?cursor=not-a-valid-cursor', requestId: 'q020-games-cursor' },
    { url: '/api/v1/casino/display-categories?type=', requestId: 'q020-display-type' },
  ];

  try {
    for (const entry of cases) {
      const response = await app.inject({
        method: 'GET',
        url: entry.url,
        headers: { 'x-request-id': entry.requestId },
      });

      assert.equal(response.statusCode, 400, entry.url);
      assert.equal(response.json().error.code, 'VALIDATION_ERROR', entry.url);
      assert.equal(response.json().requestId, entry.requestId, entry.url);
      assert.equal(response.headers['x-request-id'], entry.requestId, entry.url);
    }

    assert.equal(fixture.calls.length, 0, 'invalid query inputs must not reach the catalogue database');
  } finally {
    await app.close();
  }
});
