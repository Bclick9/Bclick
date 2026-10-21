import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { allowExactOrigin, buildCookie } from './crypto.js';
import type { IdentityConfig } from './config.js';
import { IdentityFault, IdentityService, type AuthSession, type IssuedSession } from './service.js';

const PLAYER_SESSION = '__Host-bclick_session';
const PLAYER_CSRF = '__Host-bclick_player_csrf';
const ADMIN_SESSION = '__Host-bclick_admin_session';
const ADMIN_CSRF = '__Host-bclick_admin_csrf';
const ADMIN_CHALLENGE = '__Host-bclick_admin_challenge';
const ADMIN_ENROLLMENT = '__Host-bclick_admin_enrollment';
const ENROLLMENT_CSRF = '__Host-bclick_admin_enrollment_csrf';

type CookieRead = { value: string | undefined; duplicate: boolean };
function readCookie(request: FastifyRequest, name: string): CookieRead {
  const header = request.headers.cookie;
  if (typeof header !== 'string') return { value: undefined, duplicate: false };
  let value: string | undefined;
  let duplicate = false;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const item = part.slice(index + 1).trim();
    if (key !== name) continue;
    if (value !== undefined) duplicate = true;
    else value = item;
  }
  return { value: duplicate ? undefined : value, duplicate };
}

function setCookies(reply: FastifyReply, cookies: string[]): void {
  if (cookies.length > 0) reply.header('Set-Cookie', cookies);
}
function clearCookie(name: string, httpOnly = false, sameSite: 'Strict' | 'Lax' = 'Strict'): string {
  return buildCookie(name, '', { maxAge: 0, httpOnly, sameSite });
}
function issuePlayerCookies(session: IssuedSession): string[] {
  return [
    buildCookie(PLAYER_SESSION, session.token, { maxAge: 30 * 86400, httpOnly: true, sameSite: 'Lax' }),
    buildCookie(PLAYER_CSRF, session.csrf, { maxAge: 30 * 86400, sameSite: 'Strict' }),
  ];
}
function issueAdminCookies(session: IssuedSession): string[] {
  return [
    buildCookie(ADMIN_SESSION, session.token, { maxAge: 8 * 3600, httpOnly: true, sameSite: 'Strict' }),
    buildCookie(ADMIN_CSRF, session.csrf, { maxAge: 8 * 3600, sameSite: 'Strict' }),
  ];
}
function sendError(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string): FastifyReply {
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}
async function safely(
  reply: FastifyReply,
  request: FastifyRequest,
  work: () => Promise<unknown>,
): Promise<unknown> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof IdentityFault) return sendError(reply, request, error.status, error.code, error.message);
    request.log.error({ requestId: request.id }, 'Identity operation failed');
    return sendError(reply, request, 500, 'INTERNAL_ERROR', 'The request could not be completed');
  }
}
function bodyObject(request: FastifyRequest): Record<string, unknown> {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    throw new IdentityFault(400, 'VALIDATION_ERROR', 'A JSON object body is required');
  }
  return request.body as Record<string, unknown>;
}
function playerResponse(player: Record<string, unknown>, requestId: string): Record<string, unknown> {
  return {
    data: {
      player: {
        id: player.id,
        email: player.email,
        displayName: player.display_name,
        countryCode: player.country_code,
        settlementCurrency: player.settlement_currency,
        preferredDisplayCurrency: player.preferred_display_currency,
        language: player.language,
        status: player.status,
        verificationStatus: player.verification_status,
      },
    },
    requestId,
  };
}
function fullAdminResponse(session: AuthSession, requestId: string): Record<string, unknown> {
  const admin = session.admin ?? {};
  return {
    data: {
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        status: admin.status,
      },
      roles: session.roles ?? [],
      permissions: session.permissions ?? [],
      mfa: { enabled: true, method: 'totp' },
      session: { authenticatedAt: session.authenticatedAt, expiresAt: session.expiresAt },
    },
    requestId,
  };
}

