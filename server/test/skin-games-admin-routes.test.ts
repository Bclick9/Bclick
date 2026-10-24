import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import type { IdentityConfig } from '../src/identity/config.js';
import type { AuthSession, IdentityService } from '../src/identity/service.js';
import { createCsrfToken, verifyCsrfToken } from '../src/identity/crypto.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const ADMIN_ORIGIN = 'http://localhost:5174';
const SESSION_COOKIE = '__Host-bclick_admin_session=admin-session';
const CSRF_TOKEN = createCsrfToken('admin', 'session-id', 1, 'b'.repeat(64));
const CSRF_COOKIE = '__Host-bclick_admin_csrf=' + CSRF_TOKEN;
const ADMIN_ID = '8d01ab53-7f9c-4e67-b4e8-64c5a409a7a9';
const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';
const PREMIUM_GAME_ID = 'df2c7acb-ae64-4d2a-9b8c-7c5e0e3aa7bc';
const DISPLAY_CATEGORY_ID = '51abfb02-a08c-4c66-8866-2c22381d34c1';
const PERMISSION = 'casino.provider-settings.manage';

function config(): IdentityConfig {
  return {
    nodeEnv: 'test',
    sessionHashKey: 'a'.repeat(64),
    csrfSigningKey: 'b'.repeat(64),
    totpEncryptionKey: 'c'.repeat(64),
    playerOrigins: ['http://localhost:5173'],
    adminOrigins: [ADMIN_ORIGIN],
    mailSinkPath: '.local-mail-sink.jsonl',
    termsVersion: 'test-terms-v1',
    agePolicyVersion: 'test-age-v1',
  };
}

function fakeIdentity(options: {
  permissions?: string[];
  status?: string;
  mfaVerified?: boolean;
  mfaEnabled?: boolean;
} = {}) {
  const status = options.status ?? 'active';
  const session: AuthSession = {
    id: 'session-id',
    type: 'admin',
    principalId: ADMIN_ID,
    version: 1,
    authenticatedAt: '2026-10-23T08:00:00.000Z',
    expiresAt: '2026-10-23T16:00:00.000Z',
    status,
    admin: { id: ADMIN_ID, status, mfa_enabled: options.mfaEnabled ?? true },
    roles: ['project-admin'],
    permissions: options.permissions ?? [PERMISSION],
    mfaVerified: options.mfaVerified ?? true,
  };
  return {
    async resolveSession(type: 'player' | 'admin', token: string | undefined) {
      return type === 'admin' && token === 'admin-session' ? session : null;
    },
    verifyCsrfForSession(currentSession: AuthSession, token: string) {
      return verifyCsrfToken(token, 'admin', currentSession.id, currentSession.version, config().csrfSigningKey);
    },
  } as unknown as IdentityService;
}

function authHeaders(unsafe = false) {
  return {
    cookie: SESSION_COOKIE + '; ' + CSRF_COOKIE,
    ...(unsafe ? {
      origin: ADMIN_ORIGIN,
      'x-csrf-token': CSRF_TOKEN,
    } : {}),
  };
}

type FakeGame = {
  id: string;
  slug: string;
  title: string;
  titleOverride: string | null;
  orderPosition: number;
  tierTotal: number;
  providerCode: string;
  providerName: string;
  sourceMode: 'standard' | 'premium';
  externalGameId: string;
  isPremium: boolean;
  sourceAvailable: boolean;
  catalogAvailable: boolean;
  enabled: boolean;
  providerEnabled: boolean;
  providerTierEnabled: boolean;
  sourceImageUrl: string | null;
  customImageKey: string | null;
  descriptionOverride: string | null;
  displayOrder: number;
  categories: string[];
  displayCategoryIds: string[];
  updatedAt: string;
  updatedBy: string | null;
};

