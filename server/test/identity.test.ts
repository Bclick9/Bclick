import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';

import { parseIdentityConfig } from '../src/identity/config.js';
import {
  allowExactOrigin,
  base32Encode,
  buildCookie,
  createCsrfToken,
  encryptSecret,
  hashPassword,
  normalizeEmail,
  totpCode,
  verifyCsrfToken,
  verifyPassword,
  verifyTotp,
} from '../src/identity/crypto.js';
import { PgIdentityRepository } from '../src/identity/repository.js';
import { IdentityService } from '../src/identity/service.js';
import { buildApp } from '../src/app.js';

test('identity crypto primitives normalize identifiers, use RFC TOTP and bind CSRF context', async () => {
  assert.equal(normalizeEmail('  Admin@EXAMPLE.TEST  '), 'admin@example.test');
  assert.equal(base32Encode(Buffer.from([1, 2, 3])), 'AEBAG');
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpCode(rfcSecret, 59_000), '287082');
  assert.equal(verifyTotp(rfcSecret, '287082', 59_000), true);
  assert.equal(verifyTotp(rfcSecret, '000000', 59_000), false);

  const passwordHash = await hashPassword('a-long-local-test-password');
  assert.equal(await verifyPassword('a-long-local-test-password', passwordHash), true);
  assert.equal(await verifyPassword('a-different-test-password', passwordHash), false);

  const signingKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const playerToken = createCsrfToken('player', 'session-1', 1, signingKey);
  assert.equal(verifyCsrfToken(playerToken, 'player', 'session-1', 1, signingKey), true);
  assert.equal(verifyCsrfToken(playerToken, 'admin', 'session-1', 1, signingKey), false);
  assert.equal(verifyCsrfToken(playerToken, 'player', 'session-1', 2, signingKey), false);
  assert.equal(allowExactOrigin('https://localhost:5173', ['https://localhost:5173']), true);
  assert.equal(allowExactOrigin('https://localhost:5173/path', ['https://localhost:5173']), false);
  assert.equal(allowExactOrigin('https://evil.example', ['https://localhost:5173']), false);
  const cookie = buildCookie('__Host-bclick_admin_csrf', 'token');
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Strict/);
  assert.doesNotMatch(cookie, /Domain=/);
});

function cookieMapFromResponse(headers: string | string[] | undefined, existing: Record<string, string> = {}): Record<string, string> {
  const jar = { ...existing };
  if (!headers) return jar;
  const list = Array.isArray(headers) ? headers : [headers];
  for (const cookie of list) {
    const pair = cookie.split(';', 1)[0] ?? '';
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (/;\s*Max-Age=0(?:;|$)/i.test(cookie) || /;\s*Max-Age=0(?:;|$)/i.test(cookie.toLowerCase())) delete jar[name];
    else jar[name] = value;
  }
  return jar;
}
function cookieHeader(jar: Record<string, string>, names?: string[]): string {
  return Object.entries(jar).filter(([name]) => !names || names.includes(name))
    .map(([name, value]) => name + '=' + value).join('; ');
}
function csrfHeaders(jar: Record<string, string>, name: string, origin: string): Record<string, string> {
  return { cookie: cookieHeader(jar), origin, 'x-csrf-token': jar[name] ?? '' };
}

