import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { createCsrfToken, verifyCsrfToken } from '../src/identity/crypto.js';
import type { IdentityConfig } from '../src/identity/config.js';
import type { AuthSession, IdentityService } from '../src/identity/service.js';
import type { SqlExecutor } from '../src/identity/repository.js';

const ADMIN_ORIGIN = 'http://localhost:5174';
const SESSION_COOKIE = '__Host-bclick_admin_session=admin-session';
const CSRF_TOKEN = createCsrfToken('admin', 'session-id', 1, 'b'.repeat(64));
const CSRF_COOKIE = '__Host-bclick_admin_csrf=' + CSRF_TOKEN;
const ADMIN_ID = '8d01ab53-7f9c-4e67-b4e8-64c5a409a7a9';
const PROVIDER_ID = '5a03f96c-a9cb-4f98-8a54-29af7a9f77c3';
const GAME_ID = 'ebc75e97-68a5-40f8-8177-65db54ace749';
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

function adminSession(permissions: string[] = [PERMISSION]): AuthSession {
  return {
    id: 'session-id',
    type: 'admin',
    principalId: ADMIN_ID,
    version: 1,
    authenticatedAt: '2026-10-22T10:00:00.000Z',
    expiresAt: '2026-10-22T18:00:00.000Z',
    status: 'active',
    admin: { id: ADMIN_ID, status: 'active', mfa_enabled: true },
    roles: ['project-admin'],
    permissions,
    mfaVerified: true,
  };
}

function fakeIdentity(permissions: string[] = [PERMISSION]) {
  const session = adminSession(permissions);
  return {
    async resolveSession(type: 'player' | 'admin', token: string | undefined) {
      return type === 'admin' && token === 'admin-session' ? session : null;
    },
    verifyCsrfForSession(currentSession: AuthSession, token: string) {
      return verifyCsrfToken(token, 'admin', currentSession.id, currentSession.version, config().csrfSigningKey);
    },
  } as unknown as IdentityService;
}