function fakeDatabase(options: { mode?: 'standard' | 'premium'; providerEnabled?: boolean; providerTierEnabled?: boolean; sourceAvailable?: boolean; catalogAvailable?: boolean; categoryExists?: boolean; listFailure?: { code: string; message: string } } = {}) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const mode = options.mode ?? 'standard';
  let currentCustomImageKey: string | null = null;
  let currentCategoryIconKey: string | null = null;
  let categoryGameIds: string[] = [GAME_ID];
  const row: FakeGame = {
    id: mode === 'standard' ? GAME_ID : PREMIUM_GAME_ID,
    slug: mode === 'standard' ? 'hot-hot-fruit-habanero' : 'hot-hot-fruit-habanero-premium',
    title: 'Hot Hot Fruit',
    titleOverride: null,
    orderPosition: 1,
    tierTotal: 1,
    providerCode: 'habanero',
    providerName: 'Habanero',
    sourceMode: mode,
    externalGameId: mode === 'standard' ? '4821' : '14821',
    isPremium: mode === 'premium',
    sourceAvailable: options.sourceAvailable ?? true,
    catalogAvailable: options.catalogAvailable ?? true,
    enabled: true,
    providerEnabled: options.providerEnabled ?? true,
    providerTierEnabled: options.providerTierEnabled ?? mode === 'standard',
    sourceImageUrl: 'https://bigbangcasino.bet/frontend/Vegas/ico/Habanero/SGHotHotFruit.webp',
    customImageKey: null,
    descriptionOverride: null,
    displayOrder: 100,
    categories: ['slot-games'],
    displayCategoryIds: [DISPLAY_CATEGORY_ID],
    updatedAt: '2026-10-23T08:00:00.000Z',
    updatedBy: null,
  };

  const database = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
      if (sql.includes('casino.provider-settings.access-denied')) {
        return { rows: [{ id: 'audit-id' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id::text AS id,category_type AS type FROM public.casino_display_categories WHERE id=$1::uuid')) {
        return { rows: [{ id: DISPLAY_CATEGORY_ID, type: 'casino' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id::text AS id FROM public.casino_display_categories WHERE id=$1::uuid') && !sql.includes('AND custom_icon_key=$2')) {
        return { rows: [{ id: DISPLAY_CATEGORY_ID }], rowCount: 1 };
      }
      if (sql.includes('SELECT COALESCE(array_agg(m.game_id::text ORDER BY m.game_id)')) {
        return { rows: [{ ids: categoryGameIds }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(DISTINCT g.id)::integer AS total')) {
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes('AS "imageUrl"') && sql.includes('casino_provider_tier_settings') && sql.includes("s.source_mode='standard'")) {
        return { rows: [{
          id: GAME_ID, slug: 'hot-hot-fruit-habanero', title: 'Hot Hot Fruit', provider: 'Habanero',
          imageUrl: row.sourceImageUrl, available: row.sourceAvailable && row.catalogAvailable && row.providerEnabled && row.providerTierEnabled,
        }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(DISTINCT game_id)::integer AS count FROM public.casino_game_sources')) {
        const candidateIds = Array.isArray(values[0]) ? values[0] as string[] : [];
        const count = mode === 'standard' && candidateIds.every((id) => id === GAME_ID) ? candidateIds.length : 0;
        return { rows: [{ count }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(DISTINCT id)::integer AS count FROM public.casino_games WHERE id=ANY($1::uuid[]) AND game_type=$2')) {
        const candidateIds = Array.isArray(values[0]) ? values[0] as string[] : [];
        const count = mode === 'standard' && values[1] === 'slot' && candidateIds.every((id) => id === GAME_ID) ? candidateIds.length : 0;
        return { rows: [{ count }], rowCount: 1 };
      }
      if (sql.includes("casino.display-category.games-updated")) {
        assert.ok(sql.includes('INSERT INTO public.audit_events'));
        assert.ok(sql.includes('casino_display_category'));
        categoryGameIds = Array.isArray(values[1]) ? [...values[1] as string[]] : [];
        return { rows: [{ categoryId: DISPLAY_CATEGORY_ID, gameIds: categoryGameIds }], rowCount: 1 };
      }
      if (sql.includes('SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid')) {
        const rows = options.categoryExists === false ? [] : [{ id: DISPLAY_CATEGORY_ID, custom_icon_key: currentCategoryIconKey }];
        return { rows, rowCount: rows.length };
      }
      if (sql.includes('WITH changed AS') && sql.includes('casino.display-category.icon-updated')) {
        assert.ok(sql.includes('INSERT INTO public.audit_events'));
        assert.match(sql, /RETURNING id,custom_icon_key/);
        currentCategoryIconKey = String(values[1]);
        return { rows: [{ id: DISPLAY_CATEGORY_ID, custom_icon_key: currentCategoryIconKey }], rowCount: 1 };
      }
      if (sql.includes('SELECT id::text AS id FROM public.casino_display_categories WHERE id=$1::uuid AND custom_icon_key=$2')) {
        return { rows: currentCategoryIconKey === values[1] ? [{ id: DISPLAY_CATEGORY_ID }] : [], rowCount: currentCategoryIconKey === values[1] ? 1 : 0 };
      }
      if (sql.includes('WITH next_order AS MATERIALIZED') && sql.includes('INSERT INTO public.casino_display_categories')) {
        assert.match(sql, /ON CONFLICT \(slug\) DO NOTHING/);
        assert.ok(sql.includes('INSERT INTO public.audit_events'));
        return { rows: [{
          id: DISPLAY_CATEGORY_ID, slug: String(values[1]), name: String(values[2]), description: String(values[3]),
          icon: String(values[4]), type: typeof values[9] === 'string' ? values[9] : 'casino', visible: values[5] === true, displayOrder: 100, items: 0,
        }], rowCount: 1 };
      }
      if (sql.includes('UPDATE public.casino_display_categories c') && sql.includes('casino.display-category.updated')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        return { rows: [{
          id: DISPLAY_CATEGORY_ID, slug: 'trending-games', name: values[2] || 'Trending Games',
          description: values[4] || 'Hand-picked games', icon: values[6] || 'trending', type: values[15] ?? 'casino', visible: values[8] ?? true,
          displayOrder: values[10] ?? 100, items: 1,
        }], rowCount: 1 };
      }
      if (sql.includes('DELETE FROM public.casino_display_categories c') && sql.includes('casino.display-category.deleted')) {
        assert.match(sql, /DELETE FROM public\.casino_display_categories/);
        assert.match(sql, /INSERT INTO public\.audit_events/);
        return { rows: [{ id: DISPLAY_CATEGORY_ID }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_display_categories c') && sql.includes('LEFT JOIN public.casino_game_display_categories m')) {
        return { rows: [{
          id: DISPLAY_CATEGORY_ID, slug: 'trending-games', name: 'Trending Games', description: 'Hand-picked games',
          icon: 'trending', type: 'casino', iconUrl: null, customIconKey: currentCategoryIconKey, visible: true, displayOrder: 100, items: 1,
          createdAt: '2026-10-23T08:00:00.000Z', updatedAt: '2026-10-23T08:00:00.000Z',
        }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(*)::integer AS count FROM public.casino_display_categories WHERE id=ANY')) {
        return { rows: [{ count: Array.isArray(values[0]) ? values[0].length : 0 }], rowCount: 1 };
      }
      if (sql.includes('SELECT source_mode FROM public.casino_game_sources WHERE game_id=$1 AND source_code=\'bigbang\'')) {
        return { rows: [{ source_mode: row.sourceMode }], rowCount: 1 };
      }
      if (sql.includes('WITH target AS MATERIALIZED') && sql.includes('casino_game_display_categories')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /casino\.skin-game\.display-categories-updated/);
        assert.match(sql, /ON CONFLICT \(category_id,game_id\) DO NOTHING/);
        return { rows: [{ gameId: row.id, categoryIds: values[1] }], rowCount: 1 };
      }
      if (sql.includes('SELECT count(DISTINCT g.id)::text AS total')) {
        if (options.listFailure) {
          const failure = new Error(options.listFailure.message) as Error & { code: string };
          failure.code = options.listFailure.code;
          throw failure;
        }
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes("SELECT selected_mode FROM public.casino_integration_settings")) {
        return { rows: [{ selected_mode: 'standard' }], rowCount: 1 };
      }
      if (sql.includes('SELECT g.id::text AS id,g.game_slug AS slug,g.title')) {
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes('SELECT s.source_mode,g.bclick_enabled AS enabled')) {
        return { rows: [{ source_mode: row.sourceMode, enabled: row.enabled, source_available: row.sourceAvailable, catalog_available: row.catalogAvailable, provider_enabled: row.providerEnabled, provider_tier_enabled: row.providerTierEnabled }], rowCount: 1 };
      }
      if (sql.includes('SELECT game_id::text AS game_id FROM public.casino_game_presentation')) {
        return { rows: currentCustomImageKey === values[1] ? [{ game_id: row.id }] : [], rowCount: currentCustomImageKey === values[1] ? 1 : 0 };
      }
      if (sql.includes('WITH target AS MATERIALIZED') && sql.includes('game_change AS')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /CROSS JOIN audited/);
        return {
          rows: [{ id: row.id, slug: row.slug, enabled: values[1] ?? row.enabled, updatedAt: '2026-10-23T08:10:00.000Z' }],
          rowCount: 1,
        };
      }
      if (sql.includes('casino.skin-games.position-changed')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /row_number/);
        assert.match(sql, /ON CONFLICT \(game_id\) DO UPDATE/);
        assert.match(sql, /old_position < target.old_position/);
        return { rows: [{ oldPosition: row.orderPosition, orderPosition: Number(values[1]), displayOrder: Number(values[1]) * 100 }], rowCount: 1 };
      }
      if (sql.includes('WITH lock AS MATERIALIZED')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /bclick\.skin-games\.display-order/);
        assert.match(sql, /ON CONFLICT \(game_id\) DO UPDATE/);
        return { rows: [{ mode: row.sourceMode, displayOrder: 200 }], rowCount: 1 };
      }
      if (sql.includes('SELECT s.source_mode,') && sql.includes('tier_total')) {
        return { rows: [{ source_mode: row.sourceMode, tier_total: row.tierTotal }], rowCount: 1 };
      }
      if (sql.includes('SELECT s.source_mode FROM public.casino_games g')) {
        return { rows: [{ source_mode: row.sourceMode }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.casino_game_presentation(game_id,custom_image_key')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        currentCustomImageKey = String(values[1]);
        return { rows: [{ game_id: row.id, custom_image_key: currentCustomImageKey }], rowCount: 1 };
      }
      throw new Error('Unexpected Skin Games SQL: ' + sql);
    },
  } as unknown as SqlExecutor;

  return { database, calls, row };
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuffer, data]);
  let crc = 0xffffffff;
  for (const byte of crcInput) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc);
  return Buffer.concat([size,typeBuffer,data,crcBuffer]);
}

function validPng64(): Buffer {
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64,0);
  header.writeUInt32BE(64,4);
  header[8]=8; // bit depth
  header[9]=6; // RGBA
  const raw = Buffer.alloc(64*(1+64*4));
  const imageData = deflateSync(raw);
  return Buffer.concat([signature,pngChunk('IHDR',header),pngChunk('IDAT',imageData),pngChunk('IEND',Buffer.alloc(0))]);
}

test('Skin Games list is authenticated and returns real canonical UUID/source state', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/casino/skin-games' });
    assert.equal(denied.statusCode, 401);
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/casino/skin-games?page=1&pageSize=50', headers: authHeaders() });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.json().data[0].id, GAME_ID);
    assert.equal(response.json().data[0].sourceMode, 'standard');
    assert.equal(response.json().data[0].externalGameId, '4821');
    assert.equal(response.json().data[0].provider.name, 'Habanero');
    assert.equal(response.json().data[0].imageUrl, 'https://bigbangcasino.bet/frontend/Vegas/ico/Habanero/SGHotHotFruit.webp');
    assert.equal(response.json().data[0].effectiveAvailable, true);
    assert.equal(response.json().integration.premiumAvailable, false);

    const listQuery = fixture.calls.find((call) =>
      call.sql.includes('SELECT g.id::text AS id,g.game_slug AS slug,g.title'));
    assert.ok(listQuery, 'expected the paginated game-list query');
    assert.match(listQuery.sql, /LIMIT \$1 OFFSET \$2/);
    assert.deepEqual(listQuery.values, [50, 0]);

    const filteredResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/casino/skin-games?page=2&pageSize=20&providerCode=habanero',
      headers: authHeaders(),
    });
    assert.equal(filteredResponse.statusCode, 200, filteredResponse.body);
    const filteredListQuery = fixture.calls.filter((call) =>
      call.sql.includes('SELECT g.id::text AS id,g.game_slug AS slug,g.title')).at(-1);
    assert.ok(filteredListQuery, 'expected the filtered paginated game-list query');
    assert.match(filteredListQuery.sql, /p\.code=\$1/);
    assert.match(filteredListQuery.sql, /LIMIT \$2 OFFSET \$3/);
    assert.deepEqual(filteredListQuery.values, ['habanero', 20, 20]);
  } finally {
    await app.close();
  }
});

test('Skin Games exposes a safe migration hint when local schema 012 is missing', async () => {
  const fixture = fakeDatabase({ listFailure: { code: '42P01', message: 'relation public.casino_game_presentation does not exist' } });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/casino/skin-games?page=1&pageSize=50',
      headers: authHeaders(),
    });
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(response.json().error.code, 'SKIN_GAMES_SCHEMA_NOT_READY');
    assert.match(response.json().error.message, /Migration 012/i);
    assert.doesNotMatch(response.body, /relation public\.casino_game_presentation does not exist/);
  } finally {
    await app.close();
  }
});

test('Skin Games list exposes operator display-category assignments separately from provider categories', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/casino/skin-games?page=1&pageSize=50',
      headers: authHeaders(false),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data[0].categories, ['slot-games']);
    assert.deepEqual(response.json().data[0].displayCategoryIds, [DISPLAY_CATEGORY_ID]);
    const listQuery = fixture.calls.find((call) => call.sql.includes('displayCategoryIds'));
    assert.ok(listQuery);
    assert.match(listQuery.sql, /casino_game_display_categories/);
  } finally {
    await app.close();
  }
});

