# ADR-022 Draft — KYC Lock and Deposit Override Controls

**Date:** 2026-10-20  
**Status:** DRAFT v2 — awaiting Project Owner approval; no schema/API implementation is authorized.  
**Decision owners:** Project Owner and Security/API; Legal/Compliance and Finance consulted for policy scope.  
**Related:** [Phase 4 Addendum v2](./2026-10-20-phase4-addendum-v2.md) · [ADR-021 draft](./2026-10-20-ADR-021-deposit-without-kyc-draft.md)

## 1. Context

If ADR-021 is accepted and later approved by Legal for a jurisdiction, administrators need a controlled hard KYC lock and an auditable override for deposit KYC eligibility. These are sensitive compliance controls; they must not be granted by a VIP label, frontend-only role check, or unreviewed database update.

There is currently no canonical `players` domain table and no admin-authentication handler in the Phase 3 skeleton. This ADR defines the proposed contract and policy only. It does not make any endpoint operational.

## 2. Canonical player fields

The proposed current-state fields are:

- `kyc_tier TEXT NOT NULL DEFAULT 'none'`, constrained to `none | basic | verified | enhanced`;
- `kyc_lock BOOLEAN NOT NULL DEFAULT false`;
- `kyc_lock_reason TEXT NULL`;
- `deposit_kyc_override TEXT NULL`, constrained to `require | waive` only;
- `deposit_kyc_override_expires_at TIMESTAMPTZ NULL`;
- `deposit_kyc_override_reason TEXT NULL`;
- `deposit_kyc_override_requested_by UUID NULL`;
- `deposit_kyc_override_approved_by UUID NULL`;
- `deposit_kyc_override_set_at TIMESTAMPTZ NULL`.

A null `deposit_kyc_override` means **no override**. The value `none` is removed entirely. A normalized audit/history record is still required to retain requests, approvals, denials, changes, expiry/revocation and review evidence; current-state columns do not replace immutable audit history. Requester/approver columns reference canonical admin principal IDs, never usernames or free text.

The first approved identity/domain migration must create the base `players` table from scratch before these constraints are applied. Do not author an ALTER migration against a nonexistent table, and do not create wallet/ledger/payment tables as a side effect.

## 3. KYC tier ordering and precedence algorithm

Canonical enum: `kycTier = none | basic | verified | enhanced`. Rank mapping is explicit:

- `none = 0` (Level 0 — Light);
- `basic = 1` (Level 1 — Basic);
- `verified = 2` (Level 2 — Full: ID + address + source of funds);
- `enhanced = 3` (Level 3 — Enhanced).

The word `verified` in `kycTier` means Level 2 KYC; it is distinct from `emailVerificationStatus=verified`. Never perform lexicographic text comparisons to determine tier order; use an explicit numeric rank or equivalent exhaustive mapping.

Evaluate the KYC-tier part of deposit eligibility in this exact order:

1. **Absolute lock priority:** if `kyc_lock = true` AND `rank(kyc_tier) < rank('verified')`, **REJECT** the deposit KYC check. No override can bypass the lock.
2. **Require override:** else if `deposit_kyc_override = 'require'` AND `rank(kyc_tier) < rank('verified')`, **REJECT** until Level 2 KYC is reached.
3. **Active waiver:** else if `deposit_kyc_override = 'waive'` AND `(deposit_kyc_override_expires_at IS NULL OR deposit_kyc_override_expires_at > now())`, the KYC-tier sub-check may **PASS** only if the waiver is validly authorized:
   - Future expiry = temporary waiver, approved by one eligible administrator under the approved policy; retain the 30-day maximum from the prior VIP-exception decision unless the Project Owner explicitly changes that limit.
   - Null expiry = permanent waiver, which requires dual approval by distinct principals: `requested_by != approved_by`. It cannot be activated by the single-admin local installation.
4. **Normal method rules:** in all other cases—including `deposit_kyc_override IS NULL` and an expired waiver—compare the explicit numeric player tier rank with the selected payment method's configured `kyc_tier_required`. Reject if player rank is lower; otherwise this KYC-tier sub-check passes.