function fakeDatabase() {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values: [...values] });
      if (sql.includes('casino.provider-settings.access-denied')) {
        return { rows: [{ id: 'audit-id' }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_integration_settings')) {
        return {
          rows: [{
            source_code: 'bigbang',
            selected_mode: 'standard',
            updated_at: '2026-10-22T10:00:00.000Z',
            latest_status: 'succeeded',
            last_succeeded_at: '2026-10-22T10:00:00.000Z',
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM public.casino_providers p') && sql.includes('count(DISTINCT g.id)')) {
        return {
          rows: [{
            id: PROVIDER_ID, code: 'habanero', name: 'Habanero', enabled: true,
            updatedAt: '2026-10-22T10:00:00.000Z', totalGames: 20,
            sourceAvailableGames: 18, enabledGames: 17,
            standardTierEnabled: true, standardSourceAvailableGames: 18,
            premiumSourceAvailableGames: 0, premiumTierEnabled: false,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM public.casino_games g') && sql.includes('count(DISTINCT g.id)::text AS total')) {
        return { rows: [{ total: '1' }], rowCount: 1 };
      }
      if (sql.includes('FROM public.casino_games g') && sql.includes('AS "providerCode"')) {
        return {
          rows: [{
            id: GAME_ID,
            slug: 'hot-hot-fruit-habanero',
            title: 'Hot Hot Fruit',
            providerCode: 'habanero',
            providerName: 'Habanero',
            sourceAvailable: true,
            gameAvailable: true,
            enabled: true,
            providerEnabled: true,
            updatedAt: '2026-10-22T10:06:00.000Z',
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('WITH changed AS') && sql.includes('UPDATE public.casino_provider_tier_settings')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /CROSS JOIN audited/);
        return {
          rows: [{ code: String(values[0]), enabled: values[2], updatedAt: '2026-10-23T08:10:00.000Z' }],
          rowCount: 1,
        };
      }
      if (sql.includes('WITH changed AS') && sql.includes('UPDATE public.casino_providers')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /CROSS JOIN audited/);
        return {
          rows: [{
            id: PROVIDER_ID, code: String(values[0]), name: 'Habanero',
            enabled: values[1], updatedAt: '2026-10-22T10:05:00.000Z',
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('WITH changed AS') && sql.includes('UPDATE public.casino_games')) {
        assert.match(sql, /INSERT INTO public\.audit_events/);
        assert.match(sql, /CROSS JOIN audited/);
        return {
          rows: [{
            id: GAME_ID, slug: 'hot-hot-fruit-habanero', title: 'Hot Hot Fruit',
            enabled: values[1], updatedAt: '2026-10-22T10:06:00.000Z',
          }],
          rowCount: 1,
        };
      }
      throw new Error('Unexpected provider-control SQL in test: ' + sql);
    },
  } as unknown as SqlExecutor;
  return { database, calls };
}

function authHeaders(options: {
  csrf?: boolean;
  header?: boolean;
  origin?: string;
  cookieToken?: string;
  headerToken?: string;
} = {}) {
  const cookies = [SESSION_COOKIE];
  if (options.csrf !== false) cookies.push('__Host-bclick_admin_csrf=' + (options.cookieToken ?? CSRF_TOKEN));
  return {
    cookie: cookies.join('; '),
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.csrf !== false && options.header !== false
      ? { 'x-csrf-token': options.headerToken ?? options.cookieToken ?? CSRF_TOKEN }
      : {}),
  };
}

test('BigBang admin settings expose Standard only and explicitly keep Premium unavailable', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/settings',
      headers: { cookie: SESSION_COOKIE },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data.supportedTiers, ['standard']);
    assert.equal(response.json().data.selectedTier, 'standard');
    assert.equal(response.json().data.premiumAvailable, false);
    assert.equal(response.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});

test('provider listing is protected and reports separate provider and source availability counts', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/bigbang/providers' });
    assert.equal(denied.statusCode, 401);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/providers',
      headers: { cookie: SESSION_COOKIE },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data[0].enabled, true);
    assert.equal(response.json().data[0].sourceAvailableGames, 18);
    assert.equal(response.json().data[0].enabledGames, 17);
  } finally {
    await app.close();
  }
});

test('administrator without provider-settings permission is denied and the denial is audited', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(['admin.session.read']),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/settings',
      headers: { cookie: SESSION_COOKIE },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'FORBIDDEN');
    assert.equal(fixture.calls.length, 1);
    assert.match(fixture.calls[0]!.sql, /casino\.provider-settings\.access-denied/);
    assert.equal(fixture.calls[0]!.values[1], ADMIN_ID);
  } finally {
    await app.close();
  }
});

test('provider mutation rejects missing/hostile Origin and missing, mismatched or unsigned CSRF before database effects', async () => {
  const cases = [
    {
      name: 'missing Origin',
      headers: authHeaders(),
      code: 'ORIGIN_INVALID',
      message: 'Request Origin is not allowed',
    },
    {
      name: 'hostile Origin',
      headers: authHeaders({ origin: 'https://attacker.example' }),
      code: 'ORIGIN_INVALID',
      message: 'Request Origin is not allowed',
    },
    {
      name: 'missing CSRF header',
      headers: authHeaders({ origin: ADMIN_ORIGIN, header: false }),
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
    {
      name: 'mismatched CSRF cookie and header',
      headers: authHeaders({ origin: ADMIN_ORIGIN, headerToken: 'mismatched-csrf-value-123456789' }),
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
    {
      name: 'unsigned CSRF token',
      headers: authHeaders({
        origin: ADMIN_ORIGIN,
        cookieToken: 'unsigned-csrf-token-123456789',
        headerToken: 'unsigned-csrf-token-123456789',
      }),
      code: 'CSRF_INVALID',
      message: 'CSRF validation failed',
    },
  ];
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    for (const entry of cases) {
      const requestId = 'q020-bb-provider-' + entry.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/bigbang/providers/habanero',
        headers: { ...entry.headers, 'x-request-id': requestId },
        payload: { enabled: false },
      });
      assert.equal(response.statusCode, 403, entry.name + ': ' + response.body);
      assert.deepEqual(response.json().error, { code: entry.code, message: entry.message }, entry.name);
      assert.deepEqual(Object.keys(response.json()).sort(), ['error', 'requestId'], entry.name);
      assert.equal(response.json().requestId, requestId, entry.name);
      assert.equal(response.headers['x-request-id'], requestId, entry.name);
      assert.equal(response.headers['content-type']?.split(';')[0], 'application/json', entry.name);
      assert.equal(fixture.calls.length, 0, entry.name + ': denied request must not query, mutate or audit-success');
    }
  } finally {
    await app.close();
  }
});