test('admin can assign a Standard game to multiple curated display categories with audit actor', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const categoryIds = [DISPLAY_CATEGORY_ID, '8c1e5a2b-4bd3-4c9a-a95f-29bcf43e3b5a'];
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/display-categories',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { categoryIds },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, { gameId: GAME_ID, categoryIds });
    assert.deepEqual(fixture.calls.at(-1)?.values.slice(0, 3), [GAME_ID, categoryIds, ADMIN_ID]);
    assert.match(fixture.calls.at(-1)!.sql, /casino_game_display_categories/);
    assert.match(fixture.calls.at(-1)!.sql, /casino.skin-game.display-categories-updated/);
  } finally {
    await app.close();
  }
});

test('Premium display-category assignments are refused before any assignment mutation', async () => {
  const fixture = fakeDatabase({ mode: 'premium' });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + PREMIUM_GAME_ID + '/display-categories',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { categoryIds: [DISPLAY_CATEGORY_ID] },
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(response.json().error.code, 'PREMIUM_NOT_AVAILABLE');
    assert.equal(fixture.calls.some((call) => call.sql.includes('casino.skin-game.display-categories-updated')), false);
  } finally {
    await app.close();
  }
});

test('category game picker searches canonical Standard games and returns the full saved selection', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/games?page=1&pageSize=25&query=fruit',
      headers: authHeaders(false),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(response.json().selectedGameIds, [GAME_ID]);
    assert.equal(response.json().data[0].id, GAME_ID);
    assert.equal(response.json().data[0].provider, 'Habanero');
    assert.equal(response.json().page.total, 1);
    const listing = fixture.calls.find((call) => call.sql.includes('AS "imageUrl"') && call.sql.includes('casino_provider_tier_settings'));
    assert.ok(listing);
    assert.match(listing.sql, /s\.source_mode='standard'/);
    assert.match(listing.sql, /LIMIT \$\d+ OFFSET \$\d+/);
  } finally {
    await app.close();
  }
});

test('category game picker replaces only this category’s memberships and writes an audit event', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/games',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { gameIds: [GAME_ID] },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, { categoryId: DISPLAY_CATEGORY_ID, gameIds: [GAME_ID] });
    const update = fixture.calls.find((call) => call.sql.includes('casino.display-category.games-updated'));
    assert.ok(update);
    assert.match(update.sql, /casino_game_display_categories/);
    assert.match(update.sql, /casino_display_category/);
    assert.deepEqual(update.values.slice(0, 3), [DISPLAY_CATEGORY_ID, [GAME_ID], ADMIN_ID]);
  } finally {
    await app.close();
  }
});

