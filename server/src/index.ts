import { Pool } from 'pg';

import { parseServerConfig } from '@bclick/config';

import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = parseServerConfig(process.env);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 30_000,
    application_name: 'bclick-api',
  });

  const app = buildApp({
    database: pool,
    logLevel: config.logLevel,
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
