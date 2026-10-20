# Phase 4 Identity Addendum v2 — Registration, KYC Tier and Override Contract

**Date:** 2026-10-20  
**Status:** Project Owner-approved v2 (2026-10-20). Migration 001 remains gated on separate approval of the migration-plan note and the required CI evidence.  
**Scope:** Contract/planning changes only. No migration, route handler, wallet, deposit or real-money capability is authorized.  
**Supersedes:** [Phase 4 Identity Addendum v1](./2026-10-20-phase4-addendum.md) for the field names and override semantics revised here.  
**Related plan:** [Phase 4 Identity Plan](./2026-10-20-phase4-identity-plan.md)  
**Related decisions:** [ADR-021 draft](./2026-10-20-ADR-021-deposit-without-kyc-draft.md) · [ADR-022 draft](./2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

## 1. Approval boundary

This v2 records the Project Owner's clarifications:

- email verification is a separate lifecycle from KYC;
- `verificationStatus` is replaced by required `emailVerificationStatus`;
- `kycTier` uses `none | basic | verified | enhanced`, where **kycTier=`verified` is Level 2**, not an email-verification result;
- the override has only `require` and `waive`; a null value means no override, and `none` is removed;
- `kyc_lock` has explicit priority over every KYC override.

**Wait for explicit Project Owner approval of this v2 note and both updated ADR drafts before creating the first migration or writing application code.** Updating the OpenAPI contract mirror and the drafts at this stage is documentation/contract preparation only.

The Phase 3 skeleton has a no-op baseline migration and no canonical `players` table. The first identity/data migration must create the approved base player schema from scratch; do not write an `ALTER TABLE players` migration against a table that does not exist.

## 2. Registration and email-verification contract

### RegisterRequest

Retain the existing required `email`, `password`, `countryCode` and `settlementCurrency` fields. The revised OpenAPI contract adds:

| Field | Contract / enforcement |
|---|---|
| `dateOfBirth` | Required ISO date-only value. Validate a real calendar date, reject future dates and enforce age >= 18 on the server at registration. |
| `acceptTerms` | Required boolean constrained to `true`. Record the server-side acceptance time and active terms version. |
| `acceptAgeConfirmation` | Required boolean constrained to `true`. Record the server-side acknowledgement time and policy version; it does not replace DOB validation. |
| `preferredLanguage` | Required `LanguageCode`; default selection is `en`. Keep one canonical field; do not retain a second independently editable `language` value in RegisterRequest. |
| `username` | Optional. Enforce normalized uniqueness atomically and block reserved/system names server-side. |
| `phoneNumber` | Optional E.164 value; do not imply that the phone is verified. |
| `captchaToken` | Required registration proof. Verify server-to-server with the selected CAPTCHA provider; no browser-only validation. Provider choice (Cloudflare Turnstile or hCaptcha) remains configuration/procurement detail. |

Registration must verify CAPTCHA, rate limits, supported jurisdiction, minimum age, terms/age acknowledgements and uniqueness before successful account activation. It must return a generic safe error shape and must not reveal whether an email/username exists.

### Activation and optional email verification

- Successful registration creates an **active** player after required server-side checks.
- Email verification is **not required** for account activation.
- `emailVerificationStatus` is required in `PlayerSummary`, has enum `not_required | pending | verified | rejected | expired`, and defaults to `not_required`.
- Email verification remains optional and player-requested. It is a separate lifecycle and never changes `kycTier`.
- Password reset continues through email, with account-enumeration-safe responses and a maximum of 3 reset requests per normalized email per hour.
- Security notifications may use email as an optional channel; sending or receiving an email is not evidence of verified identity.

The legacy `verificationStatus` name is removed from the PlayerSummary and the corresponding admin operational summary so that it cannot be confused with KYC. Do not use `emailVerificationStatus` as a KYC field.

## 3. PlayerSummary field contract

The repository OpenAPI mirror now proposes these required fields:

- `id`, `status`, `settlementCurrency`;
- `emailVerificationStatus` (email verification only);
- `kycTier` (required);
- `kycLock` (required).

KYC-specific fields:

| Field | Type / meaning |
|---|---|
| `kycTier` | Required enum: `none`, `basic`, `verified`, `enhanced`. Rank mapping: none=0, basic=1, verified=2, enhanced=3. Use this explicit numeric rank for comparisons; never compare enum strings lexicographically. |
| `kycStatus` | Optional detailed `kyc_verifications` lifecycle: `not_started`, `submitted`, `in_review`, `additional_information_required`, `verified`, `rejected`, `expired`. Omit when no detailed verification record/status is available. |
| `kycLock` | Required boolean; default false. A true lock blocks deposit eligibility while the player's tier is below Level 2 (`verified`). |
| `depositKycOverride` | Nullable enum `require | waive`. Null means no override. The value `none` is removed. |
| `depositKycOverrideExpiresAt` | Nullable date-time. A future value marks a temporary waiver; null with `depositKycOverride=waive` means a permanent waiver and requires dual approval. |
| `depositKycOverrideReason` | Nullable safe reason/summary for the current override; no investigation secrets. |
| `depositKycLockReason` | Nullable safe reason/summary associated with the administrative KYC lock. |

`kycTier=verified` specifically means Level 2 evidence (ID + address + source of funds) and is **not** the same thing as `emailVerificationStatus=verified`. Level mapping: `none`=Level 0 (email captured + DOB + country); `basic`=Level 1 (ID + selfie); `verified`=Level 2; `enhanced`=Level 3 enhanced review.

The KYC tier is a server-controlled outcome backed by evidence and policy. The API must not let a player-supplied registration field or frontend state set `kycTier`, `kycStatus`, `kycLock` or any override.

## 4. Proposed players schema and migration order

No migration is written in this v2. After approval, create the canonical `players` table from scratch in the first reviewed identity/domain migration, including the pre-existing base identity fields and the following approved registration/KYC data as appropriate:

| Proposed column | Proposed constraint/default |
|---|---|
| `date_of_birth` | DATE NOT NULL; validated server-side; age gate enforced at registration and rechecked where policy requires. |
| `preferred_language` | TEXT NOT NULL DEFAULT 'en'; constrained to supported LanguageCode values. |
| `username` | TEXT NULL; normalized uniqueness for non-null values; reserved-name list enforced server-side. |
| `phone_number` | TEXT NULL; normalized E.164 format. |
| `terms_accepted_at` / `terms_version` | Acceptance evidence written by the server; both required for an accepted registration. |
| `age_confirmation_at` / `age_policy_version` | Server-timestamped acknowledgement evidence; independent of the DOB gate. |
| `email_verification_status` | TEXT NOT NULL DEFAULT 'not_required'; CHECK for `not_required`, `pending`, `verified`, `rejected`, `expired`. |
| `kyc_tier` | TEXT NOT NULL DEFAULT 'none'; CHECK for `none`, `basic`, `verified`, `enhanced`. |
| `kyc_lock` | BOOLEAN NOT NULL DEFAULT false. |
| `kyc_lock_reason` | TEXT NULL; map to PlayerSummary `depositKycLockReason`; access-controlled and audited. |
| `deposit_kyc_override` | TEXT NULL; CHECK allows only `require` or `waive`. Null means no override; never store `none`. |
| `deposit_kyc_override_expires_at` | TIMESTAMPTZ NULL; null is a permanent waiver only when override is `waive`, and must then satisfy dual-approval constraints. |
| `deposit_kyc_override_reason` | TEXT NULL; required when an override is requested/activated, subject to the final schema/transition model. |
| `deposit_kyc_override_requested_by` | UUID NULL; references the canonical admin principal, not a free-text username. |
| `deposit_kyc_override_approved_by` | UUID NULL; references the canonical admin principal; must differ from requester for a permanent waiver. |
| `deposit_kyc_override_set_at` | TIMESTAMPTZ NULL; written by the server when the effective override is set. |

The final schema review must settle foreign keys to the canonical admin principal table, uniqueness/indexes, audit/history records, database CHECK constraints, retention, migration rollback/forward-fix strategy and transaction boundaries. A single row of current state does not replace immutable audit history for requests, approvals, expiry and revocation. Do not duplicate player/admin principal models or add wallet/ledger/payment tables as part of this migration.

## 5. Deposit KYC eligibility and precedence

This logic is a **proposed KYC eligibility sub-check**, not permission to execute a real deposit. Every deposit must also pass jurisdiction/legal, sanctions/AML, fraud, responsible-gambling/self-exclusion, player/account status, payment method/currency, approved thresholds, provider and operational controls. If Q-015 or any required operational gate is open, the route remains disabled irrespective of the result below.

Use explicit numeric ranks: `none=0`, `basic=1`, `verified=2`, `enhanced=3`. The literal word `verified` in `kycTier` means Level 2.

Apply this order:

1. **Absolute lock priority:** if `kycLock=true` **and** `rank(kycTier) < rank(verified)`, reject the deposit KYC check. No override may bypass this rule.
2. **Require override:** otherwise, if `depositKycOverride=require` and `rank(kycTier) < rank(verified)`, reject; additional KYC to at least Level 2 is required.
3. **Active waiver:** otherwise, if `depositKycOverride=waive` and `(expiresAt IS NULL OR expiresAt > now())`, the KYC-tier gate passes only if the waiver is validly authorized. A future expiry represents a temporary waiver; null expiry represents a permanent waiver and requires requester/approver dual control with distinct principals.
4. **Normal method policy:** in all other cases—including null override and an expired waiver—compare the numeric player tier rank to the configured method `kyc_tier_required`. Reject if the player's tier is below the method's requirement; otherwise this KYC sub-check passes.

**`kycLock=false` + no override does not mean “no KYC”; it means follow the configured payment-method rules.** An expired waiver does not continue to apply. Do not implement ordering by string comparison (for example lexicographically comparing `basic` and `verified`).

Even when step 3 passes the KYC-tier check, all non-KYC hard controls still apply and real deposits remain globally disabled until Q-015 and all other mandatory gates are closed.

## 6. Proposed admin endpoints and permissions

Planned endpoints (not yet added to OpenAPI; final request/approval shapes require approval first):

- `PATCH /api/v1/admin/players/{playerId}/kyc-lock`
- `PATCH /api/v1/admin/players/{playerId}/deposit-kyc-override`

Required permissions:

- `players.kyc.lock` — set/clear the administrative KYC lock.
- `players.deposit.override` — request/manage a non-permanent or `require` override within policy.
- `players.deposit.override.waive` — request/approve waiver operations subject to the distinct-requester/approver invariant.

The exact dual-control protocol, whether approval is a separate operation, ETag/version conflict semantics, idempotency and response schemas must be decided before adding the routes to OpenAPI. A single-admin installation may issue a temporary waiver only if approved policy permits it; it must never activate a permanent waiver because permanent means `waive + expires_at IS NULL` and requires a distinct requester and approver. Apply full admin session/MFA, server-side permission enforcement, exact Origin and CSRF, reason capture, immutable audit, security/operations alerts and periodic review.

## 7. Additional acceptance tests

### Registration / email / anti-abuse

- Reject invalid, future and under-18 DOB values; verify date boundaries and server-side enforcement independent of client validation.
- Reject absent/false `acceptTerms` and `acceptAgeConfirmation`; verify server timestamps and policy versions.
- Verify `preferredLanguage` defaults/preselects `en` and unsupported languages are rejected.
- Verify username normalization, reserved-name rejection and database-enforced uniqueness under concurrent registration.
- Validate optional phoneNumber using the E.164 pattern; omission remains valid.
- CAPTCHA missing/invalid/expired/replayed/wrong-site token fails safely; provider outage never silently bypasses mandatory verification.
- Enforce 5 registration attempts/hour/IP and 3 password-reset requests/hour/normalized email, with appropriate 429/Retry-After behavior and generic account-enumeration-safe reset responses.
- Successful registration returns an active player with `emailVerificationStatus=not_required` and `kycTier=none`; it does not require sending/consuming an email verification challenge.
- Optional email verification transitions do not change KYC tier; password reset uses expiring single-use hashed tokens.
- Device fingerprint is best-effort only, can be absent/changed, and is not the sole reason for granting/denying access; sensitive raw values are not logged.

### KYC / threshold / lock / override

- Verify the explicit tier rank mapping and ensure no lexicographic enum comparisons are used.
- Verify `kycLock=true` plus tier below Level 2 rejects all deposit entry points despite `waive` or any other override.
- Verify `require` rejects below Level 2 and cannot weaken a method-specific higher requirement.
- Verify a future temporary waiver passes only the KYC-tier sub-check within approved scope; it expires at the stated time and, subject to the retained policy cap, no later than 30 days after activation.
- Verify a permanent waiver (`waive` with null expiry) requires requester and approver to be distinct; the one-admin installation cannot activate it.
- Verify expired waiver falls through to method-specific KYC requirements; null override likewise follows method rules.
- Verify the method's required tier is still enforced after a cleared lock or absent/inactive override.
- Verify all other hard eligibility controls remain effective when a waiver passes the KYC-tier sub-check.
- Verify permissions, concurrent conflicting updates, reason requirements, audit, alerting, expiry/revocation and periodic review.
- Verify no KYC/override decision activates deposit/real-money routes while Q-015, Q-011, Q-009 or applicable Q-020 requirements remain open.

## 8. Estimate and fixed gates

The revised Phase 4 estimate remains **11–18 person-days**, including the original identity scope plus the registration/anti-abuse contract, KYC tier, lock/override policy and additional tests. External Legal/Compliance review, Finance threshold decisions and provider evidence are dependencies outside this estimate.

- **Q-020:** Open until route-level runtime contract tests cover each implemented route and relevant approved callback.
- **Q-011:** P0/Open; no deployment. The controlled exception is local Phase 4 only.
- **Q-015:** Open; no launch or deposits until legal/jurisdiction review is completed.
- **Q-009:** TND routing remains blocked without written provider-specific precision evidence and golden fixtures.
- **Phase 4:** local-only. No real deposit, withdrawal, wallet posting, payment rail, provider callback or real-money operation.

## 9. Explicit approval required

- [x] Project Owner approved this v2 note and revised PlayerSummary/OpenAPI contract (2026-10-20).
- [x] Project Owner approved ADR-021 as the target design; written Legal/Compliance approval is still required before activation.
- [x] Project Owner approved ADR-022 lock precedence, nullable override semantics and dual approval for permanent waiver.
- [ ] Approve the separate Phase 4 migration-plan note before migration 001.
- [x] Project Owner approved the proposed endpoint/permission scope at the policy level; final route contract and runtime tests remain required.
- [x] Temporary-waiver maximum remains 30 days per the approved proposal; review/alert ownership remains an operational prerequisite.

**Until this approval is recorded, this note and the updated OpenAPI mirror are drafts: no migration or application implementation may begin.**
