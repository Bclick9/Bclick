import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { createWinHouseLaunchToken } from '../src/winhouse/launch-token.js';

const playerId = 'f0b613a8-4bb1-4c12-8c0e-4f6fa2f49218';
const sessionId = 'c54b6b13-b60d-49c1-9309-bbb7649fce30';
const walletApiKey = 'test-only-winhouse-wallet-api-key-never-use-live';

test('creates the official WinHouse four-part launch token with HMAC-SHA256 over pipe-separated fields', () => {
  const nowEpochMs = 1_800_000_000_000;
  const result = createWinHouseLaunchToken({ playerId, sessionId, walletApiKey, nowEpochMs });
  const fields = result.launch.split('.');
  assert.equal(fields.length, 4);
  assert.equal(fields[0], playerId);
  assert.equal(fields[1], String(nowEpochMs + 5 * 60_000));
  assert.equal(fields[2], sessionId);

  const expectedSignature = createHmac('sha256', walletApiKey)
    .update(`${playerId}|${fields[1]}|${sessionId}`, 'utf8')
    .digest('hex');
  assert.equal(fields[3], expectedSignature);
  assert.equal(result.expiresAtEpochMs, nowEpochMs + 5 * 60_000);
  assert.equal(result.expiresAt, new Date(nowEpochMs + 5 * 60_000).toISOString());
  assert.equal(result.launch.includes(walletApiKey), false, 'the signing key is never included in the launch token');
});

test('uses a short per-launch lifetime and never permits an expiry above the provider ten-minute cap', () => {
  const result = createWinHouseLaunchToken({ playerId, sessionId, walletApiKey, nowEpochMs: 1000 });
  assert.equal(result.expiresAtEpochMs - 1000, 5 * 60_000);
  assert.throws(
    () => createWinHouseLaunchToken({ playerId, sessionId, walletApiKey, nowEpochMs: 1000, ttlMs: 10 * 60_000 + 1 }),
    /between 1 ms and 10 minutes/,
  );
  assert.throws(
    () => createWinHouseLaunchToken({ playerId, sessionId, walletApiKey, nowEpochMs: 1000, ttlMs: 0 }),
    /between 1 ms and 10 minutes/,
  );
});

test('rejects missing keys and token fields that could corrupt dot/pipe-separated parsing', () => {
  assert.throws(
    () => createWinHouseLaunchToken({ playerId, sessionId, walletApiKey: '', nowEpochMs: 1000 }),
    /WINHOUSE_WALLET_API_KEY is required/,
  );
  assert.throws(
    () => createWinHouseLaunchToken({ playerId: playerId + '.attacker', sessionId, walletApiKey, nowEpochMs: 1000 }),
    /stable token-safe identifier/,
  );
  assert.throws(
    () => createWinHouseLaunchToken({ playerId, sessionId: sessionId + '|extra', walletApiKey, nowEpochMs: 1000 }),
    /token-safe identifier/,
  );
});
