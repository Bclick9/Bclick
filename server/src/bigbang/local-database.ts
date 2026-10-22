/** Resolves the database target for local Phase 6 Sandbox tools and fails closed on remote hosts. */
export function resolveSandboxLocalDatabaseUrl(env: NodeJS.ProcessEnv): string {
  let connectionString = env.DATABASE_URL?.trim();

  if (!connectionString) {
    const password = env.POSTGRES_PASSWORD?.trim();
    if (!password) {
      throw new Error('Set DATABASE_URL to local PostgreSQL or provide POSTGRES_PASSWORD and local POSTGRES_* settings in the repository-root .env.');
    }

    const user = env.POSTGRES_USER?.trim() || 'bclick_dev';
    const database = env.POSTGRES_DB?.trim() || 'bclick';
    const portText = env.POSTGRES_PORT?.trim() || '5432';
    if (!/^\d+$/.test(portText)) throw new Error('POSTGRES_PORT must be a valid local TCP port.');
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error('POSTGRES_PORT must be between 1 and 65535.');
    }

    connectionString = 'postgresql://' + encodeURIComponent(user) + ':' + encodeURIComponent(password)
      + '@127.0.0.1:' + port + '/' + encodeURIComponent(database);
  }

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('The Phase 6 command requires a valid local PostgreSQL URL.');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)
      || !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('The Phase 6 command can target only loopback PostgreSQL, never a remote database.');
  }

  return connectionString;
}