test('category game picker refuses Premium UUIDs', async () => {
  const fixture = fakeDatabase({ mode: 'premium' });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/games',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { gameIds: [PREMIUM_GAME_ID] },
    });
    assert.equal(response.statusCode, 422, response.body);
    assert.equal(response.json().error.code, 'DISPLAY_CATEGORY_GAME_INVALID');
    assert.equal(fixture.calls.some((call) => call.sql.includes('casino.display-category.games-updated')), false);
  } finally {
    await app.close();
  }
});

test('administrator can create a curated category and the request is audited', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { name: 'Live Roulettes', description: 'Roulette tables', icon: 'trending', type: 'live-casino', visible: true },
    });
    assert.equal(response.statusCode, 201, response.body);
    assert.equal(response.json().data.slug, 'live-roulettes');
    assert.equal(response.json().data.name, 'Live Roulettes');
    assert.equal(response.json().data.type, 'live-casino');
    const insert = fixture.calls.find((call) => call.sql.includes('WITH next_order AS MATERIALIZED'));
    assert.ok(insert);
    assert.match(insert.sql, /ON CONFLICT \(slug\) DO NOTHING/);
    assert.match(insert.sql, /category_type/);
    assert.equal(insert.values[9], 'live-casino');
    assert.match(insert.sql, /RETURNING id,slug,name/);
    assert.match(insert.sql, /casino_display_category.*created.id/);
    assert.match(insert.sql, /casino.display-category.created/);
  } finally {
    await app.close();
  }
});

test('administrator can update category metadata and visibility without changing the stable slug', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID,
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { name: 'Featured Games', visible: false, displayOrder: 200, type: 'live-casino' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.slug, 'trending-games');
    assert.equal(response.json().data.name, 'Featured Games');
    assert.equal(response.json().data.visible, false);
    assert.equal(response.json().data.type, 'live-casino');
    const update = fixture.calls.find((call) => call.sql.includes('casino.display-category.updated'));
    assert.ok(update);
    assert.match(update.sql, /nameChanged/);
    assert.match(update.sql, /removed_incompatible/);
    assert.match(update.sql, /incompatibleAssignmentsRemoved/);
    assert.equal(update.values[15], 'live-casino');
    assert.match(update.sql, /visibilityChanged/);
    assert.match(update.sql, /RETURNING c.id,c.slug/);
    assert.match(update.sql, /casino_display_category.*changed.id/);
  } finally {
    await app.close();
  }
});

test('administrator can delete a curated category without deleting its catalogue games', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID,
      headers: authHeaders(true),
    });
    assert.equal(response.statusCode, 204, response.body);
    const deletion = fixture.calls.find((call) => call.sql.includes('casino.display-category.deleted'));
    assert.ok(deletion);
    assert.match(deletion.sql, /SELECT id,slug,name FROM public\.casino_display_categories/);
    assert.match(deletion.sql, /RETURNING c\.id/);
    assert.match(deletion.sql, /casino_display_category.*deleted.id/);
    assert.match(deletion.sql, /ON DELETE CASCADE|DELETE FROM public\.casino_display_categories/);
  } finally {
    await app.close();
  }
});

test('admin can upload a validated custom icon and serve only the active category icon key', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-test-'));
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config(), uploadDirectory });
  try {
    const uploadRequestId = 'q020-icon-upload-positive';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': uploadRequestId },
      payload: validPng64(),
    });
    assert.equal(response.statusCode, 201, response.body);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(response.headers['x-request-id'], uploadRequestId);
    const uploadBody = response.json();
    assert.deepEqual(Object.keys(uploadBody).sort(), ['data', 'requestId']);
    assert.equal(uploadBody.requestId, uploadRequestId);
    assert.deepEqual(Object.keys(uploadBody.data).sort(), ['categoryId', 'contentType', 'iconUrl']);
    assert.equal(uploadBody.data.categoryId, DISPLAY_CATEGORY_ID);
    assert.equal(uploadBody.data.contentType, 'image/png');
    assert.match(
      uploadBody.data.iconUrl,
      new RegExp('^/api/v1/assets/casino-display-categories/' + DISPLAY_CATEGORY_ID + '/[0-9a-f-]{36}\\.png$'),
    );
    const persisted = fixture.calls.find((call) => call.sql.includes('casino.display-category.icon-updated'));
    assert.ok(persisted);
    assert.ok(persisted.sql.includes('INSERT INTO public.audit_events'));
    assert.ok(String(persisted.values[1]).startsWith('casino-display-categories/'));

    const readRequestId = 'q020-icon-read-positive';
    const icon = await app.inject({
      method: 'GET',
      url: uploadBody.data.iconUrl,
      headers: { 'x-request-id': readRequestId },
    });
    assert.equal(icon.statusCode, 200);
    assert.equal(icon.headers['content-type'], 'image/png');
    assert.equal(icon.headers['x-content-type-options'], 'nosniff');
    assert.equal(icon.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.equal(icon.headers['content-security-policy'], "default-src 'none'; sandbox");
    assert.equal(icon.headers['x-request-id'], readRequestId);
    assert.ok(icon.rawPayload.equals(validPng64()));
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('display-category icon upload rejects undersized, oversized and invalid image bytes with request-id and error-envelope parity', async () => {
  const cases = [
    {
      name: 'unsupported text/plain Content-Type',
      contentType: 'text/plain',
      payload: Buffer.from('not-an-image'),
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
      message: 'Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type',
    },
    {
      name: 'undersized payload',
      contentType: 'image/png',
      payload: Buffer.from('tiny'),
      statusCode: 413,
      code: 'IMAGE_SIZE_INVALID',
      message: 'Category icon must be a supported image no larger than 5 MiB',
    },
    {
      name: 'oversized payload',
      contentType: 'image/png',
      // Fastify's bounded content-type parser rejects this before the route handler,
      // so the shared safe envelope is REQUEST_REJECTED rather than IMAGE_SIZE_INVALID.
      payload: Buffer.alloc(5 * 1024 * 1024 + 1),
      statusCode: 413,
      code: 'REQUEST_REJECTED',
      message: 'Request could not be processed',
    },
    {
      name: 'invalid image bytes',
      contentType: 'image/png',
      payload: Buffer.from('this-is-not-a-valid-png-image-payload'),
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
      message: 'Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type',
    },
    {
      name: 'PNG bytes with mismatched JPEG Content-Type',
      contentType: 'image/jpeg',
      payload: validPng64(),
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
      message: 'Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type',
    },
  ] as const;

  for (const entry of cases) {
    const fixture = fakeDatabase();
    const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-invalid-'));
    const app = buildApp({
      database: null,
      catalogDatabase: fixture.database,
      identity: fakeIdentity(),
      identityConfig: config(),
      uploadDirectory,
    });
    const requestId = 'q020-icon-invalid-' + entry.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
        headers: { ...authHeaders(true), 'content-type': entry.contentType, 'x-request-id': requestId },
        payload: entry.payload,
      });

      assert.equal(response.statusCode, entry.statusCode, entry.name + ': ' + response.body);
      assert.deepEqual(response.json().error, { code: entry.code, message: entry.message }, entry.name);
      assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId'], entry.name);
      assert.equal(response.json().requestId, requestId, entry.name);
      assert.equal(response.headers['x-request-id'], requestId, entry.name);
      assert.equal(response.headers['content-type']?.split(';')[0], 'application/json', entry.name);
      assert.equal(
        fixture.calls.some((call) => call.sql.includes('SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid')),
        false,
        entry.name + ': validation must precede category lookup',
      );
      assert.equal(
        fixture.calls.some((call) => call.sql.includes('casino.display-category.icon-updated')),
        false,
        entry.name + ': invalid image must never persist metadata or audit success',
      );
      assert.deepEqual(await readdir(uploadDirectory), [], entry.name + ': invalid image must not create files');
    } finally {
      await app.close();
      await rm(uploadDirectory, { recursive: true, force: true });
    }
  }
});