test('provider mutation denies insufficient RBAC with an audited 403 before any update', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(['admin.session.read']),
    identityConfig: config(),
  });
  const requestId = 'q020-bb-provider-rbac-denied';
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/bigbang/providers/habanero',
      headers: { ...authHeaders({ origin: ADMIN_ORIGIN }), 'x-request-id': requestId },
      payload: { enabled: false },
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
    assert.equal(fixture.calls.length, 1, 'RBAC denial must only append its denial audit');
    assert.match(fixture.calls[0]!.sql, /casino\.provider-settings\.access-denied/);
    assert.equal(fixture.calls[0]!.values[1], ADMIN_ID);
    assert.equal(fixture.calls.some((call) => call.sql.includes('UPDATE public.casino_providers')), false);
  } finally {
    await app.close();
  }
});

test('provider disable is persisted with an atomic audit record', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const requestId = 'q020-bb-provider-disable-success';
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/bigbang/providers/habanero',
      headers: { ...authHeaders({ origin: ADMIN_ORIGIN }), 'x-request-id': requestId },
      payload: { enabled: false },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(Object.keys(response.json()).sort(), ['data', 'requestId']);
    assert.deepEqual(response.json().data, {
      id: PROVIDER_ID,
      code: 'habanero',
      name: 'Habanero',
      enabled: false,
      updatedAt: '2026-10-22T10:05:00.000Z',
    });
    assert.equal(response.json().requestId, requestId);
    assert.equal(response.headers['x-request-id'], requestId);
    assert.equal(response.headers['content-type']?.split(';')[0], 'application/json');
    assert.equal(fixture.calls.length, 1);
    const call = fixture.calls[0]!;
    assert.match(call.sql, /UPDATE public\.casino_providers/);
    assert.match(call.sql, /INSERT INTO public\.audit_events/);
    assert.deepEqual(call.values.slice(0, 3), ['habanero', false, ADMIN_ID]);
    assert.equal(call.values[4], 'casino.provider.disabled');
  } finally {
    await app.close();
  }
});

test('game disable is persisted with an atomic audit record', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/bigbang/games/' + GAME_ID,
      headers: authHeaders({ origin: ADMIN_ORIGIN }),
      payload: { enabled: false },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.enabled, false);
    assert.equal(fixture.calls.length, 1);
    const call = fixture.calls[0]!;
    assert.match(call.sql, /UPDATE public\.casino_games/);
    assert.match(call.sql, /source_mode='standard'/);
    assert.match(call.sql, /INSERT INTO public\.audit_events/);
    assert.deepEqual(call.values.slice(0, 3), [GAME_ID, false, ADMIN_ID]);
    assert.equal(call.values[4], 'casino.game.disabled');
  } finally {
    await app.close();
  }
});


test('provider list exposes independent Standard and fail-closed Premium tier controls', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/providers',
      headers: { cookie: SESSION_COOKIE },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data[0].tiers.standard.enabled, true);
    assert.equal(response.json().data[0].tiers.standard.sourceAvailableGames, 18);
    assert.equal(response.json().data[0].tiers.premium.enabled, false);
    assert.equal(response.json().data[0].tiers.premium.available, false);
  } finally {
    await app.close();
  }
});

