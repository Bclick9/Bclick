import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import type { IdentityConfig } from '../src/identity/config.js';
import type { AuthSession, IdentityService } from '../src/identity/service.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const ADMIN_ORIGIN = 'http://localhost:5174';
const SESSION_COOKIE = '__Host-bclick_admin_session=admin-session';
const CSRF_COOKIE = '__Host-bclick_admin_csrf=csrf-token-value-123456789';
const ADMIN_ID = '8d01ab53-7f9c-4e67-b4e8-64c5a409a7a9';
const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';
const PREMIUM_GAME_ID = 'df2c7acb-ae64-4d2a-9b8c-7c5e0e3aa7bc';
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

function fakeIdentity() {
  const session: AuthSession = {
    id: 'session-id',
    type: 'admin',
    principalId: ADMIN_ID,
    version: 1,
    authenticatedAt: '2026-10-23T08:00:00.000Z',
    expiresAt: '2026-10-23T16:00:00.000Z',
    status: 'active',
    admin: { id: ADMIN_ID, status: 'active', mfa_enabled: true },
    roles: ['project-admin'],
    permissions: [PERMISSION],
    mfaVerified: true,
  };
  return {
    async resolveSession(type: 'player' | 'admin', token: string | undefined) {
      return type === 'admin' && token === 'admin-session' ? session : null;
    },
    verifyCsrfForSession(_session: AuthSession, token: string) {
      return token === 'csrf-token-value-123456789';
    },
  } as unknown as IdentityService;
}

function authHeaders(unsafe = false) {
  return {
    cookie: SESSION_COOKIE + '; ' + CSRF_COOKIE,
    ...(unsafe ? {
      origin: ADMIN_ORIGIN,
      'x-csrf-token': 'csrf-token-value-123456789',
    } : {}),
  };
}

type FakeGame = {
  id: string;
  slug: string;
  title: string;
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
  updatedAt: string;
  updatedBy: string | null;
};

function fakeDatabase(options: { mode?: 'standard' | 'premium'; providerEnabled?: boolean; providerTierEnabled?: boolean; sourceAvailable?: boolean; catalogAvailable?: boolean; listFailure?: { code: string; message: string } } = {}) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const mode = options.mode ?? 'standard';
  let currentCustomImageKey: string | null = null;
  const row: FakeGame = {
    id: mode === 'standard' ? GAME_ID : PREMIUM_GAME_ID,
    slug: mode === 'standard' ? 'hot-hot-fruit-habanero' : 'hot-hot-fruit-habanero-premium',
    title: 'Hot Hot Fruit',
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
    updatedAt: '2026-10-23T08:00:00.000Z',
    updatedBy: null,
  };

  const database = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
      if (sql.includes('casino.provider-settings.access-denied')) {
        return { rows: [{ id: 'audit-id' }], rowCount: 1 };
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
      if (sql.includes('WITH lock AS MATERIALIZED')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /bclick\.skin-games\.display-order/);
        assert.match(sql, /ON CONFLICT \(game_id\) DO UPDATE/);
        return { rows: [{ mode: row.sourceMode, displayOrder: 200 }], rowCount: 1 };
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

test('Skin Games description and per-game availability are persisted with audit actor', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config() });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID,
      headers: { ...authHeaders(true), 'content-type': 'application/json' },
      payload: { enabled: false, description: 'Operator description' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.id, GAME_ID);
    const update = fixture.calls.find((call) => call.sql.includes('game_change AS'));
    assert.ok(update);
    assert.match(update.sql, /availability_updated_by=CASE/);
    assert.match(update.sql, /description_override=CASE/);
    assert.match(update.sql, /INSERT INTO public\.audit_events/);
    assert.deepEqual(update.values.slice(0, 6), [GAME_ID, false, true, 'Operator description', false, ADMIN_ID]);
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

test('Skin Games uploads a validated persistent image and serves it without a blob URL', async () => {
  const fixture = fakeDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(),'bclick-skin-games-'));
  const app = buildApp({ database: null, catalogDatabase: fixture.database, identity: fakeIdentity(), identityConfig: config(), uploadDirectory });
  try {
    const image = validPng64();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/casino/skin-games/' + GAME_ID + '/image',
      headers: { ...authHeaders(true), 'content-type': 'image/png' },
      payload: image,
    });
    assert.equal(response.statusCode, 201, response.body);
    const data = response.json().data;
    assert.equal(data.gameId, GAME_ID);
    assert.equal(data.contentType, 'image/png');
    assert.match(data.customImageUrl, /^\/api\/v1\/assets\/casino-games\//);
    assert.equal(data.customImageUrl.includes('blob:'), false);

    const read = await app.inject({ method: 'GET', url: data.customImageUrl });
    assert.equal(read.statusCode, 200, read.body);
    assert.equal(read.headers['content-type'], 'image/png');
    assert.equal(read.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(read.rawPayload, image);
  } finally {
    await app.close();
    await rm(uploadDirectory,{recursive:true,force:true});
  }
});