function originAllowed(request: FastifyRequest, config: IdentityConfig, context: 'player' | 'admin'): boolean {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
  return allowExactOrigin(origin, context === 'player' ? config.playerOrigins : config.adminOrigins);
}

function csrfValue(request: FastifyRequest, cookieName: string): string | null {
  const read = readCookie(request, cookieName);
  if (read.duplicate || !read.value) return null;
  const header = request.headers['x-csrf-token'];
  if (typeof header !== 'string' || header.length < 20 || header !== read.value) return null;
  return read.value;
}

async function requirePlayer(request: FastifyRequest, reply: FastifyReply, service: IdentityService, config: IdentityConfig, unsafe: boolean): Promise<AuthSession | null> {
  if (unsafe && !originAllowed(request, config, 'player')) {
    sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    return null;
  }
  const sessionCookie = readCookie(request, PLAYER_SESSION);
  if (sessionCookie.duplicate) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    return null;
  }
  const session = await service.resolveSession('player', sessionCookie.value);
  if (!session) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'A valid player session is required');
    return null;
  }
  if (session.status === 'suspended' || session.status === 'closed') {
    sendError(reply, request, 403, 'FORBIDDEN', 'Player account is not active');
    return null;
  }
  if (unsafe) {
    const token = csrfValue(request, PLAYER_CSRF);
    if (!token || !service.verifyCsrfForSession(session, token)) {
      sendError(reply, request, 403, 'CSRF_INVALID', 'CSRF validation failed');
      return null;
    }
  }
  return session;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply, service: IdentityService, config: IdentityConfig, unsafe: boolean): Promise<AuthSession | null> {
  if (unsafe && !originAllowed(request, config, 'admin')) {
    sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    return null;
  }
  const sessionCookie = readCookie(request, ADMIN_SESSION);
  if (sessionCookie.duplicate) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    return null;
  }
  const session = await service.resolveSession('admin', sessionCookie.value);
  if (!session) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'A valid administrator session is required');
    return null;
  }
  if (session.status !== 'active') {
    sendError(reply, request, 403, 'FORBIDDEN', 'Administrator account is not active');
    return null;
  }
  if (!session.mfaVerified || session.admin?.mfa_enabled !== true) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'Completed administrator MFA is required');
    return null;
  }
  if (unsafe) {
    const token = csrfValue(request, ADMIN_CSRF);
    if (!token || !service.verifyCsrfForSession(session, token)) {
      sendError(reply, request, 403, 'CSRF_INVALID', 'CSRF validation failed');
      return null;
    }
  }
  return session;
}

async function requireEnrollment(
  request: FastifyRequest,
  reply: FastifyReply,
  service: IdentityService,
  config: IdentityConfig,
): Promise<{ id: string; adminId: string; version: number } | null> {
  if (!originAllowed(request, config, 'admin')) {
    sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    return null;
  }
  const browser = readCookie(request, ADMIN_CHALLENGE);
  const enrollment = readCookie(request, ADMIN_ENROLLMENT);
  if (browser.duplicate || enrollment.duplicate) {
    sendError(reply, request, 403, 'CSRF_INVALID', 'Enrollment context is invalid');
    return null;
  }
  const context = await service.findEnrollment(browser.value, enrollment.value);
  if (!context) {
    sendError(reply, request, 401, 'UNAUTHORIZED', 'MFA enrollment is invalid or expired');
    return null;
  }
  const token = csrfValue(request, ENROLLMENT_CSRF);
  if (!token || !service.verifyCsrf('enrollment', context.id, context.version, token)) {
    sendError(reply, request, 403, 'CSRF_INVALID', 'Enrollment CSRF validation failed');
    return null;
  }
  return context;
}

