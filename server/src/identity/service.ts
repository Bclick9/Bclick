import { appendFile, chmod, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';

import {
  base32Encode, createCsrfToken, decryptSecret, encryptSecret, hashPassword,
  normalizeEmail, opaqueToken, recoveryCode, tokenHash, verifyCsrfToken,
  verifyPassword, verifyTotp, type CsrfContext,
} from './crypto.js';
import type { IdentityConfig } from './config.js';
import { PgIdentityRepository } from './repository.js';

export class IdentityFault extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'IdentityFault';
  }
}
export interface IssuedSession {
  id: string; token: string; csrf: string; expiresAt: string; version: number;
}
export interface AuthSession {
  id: string; type: 'player' | 'admin'; principalId: string; version: number;
  authenticatedAt: string; expiresAt: string; status: string;
  player?: Record<string, unknown>; admin?: Record<string, unknown>;
  roles?: string[]; permissions?: string[]; mfaVerified: boolean;
}
interface DbRow extends QueryResultRow { [key: string]: unknown; }
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export class IdentityService {
  constructor(readonly repository: PgIdentityRepository, readonly config: IdentityConfig) {}

  private hash(value: string): string { return tokenHash(value, this.config.sessionHashKey); }
  createCsrf(context: CsrfContext, bindingId: string, version = 1): string {
    return createCsrfToken(context, bindingId, version, this.config.csrfSigningKey);
  }
  verifyCsrf(context: CsrfContext, bindingId: string, version: number, token: string): boolean {
    return verifyCsrfToken(token, context, bindingId, version, this.config.csrfSigningKey);
  }

  private async allowAttempt(scope: string, subject: string, windowSeconds: number, maximum: number): Promise<boolean> {
    const result = await this.repository.query<DbRow>(`INSERT INTO rate_limits(scope, subject_hash, window_started_at, attempt_count)
      VALUES ($1, $2, now(), 1)
      ON CONFLICT(scope, subject_hash) DO UPDATE SET
        attempt_count = CASE WHEN rate_limits.window_started_at <= now() - make_interval(secs => $3::int)
          THEN 1 ELSE rate_limits.attempt_count + 1 END,
        window_started_at = CASE WHEN rate_limits.window_started_at <= now() - make_interval(secs => $3::int)
          THEN now() ELSE rate_limits.window_started_at END
      RETURNING attempt_count`, [scope, this.hash(subject), windowSeconds]);
    return Number(result.rows[0]?.attempt_count ?? maximum + 1) <= maximum;
  }

  private async audit(tx: PoolClient, action: string, actorType: 'player' | 'admin' | 'system',
    actorId: string | null, subjectType: string | null, subjectId: string | null,
    outcome: 'success' | 'denied' | 'failure', requestId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await tx.query(`INSERT INTO audit_events
      (id, action, actor_type, actor_id, subject_type, subject_id, outcome, request_id, metadata, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())`,
    [randomUUID(), action, actorType, actorId, subjectType, subjectId, outcome, requestId, JSON.stringify(metadata)]);
  }

  private async emitLocalMail(kind: string, recipient: string, token: string): Promise<void> {
    if (this.config.nodeEnv !== 'development' && this.config.nodeEnv !== 'test') return;
    const path = resolve(this.config.mailSinkPath);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const line = JSON.stringify({ createdAt: new Date().toISOString(), kind, recipient, token,
      note: 'LOCAL DEVELOPMENT MAIL SINK ONLY. Do not use outside local testing.' }) + '\n';
    await appendFile(path, line, { encoding: 'utf8', mode: 0o600 });
    await chmod(path, 0o600);
  }

  private async createSession(tx: PoolClient, type: 'player' | 'admin', principalId: string, mfaVerified: boolean): Promise<IssuedSession> {
    const id = randomUUID();
    const token = opaqueToken();
    const version = 1;
    const now = new Date();
    const expires = new Date(now.getTime() + (type === 'player' ? 30 * 86400_000 : 8 * 3600_000));
    if (type === 'player') {
      await tx.query(`INSERT INTO player_sessions
        (id, player_id, token_hash, session_version, created_at, authenticated_at, expires_at)
        VALUES ($1,$2,$3,$4,$5,$5,$6)`,
      [id, principalId, this.hash(token), version, now, expires]);
    } else {
      await tx.query(`INSERT INTO admin_sessions
        (id, admin_id, token_hash, session_version, created_at, authenticated_at, expires_at, mfa_verified)
        VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
      [id, principalId, this.hash(token), version, now, expires, mfaVerified]);
    }
    return { id, token, csrf: this.createCsrf(type === 'player' ? 'player' : 'admin', id, version), expiresAt: expires.toISOString(), version };
  }

  async registerPlayer(input: {
    email: string;
    password: string;
    countryCode: string;
    settlementCurrency: string;
    dateOfBirth: string;
    acceptTerms: boolean;
    acceptAgeConfirmation: boolean;
    preferredLanguage: string;
    username?: string | null | undefined;
    phoneNumber?: string | null | undefined;
    preferredDisplayCurrency?: string | undefined;
  }, requestId: string, remoteAddress: string): Promise<{ player: Record<string, unknown>; session: IssuedSession }> {
    const email = normalizeEmail(input.email);
    if (input.acceptTerms !== true || input.acceptAgeConfirmation !== true) {
      throw new IdentityFault(422, 'CONSENT_REQUIRED', 'Terms acceptance and age confirmation are required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth) || input.dateOfBirth.startsWith('0000')) {
      throw new IdentityFault(422, 'DATE_OF_BIRTH_INVALID', 'Date of birth must be a valid ISO date');
    }
    const parsedDob = new Date(input.dateOfBirth + 'T00:00:00.000Z');
    if (!Number.isFinite(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== input.dateOfBirth) {
      throw new IdentityFault(422, 'DATE_OF_BIRTH_INVALID', 'Date of birth must be a valid calendar date');
    }

    const username = input.username == null ? null : input.username.trim();
    if (username !== null && (username.length < 1 || username.length > 64)) {
      throw new IdentityFault(422, 'USERNAME_INVALID', 'Username must contain between 1 and 64 characters');
    }
    const usernameNormalized = username === null ? null : username.toLowerCase();
    const phoneNumber = input.phoneNumber == null ? null : input.phoneNumber.trim();
    if (phoneNumber !== null && !/^\+[1-9][0-9]{1,14}$/.test(phoneNumber)) {
      throw new IdentityFault(422, 'PHONE_INVALID', 'Phone number must use E.164 format');
    }

    if (!(await this.allowAttempt('player-register-ip', remoteAddress, 900, 20))) {
      throw new IdentityFault(429, 'RATE_LIMITED', 'Too many registration attempts');
    }
    const passwordHash = await hashPassword(input.password);
    let tokenForMail = '';
    let created: { player: Record<string, unknown>; session: IssuedSession };
    try {
      created = await this.repository.transaction(async (tx) => {
        const ageCheck = await tx.query<DbRow>(
          "SELECT $1::date <= (((now() AT TIME ZONE 'UTC')::date - INTERVAL '18 years')::date) AS meets_age_requirement",
          [input.dateOfBirth],
        );
        if (ageCheck.rows[0]?.meets_age_requirement !== true) {
          throw new IdentityFault(422, 'AGE_REQUIREMENT_NOT_MET', 'Players must be at least 18 years old to register');
        }

        const id = randomUUID();
        const name = email.split('@')[0]!.slice(0, 80) || 'Player';
        const inserted = await tx.query<DbRow>(`INSERT INTO players
          (id,email,email_normalized,password_hash,display_name,country_code,settlement_currency,
           language,preferred_language,preferred_display_currency,status,verification_status,email_verification_status,
           date_of_birth,terms_accepted_at,terms_version,age_confirmation_at,age_policy_version,
           username,username_normalized,phone_number_e164,created_at,updated_at)
          VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$7,$8,'pending','pending','pending',
                  $9,now(),$10,now(),$11,$12,$13,$14,now(),now())
          RETURNING id,email,player_number,display_name,first_name,last_name,gender,country_code,city,address,
                    phone_number_e164,postal_code,settlement_currency,language,preferred_language,
                    preferred_display_currency,status,verification_status,email_verification_status,created_at,updated_at`,
        [
          id, email, passwordHash, name, input.countryCode, input.settlementCurrency,
          input.preferredLanguage, input.preferredDisplayCurrency ?? null, input.dateOfBirth,
          this.config.termsVersion, this.config.agePolicyVersion, username, usernameNormalized, phoneNumber,
        ]);
        const insertedPlayer = inserted.rows[0] as Record<string, unknown>;
        await tx.query(`INSERT INTO player_profiles (player_id,display_name,created_at,updated_at)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (player_id) DO UPDATE SET display_name=EXCLUDED.display_name,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at`,
        [id, name, insertedPlayer.created_at, insertedPlayer.updated_at]);
        await tx.query(`INSERT INTO player_credentials
          (player_id,kind,identifier,identifier_norm,password_hash,password_changed_at,created_at,updated_at)
          VALUES ($1,'email_password',$2,$2,$3,NULL,$4,$4)
          ON CONFLICT (player_id,kind) DO UPDATE SET
            identifier=EXCLUDED.identifier,identifier_norm=EXCLUDED.identifier_norm,password_hash=EXCLUDED.password_hash,updated_at=EXCLUDED.updated_at`,
        [id, email, passwordHash, insertedPlayer.created_at]);
        const session = await this.createSession(tx, 'player', id, false);
        tokenForMail = opaqueToken();
        await tx.query(`INSERT INTO player_one_time_tokens
          (id,principal_type,principal_id,token_type,token_hash,expires_at,created_at)
          VALUES ($1,'player',$2,'email_verification',$3,now()+interval '24 hours',now())`,
        [randomUUID(), id, this.hash(tokenForMail)]);
        await this.audit(tx, 'player.register', 'player', id, 'player', id, 'success', requestId);
        return { player: inserted.rows[0] as Record<string, unknown>, session };
      });
    } catch (error) {
      if (String((error as { code?: unknown }).code) === '23505') {
        throw new IdentityFault(409, 'CONFLICT', 'An account with these details already exists');
      }
      const constraint = (error as { constraint?: unknown }).constraint;
      if (constraint === 'players_date_of_birth_adult_check') {
        throw new IdentityFault(422, 'AGE_REQUIREMENT_NOT_MET', 'Players must be at least 18 years old to register');
      }
      throw error;
    }
    await this.emitLocalMail('email_verification', email, tokenForMail);
    return created;
  }

  async loginPlayer(emailInput: string, password: string, requestId: string, remoteAddress: string): Promise<{ player: Record<string, unknown>; session: IssuedSession }> {
    const email = normalizeEmail(emailInput);
    const permitted = await this.allowAttempt('player-login-email', email, 900, 5)
      && await this.allowAttempt('player-login-ip', remoteAddress, 900, 20);
    const result = await this.repository.query<DbRow>(`SELECT id,email,player_number,display_name,first_name,last_name,gender,country_code,city,address,
        phone_number_e164,postal_code,password_hash,status,verification_status,settlement_currency,language,preferred_display_currency
      FROM players WHERE email_normalized=$1`, [email]);
    const row = result.rows[0];
    const passwordOkay = await verifyPassword(password, String(row?.password_hash ?? DUMMY_HASH));
    if (!permitted) throw new IdentityFault(429, 'RATE_LIMITED', 'Too many login attempts');
    if (!row || !passwordOkay || ['suspended','closed'].includes(String(row.status))) {
      await this.repository.query(`INSERT INTO audit_events(id,action,actor_type,outcome,request_id,metadata,created_at)
        VALUES ($1,'player.login','system','denied',$2,$3::jsonb,now())`,
      [randomUUID(), requestId, JSON.stringify({ emailHash: this.hash(email) })]);
      throw new IdentityFault(401, 'UNAUTHORIZED', 'Email or password is incorrect');
    }
    const session = await this.repository.transaction(async (tx) => {
      const issued = await this.createSession(tx, 'player', String(row.id), false);
      await this.audit(tx, 'player.login', 'player', String(row.id), 'player', String(row.id), 'success', requestId);
      return issued;
    });
    return { player: row as Record<string, unknown>, session };
  }

  async resolveSession(type: 'player' | 'admin', rawToken: string | undefined): Promise<AuthSession | null> {
    if (!rawToken || rawToken.length < 32 || rawToken.length > 200) return null;
    const result = type === 'player'
      ? await this.repository.query<DbRow>(`SELECT id,player_id AS principal_id,session_version,authenticated_at,expires_at,revoked_at,false AS mfa_verified
        FROM player_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,
      [this.hash(rawToken)])
      : await this.repository.query<DbRow>(`SELECT id,admin_id AS principal_id,session_version,authenticated_at,expires_at,revoked_at,mfa_verified
        FROM admin_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,
      [this.hash(rawToken)]);
    const row = result.rows[0];
    if (!row) return null;
    const base = {
      id: String(row.id), type, principalId: String(row.principal_id), version: Number(row.session_version),
      authenticatedAt: new Date(String(row.authenticated_at)).toISOString(),
      expiresAt: new Date(String(row.expires_at)).toISOString(), mfaVerified: Boolean(row.mfa_verified),
    } as const;
    if (type === 'player') {
      const found = await this.repository.query<DbRow>(`SELECT id,email,player_number,display_name,first_name,last_name,gender,country_code,city,address,
          phone_number_e164,postal_code,settlement_currency,language,preferred_display_currency,status,verification_status,created_at,updated_at
        FROM players WHERE id=$1`, [String(row.principal_id)]);
      const player = found.rows[0];
      return player ? { ...base, type, status: String(player.status), player: player as Record<string, unknown> } : null;
    }
    const found = await this.repository.query<DbRow>(`SELECT id,email,display_name,status,mfa_enabled
      FROM admin_users WHERE id=$1`, [String(row.principal_id)]);
    const admin = found.rows[0];
    if (!admin) return null;
    const permissionResult = await this.repository.query<DbRow>(`SELECT DISTINCT r.code AS role_code,p.code AS permission_code
      FROM admin_role_assignments ar JOIN roles r ON r.id=ar.role_id
      LEFT JOIN role_permissions rp ON rp.role_id=r.id
      LEFT JOIN permissions p ON p.id=rp.permission_id
      WHERE ar.admin_id=$1 ORDER BY r.code,p.code`, [String(admin.id)]);
    return {
      ...base, type, status: String(admin.status), admin: admin as Record<string, unknown>,
      roles: [...new Set(permissionResult.rows.map((item) => String(item.role_code)))],
      permissions: [...new Set(permissionResult.rows.map((item) => item.permission_code).filter(Boolean).map(String))],
    };
  }

  async revokeSession(session: AuthSession, requestId: string): Promise<void> {
    await this.repository.transaction(async (tx) => {
      if (session.type === 'player') {
        await tx.query('UPDATE player_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [session.id]);
      } else {
        await tx.query('UPDATE admin_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [session.id]);
      }
      await this.audit(tx, session.type + '.logout', session.type, session.principalId, session.type, session.principalId, 'success', requestId);
    });
  }

  verifyCsrfForSession(session: AuthSession, token: string): boolean {
    return this.verifyCsrf(session.type === 'player' ? 'player' : 'admin', session.id, session.version, token);
  }

  async updatePlayerProfile(session: AuthSession, input: {
    displayName?: string | undefined;
    language?: string | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say' | null | undefined;
    countryCode?: string | undefined;
    city?: string | null | undefined;
    address?: string | null | undefined;
    phoneNumber?: string | null | undefined;
    postalCode?: string | null | undefined;
  }, requestId: string): Promise<Record<string, unknown>> {
    if (session.type !== 'player') throw new IdentityFault(403, 'FORBIDDEN', 'Player context required');

    type PatchField = { name: string; column: string; value: string | null };
    const patch: PatchField[] = [];
    const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
    const optionalText = (value: string | null | undefined, maxLength: number, label: string): string | null => {
      if (value == null) return null;
      const normalized = value.trim();
      if (normalized.length === 0) return null;
      if (normalized.length > maxLength) {
        throw new IdentityFault(422, 'PROFILE_FIELD_INVALID', label + ' is too long');
      }
      return normalized;
    };

    if (input.displayName !== undefined) {
      const value = input.displayName.trim();
      if (value.length < 1 || value.length > 80) {
        throw new IdentityFault(422, 'PROFILE_FIELD_INVALID', 'Display name must contain between 1 and 80 characters');
      }
      patch.push({ name: 'displayName', column: 'display_name', value });
    }
    if (input.language !== undefined) {
      const value = input.language.trim();
      if (value.length < 2 || value.length > 12) {
        throw new IdentityFault(422, 'PROFILE_FIELD_INVALID', 'Language must contain between 2 and 12 characters');
      }
      patch.push({ name: 'language', column: 'language', value });
    }
    if (has('firstName')) patch.push({ name: 'firstName', column: 'first_name', value: optionalText(input.firstName, 100, 'First name') });
    if (has('lastName')) patch.push({ name: 'lastName', column: 'last_name', value: optionalText(input.lastName, 100, 'Last name') });
    if (has('gender')) {
      const value = input.gender ?? null;
      if (value !== null && !['female', 'male', 'other', 'prefer_not_to_say'].includes(value)) {
        throw new IdentityFault(422, 'PROFILE_FIELD_INVALID', 'Gender selection is invalid');
      }
      patch.push({ name: 'gender', column: 'gender', value });
    }
    if (input.countryCode !== undefined) {
      const value = input.countryCode.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(value)) {
        throw new IdentityFault(422, 'PROFILE_FIELD_INVALID', 'Country must be a two-letter ISO country code');
      }
      patch.push({ name: 'countryCode', column: 'country_code', value });
    }
    if (has('city')) patch.push({ name: 'city', column: 'city', value: optionalText(input.city, 120, 'City') });
    if (has('address')) patch.push({ name: 'address', column: 'address', value: optionalText(input.address, 250, 'Address') });
    if (has('phoneNumber')) {
      const value = optionalText(input.phoneNumber, 16, 'Phone number');
      if (value !== null && !/^\+[1-9][0-9]{1,14}$/.test(value)) {
        throw new IdentityFault(422, 'PHONE_INVALID', 'Phone number must use international E.164 format, for example +21612345678');
      }
      patch.push({ name: 'phoneNumber', column: 'phone_number_e164', value });
    }
    if (has('postalCode')) patch.push({ name: 'postalCode', column: 'postal_code', value: optionalText(input.postalCode, 20, 'Postal code') });
    if (patch.length === 0) throw new IdentityFault(400, 'VALIDATION_ERROR', 'At least one profile field is required');

    return this.repository.transaction(async (tx) => {
      const values: unknown[] = [session.principalId];
      const assignments: string[] = [];
      for (const field of patch) {
        values.push(field.value);
        const placeholder = '$' + values.length;
        assignments.push(field.column + '=' + placeholder);
        if (field.name === 'language') assignments.push('preferred_language=' + placeholder);
      }
      const result = await tx.query<DbRow>(`UPDATE players
        SET ${assignments.join(',')},updated_at=now()
        WHERE id=$1
        RETURNING id,email,player_number,display_name,first_name,last_name,gender,country_code,city,address,
          phone_number_e164,postal_code,settlement_currency,language,preferred_display_currency,status,verification_status,created_at,updated_at`,
      values);
      const player = result.rows[0];
      if (!player) throw new IdentityFault(404, 'NOT_FOUND', 'Player not found');

      // Keep the currently active legacy source/mirror pair aligned until a
      // separately reviewed player_profiles read/write cutover is approved.
      await tx.query(`INSERT INTO player_profiles (player_id,display_name,created_at,updated_at)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (player_id) DO UPDATE SET display_name=EXCLUDED.display_name,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at`,
      [String(player.id), String(player.display_name), player.created_at, player.updated_at]);

      await this.audit(tx, 'player.profile.update', 'player', session.principalId, 'player', session.principalId,
        'success', requestId, { changedFields: patch.map((field) => field.name) });
      return player as Record<string, unknown>;
    });
  }

  async beginAdminLogin(emailInput: string, password: string, requestId: string, remoteAddress: string): Promise<{
    challengeId: string; status: 'mfa_required' | 'enrollment_required'; expiresAt: string;
    browserToken: string; enrollmentToken?: string; enrollmentCsrf?: string;
  }> {
    const email = normalizeEmail(emailInput);
    const allowed = await this.allowAttempt('admin-login-email', email, 900, 5)
      && await this.allowAttempt('admin-login-ip', remoteAddress, 900, 20);
    const result = await this.repository.query<DbRow>(`SELECT id,email_normalized,password_hash,status,mfa_enabled FROM admin_users WHERE email_normalized=$1`, [email]);
    const admin = result.rows[0];
    const passwordOkay = await verifyPassword(password, String(admin?.password_hash ?? DUMMY_HASH));
    if (!allowed) throw new IdentityFault(429, 'RATE_LIMITED', 'Too many login attempts');
    if (!admin || !passwordOkay || admin.status !== 'active') throw new IdentityFault(401, 'UNAUTHORIZED', 'Email or password is incorrect');
    const status = admin.mfa_enabled === true ? 'mfa_required' : 'enrollment_required';
    const challengeId = randomUUID();
    const browserToken = opaqueToken();
    const enrollmentToken = status === 'enrollment_required' ? opaqueToken() : undefined;
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.repository.transaction(async (tx) => {
      await tx.query(`INSERT INTO admin_mfa_challenges
        (id,admin_id,status,browser_token_hash,enrollment_token_hash,expires_at,attempt_count,max_attempts,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,0,5,now())`,
      [challengeId, String(admin.id), status, this.hash(browserToken), enrollmentToken ? this.hash(enrollmentToken) : null, expiresAt]);
      await this.audit(tx, 'admin.login.password', 'admin', String(admin.id), 'admin', String(admin.id), 'success', requestId, { challengeStatus: status });
    });
    return { challengeId, status, expiresAt: expiresAt.toISOString(), browserToken,
      ...(enrollmentToken ? { enrollmentToken, enrollmentCsrf: this.createCsrf('enrollment', challengeId, 1) } : {}) };
  }

  async findEnrollment(browserToken: string | undefined, enrollmentToken: string | undefined): Promise<{ id: string; adminId: string; version: number } | null> {
    if (!browserToken || !enrollmentToken) return null;
    const result = await this.repository.query<DbRow>(`SELECT id,admin_id FROM admin_mfa_challenges
      WHERE browser_token_hash=$1 AND enrollment_token_hash=$2 AND status='enrollment_required'
        AND consumed_at IS NULL AND expires_at>now() AND attempt_count<max_attempts`,
    [this.hash(browserToken), this.hash(enrollmentToken)]);
    const row = result.rows[0];
    return row ? { id: String(row.id), adminId: String(row.admin_id), version: 1 } : null;
  }

  async verifyAdminMfa(input: { challengeId: string; factor: 'totp' | 'recovery_code'; code: string },
    browserToken: string | undefined, requestId: string, remoteAddress: string): Promise<{ session: IssuedSession }> {
    if (!(await this.allowAttempt('admin-mfa-ip', remoteAddress, 900, 20))) throw new IdentityFault(429, 'RATE_LIMITED', 'Too many MFA attempts');
    if (!browserToken) throw new IdentityFault(401, 'UNAUTHORIZED', 'Authentication challenge is invalid or expired');
    const outcome = await this.repository.transaction(async (tx) => {
      const challengeResult = await tx.query<DbRow>(`SELECT id,admin_id,status,browser_token_hash,expires_at,attempt_count,max_attempts,consumed_at
        FROM admin_mfa_challenges WHERE id=$1 FOR UPDATE`, [input.challengeId]);
      const challenge = challengeResult.rows[0];
      if (!challenge || challenge.consumed_at || new Date(String(challenge.expires_at)).getTime() <= Date.now()
        || Number(challenge.attempt_count) >= Number(challenge.max_attempts) || challenge.status !== 'mfa_required'
        || this.hash(browserToken) !== String(challenge.browser_token_hash)) return { error: true as const };
      const adminResult = await tx.query<DbRow>(`SELECT id,status,totp_secret_encrypted,mfa_enabled FROM admin_users WHERE id=$1 FOR UPDATE`, [String(challenge.admin_id)]);
      const admin = adminResult.rows[0];
      if (!admin || admin.status !== 'active' || admin.mfa_enabled !== true || !admin.totp_secret_encrypted) return { error: true as const };
      let valid = false;
      if (input.factor === 'totp') {
        try { valid = verifyTotp(decryptSecret(String(admin.totp_secret_encrypted), this.config.totpEncryptionKey), input.code); } catch { valid = false; }
      } else {
        const codes = await tx.query<DbRow>(`SELECT id,code_hash FROM admin_mfa_recovery_codes WHERE admin_id=$1 AND consumed_at IS NULL FOR UPDATE`, [String(admin.id)]);
        for (const row of codes.rows) {
          if (await verifyPassword(input.code, String(row.code_hash))) {
            await tx.query('UPDATE admin_mfa_recovery_codes SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL', [String(row.id)]);
            valid = true;
            break;
          }
        }
      }
      if (!valid) {
        await tx.query('UPDATE admin_mfa_challenges SET attempt_count=attempt_count+1 WHERE id=$1', [String(challenge.id)]);
        await this.audit(tx, 'admin.login.mfa', 'admin', String(admin.id), 'admin', String(admin.id), 'denied', requestId, { factor: input.factor });
        return { error: true as const };
      }
      await tx.query('UPDATE admin_mfa_challenges SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL', [String(challenge.id)]);
      await tx.query('UPDATE admin_mfa_challenges SET consumed_at=now() WHERE admin_id=$1 AND consumed_at IS NULL', [String(admin.id)]);
      const session = await this.createSession(tx, 'admin', String(admin.id), true);
      await this.audit(tx, 'admin.login.mfa', 'admin', String(admin.id), 'admin', String(admin.id), 'success', requestId, { factor: input.factor });
      return { session };
    });
    if ('error' in outcome) throw new IdentityFault(401, 'UNAUTHORIZED', 'Authentication challenge is invalid or expired');
    return { session: outcome.session };
  }

  async setupTotp(enrollment: { id: string; adminId: string } | null, session: AuthSession | null, requestId: string): Promise<{ secret: string; otpauthUri: string; expiresAt: string }> {
    if (!enrollment && !session) throw new IdentityFault(401, 'UNAUTHORIZED', 'Authentication is required');
    if (session && (session.type !== 'admin' || session.status !== 'active')) throw new IdentityFault(403, 'FORBIDDEN', 'Active administrator required');
    const adminId = enrollment?.adminId ?? session!.principalId;
    const adminResult = await this.repository.query<DbRow>('SELECT id,email,mfa_enabled FROM admin_users WHERE id=$1', [adminId]);
    const admin = adminResult.rows[0];
    if (!admin || admin.mfa_enabled === true) throw new IdentityFault(409, 'CONFLICT', 'MFA is already enrolled or unavailable');
    const secret = base32Encode(randomBytes(20));
    const encrypted = encryptSecret(secret, this.config.totpEncryptionKey);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.repository.query(`UPDATE admin_users SET totp_pending_secret_encrypted=$2,totp_pending_challenge_id=$3,totp_pending_expires_at=$4,updated_at=now()
      WHERE id=$1`, [adminId, encrypted, enrollment?.id ?? null, expiresAt]);
    await this.repository.query(`INSERT INTO audit_events
      (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
      VALUES ($1,'admin.mfa.totp.setup','admin',$2,'admin',$2,'success',$3,'{}'::jsonb,now())`,
    [randomUUID(), adminId, requestId]);
    const label = encodeURIComponent('Bclick:' + String(admin.email));
    return {
      secret,
      otpauthUri: 'otpauth://totp/' + label + '?secret=' + secret + '&issuer=Bclick&algorithm=SHA1&digits=6&period=30',
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyTotpEnrollment(code: string, enrollment: { id: string; adminId: string } | null, session: AuthSession | null,
    browserToken: string | undefined, enrollmentToken: string | undefined, requestId: string): Promise<{ session?: IssuedSession; csrf?: string }> {
    if (!enrollment && !session) throw new IdentityFault(401, 'UNAUTHORIZED', 'Authentication is required');
    const adminId = enrollment?.adminId ?? session!.principalId;
    const outcome = await this.repository.transaction(async (tx) => {
      const adminResult = await tx.query<DbRow>(`SELECT id,status,mfa_enabled,totp_pending_secret_encrypted,totp_pending_challenge_id,totp_pending_expires_at
        FROM admin_users WHERE id=$1 FOR UPDATE`, [adminId]);
      const admin = adminResult.rows[0];
      if (!admin || admin.status !== 'active' || admin.mfa_enabled === true || !admin.totp_pending_secret_encrypted
        || new Date(String(admin.totp_pending_expires_at)).getTime() <= Date.now()
        || (enrollment && String(admin.totp_pending_challenge_id) !== enrollment.id)) return { error: true as const };
      let valid = false;
      try { valid = verifyTotp(decryptSecret(String(admin.totp_pending_secret_encrypted), this.config.totpEncryptionKey), code); } catch { valid = false; }
      if (!valid) {
        await this.audit(tx, 'admin.mfa.totp.verify', 'admin', adminId, 'admin', adminId, 'denied', requestId);
        return { error: true as const };
      }
      if (enrollment) {
        if (!browserToken || !enrollmentToken) return { error: true as const };
        const challenge = await tx.query<DbRow>(`SELECT id FROM admin_mfa_challenges WHERE id=$1 AND admin_id=$2
          AND status='enrollment_required' AND browser_token_hash=$3 AND enrollment_token_hash=$4
          AND consumed_at IS NULL AND expires_at>now() AND attempt_count<max_attempts FOR UPDATE`,
        [enrollment.id, adminId, this.hash(browserToken), this.hash(enrollmentToken)]);
        if (!challenge.rows[0]) return { error: true as const };
      }
      await tx.query(`UPDATE admin_users SET totp_secret_encrypted=totp_pending_secret_encrypted,
        totp_pending_secret_encrypted=NULL,totp_pending_challenge_id=NULL,totp_pending_expires_at=NULL,mfa_enabled=TRUE,updated_at=now()
        WHERE id=$1`, [adminId]);
      if (enrollment) {
        await tx.query('UPDATE admin_mfa_challenges SET consumed_at=now() WHERE id=$1', [enrollment.id]);
        const issued = await this.createSession(tx, 'admin', adminId, true);
        await this.audit(tx, 'admin.mfa.totp.verify', 'admin', adminId, 'admin', adminId, 'success', requestId, { completedEnrollment: true });
        return { session: issued };
      }
      await this.audit(tx, 'admin.mfa.totp.verify', 'admin', adminId, 'admin', adminId, 'success', requestId);
      return { csrf: this.createCsrf('admin', session!.id, session!.version) };
    });
    if ('error' in outcome) throw new IdentityFault(401, 'UNAUTHORIZED', 'TOTP enrollment is invalid or expired');
    return outcome;
  }

  async regenerateRecoveryCodes(session: AuthSession, totpCode: string, reason: string, requestId: string): Promise<{ codes: string[]; createdAt: string }> {
    if (session.type !== 'admin' || session.status !== 'active' || !session.mfaVerified) throw new IdentityFault(403, 'FORBIDDEN', 'Active full administrator session required');
    const result = await this.repository.query<DbRow>('SELECT totp_secret_encrypted FROM admin_users WHERE id=$1 AND mfa_enabled=TRUE', [session.principalId]);
    if (!result.rows[0]?.totp_secret_encrypted
      || !verifyTotp(decryptSecret(String(result.rows[0].totp_secret_encrypted), this.config.totpEncryptionKey), totpCode)) {
      throw new IdentityFault(401, 'UNAUTHORIZED', 'Step-up authentication failed');
    }
    const codes = Array.from({ length: 10 }, recoveryCode);
    const hashes: string[] = [];
    for (const code of codes) hashes.push(await hashPassword(code));
    await this.repository.transaction(async (tx) => {
      await tx.query('UPDATE admin_mfa_recovery_codes SET consumed_at=COALESCE(consumed_at,now()) WHERE admin_id=$1', [session.principalId]);
      for (const hash of hashes) await tx.query('INSERT INTO admin_mfa_recovery_codes(id,admin_id,code_hash,created_at) VALUES ($1,$2,$3,now())', [randomUUID(), session.principalId, hash]);
      await this.audit(tx, 'admin.mfa.recovery_codes.regenerate', 'admin', session.principalId, 'admin', session.principalId, 'success', requestId, { count: codes.length, reasonLength: reason.length });
    });
    return { codes, createdAt: new Date().toISOString() };
  }

  async requestPasswordReset(emailInput: string, remoteAddress: string): Promise<void> {
    if (!(await this.allowAttempt('password-reset-ip', remoteAddress, 900, 20))) throw new IdentityFault(429, 'RATE_LIMITED', 'Too many password reset requests');
    const email = normalizeEmail(emailInput);
    const result = await this.repository.query<DbRow>('SELECT id,email FROM players WHERE email_normalized=$1', [email]);
    const player = result.rows[0];
    if (!player) return;
    const token = opaqueToken();
    await this.repository.query(`INSERT INTO player_one_time_tokens(id,principal_type,principal_id,token_type,token_hash,expires_at,created_at)
      VALUES ($1,'player',$2,'password_reset',$3,now()+interval '30 minutes',now())`, [randomUUID(), String(player.id), this.hash(token)]);
    await this.emitLocalMail('password_reset', String(player.email), token);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.repository.transaction(async (tx) => {
      const record = await tx.query<DbRow>(`SELECT id,principal_id FROM player_one_time_tokens
        WHERE token_type='password_reset' AND token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`, [this.hash(token)]);
      const row = record.rows[0];
      if (!row) throw new IdentityFault(400, 'VALIDATION_ERROR', 'Password reset token is invalid or expired');
      await tx.query('UPDATE players SET password_hash=$2,updated_at=now() WHERE id=$1', [String(row.principal_id), passwordHash]);
      await tx.query(`UPDATE player_credentials SET password_hash=$2,password_changed_at=now(),updated_at=now()
        WHERE player_id=$1 AND kind='email_password'`, [String(row.principal_id), passwordHash]);
      await tx.query('UPDATE player_one_time_tokens SET consumed_at=now() WHERE id=$1', [String(row.id)]);
      await tx.query('UPDATE player_sessions SET revoked_at=now() WHERE player_id=$1 AND revoked_at IS NULL', [String(row.principal_id)]);
    });
  }

  async confirmEmailVerification(token: string): Promise<void> {
    await this.repository.transaction(async (tx) => {
      const record = await tx.query<DbRow>(`SELECT id,principal_id FROM player_one_time_tokens
        WHERE token_type='email_verification' AND token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`, [this.hash(token)]);
      const row = record.rows[0];
      if (!row) throw new IdentityFault(400, 'VALIDATION_ERROR', 'Verification token is invalid or expired');
      await tx.query("UPDATE players SET verification_status='verified',email_verification_status='verified',updated_at=now() WHERE id=$1", [String(row.principal_id)]);
      await tx.query('UPDATE player_one_time_tokens SET consumed_at=now() WHERE id=$1', [String(row.id)]);
    });
  }

  async requestEmailVerification(session: AuthSession): Promise<void> {
    if (session.type !== 'player') throw new IdentityFault(403, 'FORBIDDEN', 'Player context required');
    const result = await this.repository.query<DbRow>('SELECT id,email,verification_status FROM players WHERE id=$1', [session.principalId]);
    const player = result.rows[0];
    if (!player || player.verification_status === 'verified') return;
    const token = opaqueToken();
    await this.repository.query(`INSERT INTO player_one_time_tokens(id,principal_type,principal_id,token_type,token_hash,expires_at,created_at)
      VALUES ($1,'player',$2,'email_verification',$3,now()+interval '24 hours',now())`, [randomUUID(), String(player.id), this.hash(token)]);
    await this.emitLocalMail('email_verification', String(player.email), token);
  }

  async bootstrapAdmin(input: { email: string; displayName: string; password: string }): Promise<void> {
    if (this.config.nodeEnv === 'production') throw new Error('Admin bootstrap is local-only while Q-011 remains open');
    const email = normalizeEmail(input.email);
    if (input.password.length < 16 || input.password === 'admin' || input.password.toLowerCase() === email) {
      throw new Error('Bootstrap password must be unique, at least 16 characters, and not a default credential');
    }
    const passwordHash = await hashPassword(input.password);
    await this.repository.transaction(async (tx) => {
      const count = await tx.query<DbRow>('SELECT count(*)::int AS count FROM admin_users');
      if (Number(count.rows[0]?.count ?? 0) !== 0) throw new Error('Admin bootstrap is one-time and an admin already exists');
      const id = randomUUID();
      await tx.query(`INSERT INTO admin_users(id,email,email_normalized,display_name,password_hash,status,mfa_enabled,created_at,updated_at)
        VALUES ($1,$2,$2,$3,$4,'active',FALSE,now(),now())`, [id, email, input.displayName.trim(), passwordHash]);
      await tx.query(`INSERT INTO admin_role_assignments(admin_id,role_id)
        SELECT $1,id FROM roles WHERE code='project-admin'`, [id]);
      await this.audit(tx, 'admin.bootstrap', 'system', null, 'admin', id, 'success', randomUUID(), { oneTime: true });
    });
  }
}
