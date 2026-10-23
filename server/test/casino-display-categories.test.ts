import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';

function fakeCatalogDatabase() {
  const calls: string[] = [];
  const database = {
    async query(sql: string) {
      calls.push(sql);
      if (sql.includes('count(DISTINCT g.id)::text AS total') && sql.includes('casino_game_display_categories')) {
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes('SELECT g.id::text AS id,g.game_slug AS slug') && sql.includes('casino_game_display_categories')) {
        return { rows: [{ id: GAME_ID, slug: 'hot-hot-fruit-habanero', title: 'Hot Hot Fruit', provider_code: 'habanero', provider_name: 'Habanero', image_url: 'https://assets.example.test/hot-hot-fruit.webp', description: '', available: true, demo_available: false, real_available: false, categories: ['slot-games'] }], rowCount: 1 };
      }
      if (sql.includes('count(DISTINCT gc.category_slug)::text AS total')) {
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes('SELECT DISTINCT gc.category_slug AS slug')) {
        return { rows: [{ slug: 'live-roulettes' }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_catalog_sync_runs')) {
        return { rows: [{ latest_status: 'succeeded', fetched_at: null }], rowCount: 1 };
      }
      if (sql.includes('WITH public_games AS') && sql.includes('casino_game_display_categories')) {
        return {
          rows: [{
            id: '51abfb02-a08c-4c66-8866-2c22381d34c1',
            slug: 'trending-games',
            name: 'Trending Games',
            description: 'Operator-selected casino highlights',
            icon: 'trending',
            type: 'casino',
            iconUrl: null,
            customIconKey: null,
            displayOrder: 100,
            games: [{
              id: GAME_ID,
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
          rowCount: 1,
        };
      }
      throw new Error('Unexpected SQL in curated category route test: ' + sql);
    },
  } as unknown as SqlExecutor;
  return { database, calls };
}

test('catalogue displayCategory filter returns only assigned available Standard games and remains paginated', async () => {
  const fixture = fakeCatalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/games?displayCategory=trending-games&pageSize=12' });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['cache-control'], 'no-store');
    const payload = response.json();
    assert.equal(payload.page.total, 1);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].id, GAME_ID);
    assert.equal(payload.data[0].slug, 'hot-hot-fruit-habanero');
    const membershipQueries = fixture.calls.filter((sql) => sql.includes('casino_game_display_categories dgc'));
    assert.equal(membershipQueries.length, 2, 'the count and page queries must both filter by category membership');
    for (const sql of membershipQueries) {
      assert.ok(sql.includes('dc.slug=$1'));
      assert.ok(sql.includes('dc.visible=true'));
      assert.ok(sql.includes('dgc.game_id=g.id'));
      assert.ok(sql.includes("s.source_mode='standard'"));
      assert.ok(sql.includes('g.available=true'));
    }
  } finally {
    await app.close();
  }
});


test('type-scoped catalogue applies type and category-type membership filters server-side', async () => {
  const fixture = fakeCatalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/games?type=live-casino&displayCategory=live-roulettes&pageSize=12' });
    assert.equal(response.statusCode, 200, response.body);
    const membershipQueries = fixture.calls.filter((sql) => sql.includes('casino_game_display_categories dgc'));
    assert.equal(membershipQueries.length, 2);
    for (const sql of membershipQueries) {
      assert.ok(sql.includes("g.game_type='live'"));
      assert.ok(sql.includes("dc.category_type='live-casino'"));
    }
  } finally {
    await app.close();
  }
});

test('source categories only include rows matching the requested storefront type', async () => {
  const fixture = fakeCatalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/categories?type=live-casino&pageSize=25' });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data.map((item: {slug:string}) => item.slug), ['live-roulettes']);
    const categoryQueries = fixture.calls.filter((sql) => sql.includes('casino_game_categories gc'));
    assert.equal(categoryQueries.length, 2);
    for (const sql of categoryQueries) assert.ok(sql.includes("g.game_type='live'"));
  } finally {
    await app.close();
  }
});

test('public curated categories return operator-selected canonical games and no-store headers', async () => {
  const fixture = fakeCatalogDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/v1/casino/display-categories' });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['cache-control'], 'no-store');
    const payload = response.json();
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].name, 'Trending Games');
    assert.equal(payload.data[0].games[0].id, GAME_ID);
    assert.equal(payload.data[0].games[0].slug, 'hot-hot-fruit-habanero');
    assert.match(fixture.calls[0]!, /source_mode='standard'/);
    assert.match(fixture.calls[0]!, /casino_game_display_categories/);
    assert.match(fixture.calls[0]!, /SELECT g\.id AS id,g\.game_slug AS slug/);
    assert.match(fixture.calls[0]!, /JOIN public_games pg ON pg\.id=cgm\.game_id/);
    assert.doesNotMatch(fixture.calls[0]!, /SELECT g\.id::text AS id,g\.game_slug AS slug/);
    assert.match(fixture.calls[0]!, /c.visible=true/);
    assert.match(fixture.calls[0]!, /g.bclick_enabled=true/);
    assert.match(fixture.calls[0]!, /p.bclick_enabled=true/);
  } finally {
    await app.close();
  }
});
