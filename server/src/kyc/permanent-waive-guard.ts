export type DepositKycOverride = 'require' | 'waive' | null;

export interface PermanentWaiveTransaction {
  /**
   * Count active admin principals using authoritative database state.
   * Implementations must run this on the same transaction/locking scope
   * that will persist the override.
   */
  countActiveAdmins(): Promise<number>;
  /** Check that an ID resolves to a currently active administrator. */
  isActiveAdmin(adminId: string): Promise<boolean>;
}

export interface DepositKycOverrideDecision {
  override: DepositKycOverride;
  /** Null is permanent only when override === 'waive'. */
  expiresAt: Date | string | null;
  requestedBy: string | null;
  approvedBy: string | null;
}

export class DepositKycOverridePolicyError extends Error {
  readonly statusCode: 403 | 422;
  readonly code: string;

  constructor(statusCode: 403 | 422, code: string, message: string) {
    super(message);
    this.name = 'DepositKycOverridePolicyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Server-side guard for the permanent-waiver transition.
 *
 * Call this inside the database transaction before persisting any effective
 * waive with a NULL expiry. Never derive active admin count or principal IDs
 * from client-supplied fields. Temporary waivers and non-waive overrides use
 * their separate policy checks and do not enter this permanent-waiver guard.
 */
export async function assertPermanentWaiveAllowed(
  tx: PermanentWaiveTransaction,
  decision: DepositKycOverrideDecision,
): Promise<void> {
  if (decision.override !== 'waive' || decision.expiresAt !== null) {
    return;
  }

  const activeAdminCount = await tx.countActiveAdmins();
  if (!Number.isSafeInteger(activeAdminCount) || activeAdminCount < 2) {
    throw new DepositKycOverridePolicyError(
      422,
      'PERMANENT_WAIVE_REQUIRES_TWO_ADMINS',
      'Permanent KYC waiver requires at least two active administrators',
    );
  }

  const requestedBy = decision.requestedBy?.trim().toLowerCase() ?? '';
  const approvedBy = decision.approvedBy?.trim().toLowerCase() ?? '';

  if (!requestedBy || !approvedBy) {
    throw new DepositKycOverridePolicyError(
      403,
      'PERMANENT_WAIVE_APPROVALS_REQUIRED',
      'Permanent KYC waiver requires a requester and an independent approver',
    );
  }

  if (requestedBy === approvedBy) {
    throw new DepositKycOverridePolicyError(
      403,
      'REQUESTER_CANNOT_APPROVE_OWN',
      'The requester cannot approve their own permanent KYC waiver',
    );
  }

  const [requesterIsActive, approverIsActive] = await Promise.all([
    tx.isActiveAdmin(requestedBy),
    tx.isActiveAdmin(approvedBy),
  ]);
  if (!requesterIsActive || !approverIsActive) {
    throw new DepositKycOverridePolicyError(
      403,
      'PERMANENT_WAIVE_APPROVERS_MUST_BE_ACTIVE',
      'Both requester and approver must be active administrators',
    );
  }
}