test('display-category icon upload returns a safe 404 before file creation when the category does not exist', async () => {
  const fixture = fakeDatabase({ categoryExists: false });
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-missing-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });
  const requestId = 'q020-icon-category-not-found';

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': requestId },
      payload: validPng64(),
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.deepEqual(response.json().error, { code: 'NOT_FOUND', message: 'Display category was not found' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(
      fixture.calls.filter((call) => call.sql.includes('SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid')).length,
      1,
    );
    assert.equal(fixture.calls.some((call) => call.sql.includes('casino.display-category.icon-updated')), false);
    assert.deepEqual(await readdir(uploadDirectory), [], 'missing category must be checked before any filesystem write');
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('active display-category asset rejects invalid filenames before database access', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  const requestId = 'q020-icon-filename-invalid';

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/casino-display-categories/' + DISPLAY_CATEGORY_ID + '/not-a-uuid.png',
      headers: { 'x-request-id': requestId },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.deepEqual(response.json().error, { code: 'VALIDATION_ERROR', message: 'Request validation failed' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, 0, 'filename schema rejection must occur before the catalogue lookup');
  } finally {
    await app.close();
  }
});


test('display-category icon upload rejects a malformed category ID with the OpenAPI 400 envelope before DB or storage access', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-invalid-category-id-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });
  const requestId = 'q020-icon-invalid-category-id';

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/not-a-uuid/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': requestId },
      payload: validPng64(),
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.deepEqual(response.json().error, { code: 'VALIDATION_ERROR', message: 'Request validation failed' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, 0, 'invalid category ID must be rejected before DB access');
    assert.deepEqual(await readdir(uploadDirectory), [], 'invalid category ID must not create files');
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('display-category icon upload rejects disallowed Origin and invalid or missing signed CSRF before DB/filesystem effects', async () => {
  const cases: Array<{ name: string; headers: Record<string, string>; statusCode: number; code: string; message: string }> = [
    {
      name: 'untrusted Origin',
      statusCode: 403,
      headers: { ...authHeaders(true), origin: 'https://attacker.example' },
      code: 'ORIGIN_INVALID',
      message: 'Request Origin is not allowed',
    },
    {
      name: 'missing Origin',
      statusCode: 403,
      headers: { cookie: SESSION_COOKIE + '; ' + CSRF_COOKIE, 'x-csrf-token': CSRF_TOKEN },
      code: 'ORIGIN_INVALID',
      message: 'Request Origin is not allowed',
    },
    {
      name: 'missing CSRF header',
      statusCode: 403,
      headers: { cookie: SESSION_COOKIE + '; ' + CSRF_COOKIE, origin: ADMIN_ORIGIN },
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
    {
      name: 'CSRF header differs from cookie',
      statusCode: 403,
      headers: { ...authHeaders(true), 'x-csrf-token': 'tampered-token-value' },
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
    {
      name: 'missing administrator session',
      statusCode: 401,
      headers: { cookie: CSRF_COOKIE, origin: ADMIN_ORIGIN, 'x-csrf-token': CSRF_TOKEN },
      code: 'UNAUTHORIZED',
      message: 'A valid administrator session is required',
    },
    {
      name: 'matching but unsigned CSRF cookie and header',
      statusCode: 403,
      headers: {
        cookie: SESSION_COOKIE + '; __Host-bclick_admin_csrf=not-a-valid-signed-token',
        origin: ADMIN_ORIGIN,
        'x-csrf-token': 'not-a-valid-signed-token',
      },
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
  ];

  for (const entry of cases) {
    const fixture = fakeDatabase();
    const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-origin-csrf-'));
    const app = buildApp({
      database: null,
      catalogDatabase: fixture.database,
      identity: fakeIdentity(),
      identityConfig: config(),
      uploadDirectory,
    });
    const requestId = 'q020-icon-security-' + entry.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
        headers: { ...entry.headers, 'content-type': 'image/png', 'x-request-id': requestId },
        payload: validPng64(),
      });

      assert.equal(response.statusCode, entry.statusCode, entry.name + ': ' + response.body);
      assert.deepEqual(response.json().error, { code: entry.code, message: entry.message }, entry.name);
      assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId'], entry.name);
      assert.equal(response.json().requestId, requestId, entry.name);
      assert.equal(response.headers['x-request-id'], requestId, entry.name);
      assert.equal(response.headers['content-type']?.split(';')[0], 'application/json', entry.name);
      assert.equal(fixture.calls.length, 0, entry.name + ': denial must happen before DB access');
      assert.deepEqual(await readdir(uploadDirectory), [], entry.name + ': denial must not create files');
    } finally {
      await app.close();
      await rm(uploadDirectory, { recursive: true, force: true });
    }
  }
});

test('display-category icon upload uses the real admin permission guard and audits denied RBAC without writing a file', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-rbac-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity({ permissions: [] }),
    identityConfig: config(),
    uploadDirectory,
  });
  const requestId = 'q020-icon-rbac-denied';

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': requestId },
      payload: validPng64(),
    });

    assert.equal(response.statusCode, 403, response.body);
    assert.deepEqual(response.json().error, {
      code: 'FORBIDDEN',
      message: 'The administrator lacks the required provider-settings permission',
    });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(fixture.calls.filter((call) => call.sql.includes('casino.provider-settings.access-denied')).length, 1);
    assert.equal(fixture.calls.some((call) => call.sql.includes('SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid')), false);
    assert.equal(fixture.calls.some((call) => call.sql.includes('casino.display-category.icon-updated')), false);
    assert.deepEqual(await readdir(uploadDirectory), []);
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('public display-category icon rejects inactive or unknown keys with a safe 404 before filesystem reads', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-inactive-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });
  const fileName = '94a4c5a1-8cb4-4efc-9b92-05a9c3045f72.png';
  const requestId = 'q020-icon-inactive-key';

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/casino-display-categories/' + DISPLAY_CATEGORY_ID + '/' + fileName,
      headers: { 'x-request-id': requestId },
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.deepEqual(response.json().error, { code: 'NOT_FOUND', message: 'Category icon was not found' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.calls[0]?.sql.includes('custom_icon_key=$2'), true);
    assert.equal(fixture.calls[0]?.values[1], 'casino-display-categories/' + DISPLAY_CATEGORY_ID + '/' + fileName);
    assert.deepEqual(await readdir(uploadDirectory), []);
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('public display-category icon refuses encoded path traversal before database access', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-traversal-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });
  const requestId = 'q020-icon-path-traversal';

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/casino-display-categories/' + DISPLAY_CATEGORY_ID + '/..%2F..%2F..%2Fetc%2Fpasswd',
      headers: { 'x-request-id': requestId },
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.deepEqual(response.json().error, { code: 'VALIDATION_ERROR', message: 'Request validation failed' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, 0, 'path traversal must be rejected by schema before DB/filesystem access');
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('public display-category icon returns 404 when its persisted active file is missing and never leaks storage paths', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-missing-file-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });

  try {
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': 'q020-icon-missing-file-upload' },
      payload: validPng64(),
    });
    assert.equal(uploaded.statusCode, 201, uploaded.body);
    const iconUrl = uploaded.json().data.iconUrl as string;
    const fileName = iconUrl.split('/').at(-1)!;
    const filePath = path.join(uploadDirectory, 'casino-display-categories', DISPLAY_CATEGORY_ID, fileName);
    await unlink(filePath);

    const requestId = 'q020-icon-missing-file-read';
    const response = await app.inject({ method: 'GET', url: iconUrl, headers: { 'x-request-id': requestId } });
    assert.equal(response.statusCode, 404, response.body);
    assert.deepEqual(response.json().error, { code: 'NOT_FOUND', message: 'Category icon was not found' });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(response.body.includes(uploadDirectory), false);
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('public display-category icon handles non-ENOENT filesystem failures with a safe 500 envelope', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-filesystem-failure-'));
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });

  try {
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': 'q020-icon-fs-failure-upload' },
      payload: validPng64(),
    });
    assert.equal(uploaded.statusCode, 201, uploaded.body);
    const iconUrl = uploaded.json().data.iconUrl as string;
    const categoryDirectory = path.join(uploadDirectory, 'casino-display-categories', DISPLAY_CATEGORY_ID);
    await rm(categoryDirectory, { recursive: true, force: true });
    await writeFile(categoryDirectory, 'not-a-directory');

    const requestId = 'q020-icon-fs-failure-read';
    const response = await app.inject({ method: 'GET', url: iconUrl, headers: { 'x-request-id': requestId } });
    assert.equal(response.statusCode, 500, response.body);
    assert.deepEqual(response.json().error, {
      code: 'INTERNAL_ERROR',
      message: 'The Skin Games request could not be completed',
    });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(response.body.includes(uploadDirectory), false);
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('display-category icon upload fails safely when persistent storage cannot be created and leaves no orphaned file', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'bclick-category-icon-write-failure-'));
  const storageRoot = path.join(uploadDirectory, 'casino-display-categories');
  await writeFile(storageRoot, 'do-not-overwrite');
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory,
  });
  const requestId = 'q020-icon-upload-fs-failure';

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/display-categories/' + DISPLAY_CATEGORY_ID + '/icon',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': requestId },
      payload: validPng64(),
    });

    assert.equal(response.statusCode, 500, response.body);
    assert.deepEqual(response.json().error, {
      code: 'INTERNAL_ERROR',
      message: 'The Skin Games request could not be completed',
    });
    assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(response.body.includes(uploadDirectory), false);
    assert.equal(fixture.calls.filter((call) => call.sql.includes('SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid')).length, 1);
    assert.equal(fixture.calls.some((call) => call.sql.includes('casino.display-category.icon-updated')), false);
    assert.equal(await readFile(storageRoot, 'utf8'), 'do-not-overwrite');
    assert.deepEqual(await readdir(uploadDirectory), ['casino-display-categories']);
  } finally {
    await app.close();
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});

