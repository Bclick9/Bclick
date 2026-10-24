import assert from 'node:assert/strict';
import test from 'node:test';

import { parseServerConfig } from '../src/index.ts';

const validEnvironment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3020',
  DATABASE_URL: 'postgres://test_user:test_password@localhost:5432/bclick_test',
};

test('parses validated server configuration and safe defaults', () => {
  const config = parseServerConfig(validEnvironment);

  assert.equal(config.nodeEnv, 'test');
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3020);
  assert.equal(config.dbPoolMax, 10);
  assert.equal(config.logLevel, 'info');
  assert.equal(config.walletApiEnabled, false, 'wallet/payment APIs default off');
  assert.equal(config.databaseUrl, validEnvironment.DATABASE_URL);
});

test('requires a PostgreSQL URL without echoing credentials in errors', () => {
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, DATABASE_URL: '' }),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, DATABASE_URL: 'https://user:secret@db' }),
    /DATABASE_URL must point to a PostgreSQL database/,
  );
});

test('rejects invalid ports, pool sizes, environments, and log levels', () => {
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, PORT: '0' }),
    /PORT must be an integer/,
  );
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, DB_POOL_MAX: '51' }),
    /DB_POOL_MAX must be an integer/,
  );
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, NODE_ENV: 'prod' }),
    /NODE_ENV must be/,
  );
  assert.throws(
    () => parseServerConfig({ ...validEnvironment, LOG_LEVEL: 'verbose' }),
    /LOG_LEVEL must be/,
  );
});


test('binds local development to loopback and rejects public bind addresses', () => {
  const config = parseServerConfig({ ...validEnvironment, NODE_ENV: 'development', HOST: undefined });
  assert.equal(config.host, '127.0.0.1');
  assert.throws(() => parseServerConfig({ ...validEnvironment, HOST: '0.0.0.0' }), /loopback address/);
});


test('ENABLE_WALLET_API is a strict opt-in, but never permits payment routes in staging or production', () => {
  assert.equal(parseServerConfig({ ...validEnvironment, ENABLE_WALLET_API: 'false' }).walletApiEnabled, false);
  assert.equal(parseServerConfig({ ...validEnvironment, ENABLE_WALLET_API: 'true' }).walletApiEnabled, true,
    'local/test flag can be parsed for fail-closed route testing; the payment service is still not wired');
  for (const invalid of ['yes', '1', 'enabled', 'TRUE-ish']) {
    assert.throws(
      () => parseServerConfig({ ...validEnvironment, ENABLE_WALLET_API: invalid }),
      /ENABLE_WALLET_API must be exactly true or false/,
      invalid,
    );
  }
  for (const nodeEnv of ['staging', 'production']) {
    assert.throws(
      () => parseServerConfig({
        ...validEnvironment,
        NODE_ENV: nodeEnv,
        BCLICK_ALLOWED_HOSTS: 'api.bclick.example',
        ENABLE_WALLET_API: 'true',
      }),
      /ENABLE_WALLET_API must remain false/,
      nodeEnv,
    );
  }
});