**`kyc_lock=false` + no override means follow method rules, not “no KYC.”** A temporary waiver that has expired no longer bypasses the method requirement. A `require` override is a KYC floor at Level 2 and must not weaken a method-specific higher tier.

Passing this KYC-tier sub-check is not a complete deposit authorization. Jurisdiction/legal approval, approved thresholds, player/account status, sanctions/AML/fraud controls, self-exclusion/responsible-gambling rules, method/currency limits and all other required checks must still pass. If a launch/operational gate remains open, the deposit route remains globally disabled.

## 4. Temporary and permanent waiver constraints

- **Null override:** no exception exists; evaluate normal method rules.
- **`require`:** impose Level 2 KYC where the tier is lower; all method and legal requirements may still require more.
- **`waive` + future `expires_at`:** temporary waiver, under approved policy and no longer than 30 days after activation unless the Project Owner explicitly approves a different cap. The server sets `set_at`, checks the future expiry, records the requester and applies alerts/review.
- **`waive` + `expires_at IS NULL`:** permanent waiver; dual approval is mandatory. A database CHECK and the service transaction should ensure non-null requester and approver IDs and distinct principals for an active permanent waiver. Approval must be recorded before setting the effective state. A null expiry with missing/invalid approval fails closed.
- **Expired `waive`:** treat it as inactive and return to normal method rules; emit expiry alert/audit event. Do not silently renew it.
- **`kyc_lock=true`:** takes precedence whenever the tier is below Level 2, even if a temporary or permanent `waive` appears active.

Any approved waiver has only the scope documented in its decision record and cannot override mandatory sanctions/AML, jurisdiction, responsible-gambling, player/account-state, PSP/payment or provider-security controls.

## 5. Proposed admin endpoints and permissions

Proposed endpoints, not yet added to OpenAPI:

- `PATCH /api/v1/admin/players/{playerId}/kyc-lock`
- `PATCH /api/v1/admin/players/{playerId}/deposit-kyc-override`

Required server-enforced permissions:

- `players.kyc.lock` — set/clear the lock.
- `players.deposit.override` — manage `require` and temporary override requests within policy.
- `players.deposit.override.waive` — request/approve waiver actions subject to the dual-control invariants.

The final API must define whether waiver request and approval are separate operations/states. A single PATCH cannot cause one principal to request and approve their own permanent waiver. The one-admin local setup must deny permanent waiver activation until an independent eligible approver exists.

For every mutation, require a full admin session with mandatory MFA, server-derived permission checks, CSRF and exact-Origin protections, a reason, request ID and conflict/version handling. Record immutable audit events and emit security/operations alerts. UI button visibility is not an authorization boundary.

## 6. Normative server-side guard for permanent waiver

The permanent-waiver check is a server-side authorization invariant, not a UI or documentation-only rule. The mutation service must execute the guard in the same database transaction as the effective override-state change, using an authoritative count of currently active admin principals from the database. Never accept `active_admin_count`, requester identity, approver identity, or approval state from client-supplied fields.

Normative pseudocode:

```ts
// Execute inside the transaction that would persist the permanent waiver.
if (deposit_kyc_override === 'waive' && expires_at === null) {
  const active_admin_count = await tx.countActiveAdmins();

  if (active_admin_count < 2) {
    throw httpError(422, 'PERMANENT_WAIVE_REQUIRES_TWO_ADMINS');
  }

  if (requested_by === approved_by) {
    throw httpError(403, 'REQUESTER_CANNOT_APPROVE_OWN');
  }

  // These IDs must resolve to active admin principals as well.
  await tx.assertActiveAdmin(requested_by);
  await tx.assertActiveAdmin(approved_by);

  // Only after all guards pass may the approved state be persisted/audited.
  await tx.persistPermanentWaive(/* approved state and audit context */);
}
```

Use the standard error envelope and request ID. If the authoritative count query fails or returns an invalid count, fail closed and do not persist the waiver. The count and active-principal checks must use server-side state with the same transaction/locking strategy as the override write. Every route/service path that can set or approve a permanent waiver must call this guard; a UI-only check is prohibited.

