# ADR-022 Draft — KYC Lock and Deposit Override Controls

**Date:** 2026-10-20  
**Status:** DRAFT — not accepted; no schema/API implementation authorized.  
**Decision owners:** Project Owner, Security/API and Legal/Compliance; Finance consulted for deposit policy.  
**Related:** [Phase 4 addendum](./2026-10-20-phase4-addendum.md) · [ADR-021 draft](./2026-10-20-ADR-021-deposit-without-kyc-draft.md)

## 1. Context

If the threshold-based model in ADR-021 is accepted, administrators need controlled ways to impose a hard KYC lock or request an exceptional deposit policy for an individual player. Such controls are sensitive financial/compliance operations: they must not be driven by a VIP label, frontend permissions or an unreviewed database flag alone.

The repository currently has no player domain table or admin authentication handlers. This ADR defines a proposed future contract only; no existing endpoint is implied to be operational.

## 2. Decision proposed

### 2.1 Hard KYC lock

Proposed field: `players.kyc_lock BOOLEAN NOT NULL DEFAULT false`.

When `kyc_lock = true`, all deposits are blocked until the player reaches at least Level 2 and the eligibility service verifies all other current rules. The lock is a hard block and takes precedence over the deposit override. No `none`, `require` or `waive` override may bypass a true lock.

Setting or clearing the lock requires an authorized administrator, reason capture, immutable audit event and alert. Clearing a lock does not itself enable deposits; every other eligibility control must still pass.

### 2.2 Deposit KYC override

The owner-proposed state set is `none | require | waive`, with these requested meanings:

- `require`: require additional KYC before the applicable deposit can proceed.
- `none`: VIP exception, limited to 30 days.
- `waive`: waive the applicable KYC requirement under dual approval.

**Naming decision remains open:** `none` ordinarily means “no override,” which conflicts with the stated VIP-exception meaning. This draft does not silently resolve that ambiguity. Before OpenAPI or schema work, the Project Owner must either approve this nonstandard meaning explicitly or rename the value to an unambiguous VIP-exception value. No implementation may infer a waiver from `none` until this is decided.

A simple enum on the player row is insufficient to support 30-day expiry, dual approval, audit and periodic review. Proposed persistence is an effective state plus an audit-backed override record/history containing at least:

- player and override type/state;
- reason code and operator justification;
- requester and, where required, independent approver;
- requested, approved, effective, expiry and revocation timestamps;
- related case/ticket reference where applicable;
- decision and policy version;
- review outcome and immutable audit correlation ID.

The schema design must prevent duplicate active overrides, enforce one-time state transitions, and safely revert expired exceptions to normal policy. Until the final schema is approved, do not assume all of the history can be represented by player columns alone.

### 2.3 Dual approval

A `waive` request must never activate through a single administrator's mutation. Requester and approver must be different principals; the approver must have the explicit waive permission and an eligible active admin session with completed MFA. The initial local installation has one administrator, so waive activation remains unavailable until a safe independent approval path exists. Do not weaken separation rules to make the UI appear functional.

The final API contract must specify whether the listed PATCH operation creates a pending request and a separate approval operation activates it, or whether another equivalent two-person workflow is used. A single PATCH cannot both request and approve a waiver under the separation rule.

## 3. Proposed admin endpoints

Paths below are proposals and must be added to OpenAPI only after this ADR and the broader addendum are accepted:

- `PATCH /api/v1/admin/players/{playerId}/kyc-lock`
- `PATCH /api/v1/admin/players/{playerId}/deposit-kyc-override`

Required contract behavior:

- Require a full authenticated admin session, mandatory MFA and server-derived permissions.
- Validate player ID, requested state, reason and applicable case/evidence references.
- Validate transition and precedence rules transactionally; reject stale/conflicting state rather than silently overwriting it.
- Use the standard error envelope and request ID. Add CSRF and exact-Origin protection for unsafe cookie-authenticated requests.
- Record immutable audit details, emit security/operations alerts and expose no sensitive internal review notes to player-facing APIs.
- Do not permit an override to bypass sanctions/AML, jurisdiction, responsible-gambling, account status, payment method/currency limits or other mandatory eligibility checks.
- Do not enable deposit routes in an environment where the jurisdictional policy remains unapproved.

