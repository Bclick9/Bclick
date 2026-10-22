import { Pool } from 'pg';
import { parseServerConfig } from '@bclick/config';
import { PgIdentityRepository } from '../identity/repository.js';
import { BigBangApiClient } from './client.js';
import { BigBangCatalogService } from './catalog.js';
import { resolveSandboxLocalDatabaseUrl } from './local-database.js';

async function main(): Promise<void> {
  const key = process.env.BIGBANG_SANDBOX_API_KEY?.trim();
  if (!key) throw new Error('BIGBANG_SANDBOX_API_KEY is required for the catalogue sync command.');
  if (!key.startsWith('ek_test_')) {
    throw new Error('Phase 6 catalogue sync accepts only a BigBang sandbox key prefixed ek_test_.');
  }
  // This Phase 6 command deliberately refuses live keys. It can only read the sandbox catalogue.
  const api = new BigBangApiClient({ apiKey: key });
  const databaseUrl = resolveSandboxLocalDatabaseUrl(process.env);
  const config = parseServerConfig({ ...process.env, DATABASE_URL: databaseUrl });

  if (config.nodeEnv === 'production') {
    throw new Error('The Phase 6 BigBang catalogue command refuses production runtime configuration.');
  }
  if (process.env.BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM !== 'YES') {
    throw new Error('Set BCLICK_BIGBANG_CATALOGUE_SANDBOX_CONFIRM=YES to confirm this sandbox-only catalogue sync.');
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 3,
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 15_000,
    application_name: 'bclick-bigbang-catalog-sync',
  });
  try {
    const repository = new PgIdentityRepository(pool);
    const service = new BigBangCatalogService(repository, api);
    const result = await service.sync();
    process.stdout.write(JSON.stringify({ status: 'succeeded', ...result }) + '\n');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code)
    : 'CATALOG_SYNC_FAILED';
  process.stderr.write('[bclick] BigBang sandbox catalogue sync failed (' + code + '). No credential or provider response was logged.\n');
  process.exitCode = 1;
});
