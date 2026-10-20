import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPermanentWaiveAllowed,
  DepositKycOverridePolicyError,
  type PermanentWaiveTransaction,
} from '../src/kyc/permanent-waive-guard.js';

function fakeTransaction(activeAdminCount: number, activeIds = ['admin-a', 'admin-b']): PermanentWaiveTransaction {
  return {
    countActiveAdmins: async () => activeAdminCount,
    isActiveAdmin: async (id: string) => activeIds.includes(id),
  };
}

function policyError(statusCode: number, code: string) {
  return (error: unknown) =>
    error instanceof DepositKycOverridePolicyError &&
    error.statusCode === statusCode &&
    error.code === code;
}

test('permanent waiver is blocked with 422 when fewer than two active admins exist', async () => {
  await assert.rejects(
    () =>
      assertPermanentWaiveAllowed(fakeTransaction(1), {
        override: 'waive',
        expiresAt: null,
        requestedBy: 'admin-a',
        approvedBy: 'admin-b',
      }),
    policyError(422, 'PERMANENT_WAIVE_REQUIRES_TWO_ADMINS'),
  );
});

test('permanent waiver cannot be self-approved even when two admins are active', async () => {
  await assert.rejects(
    () =>
      assertPermanentWaiveAllowed(fakeTransaction(2), {
        override: 'waive',
        expiresAt: null,
        requestedBy: 'ADMIN-A',
        approvedBy: 'admin-a',
      }),
    policyError(403, 'REQUESTER_CANNOT_APPROVE_OWN'),
  );
});

test('permanent waiver requires both distinct principals to be active admins', async () => {
  await assert.rejects(
    () =>
      assertPermanentWaiveAllowed(fakeTransaction(2, ['admin-a']), {
        override: 'waive',
        expiresAt: null,
        requestedBy: 'admin-a',
        approvedBy: 'admin-b',
      }),
    policyError(403, 'PERMANENT_WAIVE_APPROVERS_MUST_BE_ACTIVE'),
  );
});

test('permanent waiver passes guard with two active, distinct administrators', async () => {
  await assert.doesNotReject(() =>
    assertPermanentWaiveAllowed(fakeTransaction(2), {
      override: 'waive',
      expiresAt: null,
      requestedBy: 'admin-a',
      approvedBy: 'admin-b',
    }),
  );
});

test('guard does not apply permanent-waiver rules to no override, require, or temporary waive', async () => {
  const tx: PermanentWaiveTransaction = {
    countActiveAdmins: async () => {
      throw new Error('count must not be read for non-permanent waiver');
    },
    isActiveAdmin: async () => {
      throw new Error('admin lookup must not run for non-permanent waiver');
    },
  };

  await assert.doesNotReject(() =>
    assertPermanentWaiveAllowed(tx, {
      override: null,
      expiresAt: null,
      requestedBy: null,
      approvedBy: null,
    }),
  );
  await assert.doesNotReject(() =>
    assertPermanentWaiveAllowed(tx, {
      override: 'require',
      expiresAt: null,
      requestedBy: 'admin-a',
      approvedBy: 'admin-a',
    }),
  );
  await assert.doesNotReject(() =>
    assertPermanentWaiveAllowed(tx, {
      override: 'waive',
      expiresAt: new Date(Date.now() + 60_000),
      requestedBy: 'admin-a',
      approvedBy: 'admin-a',
    }),
  );
});

test('failed authoritative active-admin count fails closed', async () => {
  const tx: PermanentWaiveTransaction = {
    countActiveAdmins: async () => {
      throw new Error('database unavailable');
    },
    isActiveAdmin: async () => true,
  };

  await assert.rejects(
    () =>
      assertPermanentWaiveAllowed(tx, {
        override: 'waive',
        expiresAt: null,
        requestedBy: 'admin-a',
        approvedBy: 'admin-b',
      }),
    /database unavailable/,
  );
});