test('display-category editor endpoint returns persistent categories to an MFA administrator', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/casino/display-categories',
      headers: authHeaders(false),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data[0].name, 'Trending Games');
    assert.equal(response.json().data[0].items, 1);
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});

test('Skin Games description and per-game availability are persisted with audit actor', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID,
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { enabled: false, description: 'Operator description', displayTitle: 'Zeus the Thunderer Deluxe' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.id, GAME_ID);
    const update = fixture.calls.find((call) => call.sql.includes('game_change AS'));
    assert.ok(update);
    assert.match(update.sql, /availability_updated_by=CASE/);
    assert.match(update.sql, /description_override=CASE/);
    assert.match(update.sql, /title_override=CASE/);
    assert.match(update.sql, /displayTitleChanged/);
    assert.match(update.sql, /INSERT INTO public\.audit_events/);
    assert.deepEqual(update.values.slice(0, 6), [GAME_ID, false, true, 'Operator description', false, ADMIN_ID]);
    assert.deepEqual(update.values.slice(8), [true, 'Zeus the Thunderer Deluxe']);
  } finally {
    await app.close();
  }
});


test('Skin Games does not enable a game while its source/provider/tier is unavailable', async () => {
  const fixture = fakeDatabase({ providerTierEnabled: false });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID,
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { enabled: true },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'GAME_NOT_EFFECTIVELY_AVAILABLE');
    assert.equal(fixture.calls.length, 1, 'refusal occurs before any update/audit CTE');
  } finally {
    await app.close();
  }
});

test('Skin Games refuses a Premium availability mutation while integration is Standard-only', async () => {
  const fixture = fakeDatabase({ mode: 'premium' });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + PREMIUM_GAME_ID,
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { enabled: false },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'PREMIUM_NOT_AVAILABLE');
    assert.equal(fixture.calls.length, 1, 'premium refusal must happen before a mutation');
  } finally {
    await app.close();
  }
});

test('Skin Games drag order is tier-scoped and writes the order audit', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/reorder',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { gameId: GAME_ID, targetGameId: 'e6f79f9e-9bb1-4d91-9784-e0fbc40ca4de', position: 'before' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.sourceMode, 'standard');
    assert.equal(response.json().data.displayOrder, 200);
  } finally {
    await app.close();
  }
});

test('Skin Games numeric order repositions a game and audits the administrator', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/order-position',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { orderPosition: 1 },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, {
      gameId: GAME_ID, oldPosition: 1, orderPosition: 1, displayOrder: 100,
    });
    const orderQuery = fixture.calls.find((call) => call.sql.includes('casino.skin-games.position-changed'));
    assert.ok(orderQuery, 'numeric order query must write an audit event');
    assert.deepEqual(orderQuery.values, [GAME_ID, 1, 'standard', ADMIN_ID, orderQuery.values[4], orderQuery.values[5]]);
    assert.match(orderQuery.sql, /pg_advisory_xact_lock/);
    assert.match(orderQuery.sql, /new_position\*100/);
    assert.match(orderQuery.sql, /INSERT INTO public\.audit_events/);
  } finally {
    await app.close();
  }
});