The repository currently has no KYC override endpoint or canonical `players` table. The guard must be unit-tested before the migration gate, then wired into the actual mutation service/route before any such endpoint can be enabled. The helper alone does not make a route operational; Q-020 runtime acceptance remains mandatory.

## 6. Database integrity, audit and operations

- Use a CHECK constraint restricting the override to NULL, `require` or `waive`; `none` is never stored.
- Enforce referential integrity for requester and approver IDs.
- Enforce that an active permanent `waive` cannot be effective without both principals and `requested_by != approved_by`. The service must repeat this check inside the transition transaction; a UI-only check is insufficient.
- Use a transaction/version check to prevent concurrent admins from overwriting one another's decision. Define ETag/If-Match or the reviewed equivalent before final API contract.
- Record requester, approver, target player, prior/new state, reason, policy version, timestamp, request ID and outcome. Never log passwords, session/CSRF tokens, raw KYC documents or unnecessary personal data.
- Alert on lock changes, waiver requests/approvals, permanent waivers, attempted bypass while locked, expired waivers, invalid dual-control attempts and suspicious repeated actions.
- Assign a review owner and interval before operations are enabled. Temporary waiver expiry must be monitored; there is no silent renewal.

## 8. Acceptance tests

1. `kyc_lock=true` and `kyc_tier < verified` rejects every deposit path even when override is `waive`.
2. `kyc_lock=true` with Level 2 or higher proceeds only to the remaining rules; it never skips method-specific or legal checks.
3. `kyc_lock=false` and a null override follows the method's configured `kyc_tier_required`; it does not imply no KYC.
4. `require` rejects tiers below Level 2, and a method may still require a higher tier.
5. Active future waiver passes only the KYC-tier sub-check and only within approved scope; expired waiver falls through to method rules.
6. Temporary waiver expiry is no more than 30 days unless a new explicit owner decision changes the cap; expiry alerts and audit are emitted.
7. Permanent waiver with null expiry requires distinct requester and approver IDs; same-principal approval is rejected; the one-admin installation cannot activate it.
8. Invalid/missing requester, approver, reason, permission, MFA, policy state or stale version fails closed; concurrent conflicting updates are detected.
9. The `none` enum value is rejected; only SQL NULL, `require` and `waive` are accepted.
10. All requests, approvals, denials, expiries, revocations and reviews are auditable; alerts are emitted.
11. No waiver bypasses jurisdiction, sanctions/AML, responsible-gambling/self-exclusion, account-state, method/currency or other mandatory checks.
12. No test or admin endpoint enables deposits while Q-015, Q-011 and applicable Q-020/Q-009 gates remain open.

## 9. Consequences and dependencies

This design requires approved ADR-021 policy, canonical player/admin identities, explicit RBAC, audit/history, expiry processing/monitoring and a two-person permanent-waiver workflow. Because the player table does not exist, schema implementation must start with the approved canonical `players` table and then add any normalized override/audit structures in the migration sequence approved after this ADR.

Q-011 remains P0/Open and blocks deployment. Q-015 blocks launch/deposits pending Legal/Compliance. Q-009 keeps TND provider routing blocked until written provider precision evidence and golden fixtures pass. Q-020 remains open until actual runtime coverage exists for implemented routes.

## 10. Approval record

- [ ] Project Owner approves the `kyc_lock` absolute-precedence algorithm.
- [ ] Project Owner approves nullable override semantics and removal of `none`.
- [ ] Project Owner confirms the 30-day maximum for temporary waivers.
- [ ] Security/API approves distinct-principal dual control for permanent waiver.
- [ ] Legal/Compliance approves the contexts in which waiver is allowed.
- [ ] Operations approves expiry alerts and periodic review ownership.
- [ ] The final OpenAPI contract, migration design and runtime tests are reviewed together before implementation.

**Until approvals are recorded, this ADR is a draft and authorizes no migration or endpoint.**