test('Standard provider tier can be disabled with an audit event, but Premium tier stays unavailable', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/bigbang/providers/habanero/tiers/standard',
      headers: authHeaders({ origin: ADMIN_ORIGIN }),
      payload: { enabled: false },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().data, {
      code: 'habanero', mode: 'standard', enabled: false, updatedAt: '2026-10-23T08:10:00.000Z',
    });
    const tierMutation = fixture.calls.find((call) => call.sql.includes('UPDATE public.casino_provider_tier_settings'));
    assert.ok(tierMutation);
    assert.match(tierMutation.sql, /INSERT INTO public\.audit_events/);
    assert.deepEqual(tierMutation.values.slice(0, 4), ['habanero', 'standard', false, ADMIN_ID]);

    const callsBeforePremium = fixture.calls.length;
    const premium = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/bigbang/providers/habanero/tiers/premium',
      headers: authHeaders({ origin: ADMIN_ORIGIN }),
      payload: { enabled: true },
    });
    assert.equal(premium.statusCode, 409);
    assert.equal(premium.json().error.code, 'PREMIUM_NOT_AVAILABLE');
    assert.equal(fixture.calls.length, callsBeforePremium);
  } finally {
    await app.close();
  }
});


test('Q-020 admin BigBang games GET has direct success, permission-denial and schema-negative route evidence', async () => {
  const fixture = fakeDatabase();
  const app = buildApp({
    database: null,
    catalogDatabase: fixture.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/games?page=1&pageSize=25&providerCode=habanero&query=Hot',
      headers: { cookie: SESSION_COOKIE, 'x-request-id': 'q020-admin-games-ok' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['x-request-id'], 'q020-admin-games-ok');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(response.json().data, [{
      id: GAME_ID,
      slug: 'hot-hot-fruit-habanero',
      title: 'Hot Hot Fruit',
      provider: { code: 'habanero', name: 'Habanero' },
      sourceAvailable: true,
      catalogAvailable: true,
      enabled: true,
      providerEnabled: true,
      updatedAt: '2026-10-22T10:06:00.000Z',
    }]);
    assert.deepEqual(response.json().page, { page: 1, pageSize: 25, total: 1, nextPage: null });
    assert.equal(fixture.calls.length, 2, 'the list endpoint should make only count and page queries');
    assert.deepEqual(fixture.calls[0]!.values, ['habanero', '%Hot%']);
    assert.match(fixture.calls[0]!.sql, /p\.code=\$1/);
    assert.match(fixture.calls[0]!.sql, /g\.title ILIKE \$2/);
    assert.deepEqual(fixture.calls[1]!.values, ['habanero', '%Hot%', 25, 0]);
    assert.doesNotMatch(fixture.calls[1]!.sql, /Hot/);
  } finally {
    await app.close();
  }

  const missingSessionDb = fakeDatabase();
  const missingSessionApp = buildApp({
    database: null,
    catalogDatabase: missingSessionDb.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const denied = await missingSessionApp.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/games',
    });
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.json().error.code, 'UNAUTHORIZED');
    assert.equal(missingSessionDb.calls.length, 0, 'anonymous GET must not query game data');
  } finally {
    await missingSessionApp.close();
  }

  const insufficientPermissionDb = fakeDatabase();
  const insufficientPermissionApp = buildApp({
    database: null,
    catalogDatabase: insufficientPermissionDb.database,
    identity: fakeIdentity([]),
    identityConfig: config(),
  });
  try {
    const denied = await insufficientPermissionApp.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/games',
      headers: { cookie: SESSION_COOKIE },
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.json().error.code, 'FORBIDDEN');
    assert.ok(insufficientPermissionDb.calls.some((call) => call.sql.includes('casino.provider-settings.access-denied')));
  } finally {
    await insufficientPermissionApp.close();
  }

  const schemaDb = fakeDatabase();
  const schemaApp = buildApp({
    database: null,
    catalogDatabase: schemaDb.database,
    identity: fakeIdentity(),
    identityConfig: config(),
  });
  try {
    const invalid = await schemaApp.inject({
      method: 'GET',
      url: '/api/v1/admin/bigbang/games?pageSize=101',
      headers: { cookie: SESSION_COOKIE, 'x-request-id': 'q020-admin-games-invalid' },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, 'VALIDATION_ERROR');
    assert.equal(invalid.json().requestId, 'q020-admin-games-invalid');
    assert.equal(invalid.headers['x-request-id'], 'q020-admin-games-invalid');
    assert.equal(schemaDb.calls.length, 0, 'invalid paging must be rejected before DB access');
  } finally {
    await schemaApp.close();
  }
});
