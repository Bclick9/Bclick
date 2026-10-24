import assert from 'node:assert/strict';
import test from 'node:test';

import { parseServerConfig } from '../src/index.js';

const base = {
  DATABASE_URL: 'postgresql://bclick:test@127.0.0.1:5432/bclick',
};

test('development may omit a host allowlist, but shared environments may not', () => {
  assert.deepEqual(parseServerConfig(base).allowedHosts, []);
  assert.throws(
    () => parseServerConfig({ ...base, NODE_ENV: 'staging' }),
    /BCLICK_ALLOWED_HOSTS is required/,
  );
  assert.throws(
    () => parseServerConfig({ ...base, NODE_ENV: 'production' }),
    /BCLICK_ALLOWED_HOSTS is required/,
  );
});

test('shared environments accept only exact host authorities', () => {
  const config = parseServerConfig({
    ...base,
    NODE_ENV: 'production',
    BCLICK_ALLOWED_HOSTS: 'api.bclick.example,api2.bclick.example:8443',
  });
  assert.deepEqual(config.allowedHosts, ['api.bclick.example', 'api2.bclick.example:8443']);
});

test('host allowlist rejects invalid authorities and de-duplicates case-insensitively', () => {
  for (const invalid of [
    '*.bclick.example',
    'api.bclick.example/path',
    'api.bclick.example attacker.example',
    'user@api.bclick.example',
    'api.bclick.example:99999',
    'api.bclick.example?x=1',
  ]) {
    assert.throws(
      () => parseServerConfig({
        ...base,
        NODE_ENV: 'production',
        BCLICK_ALLOWED_HOSTS: invalid,
      }),
      /BCLICK_ALLOWED_HOSTS/,
      invalid,
    );
  }

  assert.deepEqual(
    parseServerConfig({
      ...base,
      NODE_ENV: 'production',
      BCLICK_ALLOWED_HOSTS: 'API.BCLICK.EXAMPLE,api.bclick.example',
    }).allowedHosts,
    ['api.bclick.example'],
  );
});