test('Skin Games numeric order rejects positions outside the tier bounds', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/order-position',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { orderPosition: 2 },
    });
    assert.equal(response.statusCode, 422, response.body);
    assert.equal(response.json().error.code, 'ORDER_POSITION_OUT_OF_RANGE');
    assert.equal(fixture.calls.length, 1, 'out-of-range position must be refused before the ordering/audit statement');
  } finally {
    await app.close();
  }
});

test('Skin Games numeric order remains locked for Premium rows', async () => {
  const fixture = fakeDatabase({ mode: 'premium' });
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + PREMIUM_GAME_ID + '/order-position',
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { orderPosition: 1 },
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(response.json().error.code, 'PREMIUM_NOT_AVAILABLE');
    assert.equal(fixture.calls.length, 1, 'Premium refusal must happen before any mutation');
  } finally {
    await app.close();
  }
});

test('Skin Games uploads a validated persistent image and serves it without a blob URL', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-'));
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config(), uploadDirectory });
  try {
    const image = validPng64();
    const uploadRequestId = 'q020-skin-image-success';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': uploadRequestId },
      payload: image,
    });
    assert.equal(response.statusCode, 201, response.body);
    assert.deepEqual(Object.keys(response.json()).sort(), ['data', 'requestId']);
    const data = response.json().data;
    assert.deepEqual(Object.keys(data).sort(), ['contentType', 'customImageUrl', 'gameId']);
    assert.equal(data.gameId, GAME_ID);
    assert.equal(data.contentType, 'image/png');
    assert.equal(response.json().requestId, uploadRequestId);
    assert.equal(response.headers['x-request-id'], uploadRequestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    const imageAudit = fixture.calls.find((call) => call.sql.includes("'casino.skin-game.image-updated'"));
    assert.ok(imageAudit, 'image persistence must write an audit event');
    assert.match(
      imageAudit.sql,
      /jsonb_build_object\('contentType',\$6::text,'bytes',\$7::integer,'imageKey',changed\.custom_image_key\)/,
      'jsonb_build_object parameters must have explicit PostgreSQL types',
    );
    assert.deepEqual(imageAudit.values.slice(5), ['image/png', image.length]);
    assert.match(data.customImageUrl, /^\/api\/v1\/assets\/casino-games\//);
    assert.equal(data.customImageUrl.includes('blob:'), false);

    const imageRequestId = 'q020-skin-image-read-success';
    const read = await app.inject({
      method: 'GET',
      url: data.customImageUrl,
      headers: { 'x-request-id': imageRequestId },
    });
    assert.equal(read.statusCode, 200, read.body);
    assert.equal(read.headers['content-type'], 'image/png');
    assert.equal(read.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.equal(read.headers['content-security-policy'], "default-src 'none'; sandbox");
    assert.equal(read.headers['x-content-type-options'], 'nosniff');
    assert.equal(read.headers['x-request-id'], imageRequestId);
    assert.deepEqual(read.rawPayload, image);
  } finally {
    await app.close();
    await rm(uploadDirectory,{recursive:true,force:true});
  }
});


test('Skin Games image upload rejects invalid Origin and CSRF with production guards before file/database side effects and enforces RBAC', async () => {
  const uploadDirectory = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-security-'));
  try {
    const deniedFixture = fakeDatabase();
    const app = buildApp({
      database: null,
      catalogDatabase: deniedFixture.database,
      identity: fakeIdentity(),
      identityConfig: config(),
      uploadDirectory,
    });
    const omitHeader = (headers: Record<string, string>, name: string): Record<string, string> => {
      const copy = { ...headers };
      delete copy[name];
      return copy;
    };
    const validUploadHeaders = { ...authHeaders(true), 'content-type': 'image/png' };
    const unsignedToken = 'unsigned-csrf-token-123456789';
    const cases = [
      {
        name: 'missing Origin',
        headers: omitHeader(validUploadHeaders, 'origin'),
        code: 'ORIGIN_INVALID',
        message: 'Request Origin is not allowed',
      },
      {
        name: 'hostile Origin',
        headers: { ...validUploadHeaders, origin: 'https://attacker.example' },
        code: 'ORIGIN_INVALID',
        message: 'Request Origin is not allowed',
      },
      {
        name: 'missing CSRF header',
        headers: omitHeader(validUploadHeaders, 'x-csrf-token'),
        code: 'CSRF_INVALID',
        message: 'CSRF validation failed',
      },
      {
        name: 'mismatched CSRF cookie and header',
        headers: { ...validUploadHeaders, 'x-csrf-token': 'mismatched-csrf-value-123456789' },
        code: 'CSRF_INVALID',
        message: 'CSRF validation failed',
      },
      {
        name: 'unsigned CSRF token',
        headers: {
          ...validUploadHeaders,
          cookie: SESSION_COOKIE + '; __Host-bclick_admin_csrf=' + unsignedToken,
          'x-csrf-token': unsignedToken,
        },
        code: 'CSRF_INVALID',
        message: 'CSRF validation failed',
      },
    ];
    try {
      for (const entry of cases) {
        const requestId = 'q020-skin-image-security-' + entry.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
          headers: { ...entry.headers, 'x-request-id': requestId },
          payload: validPng64(),
        });
        assert.equal(response.statusCode, 403, entry.name + ': ' + response.body);
        assert.deepEqual(response.json().error, { code: entry.code, message: entry.message }, entry.name);
        assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId'], entry.name);
        assert.equal(response.json().requestId, requestId, entry.name);
        assert.equal(response.headers['x-request-id'], requestId, entry.name);
        assert.equal(response.headers['content-type']?.split(';')[0], 'application/json', entry.name);
        assert.equal(deniedFixture.calls.length, 0, entry.name + ': denied request must not query or write audit-success');
        assert.deepEqual(await readdir(uploadDirectory), [], entry.name + ': denied request must not create an upload directory or file');
      }
    } finally {
      await app.close();
    }

    const permissionFixture = fakeDatabase();
    const permissionApp = buildApp({
      database: null,
      catalogDatabase: permissionFixture.database,
      identity: fakeIdentity({ permissions: [] }),
      identityConfig: config(),
      uploadDirectory,
    });
    try {
      const requestId = 'q020-skin-image-rbac-denied';
      const response = await permissionApp.inject({
        method: 'POST',
        url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
        headers: { ...validUploadHeaders, 'x-request-id': requestId },
        payload: validPng64(),
      });
      assert.equal(response.statusCode, 403, response.body);
      assert.deepEqual(response.json().error, {
        code: 'FORBIDDEN',
        message: 'The administrator lacks the required provider-settings permission',
      });
      assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId']);
      assert.equal(response.json().requestId, requestId);
      assert.equal(response.headers['x-request-id'], requestId);
      assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
      assert.equal(permissionFixture.calls.length, 1, 'RBAC denial should write only the denial audit');
      assert.ok(permissionFixture.calls[0]!.sql.includes('casino.provider-settings.access-denied'));
      assert.equal(permissionFixture.calls.some((call) => call.sql.includes("casino.skin-game.image-updated")), false);
      assert.deepEqual(await readdir(uploadDirectory), [], 'RBAC denial must not create an upload directory or file');
    } finally {
      await permissionApp.close();
    }
  } finally {
    await rm(uploadDirectory,{recursive:true,force:true});
  }
});


