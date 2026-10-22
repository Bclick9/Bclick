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
  readonly total?: number;
} = {}) {
  const calls: QueryCall[] = [];
  const game = options.game === undefined ? ROW : options.game;
  const alias = options.alias ?? null;
  const listRows = options.listRows ?? [ROW];
  const total = options.total ?? listRows.length;

  const database = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
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
      if (sql.includes('ORDER BY lower(g.title),g.id')) {
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
    assert.match(fixture.calls[0]!.sql, /FROM public\.casino_game_legacy_slug_aliases/);
    assert.match(fixture.calls[1]!.sql, /WHERE g\.game_slug=\$1/);
    assert.match(fixture.calls[1]!.sql, /array_agg\(DISTINCT gc\.category_slug ORDER BY gc\.category_slug\)/);
    assert.deepEqual(fixture.calls[0]!.values, [GAME_SLUG]);
    assert.deepEqual(fixture.calls[1]!.values, [GAME_SLUG]);
    assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=120');
  } finally {
    await app.close();
  }
});


test('legacy slug resolves to the pinned canonical UUID and returns the canonical slug', async () => {
  const fixture = catalogDatabase({
    alias: { alias_slug: 'lightning-roulette', resolution_status: 'resolved', game_id: GAME_ID },
  });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/lightning-roulette',
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, expectedGame());
    assert.match(fixture.calls[0]!.sql, /FROM public\.casino_game_legacy_slug_aliases/);
    assert.match(fixture.calls[1]!.sql, /WHERE g\.id=\$1/);
    assert.deepEqual(fixture.calls[1]!.values, [GAME_ID]);
  } finally {
    await app.close();
  }
});

test('ambiguous legacy slug fails closed without guessing a canonical game', async () => {
  const fixture = catalogDatabase({
    alias: { alias_slug: 'lightning-roulette', resolution_status: 'ambiguous', game_id: null },
  });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/lightning-roulette',
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'LEGACY_SLUG_AMBIGUOUS');
    assert.equal(fixture.calls.length, 1);
  } finally {
    await app.close();
  }
});

test('unmatched legacy slug returns 404 instead of falling back to title-based lookup', async () => {
  const fixture = catalogDatabase({
    alias: { alias_slug: 'legacy-hot-fruit', resolution_status: 'unmatched', game_id: null },
  });
  const app = buildApp({ database: null, catalogDatabase: fixture.database });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/casino/games/by-slug/legacy-hot-fruit',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, 'NOT_FOUND');
    assert.equal(fixture.calls.length, 1);
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
    assert.match(missingFixture.calls[0]!.sql, /FROM public\.casino_game_legacy_slug_aliases/);
    assert.deepEqual(missingFixture.calls[0]!.values, ['unknown-game']);
    assert.deepEqual(missingFixture.calls[1]!.values, ['unknown-game']);
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
