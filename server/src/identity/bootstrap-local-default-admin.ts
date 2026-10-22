import { Pool } from 'pg';

import { parseServerConfig } from '@bclick/config';

import { parseIdentityConfig } from './config.js';
import { PgIdentityRepository } from './repository.js';
import { IdentityService } from './service.js';

async function main(): Promise<void> {
  const runtime = parseServerConfig(process.env);
  if (runtime.nodeEnv !== 'development') {
    throw new Error('Default admin credentials are allowed only by the local development bootstrap');
  }
  const identityConfig = parseIdentityConfig(process.env, runtime.nodeEnv);
  if (!identityConfig) {
    throw new Error('Set BCLICK_IDENTITY_ENABLED=true after the local script has generated the Identity secrets');
  }

  const pool = new Pool({
    connectionString: runtime.databaseUrl,
    max: 2,
    connectionTimeoutMillis: 1500,
    application_name: 'bclick-local-default-admin-bootstrap',
  });
  try {
    const service = new IdentityService(new PgIdentityRepository(pool), identityConfig);
    const result = await service.bootstrapLocalDefaultAdmin();
    if (result === 'skipped-existing-admin') {
      console.info('An administrator already exists; no default admin was added or changed.');
      return;
    }
    if (result === 'existing-needs-attention') {
      console.warn('admin@admin.com already exists but is inactive or no longer uses the temporary default password. Existing credentials were not changed.');
      return;
    }
    console.info(
      (result === 'created' ? 'Created' : 'Verified') +
      ' local-only administrator admin@admin.com (temporary password: admin). First login requires TOTP enrollment unless already enrolled.',
    );
    console.warn('OWNER-REQUESTED TEMPORARY EXCEPTION: never use this default credential outside local development.');
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error('[bclick-local-default-admin] Bootstrap refused or failed; no credentials or secrets were logged.');
  process.exitCode = 1;
});