The final request/approval structure, concurrency control (including ETag/If-Match or an equivalent version check), idempotency expectations and response schemas must be reviewed before implementation.

## 4. Permissions

Add the following server-enforced permissions:

- `players.kyc.lock` — set or clear the hard KYC lock.
- `players.deposit.override` — request/manage a non-waive override within policy.
- `players.deposit.override.waive` — request or independently approve a waiver, as assigned by the final dual-control contract.

The policy must distinguish requesting a waiver from approving one. Possession of `players.deposit.override.waive` does not allow the same principal to act as requester and approver. Frontend visibility is not an authorization control. Test every operation with allowed and denied permission combinations.

## 5. Audit, alerts and periodic review

Every request, approval, denial, edit, expiry, revocation and review must produce an audit event with actor, target, action, outcome, timestamp, request ID, reason and policy/record version. Never log credentials, session cookies, CSRF tokens, raw KYC documents or unnecessary personal data.

Alert on at least: creation/change of a hard lock, any waiver request and approval, an imminent/actual override expiry, attempted bypass while locked, expired or inconsistent state, failed dual-approval constraints, and repeated unauthorized attempts. The alert destination and response ownership must be configured before operations are enabled.

The review interval and owner must be approved before implementation. VIP exceptions expire after 30 days as requested; there is no silent auto-renewal. Renewal requires fresh justification and a new decision/audit event. A `waive` exception must have an explicitly approved scope and expiry policy; do not default it to permanent.

## 6. Acceptance tests

- A locked player cannot create/complete a deposit through any route, even when an override says `none` or `waive`.
- A player below Level 2 remains locked from withdrawal under ADR-021 even when deposits are allowed.
- `require` enforces the configured additional evidence and fails closed if evidence is missing, stale or rejected.
- The VIP exception expires no later than 30 days after approval; it cannot self-renew and emits expiry alerts.
- The ambiguous `none` state is rejected by implementation/contract tests until its semantics are approved.
- A waive request cannot activate without independent approval; the same principal cannot request and approve.
- The single-admin local configuration cannot complete a two-person waiver.
- Missing reason, missing permission, missing MFA, stale version and conflicting concurrent changes are rejected safely.
- All changes are audited; alerts are emitted; audit records are immutable to ordinary operators.
- Expiry/revocation returns the player to normal policy without silently granting extra eligibility.
- Overrides cannot bypass legal/jurisdiction, sanctions/AML, responsible-gambling, account-status, payment-method or other mandatory controls.
- No test or admin operation makes a real-money route available while Q-015/Q-011 and relevant Q-020/Q-009 gates remain open.

## 7. Consequences and dependencies

This decision adds state-management, dual-control, audit, alerting and review complexity. It also requires an approved eligibility policy (ADR-021), RBAC integration, a player-domain schema, API contracts and operator workflows. Because player/identity storage does not exist in the Phase 3 skeleton, migration planning must be sequential: first approve/create the canonical player schema, then add or evolve the override structures in a reviewed migration. No player migration may precede approval of this ADR.

Q-011 remains P0/Open and blocks deployment; Q-015 blocks launch/deposits pending Legal/Compliance review; Q-009 keeps TND provider routing disabled until evidence is accepted; Q-020 remains open until runtime tests cover implemented routes.

## 8. Approval record

- [ ] Project Owner approves the hard-lock precedence and schema approach.
- [ ] Project Owner resolves the meaning/name of `none`.
- [ ] Security/API approves the independent approval workflow and permission split.
- [ ] Legal/Compliance approves when a waiver is permitted and its expiry/scope.
- [ ] Operations approves audit alerts and periodic review owner/interval.
- [ ] OpenAPI, migrations and acceptance tests are reviewed together before implementation.

**Until those approvals are recorded, this ADR remains a draft and authorizes no migration or endpoint.**
