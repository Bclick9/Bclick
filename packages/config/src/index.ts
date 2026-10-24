export type RuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

export interface ServerConfig {
  readonly nodeEnv: RuntimeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly dbPoolMax: number;
  readonly logLevel: LogLevel;
  /** Exact HTTP Host authorities accepted by the API; empty only in local/test environments. */
  readonly allowedHosts: readonly string[];
}

export type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const ENVIRONMENTS: readonly RuntimeEnvironment[] = [
  'development',
  'test',
  'staging',
  'production',
];

const LOG_LEVELS: readonly LogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
];

function parseInteger(
  name: string,
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }

  return parsed;
}


function parseAllowedHosts(env: EnvironmentInput, nodeEnv: RuntimeEnvironment): string[] {
  const items = (env.BCLICK_ALLOWED_HOSTS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    if (nodeEnv === 'staging' || nodeEnv === 'production') {
      throw new Error('BCLICK_ALLOWED_HOSTS is required in staging and production');
    }
    return [];
  }

  const hosts = items.map((item) => {
    const candidate = item.toLowerCase();
    if (
      candidate.includes('*')
      || candidate.includes('/')
      || candidate.includes('\\')
      || candidate.includes('@')
      || candidate.includes('?')
      || candidate.includes('#')
      || candidate.includes(',')
      || [...candidate].some((char) => char.charCodeAt(0) <= 0x20 || char.charCodeAt(0) === 0x7f)
    ) {
      throw new Error('BCLICK_ALLOWED_HOSTS must contain exact host authorities without wildcards or paths');
    }

    let parsed: URL;
    try {
      parsed = new URL('http://' + candidate);
    } catch {
      throw new Error('BCLICK_ALLOWED_HOSTS contains an invalid host authority');
    }
    if (
      parsed.host !== candidate
      || parsed.username
      || parsed.password
      || parsed.pathname !== '/'
      || parsed.search
      || parsed.hash
    ) {
      throw new Error('BCLICK_ALLOWED_HOSTS must contain exact host authorities, optionally with a port');
    }
    return parsed.host;
  });
  return [...new Set(hosts)];
}

function parseDatabaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) throw new Error('DATABASE_URL is required');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  if (
    (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new Error('DATABASE_URL must point to a PostgreSQL database');
  }

  return value;
}

/**
 * Validates runtime configuration without loading .env files or logging
 * supplied values. Secrets must be injected by the caller/deployment runtime.
 */
export function parseServerConfig(env: EnvironmentInput): ServerConfig {
  const rawEnvironment = (env.NODE_ENV ?? 'development').trim();
  if (!ENVIRONMENTS.includes(rawEnvironment as RuntimeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, staging, or production');
  }

  const rawLogLevel = (env.LOG_LEVEL ?? 'info').trim().toLowerCase();
  if (!LOG_LEVELS.includes(rawLogLevel as LogLevel)) {
    throw new Error('LOG_LEVEL must be trace, debug, info, warn, error, fatal, or silent');
  }

  const host = (env.HOST ?? '127.0.0.1').trim();
  if (!host || /[\r\n]/.test(host)) {
    throw new Error('HOST must be a non-empty hostname or IP address');
  }
  if ((rawEnvironment === 'development' || rawEnvironment === 'test') && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Local API development/test must bind to a loopback address');
  }

  return {
    nodeEnv: rawEnvironment as RuntimeEnvironment,
    host,
    port: parseInteger('PORT', env.PORT, 3000, 1, 65_535),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
    dbPoolMax: parseInteger('DB_POOL_MAX', env.DB_POOL_MAX, 10, 1, 50),
    logLevel: rawLogLevel as LogLevel,
    allowedHosts: parseAllowedHosts(env, rawEnvironment as RuntimeEnvironment),
  };
}
