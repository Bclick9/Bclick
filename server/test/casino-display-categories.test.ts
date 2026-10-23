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
      if (sql.includes('WITH public_games AS') && sql.includes('casino_game_display_categories')) {
        return {
          rows: [{
            id: '51abfb02-a08c-4c66-8866-2c22381d34c1',
            slug: 'trending-games',
            name: 'Trending Games',
            description: 'Operator-selected casino highlights',
            icon: 'trending',
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