test('Skin Games public image route rejects inactive/traversal keys and maps missing or unreadable files to safe OpenAPI envelopes', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-asset-errors-'));
  let app: ReturnType<typeof buildApp> | null = null;
  let blockedRoot = '';
  let blockedRootParent = '';
  try {
    app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config(), uploadDirectory });
    const uploadId = 'q020-skin-asset-error-setup';
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
      headers: { ...authHeaders(true), 'content-type': 'image/png', 'x-request-id': uploadId },
      payload: validPng64(),
    });
    assert.equal(uploaded.statusCode, 201, uploaded.body);
    const imageUrl = uploaded.json().data.customImageUrl as string;
    const relativeAssetPath = imageUrl.replace(/^\\/api\\/v1\\/assets\\//, '');
    assert.ok(relativeAssetPath.startsWith('casino-games/' + GAME_ID + '/'));
    const imageFilePath = path.join(uploadDirectory, relativeAssetPath);
    const inactiveFileName = '11111111-1111-4111-8111-111111111111.png';

    const beforeInactive = fixture.calls.length;
    const inactiveRequestId = 'q020-skin-asset-inactive';
    const inactive = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/casino-games/' + GAME_ID + '/' + inactiveFileName,
      headers: { 'x-request-id': inactiveRequestId },
    });
    assert.equal(inactive.statusCode, 404, inactive.body);
    assert.deepEqual(inactive.json().error, { code: 'NOT_FOUND', message: 'Image was not found' });
    assert.deepEqual(Object.keys(inactive.json()).sort(), ['error', 'requestId']);
    assert.equal(inactive.json().requestId, inactiveRequestId);
    assert.equal(inactive.headers['x-request-id'], inactiveRequestId);
    assert.equal(inactive.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, beforeInactive + 1, 'inactive key should be checked in the DB and denied before filesystem reads');

    const beforeTraversal = fixture.calls.length;
    const traversalRequestId = 'q020-skin-asset-traversal';
    const traversal = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/casino-games/' + GAME_ID + '/%2E%2E%2F..%2Fsecret.png',
      headers: { 'x-request-id': traversalRequestId },
    });
    assert.equal(traversal.statusCode, 400, traversal.body);
    assert.deepEqual(Object.keys(traversal.json()).sort(), ['error', 'requestId']);
    assert.equal(traversal.json().error.code, 'VALIDATION_ERROR');
    assert.equal(traversal.json().requestId, traversalRequestId);
    assert.equal(traversal.headers['x-request-id'], traversalRequestId);
    assert.equal(traversal.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, beforeTraversal, 'invalid traversal filename must be rejected before DB access');

    await unlink(imageFilePath);
    const missingRequestId = 'q020-skin-asset-file-missing';
    const missing = await app.inject({
      method: 'GET',
      url: imageUrl,
      headers: { 'x-request-id': missingRequestId },
    });
    assert.equal(missing.statusCode, 404, missing.body);
    assert.deepEqual(missing.json().error, { code: 'NOT_FOUND', message: 'Image was not found' });
    assert.deepEqual(Object.keys(missing.json()).sort(), ['error', 'requestId']);
    assert.equal(missing.json().requestId, missingRequestId);
    assert.equal(missing.headers['x-request-id'], missingRequestId);
    assert.equal(missing.headers['content-type']?.split(';')[0], 'application/json');
    assert.doesNotMatch(missing.body, /\/tmp\/|bclick-skin-games-asset-errors/);
  } finally {
    if(app) await app.close();
    await rm(uploadDirectory,{recursive:true,force:true});
    if(blockedRootParent) await rm(blockedRootParent,{recursive:true,force:true});
  }
});


test('Skin Games image upload returns a safe generic error when persistent storage cannot be written', async () => {')));

    await app.close();
    app = null;

    blockedRootParent = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-asset-read-failure-'));
    blockedRoot = path.join(blockedRootParent,'not-a-directory');
    await writeFile(blockedRoot,'block the upload path');
    const failingApp = buildApp({
      database: null,
      catalogDatabase: fixture.database,
      identity: fakeIdentity(),
      identityConfig: config(),
      uploadDirectory: blockedRoot,
    });
    try {
      const failureRequestId = 'q020-skin-asset-read-failure';
      const failure = await failingApp.inject({
        method: 'GET',
        url: imageUrl,
        headers: { 'x-request-id': failureRequestId },
      });
      assert.equal(failure.statusCode, 500, failure.body);
      assert.deepEqual(failure.json().error, {
        code: 'INTERNAL_ERROR',
        message: 'The Skin Games request could not be completed',
      });
      assert.deepEqual(Object.keys(failure.json()).sort(), ['error', 'requestId']);
      assert.equal(failure.json().requestId, failureRequestId);
      assert.equal(failure.headers['x-request-id'], failureRequestId);
      assert.equal(failure.headers['content-type']?.split(';')[0], 'application/json');
      assert.doesNotMatch(failure.body, /ENOTDIR|not-a-directory|skin-games-asset-read-failure/);
    } finally {
      await failingApp.close();
    }
  } finally {
    if(app) await app.close();
    await rm(uploadDirectory,{recursive:true,force:true});
    if(blockedRootParent) await rm(blockedRootParent,{recursive:true,force:true});
  }
});

test('Skin Games image upload returns a safe generic error when persistent storage cannot be written', async () => {
  const fixture = fakeDatabase();
  const tempRoot = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-write-failure-'));
  const blockedDirectory = path.join(tempRoot,'not-a-directory');
  await writeFile(blockedDirectory,'block the upload path');
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
    uploadDirectory: blockedDirectory,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
      headers: { ...authHeaders(true), 'content-type': 'image/png' },
      payload: validPng64(),
    });
    assert.equal(response.statusCode, 500, response.body);
    assert.equal(response.json().error.code, 'INTERNAL_ERROR');
    assert.equal(response.json().error.message, 'The Skin Games request could not be completed');
    assert.doesNotMatch(response.body, /ENOTDIR|not-a-directory|skin-games-write-failure/);
  } finally {
    await app.close();
    await rm(tempRoot,{recursive:true,force:true});
  }
});
