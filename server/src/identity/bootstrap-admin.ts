import { Pool } from 'pg';

import { parseServerConfig } from '@bclick/config';

import { parseIdentityConfig } from './config.js';
import { PgIdentityRepository } from './repository.js';
import { IdentityService } from './service.js';

async function main(): Promise<void> {
  const runtime = parseServerConfig(process.env);
  if (runtime.nodeEnv !== 'development' && runtime.nodeEnv !== 'test') {
    throw new Error('Admin bootstrap may run only in local development/test');
  }
  const identityConfig = parseIdentityConfig(process.env, runtime.nodeEnv);
  if (!identityConfig) throw new Error('Set BCLICK_IDENTITY_ENABLED=true after local secret/origin configuration');
  const email = process.env.IDENTITY_BOOTSTRAP_EMAIL?.trim();
  const displayName = process.env.IDENTITY_BOOTSTRAP_DISPLAY_NAME?.trim();
  const password = process.env.IDENTITY_BOOTSTRAP_PASSWORD;
  if (!email || !displayName || !password) {
    throw new Error('IDENTITY_BOOTSTRAP_EMAIL, IDENTITY_BOOTSTRAP_DISPLAY_NAME, and IDENTITY_BOOTSTRAP_PASSWORD are required');
  }
  const pool = new Pool({
    connectionString: runtime.databaseUrl,
    max: 2,
    connectionTimeoutMillis: 1500,
    application_name: 'bclick-local-admin-bootstrap',
  });
  try {
    const service = new IdentityService(new PgIdentityRepository(pool), identityConfig);
    await service.bootstrapAdmin({ email, displayName, password });
    console.info('One-time local administrator provisioned. First login must complete TOTP enrollment.');
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error('[bclick-admin-bootstrap] Provisioning failed; no credentials or secrets were logged.');
  process.exitCode = 1;
});
