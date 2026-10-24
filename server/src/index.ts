import { Pool } from 'pg';

import { parseServerConfig } from '@bclick/config';

import { buildApp } from './app.js';
import { parseIdentityConfig } from './identity/config.js';
import { PgIdentityRepository } from './identity/repository.js';
import { IdentityService } from './identity/service.js';
import { BigBangApiClient } from './bigbang/client.js';

async function main(): Promise<void> {
  const config = parseServerConfig(process.env);
  const identityConfig = parseIdentityConfig(process.env, config.nodeEnv);
  const sandboxKey = process.env.BIGBANG_SANDBOX_API_KEY?.trim() ?? '';
  const sandboxDemoClient = config.nodeEnv === 'development'
    && sandboxKey.startsWith('ek_test_')
    && sandboxKey.length >= 12
    ? new BigBangApiClient({ apiKey: sandboxKey })
    : null;
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 30_000,
    application_name: 'bclick-api',
  });

  const repository = new PgIdentityRepository(pool);
  const identity = identityConfig ? new IdentityService(repository, identityConfig) : null;
  const app = buildApp({
    database: pool,
    logLevel: config.logLevel,
    identity,
    identityConfig,
    catalogDatabase: repository,
    sandboxDemoClient,
    allowedHosts: config.allowedHosts,
    walletApiEnabled: config.walletApiEnabled,
  });

  app.addHook('onClose', async () => {
    await pool.end();
  });

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error({ err: error }, 'API failed to start');
    await app.close().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, 'Graceful shutdown requested');
    void app.close().then(
      () => {
        process.exitCode = 0;
      },
      (error: unknown) => {
        app.log.error({ err: error, signal }, 'API shutdown failed');
        process.exitCode = 1;
      },
    );
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(() => {
  // Configuration errors deliberately omit environment values and credentials.
  console.error('[bclick-api] Configuration or startup failed; no secrets were logged.');
  process.exitCode = 1;
});
