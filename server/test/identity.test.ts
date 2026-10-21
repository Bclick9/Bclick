import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

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
  skip: !process.env.DATABASE_URL,
}, async () => {
  const databaseUrl = process.env.DATABASE_URL!;
  const identityConfig = parseIdentityConfig(process.env, 'test');
  assert.ok(identityConfig, 'CI test environment must explicitly enable local Identity');
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PgIdentityRepository(pool);
  const service = new IdentityService(repository, identityConfig);
  const app = buildApp({ database: pool, logLevel: 'silent', identity: service, identityConfig });

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
    await pool.query(
      'INSERT INTO admin_users(id,email,email_normalized,display_name,password_hash,status,mfa_enabled,created_at,updated_at) VALUES ($1,$2,$2,$3,$4,$5,FALSE,now(),now())',
      [adminId, adminEmail, 'Test Project Admin', await hashPassword(adminPassword), 'active'],
    );
    await pool.query(
      "INSERT INTO admin_role_assignments(admin_id,role_id) SELECT $1,id FROM roles WHERE code='project-admin'",
      [adminId],
    );

    const blockedOrigin = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/login', headers: { origin: 'https://evil.example' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(blockedOrigin.statusCode, 403, 'untrusted Origin must be denied');

    const consentRejected = await app.inject({
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

    const underageRejected = await app.inject({
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

    const adminPasswordStep = await app.inject({
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

    const setup = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/setup',
      headers: csrfHeaders(adminStepJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: {},
    });
    assert.equal(setup.statusCode, 201, setup.body);
    totpSecret = String(setup.json().data.secret);
    assert.ok(totpSecret.length >= 16);
    assert.match(String(setup.json().data.otpauthUri), /^otpauth:\/\/totp\//);
    assert.ok(!setup.body.includes(adminPassword));

    const enroll = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/verify',
      headers: csrfHeaders(adminStepJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: { code: totpCode(totpSecret) },
    });
    assert.equal(enroll.statusCode, 204, enroll.body);
    activeAdminJar = cookieMapFromResponse(enroll.headers['set-cookie'], adminStepJar);
    assert.ok(activeAdminJar['__Host-bclick_admin_session']);
    assert.ok(activeAdminJar['__Host-bclick_admin_csrf']);
    assert.equal(activeAdminJar['__Host-bclick_admin_enrollment'], undefined);
    assert.equal(activeAdminJar['__Host-bclick_admin_enrollment_csrf'], undefined);
    assert.equal(activeAdminJar['__Host-bclick_admin_challenge'], undefined);

    const adminSession = await app.inject({
      method: 'GET', url: '/api/v1/admin/session',
      headers: { cookie: cookieHeader(activeAdminJar) },
    });
    assert.equal(adminSession.statusCode, 200, adminSession.body);
    assert.equal(adminSession.json().data.admin.status, 'active');
    assert.equal(adminSession.json().data.admin.displayName, 'Test Project Admin');
    assert.deepEqual(adminSession.json().data.mfa, { enabled: true, method: 'totp' });

    const registered = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      headers: { origin: 'https://localhost:5173' },
      payload: { email: playerEmail, password: playerPassword, countryCode: 'TN', settlementCurrency: 'TND', dateOfBirth: '1990-01-01', acceptTerms: true, acceptAgeConfirmation: true, preferredLanguage: 'en', username: ' Player.Test ', phoneNumber: '+21612345678' },
    });
    assert.equal(registered.statusCode, 201, registered.body);
    playerJar = cookieMapFromResponse(registered.headers['set-cookie']);
    playerId.push(String(registered.json().data.player.id));
    assert.ok(playerJar['__Host-bclick_session']);
    assert.ok(playerJar['__Host-bclick_player_csrf']);

    const persistedRegistration = await pool.query(
      'SELECT date_of_birth::text AS date_of_birth, terms_accepted_at IS NOT NULL AS terms_accepted, terms_version, age_confirmation_at IS NOT NULL AS age_confirmed, age_policy_version, preferred_language, username, username_normalized, phone_number_e164 FROM players WHERE id=$1',
      [playerId[0]],
    );
    assert.deepEqual(persistedRegistration.rows[0], {
      date_of_birth: '1990-01-01',
      terms_accepted: true,
      terms_version: 'ci-terms-v1',
      age_confirmed: true,
      age_policy_version: 'ci-age-policy-v1',
      preferred_language: 'en',
      username: 'Player.Test',
      username_normalized: 'player.test',
      phone_number_e164: '+21612345678',
    });

    // Acceptance 1: player CSRF material must not authorize an admin mutation.
    const playerTokenAtAdmin = await app.inject({
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
    const adminTokenAtPlayer = await app.inject({
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
    const enrollmentTokenAtAdmin = await app.inject({
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
    const replayedEnrollment = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/totp/setup',
      headers: csrfHeaders(oldEnrollmentJar, '__Host-bclick_admin_enrollment_csrf', 'https://localhost:5174'),
      payload: {},
    });
    assert.equal(replayedEnrollment.statusCode, 401);

    // Acceptance 5: logging out one context does not revoke the other context.
    const adminLogout = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/logout',
      headers: csrfHeaders(activeAdminJar, '__Host-bclick_admin_csrf', 'https://localhost:5174'),
    });
    assert.equal(adminLogout.statusCode, 204, adminLogout.body);
    activeAdminJar = cookieMapFromResponse(adminLogout.headers['set-cookie'], activeAdminJar);

    const playerStillActive = await app.inject({
      method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader(playerJar) },
    });
    assert.equal(playerStillActive.statusCode, 200, playerStillActive.body);

    // Re-authenticate the admin so the converse can be checked independently.
    const secondPasswordStep = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://localhost:5174' },
      payload: { email: adminEmail, password: adminPassword },
    });
    assert.equal(secondPasswordStep.statusCode, 202);
    assert.equal(secondPasswordStep.json().data.status, 'mfa_required');
    let secondAdminJar = cookieMapFromResponse(secondPasswordStep.headers['set-cookie']);
    const secondMfa = await app.inject({
      method: 'POST', url: '/api/v1/admin/auth/mfa/verify',
      headers: { cookie: cookieHeader(secondAdminJar), origin: 'https://localhost:5174' },
      payload: { challengeId: secondPasswordStep.json().data.challengeId, factor: 'totp', code: totpCode(totpSecret) },
    });
    assert.equal(secondMfa.statusCode, 200, secondMfa.body);
    secondAdminJar = cookieMapFromResponse(secondMfa.headers['set-cookie'], secondAdminJar);

    const playerLogout = await app.inject({
      method: 'POST', url: '/api/v1/auth/logout',
      headers: csrfHeaders(playerJar, '__Host-bclick_player_csrf', 'https://localhost:5173'),
    });
    assert.equal(playerLogout.statusCode, 204, playerLogout.body);
    const adminStillActive = await app.inject({
      method: 'GET', url: '/api/v1/admin/session', headers: { cookie: cookieHeader(secondAdminJar) },
    });
    assert.equal(adminStillActive.statusCode, 200, adminStillActive.body);
  } finally {
    await app.close();
    if (playerId[0]) {
      await pool.query("DELETE FROM audit_events WHERE actor_id=$1 OR subject_id=$1 OR actor_id=$2 OR subject_id=$2", [adminId, playerId[0]]).catch(() => undefined);
      await pool.query("DELETE FROM auth_sessions WHERE (principal_type='admin' AND principal_id=$1) OR (principal_type='player' AND principal_id=$2)", [adminId, playerId[0]]).catch(() => undefined);
      await pool.query('DELETE FROM admin_users WHERE id=$1', [adminId]).catch(() => undefined);
      await pool.query('DELETE FROM players WHERE id=$1', [playerId[0]]).catch(() => undefined);
    } else {
      await pool.query("DELETE FROM audit_events WHERE actor_id=$1 OR subject_id=$1", [adminId]).catch(() => undefined);
      await pool.query('DELETE FROM admin_users WHERE id=$1', [adminId]).catch(() => undefined);
    }
    await pool.end();
  }
});
