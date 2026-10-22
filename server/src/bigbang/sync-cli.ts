import { Pool } from 'pg';
import { parseServerConfig } from '@bclick/config';
import { PgIdentityRepository } from '../identity/repository.js';
import { BigBangApiClient } from './client.js';
import { BigBangCatalogService } from './catalog.js';

async function main(): Promise<void> {
  const key = process.env.BIGBANG_API_KEY?.trim();
  if (!key) throw new Error('BIGBANG_API_KEY is required for the catalogue sync command.');
  // This Phase 6 command deliberately refuses live keys. It can only read the sandbox catalogue.
  const api = new BigBangApiClient({ apiKey: key });
  const config = parseServerConfig(process.env);
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
