import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';

const paymentPaths = [
  '/api/v1/payments/deposits',
  '/api/v1/payments/withdrawals',
] as const;

test('ENABLE_WALLET_API=false rejects deposit and withdrawal before body parsing/authentication', async () => {
  const app = buildApp({ database: null, logLevel: 'silent', walletApiEnabled: false });

  try {
    for (const [index, url] of paymentPaths.entries()) {
      const requestId = `wallet-disabled-${index}-01`;
      const response = await app.inject({
        method: 'POST',
        url,
        headers: {
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        payload: '{ malformed JSON',
      });

      assert.equal(response.statusCode, 503, response.body);
      assert.deepEqual(response.json(), {
        error: { code: 'WALLET_API_DISABLED', message: 'Wallet payment APIs are disabled' },
        requestId,
      });
      assert.equal(response.headers['x-request-id'], requestId);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.body.includes('malformed JSON'), false);
    }
  } finally {
    await app.close();
  }
});

test('ENABLE_WALLET_API=true in a local test environment still fails closed without the accepted payment service', async () => {
  const app = buildApp({ database: null, logLevel: 'silent', walletApiEnabled: true });

  try {
    for (const url of paymentPaths) {
      const response = await app.inject({
        method: 'POST',
        url,
        payload: { amount: '100.00', currency: 'TND' },
      });

      assert.equal(response.statusCode, 503, response.body);
      assert.equal(response.json().error.code, 'WALLET_API_NOT_READY');
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.body.includes('100.00'), false);
    }
  } finally {
    await app.close();
  }
});
