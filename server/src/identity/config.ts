import type { RuntimeEnvironment } from '@bclick/config';

export interface IdentityConfig {
  readonly nodeEnv: RuntimeEnvironment;
  readonly sessionHashKey: string;
  readonly csrfSigningKey: string;
  readonly totpEncryptionKey: string;
  readonly playerOrigins: readonly string[];
  readonly adminOrigins: readonly string[];
  readonly mailSinkPath: string;
  readonly termsVersion: string;
  readonly agePolicyVersion: string;
}

function parseKey(env: Readonly<Record<string, string | undefined>>, key: string): string {
  const value = env[key]?.trim() ?? '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(key + ' must be a 64-character hex-encoded 32-byte secret');
  }
  return value.toLowerCase();
}

function parsePolicyVersion(env: Readonly<Record<string, string | undefined>>, key: string): string {
  const value = env[key]?.trim() ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value)) {
    throw new Error(key + ' must be a non-empty version identifier (1-64 letters, digits, dot, underscore, colon or hyphen)');
  }
  return value;
}

function parseOrigins(env: Readonly<Record<string, string | undefined>>, key: string): string[] {
  const items = (env[key] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) throw new Error(key + ' must contain at least one exact origin');
  for (const origin of items) {
    if (origin.includes('*') || origin === 'null') throw new Error(key + ' must not contain wildcard or opaque origins');
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error(key + ' contains an invalid origin'); }
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error(key + ' must contain origins only, with no paths, credentials, or wildcards');
    }
  }
  return [...new Set(items)];
}

export function parseIdentityConfig(
  env: Readonly<Record<string, string | undefined>>,
  nodeEnv: RuntimeEnvironment,
): IdentityConfig | null {
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    throw new Error('Phase 4 Identity may run only in local development/test while Q-011 remains open');
  }
  if ((env.BCLICK_IDENTITY_ENABLED ?? '').trim().toLowerCase() !== 'true') return null;
  return {
    nodeEnv,
    sessionHashKey: parseKey(env, 'BCLICK_SESSION_HASH_KEY'),
    csrfSigningKey: parseKey(env, 'BCLICK_CSRF_SIGNING_KEY'),
    totpEncryptionKey: parseKey(env, 'BCLICK_TOTP_ENCRYPTION_KEY'),
    playerOrigins: parseOrigins(env, 'BCLICK_PLAYER_ALLOWED_ORIGINS'),
    adminOrigins: parseOrigins(env, 'BCLICK_ADMIN_ALLOWED_ORIGINS'),
    mailSinkPath: env.BCLICK_LOCAL_MAIL_SINK_PATH?.trim() || '.local-mail-sink.jsonl',
    termsVersion: parsePolicyVersion(env, 'BCLICK_TERMS_VERSION'),
    agePolicyVersion: parsePolicyVersion(env, 'BCLICK_AGE_POLICY_VERSION'),
  };
}