export function registerIdentityRoutes(app: FastifyInstance, service: IdentityService, config: IdentityConfig): void {
  app.post('/api/v1/auth/register', { config: { rateLimit: false }, schema: { body: { type: 'object', additionalProperties: false, required: [
    'email', 'password', 'countryCode', 'settlementCurrency', 'dateOfBirth',
    'acceptTerms', 'acceptAgeConfirmation', 'preferredLanguage'
  ], properties: {
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: 12, maxLength: 1024 },
    countryCode: { type: 'string', pattern: '^[A-Z]{2}

  app.post('/api/v1/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.loginPlayer(String(body.email), String(body.password), request.id, request.ip);
    setCookies(reply, issuePlayerCookies(result.session));
    return reply.code(200).send(playerResponse(result.player, request.id));
  }));

  app.get('/api/v1/auth/session', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.post('/api/v1/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(PLAYER_SESSION, true, 'Lax'), clearCookie(PLAYER_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/player/profile', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.patch('/api/v1/player/profile', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: { displayName: { type: 'string', minLength: 1, maxLength: 80 }, language: { type: 'string', minLength: 2, maxLength: 12 } },
      },
    },
  }, async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const player = await service.updatePlayerProfile(session, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
    });
    return reply.code(200).send(playerResponse(player, request.id));
  }));

  app.post('/api/v1/auth/password-reset/request', { schema: { body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string', format: 'email', maxLength: 254 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.requestPasswordReset(String(body.email), request.ip);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/password-reset/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token','newPassword'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 }, newPassword: { type: 'string', minLength: 12, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmPasswordReset(String(body.token), String(body.newPassword));
    return reply.code(204).send();
  }));

  app.post('/api/v1/auth/email-verification/request', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.requestEmailVerification(session);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/email-verification/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmEmailVerification(String(body.token));
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.beginAdminLogin(String(body.email), String(body.password), request.id, request.ip);
    const cookies = [buildCookie(ADMIN_CHALLENGE, result.browserToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' })];
    if (result.status === 'enrollment_required' && result.enrollmentToken && result.enrollmentCsrf) {
      cookies.push(buildCookie(ADMIN_ENROLLMENT, result.enrollmentToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' }));
      cookies.push(buildCookie(ENROLLMENT_CSRF, result.enrollmentCsrf, { maxAge: 300, sameSite: 'Strict' }));
      reply.header('X-CSRF-Token-Source', ENROLLMENT_CSRF);
    } else {
      cookies.push(clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF));
    }
    setCookies(reply, cookies);
    return reply.code(202).send({ data: { status: result.status, challengeId: result.challengeId, expiresAt: result.expiresAt }, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['challengeId','factor','code'], properties: { challengeId: { type: 'string', format: 'uuid' }, factor: { type: 'string', enum: ['totp','recovery_code'] }, code: { type: 'string', minLength: 6, maxLength: 64 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const browser = readCookie(request, ADMIN_CHALLENGE);
    if (browser.duplicate || !browser.value) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Authentication challenge is invalid or expired');
    const result = await service.verifyAdminMfa({
      challengeId: String(body.challengeId), factor: String(body.factor) as 'totp' | 'recovery_code', code: String(body.code),
    }, browser.value, request.id, request.ip);
    const authenticated = await service.resolveSession('admin', result.session.token);
    if (!authenticated) return sendError(reply, request, 500, 'INTERNAL_ERROR', 'The administrator session could not be established');
    setCookies(reply, [
      clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
      ...issueAdminCookies(result.session),
    ]);
    return reply.code(200).send(fullAdminResponse(authenticated, request.id));
  }));

  app.post('/api/v1/admin/auth/mfa/totp/setup', async (request, reply) => safely(reply, request, async () => {
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const setup = await service.setupTotp(enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null, session, request.id);
    return reply.code(201).send({ data: setup, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/totp/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } } }, async (request, reply) => safely(reply, request, async () => {
    const body = bodyObject(request);
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const browser = readCookie(request, ADMIN_CHALLENGE);
    const enrollmentCookie = readCookie(request, ADMIN_ENROLLMENT);
    if (browser.duplicate || enrollmentCookie.duplicate) return sendError(reply, request, 403, 'CSRF_INVALID', 'Enrollment context is invalid');
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const result = await service.verifyTotpEnrollment(String(body.code),
      enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null,
      session, browser.value, enrollmentCookie.value, request.id);
    if (result.session) {
      setCookies(reply, [
        clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
        ...issueAdminCookies(result.session),
      ]);
    } else if (result.csrf && session) {
      setCookies(reply, [buildCookie(ADMIN_CSRF, result.csrf, { maxAge: 8 * 3600, sameSite: 'Strict' })]);
    }
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/mfa/recovery-codes', { schema: { body: { type: 'object', additionalProperties: false, required: ['totpCode','reason'], properties: { totpCode: { type: 'string', pattern: '^[0-9]{6}$' }, reason: { type: 'string', minLength: 8, maxLength: 500 } } } } }, async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const result = await service.regenerateRecoveryCodes(session, String(body.totpCode), String(body.reason), request.id);
    return reply.code(200).send({ data: result, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(ADMIN_SESSION, true), clearCookie(ADMIN_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/admin/session', async (request, reply) => safely(reply, request, async () => {
    const sessionCookie = readCookie(request, ADMIN_SESSION);
    if (sessionCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    const session = await service.resolveSession('admin', sessionCookie.value);
    if (!session) return sendError(reply, request, 401, 'UNAUTHORIZED', 'A valid administrator session is required');
    if (session.status !== 'active') return sendError(reply, request, 403, 'FORBIDDEN', 'Administrator account is not active');
    if (!session.mfaVerified || session.admin?.mfa_enabled !== true) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Completed administrator MFA is required');
    return reply.code(200).send(fullAdminResponse(session, request.id));
  }));
}
 },
    settlementCurrency: { type: 'string', enum: ['TND','EUR','USD'] },
    dateOfBirth: { type: 'string', format: 'date' },
    acceptTerms: { type: 'boolean', const: true },
    acceptAgeConfirmation: { type: 'boolean', const: true },
    preferredLanguage: { type: 'string', minLength: 2, maxLength: 12 },
    username: { type: ['string', 'null'], minLength: 1, maxLength: 64 },
    phoneNumber: { type: ['string', 'null'], pattern: '^\\+[1-9][0-9]{1,14}$' },

  app.post('/api/v1/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.loginPlayer(String(body.email), String(body.password), request.id, request.ip);
    setCookies(reply, issuePlayerCookies(result.session));
    return reply.code(200).send(playerResponse(result.player, request.id));
  }));

  app.get('/api/v1/auth/session', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.post('/api/v1/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(PLAYER_SESSION, true, 'Lax'), clearCookie(PLAYER_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/player/profile', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.patch('/api/v1/player/profile', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: { displayName: { type: 'string', minLength: 1, maxLength: 80 }, language: { type: 'string', minLength: 2, maxLength: 12 } },
      },
    },
  }, async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const player = await service.updatePlayerProfile(session, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
    });
    return reply.code(200).send(playerResponse(player, request.id));
  }));

  app.post('/api/v1/auth/password-reset/request', { schema: { body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string', format: 'email', maxLength: 254 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.requestPasswordReset(String(body.email), request.ip);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/password-reset/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token','newPassword'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 }, newPassword: { type: 'string', minLength: 12, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmPasswordReset(String(body.token), String(body.newPassword));
    return reply.code(204).send();
  }));

  app.post('/api/v1/auth/email-verification/request', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.requestEmailVerification(session);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/email-verification/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmEmailVerification(String(body.token));
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.beginAdminLogin(String(body.email), String(body.password), request.id, request.ip);
    const cookies = [buildCookie(ADMIN_CHALLENGE, result.browserToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' })];
    if (result.status === 'enrollment_required' && result.enrollmentToken && result.enrollmentCsrf) {
      cookies.push(buildCookie(ADMIN_ENROLLMENT, result.enrollmentToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' }));
      cookies.push(buildCookie(ENROLLMENT_CSRF, result.enrollmentCsrf, { maxAge: 300, sameSite: 'Strict' }));
      reply.header('X-CSRF-Token-Source', ENROLLMENT_CSRF);
    } else {
      cookies.push(clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF));
    }
    setCookies(reply, cookies);
    return reply.code(202).send({ data: { status: result.status, challengeId: result.challengeId, expiresAt: result.expiresAt }, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['challengeId','factor','code'], properties: { challengeId: { type: 'string', format: 'uuid' }, factor: { type: 'string', enum: ['totp','recovery_code'] }, code: { type: 'string', minLength: 6, maxLength: 64 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const browser = readCookie(request, ADMIN_CHALLENGE);
    if (browser.duplicate || !browser.value) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Authentication challenge is invalid or expired');
    const result = await service.verifyAdminMfa({
      challengeId: String(body.challengeId), factor: String(body.factor) as 'totp' | 'recovery_code', code: String(body.code),
    }, browser.value, request.id, request.ip);
    const authenticated = await service.resolveSession('admin', result.session.token);
    if (!authenticated) return sendError(reply, request, 500, 'INTERNAL_ERROR', 'The administrator session could not be established');
    setCookies(reply, [
      clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
      ...issueAdminCookies(result.session),
    ]);
    return reply.code(200).send(fullAdminResponse(authenticated, request.id));
  }));

  app.post('/api/v1/admin/auth/mfa/totp/setup', async (request, reply) => safely(reply, request, async () => {
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const setup = await service.setupTotp(enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null, session, request.id);
    return reply.code(201).send({ data: setup, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/totp/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } } }, async (request, reply) => safely(reply, request, async () => {
    const body = bodyObject(request);
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const browser = readCookie(request, ADMIN_CHALLENGE);
    const enrollmentCookie = readCookie(request, ADMIN_ENROLLMENT);
    if (browser.duplicate || enrollmentCookie.duplicate) return sendError(reply, request, 403, 'CSRF_INVALID', 'Enrollment context is invalid');
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const result = await service.verifyTotpEnrollment(String(body.code),
      enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null,
      session, browser.value, enrollmentCookie.value, request.id);
    if (result.session) {
      setCookies(reply, [
        clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
        ...issueAdminCookies(result.session),
      ]);
    } else if (result.csrf && session) {
      setCookies(reply, [buildCookie(ADMIN_CSRF, result.csrf, { maxAge: 8 * 3600, sameSite: 'Strict' })]);
    }
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/mfa/recovery-codes', { schema: { body: { type: 'object', additionalProperties: false, required: ['totpCode','reason'], properties: { totpCode: { type: 'string', pattern: '^[0-9]{6}$' }, reason: { type: 'string', minLength: 8, maxLength: 500 } } } } }, async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const result = await service.regenerateRecoveryCodes(session, String(body.totpCode), String(body.reason), request.id);
    return reply.code(200).send({ data: result, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(ADMIN_SESSION, true), clearCookie(ADMIN_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/admin/session', async (request, reply) => safely(reply, request, async () => {
    const sessionCookie = readCookie(request, ADMIN_SESSION);
    if (sessionCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    const session = await service.resolveSession('admin', sessionCookie.value);
    if (!session) return sendError(reply, request, 401, 'UNAUTHORIZED', 'A valid administrator session is required');
    if (session.status !== 'active') return sendError(reply, request, 403, 'FORBIDDEN', 'Administrator account is not active');
    if (!session.mfaVerified || session.admin?.mfa_enabled !== true) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Completed administrator MFA is required');
    return reply.code(200).send(fullAdminResponse(session, request.id));
  }));
}
 },
    preferredDisplayCurrency: { type: 'string', enum: ['TND','EUR','USD'] }
  } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.registerPlayer({
      email: String(body.email),
      password: String(body.password),
      countryCode: String(body.countryCode),
      settlementCurrency: String(body.settlementCurrency),
      dateOfBirth: String(body.dateOfBirth),
      acceptTerms: body.acceptTerms === true,
      acceptAgeConfirmation: body.acceptAgeConfirmation === true,
      preferredLanguage: String(body.preferredLanguage),
      username: body.username == null ? null : String(body.username),
      phoneNumber: body.phoneNumber == null ? null : String(body.phoneNumber),
      preferredDisplayCurrency: body.preferredDisplayCurrency ? String(body.preferredDisplayCurrency) : undefined,
    }, request.id, request.ip);
    setCookies(reply, issuePlayerCookies(result.session));
    return reply.code(201).send(playerResponse(result.player, request.id));
  }));

  app.post('/api/v1/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.loginPlayer(String(body.email), String(body.password), request.id, request.ip);
    setCookies(reply, issuePlayerCookies(result.session));
    return reply.code(200).send(playerResponse(result.player, request.id));
  }));

  app.get('/api/v1/auth/session', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.post('/api/v1/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(PLAYER_SESSION, true, 'Lax'), clearCookie(PLAYER_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/player/profile', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, false);
    if (!session) return;
    return reply.code(200).send(playerResponse(session.player ?? {}, request.id));
  }));

  app.patch('/api/v1/player/profile', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: { displayName: { type: 'string', minLength: 1, maxLength: 80 }, language: { type: 'string', minLength: 2, maxLength: 12 } },
      },
    },
  }, async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const player = await service.updatePlayerProfile(session, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
    });
    return reply.code(200).send(playerResponse(player, request.id));
  }));

  app.post('/api/v1/auth/password-reset/request', { schema: { body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string', format: 'email', maxLength: 254 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.requestPasswordReset(String(body.email), request.ip);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/password-reset/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token','newPassword'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 }, newPassword: { type: 'string', minLength: 12, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmPasswordReset(String(body.token), String(body.newPassword));
    return reply.code(204).send();
  }));

  app.post('/api/v1/auth/email-verification/request', async (request, reply) => safely(reply, request, async () => {
    const session = await requirePlayer(request, reply, service, config, true);
    if (!session) return;
    await service.requestEmailVerification(session);
    return reply.code(202).send();
  }));

  app.post('/api/v1/auth/email-verification/confirm', { schema: { body: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', minLength: 32, maxLength: 512 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'player')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    await service.confirmEmailVerification(String(body.token));
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/login', { schema: { body: { type: 'object', additionalProperties: false, required: ['email','password'], properties: { email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, maxLength: 1024 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const result = await service.beginAdminLogin(String(body.email), String(body.password), request.id, request.ip);
    const cookies = [buildCookie(ADMIN_CHALLENGE, result.browserToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' })];
    if (result.status === 'enrollment_required' && result.enrollmentToken && result.enrollmentCsrf) {
      cookies.push(buildCookie(ADMIN_ENROLLMENT, result.enrollmentToken, { maxAge: 300, httpOnly: true, sameSite: 'Strict' }));
      cookies.push(buildCookie(ENROLLMENT_CSRF, result.enrollmentCsrf, { maxAge: 300, sameSite: 'Strict' }));
      reply.header('X-CSRF-Token-Source', ENROLLMENT_CSRF);
    } else {
      cookies.push(clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF));
    }
    setCookies(reply, cookies);
    return reply.code(202).send({ data: { status: result.status, challengeId: result.challengeId, expiresAt: result.expiresAt }, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['challengeId','factor','code'], properties: { challengeId: { type: 'string', format: 'uuid' }, factor: { type: 'string', enum: ['totp','recovery_code'] }, code: { type: 'string', minLength: 6, maxLength: 64 } } } } }, async (request, reply) => safely(reply, request, async () => {
    if (!originAllowed(request, config, 'admin')) return sendError(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    const body = bodyObject(request);
    const browser = readCookie(request, ADMIN_CHALLENGE);
    if (browser.duplicate || !browser.value) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Authentication challenge is invalid or expired');
    const result = await service.verifyAdminMfa({
      challengeId: String(body.challengeId), factor: String(body.factor) as 'totp' | 'recovery_code', code: String(body.code),
    }, browser.value, request.id, request.ip);
    const authenticated = await service.resolveSession('admin', result.session.token);
    if (!authenticated) return sendError(reply, request, 500, 'INTERNAL_ERROR', 'The administrator session could not be established');
    setCookies(reply, [
      clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
      ...issueAdminCookies(result.session),
    ]);
    return reply.code(200).send(fullAdminResponse(authenticated, request.id));
  }));

  app.post('/api/v1/admin/auth/mfa/totp/setup', async (request, reply) => safely(reply, request, async () => {
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const setup = await service.setupTotp(enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null, session, request.id);
    return reply.code(201).send({ data: setup, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/mfa/totp/verify', { schema: { body: { type: 'object', additionalProperties: false, required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } } }, async (request, reply) => safely(reply, request, async () => {
    const body = bodyObject(request);
    const fullCookie = readCookie(request, ADMIN_SESSION);
    if (fullCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    let session: AuthSession | null = null;
    if (fullCookie.value) {
      session = await requireAdmin(request, reply, service, config, true);
      if (!session) return;
    }
    const browser = readCookie(request, ADMIN_CHALLENGE);
    const enrollmentCookie = readCookie(request, ADMIN_ENROLLMENT);
    if (browser.duplicate || enrollmentCookie.duplicate) return sendError(reply, request, 403, 'CSRF_INVALID', 'Enrollment context is invalid');
    const enrollment = session ? null : await requireEnrollment(request, reply, service, config);
    if (!session && !enrollment) return;
    const result = await service.verifyTotpEnrollment(String(body.code),
      enrollment ? { id: enrollment.id, adminId: enrollment.adminId } : null,
      session, browser.value, enrollmentCookie.value, request.id);
    if (result.session) {
      setCookies(reply, [
        clearCookie(ADMIN_CHALLENGE, true), clearCookie(ADMIN_ENROLLMENT, true), clearCookie(ENROLLMENT_CSRF),
        ...issueAdminCookies(result.session),
      ]);
    } else if (result.csrf && session) {
      setCookies(reply, [buildCookie(ADMIN_CSRF, result.csrf, { maxAge: 8 * 3600, sameSite: 'Strict' })]);
    }
    return reply.code(204).send();
  }));

  app.post('/api/v1/admin/auth/mfa/recovery-codes', { schema: { body: { type: 'object', additionalProperties: false, required: ['totpCode','reason'], properties: { totpCode: { type: 'string', pattern: '^[0-9]{6}$' }, reason: { type: 'string', minLength: 8, maxLength: 500 } } } } }, async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    const body = bodyObject(request);
    const result = await service.regenerateRecoveryCodes(session, String(body.totpCode), String(body.reason), request.id);
    return reply.code(200).send({ data: result, requestId: request.id });
  }));

  app.post('/api/v1/admin/auth/logout', async (request, reply) => safely(reply, request, async () => {
    const session = await requireAdmin(request, reply, service, config, true);
    if (!session) return;
    await service.revokeSession(session, request.id);
    setCookies(reply, [clearCookie(ADMIN_SESSION, true), clearCookie(ADMIN_CSRF)]);
    return reply.code(204).send();
  }));

  app.get('/api/v1/admin/session', async (request, reply) => safely(reply, request, async () => {
    const sessionCookie = readCookie(request, ADMIN_SESSION);
    if (sessionCookie.duplicate) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Session is invalid');
    const session = await service.resolveSession('admin', sessionCookie.value);
    if (!session) return sendError(reply, request, 401, 'UNAUTHORIZED', 'A valid administrator session is required');
    if (session.status !== 'active') return sendError(reply, request, 403, 'FORBIDDEN', 'Administrator account is not active');
    if (!session.mfaVerified || session.admin?.mfa_enabled !== true) return sendError(reply, request, 401, 'UNAUTHORIZED', 'Completed administrator MFA is required');
    return reply.code(200).send(fullAdminResponse(session, request.id));
  }));
}