test('Identity runtime acceptance: browser-bound MFA, cross-context CSRF 403 and logout isolation', {
  timeout: 120_000,
}, async () => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const mailSinkPath = join(tmpdir(), 'bclick-identity-test-' + randomUUID() + '.jsonl');
  const identityEnvironment = {
    BCLICK_IDENTITY_ENABLED: 'true',
    BCLICK_SESSION_HASH_KEY: randomBytes(32).toString('hex'),
    BCLICK_CSRF_SIGNING_KEY: randomBytes(32).toString('hex'),
    BCLICK_TOTP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    BCLICK_PLAYER_ALLOWED_ORIGINS: 'https://localhost:5173',
    BCLICK_ADMIN_ALLOWED_ORIGINS: 'https://localhost:5174',
    BCLICK_LOCAL_MAIL_SINK_PATH: mailSinkPath,
    BCLICK_TERMS_VERSION: 'ci-terms-v1',
    BCLICK_AGE_POLICY_VERSION: 'ci-age-policy-v1',
  };
  const identityConfig = parseIdentityConfig(identityEnvironment, 'test');
  assert.ok(identityConfig, 'test-only Identity configuration must be enabled');
  let pool: Pool | undefined;
  let app: ReturnType<typeof buildApp> | undefined;

  const adminId = randomUUID();
  const playerId: string[] = [];
  const adminEmail = 'identity-' + randomUUID() + '@example.test';
  const adminPassword = 'Local-Identity-Test-Password-123!';
  const playerEmail = 'player-' + randomUUID() + '@example.test';
  const playerPassword = 'Local-Player-Test-Password-123!';
  let totpSecret = '';
  let playerJar: Record<string, string> = {};
  let activeAdminJar: Record<string, string> = {};
  let oldEnrollmentJar: Record<string, string> = {};

  try {
    await runner({
      databaseUrl,
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => undefined,
    });
    const database = new Pool({ connectionString: databaseUrl, max: 4 });
    pool = database;
    const repository = new PgIdentityRepository(database);
    const service = new IdentityService(repository, identityConfig);
    const appUnderTest = buildApp({ database, logLevel: 'silent', identity: service, identityConfig });
    app = appUnderTest;

    // Sensitive player endpoints must fail closed before any session exists.
    const anonymousProfile = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/player/profile',
    });
    assert.equal(anonymousProfile.statusCode, 401);
    assert.equal(anonymousProfile.json().error.code, 'UNAUTHORIZED');
    assert.equal(anonymousProfile.json().data, undefined, 'anonymous profile reads must return no player data');

    const anonymousProfileUpdate = await appUnderTest.inject({
      method: 'PATCH', url: '/api/v1/player/profile',
      headers: { origin: 'https://localhost:5173' },
      payload: { displayName: 'Must not be persisted' },
    });
    assert.equal(anonymousProfileUpdate.statusCode, 401);
    assert.equal(anonymousProfileUpdate.json().error.code, 'UNAUTHORIZED');
    assert.equal(anonymousProfileUpdate.json().data, undefined, 'anonymous profile mutations must return no player data');

    // Wallet APIs are not implemented yet; an unknown wallet endpoint must not return a public/demo wallet payload.
    const walletRouteNotImplemented = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/wallets',
    });
    assert.equal(walletRouteNotImplemented.statusCode, 404);
    assert.equal(walletRouteNotImplemented.json().data, undefined);

    await database.query(
      'INSERT INTO admin_users(id,email,email_normalized,display_name,password_hash,status,mfa_enabled,created_at,updated_at) VALUES ($1,$2,$2,$3,$4,$5,FALSE,now(),now())',
      [adminId, adminEmail, 'Test Project Admin', await hashPassword(adminPassword), 'active'],
    );
    await database.query(
      "INSERT INTO admin_role_assignments(admin_id,role_id) SELECT $1,id FROM roles WHERE code='project-admin'",
      [adminId],
    );

    // Q-001: missing, malformed, and duplicate admin-session cookies never authenticate.
    const missingAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
    });
    assert.equal(missingAdminSession.statusCode, 401);
    assert.equal(missingAdminSession.json().error.code, 'UNAUTHORIZED');

    const malformedAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: '__Host-bclick_admin_session=short' },
    });
    assert.equal(malformedAdminSession.statusCode, 401);

    const duplicateAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: {
        cookie: '__Host-bclick_admin_session=opaque-session-value-12345678901234567890; __Host-bclick_admin_session=another-opaque-session-value-1234567890',
      },
    });
    assert.equal(duplicateAdminSession.statusCode, 401);

    const blockedOrigin = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login', headers: { origin: 'https://evil.example' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(blockedOrigin.statusCode, 403, 'untrusted Origin must be denied');

    const consentRejected = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: {
        email: 'consent-' + randomUUID() + '@example.test',
        password: playerPassword,
        countryCode: 'TN',
        settlementCurrency: 'TND',
        dateOfBirth: '1990-01-01',
        acceptTerms: false,
        acceptAgeConfirmation: true,
        preferredLanguage: 'en',
      },
    });
    assert.equal(consentRejected.statusCode, 400, 'terms acceptance must be explicitly true');

    const underageRejected = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: {
        email: 'underage-' + randomUUID() + '@example.test',
        password: playerPassword,
        countryCode: 'TN',
        settlementCurrency: 'TND',
        dateOfBirth: '2020-01-01',
        acceptTerms: true,
        acceptAgeConfirmation: true,
        preferredLanguage: 'en',
      },
    });
    assert.equal(underageRejected.statusCode, 422, 'server-side age check must reject underage registration');

    const adminPasswordStep = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(adminPasswordStep.statusCode, 202);
    assert.equal(adminPasswordStep.json().data.status, 'enrollment_required');
    const adminChallengeId = String(adminPasswordStep.json().data.challengeId);
    let adminStepJar = cookieMapFromResponse(adminPasswordStep.headers['set-cookie']);
    assert.ok(adminStepJar['__Host-bclick_admin_challenge']);
    assert.ok(adminStepJar['__Host-bclick_admin_enrollment']);
    assert.ok(adminStepJar['__Host-bclick_admin_enrollment_csrf']);
    assert.match(String(adminPasswordStep.headers['set-cookie']), /HttpOnly/);
    oldEnrollmentJar = { ...adminStepJar };

    // A password-only/enrollment challenge is not a full authenticated admin session.
    assert.equal(adminStepJar['__Host-bclick_admin_session'], undefined);
    const enrollmentChallengeOnlySession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: cookieHeader(adminStepJar) },
    });
    assert.equal(enrollmentChallengeOnlySession.statusCode, 401);

    const setup = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/setup',
      headers: csrfHeaders(adminStepJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: {},
    });
    assert.equal(setup.statusCode, 201, setup.body);
    totpSecret = String(setup.json().data.secret);
    assert.ok(totpSecret.length >= 16);
    assert.match(String(setup.json().data.otpauthUri), /^otpauth:\/\/totp\//);
    assert.ok(!setup.body.includes(adminPassword));

    const enroll = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/verify',
      headers: csrfHeaders(adminStepJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: { code: totpCode(totpSecret) },
    });
    assert.equal(enroll.statusCode, 204, enroll.body);
    activeAdminJar = cookieMapFromResponse(enroll.headers['set-cookie'], adminStepJar);
    assert.ok(activeAdminJar['__Host-bclick_admin_session']);
    assert.ok(activeAdminJar['__Host-bclick_admin_csrf']);
    const adminSetCookies = Array.isArray(enroll.headers['set-cookie'])
      ? enroll.headers['set-cookie'] : [String(enroll.headers['set-cookie'] ?? '')];
    const adminSessionSetCookie = adminSetCookies.find((value) => value.startsWith('__Host-bclick_admin_session='));
    const adminCsrfSetCookie = adminSetCookies.find((value) => value.startsWith('__Host-bclick_admin_csrf='));
    assert.ok(adminSessionSetCookie, 'MFA completion must issue an admin session cookie');
    assert.match(adminSessionSetCookie, /SameSite=Strict/, 'Admin session cookie must be SameSite=Strict');
    assert.match(adminSessionSetCookie, /HttpOnly/, 'Admin session cookie must be HttpOnly');
    assert.ok(adminCsrfSetCookie, 'MFA completion must issue an admin CSRF cookie');
    assert.match(adminCsrfSetCookie, /SameSite=Strict/, 'Admin CSRF cookie must be SameSite=Strict');
    assert.doesNotMatch(adminCsrfSetCookie, /HttpOnly/, 'Admin CSRF cookie must remain JS-readable for the double-submit contract');
    assert.equal(activeAdminJar['__Host-bclick_admin_enrollment'], undefined);
    assert.equal(activeAdminJar['__Host-bclick_admin_enrollment_csrf'], undefined);
    assert.equal(activeAdminJar['__Host-bclick_admin_challenge'], undefined);

    const adminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: cookieHeader(activeAdminJar) },
    });
    assert.equal(adminSession.statusCode, 200, adminSession.body);
    assert.equal(adminSession.json().data.admin.status, 'active');
    assert.equal(adminSession.json().data.admin.displayName, 'Test Project Admin');
    assert.deepEqual(adminSession.json().data.mfa, { enabled: true, method: 'totp' });

    const registered = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: { email: playerEmail, password: playerPassword, countryCode: 'TN', settlementCurrency: 'TND', dateOfBirth: '1990-01-01', acceptTerms: true, acceptAgeConfirmation: true, preferredLanguage: 'en', username: ' Player.Test ', phoneNumber: '+21612345678' },
    });
    assert.equal(registered.statusCode, 201, registered.body);
    playerJar = cookieMapFromResponse(registered.headers['set-cookie']);
    playerId.push(String(registered.json().data.player.id));
    assert.ok(playerJar['__Host-bclick_session']);
    assert.ok(playerJar['__Host-bclick_player_csrf']);
    const playerSetCookies = Array.isArray(registered.headers['set-cookie'])
      ? registered.headers['set-cookie'] : [String(registered.headers['set-cookie'] ?? '')];
    const playerSessionSetCookie = playerSetCookies.find((value) => value.startsWith('__Host-bclick_session='));
    const playerCsrfSetCookie = playerSetCookies.find((value) => value.startsWith('__Host-bclick_player_csrf='));
    assert.ok(playerSessionSetCookie, 'Registration must issue a player session cookie');
    assert.match(playerSessionSetCookie, /SameSite=Lax/, 'Player session cookie must be SameSite=Lax');
    assert.match(playerSessionSetCookie, /HttpOnly/, 'Player session cookie must be HttpOnly');
    assert.ok(playerCsrfSetCookie, 'Registration must issue a player CSRF cookie');
    assert.match(playerCsrfSetCookie, /SameSite=Strict/, 'Player CSRF cookie remains SameSite=Strict');
    assert.doesNotMatch(playerCsrfSetCookie, /HttpOnly/, 'Player CSRF cookie must remain JS-readable for double submit');

    // Q-003 positive control: valid same-origin player CSRF authorizes the intended mutation.
    const sameOriginProfileUpdate = await appUnderTest.inject({
      method: 'PATCH', url: '/api/v1/player/profile',
      headers: csrfHeaders(playerJar, '__Host-bclick_player_csrf', 'https://localhost:5173'),
      payload: {
        displayName: 'Same-origin acceptance update',
        firstName: 'Ahmed',
        lastName: 'Test Player',
        gender: 'male',
        countryCode: 'TN',
        city: 'Tunis',
        address: 'Avenue Habib Bourguiba',
        phoneNumber: '+21612345678',
        postalCode: '1000',
      },
    });
    assert.equal(sameOriginProfileUpdate.statusCode, 200, sameOriginProfileUpdate.body);
    const returnedProfile = sameOriginProfileUpdate.json().data.player;
    assert.equal(returnedProfile.displayName, 'Same-origin acceptance update');
    assert.equal(returnedProfile.playerNumber, '436222976');
    assert.match(returnedProfile.playerNumber, /^\d{9,}$/);
    assert.equal(returnedProfile.firstName, 'Ahmed');
    assert.equal(returnedProfile.lastName, 'Test Player');
    assert.equal(returnedProfile.gender, 'male');
    assert.equal(returnedProfile.countryCode, 'TN');
    assert.equal(returnedProfile.city, 'Tunis');
    assert.equal(returnedProfile.address, 'Avenue Habib Bourguiba');
    assert.equal(returnedProfile.phoneNumber, '+21612345678');
    assert.equal(returnedProfile.postalCode, '1000');

    const persistedRegistration = await database.query(
      'SELECT player_number::text AS player_number, first_name, last_name, gender, country_code, city, address, phone_number_e164, postal_code, display_name, date_of_birth::text AS date_of_birth, terms_accepted_at IS NOT NULL AS terms_accepted, terms_version, age_confirmation_at IS NOT NULL AS age_confirmed, age_policy_version, preferred_language, username, username_normalized FROM players WHERE id=$1',
      [playerId[0]],
    );
    assert.deepEqual(persistedRegistration.rows[0], {
      player_number: '436222976',
      first_name: 'Ahmed',
      last_name: 'Test Player',
      gender: 'male',
      country_code: 'TN',
      city: 'Tunis',
      address: 'Avenue Habib Bourguiba',
      phone_number_e164: '+21612345678',
      postal_code: '1000',
      display_name: 'Same-origin acceptance update',
      date_of_birth: '1990-01-01',
      terms_accepted: true,
      terms_version: 'ci-terms-v1',
      age_confirmed: true,
      age_policy_version: 'ci-age-policy-v1',
      preferred_language: 'en',
      username: 'Player.Test',
      username_normalized: 'player.test',
    });
    const mirroredProfile = await database.query('SELECT display_name FROM player_profiles WHERE player_id=$1', [playerId[0]]);
    assert.equal(mirroredProfile.rows[0]?.display_name, 'Same-origin acceptance update');
    const mirroredCredential = await database.query('SELECT identifier_norm FROM player_credentials WHERE player_id=$1 AND kind=$2', [playerId[0], 'email_password']);
    assert.equal(mirroredCredential.rows[0]?.identifier_norm, playerEmail.toLowerCase());

    // The public player number must be globally unique and strictly increment for the next registration.
    const secondRegistered = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: {
        email: 'second-player-' + randomUUID() + '@example.test',
        password: playerPassword,
        countryCode: 'TN',
        settlementCurrency: 'TND',
        dateOfBirth: '1991-02-03',
        acceptTerms: true,
        acceptAgeConfirmation: true,
        preferredLanguage: 'en',
      },
    });
    assert.equal(secondRegistered.statusCode, 201, secondRegistered.body);
    assert.equal(secondRegistered.json().data.player.playerNumber, '436222977');
    assert.match(secondRegistered.json().data.player.playerNumber, /^\\d{9,}$/);

    // Acceptance 1: player CSRF material must not authorize an admin mutation.
    const playerTokenAtAdmin = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/logout',
      headers: {
        cookie: cookieHeader({
          '__Host-bclick_admin_session': activeAdminJar['__Host-bclick_admin_session']!,
          '__Host-bclick_player_csrf': playerJar['__Host-bclick_player_csrf']!,
        }),
        origin: 'https://localhost:5174',
        'x-csrf-token': playerJar['__Host-bclick_player_csrf']!,
      },
    });
    assert.equal(playerTokenAtAdmin.statusCode, 403);

    // Acceptance 2: admin CSRF material must not authorize a player mutation.
    const adminTokenAtPlayer = await appUnderTest.inject({
      method: 'PATCH', url: '/api/v1/player/profile',
      headers: {
        cookie: cookieHeader({
          '__Host-bclick_session': playerJar['__Host-bclick_session']!,
          '__Host-bclick_admin_csrf': activeAdminJar['__Host-bclick_admin_csrf']!,
        }),
        origin: 'https://localhost:5173',
        'x-csrf-token': activeAdminJar['__Host-bclick_admin_csrf']!,
      },
      payload: { displayName: 'Cross-context denied' },
    });
    assert.equal(adminTokenAtPlayer.statusCode, 403);

    // Acceptance 3: enrollment CSRF cannot authorize a full-admin mutation.
    const enrollmentTokenAtAdmin = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/logout',
      headers: {
        cookie: cookieHeader({
          '__Host-bclick_admin_session': activeAdminJar['__Host-bclick_admin_session']!,
          '__Host-bclick_admin_enrollment_csrf': oldEnrollmentJar['__Host-bclick_admin_enrollment_csrf']!,
        }),
        origin: 'https://localhost:5174',
        'x-csrf-token': oldEnrollmentJar['__Host-bclick_admin_enrollment_csrf']!,
      },
    });
    assert.equal(enrollmentTokenAtAdmin.statusCode, 403);

    // Acceptance 4: TOTP completion consumes the enrollment challenge and invalidates its old token.
    const replayedEnrollment = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/setup',
      headers: csrfHeaders(oldEnrollmentJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: {},
    });
    assert.equal(replayedEnrollment.statusCode, 401);

    // Acceptance 5: logging out one context does not revoke the other context.
    const firstAdminSessionToken = activeAdminJar['__Host-bclick_admin_session']!;
    const adminLogout = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/logout',
      headers: csrfHeaders(activeAdminJar, '__Host-bclick_admin_csrf', 'https://localhost:5174'),
    });
    assert.equal(adminLogout.statusCode, 204, adminLogout.body);

    const revokedFirstAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: cookieHeader({ '__Host-bclick_admin_session': firstAdminSessionToken }) },
    });
    assert.equal(revokedFirstAdminSession.statusCode, 401, 'revoked admin session must no longer resolve');

    activeAdminJar = cookieMapFromResponse(adminLogout.headers['set-cookie'], activeAdminJar);

    const playerStillActive = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader(playerJar) },
    });
    assert.equal(playerStillActive.statusCode, 200, playerStillActive.body);

    // Re-authenticate the admin so the converse can be checked independently.
    const secondPasswordStep = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(secondPasswordStep.statusCode, 202);
    assert.equal(secondPasswordStep.json().data.status, 'mfa_required');
    let secondAdminJar = cookieMapFromResponse(secondPasswordStep.headers['set-cookie']);
    const secondChallengeId = String(secondPasswordStep.json().data.challengeId);
    const secondChallengeBrowserToken = secondAdminJar['__Host-bclick_admin_challenge']!;
    assert.ok(secondChallengeBrowserToken, 'MFA-required login must set the browser-binding cookie');
    assert.equal(secondAdminJar['__Host-bclick_admin_session'], undefined);
    assert.equal(secondAdminJar['__Host-bclick_admin_enrollment'], undefined);
    assert.equal(secondAdminJar['__Host-bclick_admin_enrollment_csrf'], undefined);
    assert.equal(secondPasswordStep.headers['x-csrf-token-source'], undefined);

    const challengeOnlyMfaSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(challengeOnlyMfaSession.statusCode, 401, 'MFA challenge alone must not be a session');

    // A challenge ID from one browser must not be consumable with another browser's binding cookie.
    const competingPasswordStep = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(competingPasswordStep.statusCode, 202);
    assert.equal(competingPasswordStep.json().data.status, 'mfa_required');
    const competingAdminJar = cookieMapFromResponse(competingPasswordStep.headers['set-cookie']);
    const crossBrowserMfa = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: { cookie: cookieHeader(competingAdminJar), origin: 'https://localhost:5174' },
      payload: { challengeId: secondChallengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(crossBrowserMfa.statusCode, 401, 'challenge must be bound to its originating browser cookie');

    const secondMfa = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: { cookie: cookieHeader(secondAdminJar), origin: 'https://localhost:5174' },
      payload: { challengeId: secondChallengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(secondMfa.statusCode, 200, secondMfa.body);
    secondAdminJar = cookieMapFromResponse(secondMfa.headers['set-cookie'], secondAdminJar);

    const replayedMfaChallenge = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: {
        cookie: cookieHeader({ '__Host-bclick_admin_challenge': secondChallengeBrowserToken }),
        origin: 'https://localhost:5174',
      },
      payload: { challengeId: secondChallengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(replayedMfaChallenge.statusCode, 401, 'consumed MFA challenges must not be replayable');

    // Q-002: challenge expiry is enforced independently of the browser-binding proof.
    const expiredPasswordStep = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(expiredPasswordStep.statusCode, 202);
    const expiredChallengeId = String(expiredPasswordStep.json().data.challengeId);
    const expiredChallengeJar = cookieMapFromResponse(expiredPasswordStep.headers['set-cookie']);
    await database.query(
      "UPDATE admin_mfa_challenges SET created_at=now()-interval '10 minutes', expires_at=now()-interval '5 minutes' WHERE id=$1",
      [expiredChallengeId],
    );
    const expiredChallengeMfa = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: { cookie: cookieHeader(expiredChallengeJar), origin: 'https://localhost:5174' },
      payload: { challengeId: expiredChallengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(expiredChallengeMfa.statusCode, 401, 'expired challenges must not establish admin sessions');

    // A valid TOTP cannot bypass the per-challenge five-attempt ceiling.
    const boundedPasswordStep = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(boundedPasswordStep.statusCode, 202);
    const boundedChallengeId = String(boundedPasswordStep.json().data.challengeId);
    const boundedChallengeJar = cookieMapFromResponse(boundedPasswordStep.headers['set-cookie']);
    const currentTotp = totpCode(totpSecret);
    const wrongTotp = currentTotp === '000000' ? '000001' : '000000';
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const rejectedMfa = await appUnderTest.inject({
        method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
        headers: { cookie: cookieHeader(boundedChallengeJar), origin: 'https://localhost:5174' },
        payload: { challengeId: boundedChallengeId, factor: 'totp', code: wrongTotp },
      });
      assert.equal(rejectedMfa.statusCode, 401, `invalid TOTP attempt ${attempt} must be denied`);
    }
    const boundedAttempts = await database.query(
      'SELECT attempt_count, max_attempts FROM admin_mfa_challenges WHERE id=$1',
      [boundedChallengeId],
    );
    assert.equal(Number(boundedAttempts.rows[0]?.attempt_count), 5);
    assert.equal(Number(boundedAttempts.rows[0]?.max_attempts), 5);
    const correctCodeAfterLimit = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: { cookie: cookieHeader(boundedChallengeJar), origin: 'https://localhost:5174' },
      payload: { challengeId: boundedChallengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(correctCodeAfterLimit.statusCode, 401, 'attempt limit must remain enforced even for a later valid TOTP');

    const playerLogout = await appUnderTest.inject({
      method: 'POST', url: '/api/v1/auth/logout',
      headers: csrfHeaders(playerJar, '__Host-bclick_player_csrf', 'https://localhost:5173'),
    });
    assert.equal(playerLogout.statusCode, 204, playerLogout.body);
    const adminStillActive = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(adminStillActive.statusCode, 200, adminStillActive.body);

    // Q-001: permissions are resolved from current server-side role assignments, not session snapshots.
    await database.query('DELETE FROM admin_role_assignments WHERE admin_id=$1', [adminId]);
    const afterPermissionRevocation = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(afterPermissionRevocation.statusCode, 200, afterPermissionRevocation.body);
    assert.deepEqual(afterPermissionRevocation.json().data.roles, []);
    assert.deepEqual(afterPermissionRevocation.json().data.permissions, []);
    await database.query(
      "INSERT INTO admin_role_assignments(admin_id,role_id) SELECT $1,id FROM roles WHERE code='project-admin'",
      [adminId],
    );

    // A known locked/disabled account with a valid full session receives 403, not a success payload.
    await database.query("UPDATE admin_users SET status='locked' WHERE id=$1", [adminId]);
    const lockedAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(lockedAdminSession.statusCode, 403);
    assert.equal(lockedAdminSession.json().error.code, 'FORBIDDEN');

    await database.query("UPDATE admin_users SET status='disabled' WHERE id=$1", [adminId]);
    const disabledAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(disabledAdminSession.statusCode, 403);
    assert.equal(disabledAdminSession.json().error.code, 'FORBIDDEN');

    await database.query("UPDATE admin_users SET status='active' WHERE id=$1", [adminId]);
    const restoredAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(restoredAdminSession.statusCode, 200, restoredAdminSession.body);

    // Expired sessions are rejected even if a previously issued cookie is replayed.
    const liveSessionRows = await database.query(
      'SELECT id FROM admin_sessions WHERE admin_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [adminId],
    );
    assert.equal(liveSessionRows.rowCount, 1, 'expected a full admin session to expire in the test database');
    await database.query(
      "UPDATE admin_sessions SET created_at=now()-interval '2 minutes', authenticated_at=now()-interval '2 minutes', expires_at=now()-interval '1 minute' WHERE id=$1",
      [liveSessionRows.rows[0]!.id],
    );
    const expiredAdminSession = await appUnderTest.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(expiredAdminSession.statusCode, 401);
  } finally {
    try {
      if (app) await app.close();
      if (pool) {
        if (playerId[0]) {
          await pool.query("DELETE FROM audit_events WHERE actor_id=$1 OR subject_id=$1 OR actor_id=$2 OR subject_id=$2", [adminId, playerId[0]]).catch(() => undefined);
          await pool.query('DELETE FROM player_sessions WHERE player_id=$1', [playerId[0]]).catch(() => undefined);
          await pool.query('DELETE FROM admin_sessions WHERE admin_id=$1', [adminId]).catch(() => undefined);
          await pool.query('DELETE FROM admin_users WHERE id=$1', [adminId]).catch(() => undefined);
          await pool.query('DELETE FROM players WHERE id=$1', [playerId[0]]).catch(() => undefined);
        } else {
          await pool.query("DELETE FROM audit_events WHERE actor_id=$1 OR subject_id=$1", [adminId]).catch(() => undefined);
          await pool.query('DELETE FROM admin_users WHERE id=$1', [adminId]).catch(() => undefined);
        }
        await pool.end();
      }
    } finally {
      await container.stop();
      await unlink(mailSinkPath).catch(() => undefined);
    }
  }
});
