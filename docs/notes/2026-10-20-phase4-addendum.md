# Phase 4 Identity Addendum — Registration and KYC Policy Decisions

**Date:** 2026-10-20  
**Status:** DRAFT — awaiting explicit Project Owner approval with ADR-021 and ADR-022.  
**Scope:** Planning and contract design only. No migration, application code, deposit route, or KYC override endpoint is authorized by this note.  
**Related plan:** [Phase 4 Identity Plan](./2026-10-20-phase4-identity-plan.md)  
**Related ADR drafts:** [ADR-021 — Deposit Without Full KYC](./2026-10-20-ADR-021-deposit-without-kyc-draft.md) · [ADR-022 — KYC Lock and Deposit Override](./2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

## 1. Purpose and approval boundary

This addendum captures the Project Owner's more recent registration and KYC policy direction, which is not represented by the original Phase 4 plan. The original plan remains the structural implementation framework, but its details are not approved until this addendum and both ADRs are explicitly accepted.

**No code or migration work may start until the Project Owner approves all three documents.** In particular, do not create or alter the players schema before ADR-021 and ADR-022 are approved. The current Phase 3 baseline migration is a no-op and no domain/player tables exist yet; the approved migration sequence must therefore create the canonical player schema before any later migration alters it.

Approval of these drafts will not satisfy Q-011, Q-015, Q-020 or Q-009, and will not authorize deposits, withdrawals, real-money routes, provider callbacks or deployment.

## 2. Registration decisions to encode after approval

### 2.1 Email verification

- Email verification is **not required** to activate a newly registered player.
- The player becomes active immediately after successful registration and server-side eligibility checks.
- The intended default is `verificationStatus = not_required`.
- Email verification remains an optional, player-requested flow.
- Password reset continues to use email and must remain available even when email verification is not required.
- Security notifications may be sent by email as an optional delivery channel; delivery is not proof of identity and must not be required for initial account activation.

**Contract clarity required:** the existing OpenAPI PlayerSummary already has a required `verificationStatus` with values `pending, verified, rejected, expired, not_required`, while KYC has a separate `GET /api/v1/kyc/status` contract. Before code, explicitly scope PlayerSummary.verificationStatus to the email-verification lifecycle and define allowed transitions. Do not use this field as a substitute for KYC status. Confirm whether the legacy `rejected` value remains meaningful for email verification or should be removed in a reviewed contract change.

### 2.2 RegisterRequest additions

Retain the existing required email, password, countryCode and settlementCurrency contract fields. Proposed additions:

| Field | Input rule | Server rule / persistence intent |
|---|---|---|
| dateOfBirth | Required; date-only ISO format | Validate age >= 18 server-side, reject future/invalid dates and unsupported-jurisdiction registrations. Persist the date without a time component. |
| acceptTerms | Required boolean and must be true | Reject false or missing values. Persist acceptance timestamp and the applicable terms version, not just a client-supplied boolean. |
| acceptAgeConfirmation | Required boolean and must be true | Reject false or missing values. Persist timestamp and age-policy/version evidence. This acknowledgement does not replace date-of-birth validation. |
| preferredLanguage | Registration form must have a selected value; default to en | Persist a non-null language. Resolve the wire-contract detail of whether omission is accepted by the API and defaulted server-side or the UI must always send the preselected en value. |
| username | Optional | Normalize consistently; enforce uniqueness with a database constraint and block reserved/system/protected names using a server-maintained list. |
| phoneNumber | Optional | Validate normalized E.164 format. Do not make phone verification a requirement unless separately approved. |
| captchaToken | Required at the API boundary when registration CAPTCHA is enabled | Verify server-to-server with the chosen CAPTCHA provider; reject missing, invalid, expired, replayed, or wrong-host/site tokens. Keep provider choice configurable until approved. |

OpenAPI already includes optional `language` and `preferredDisplayCurrency`. The contract change must decide whether `language` is renamed to `preferredLanguage` or retained as a compatibility alias; do not silently maintain two independently editable language fields. `preferredDisplayCurrency` remains presentation-only, and `settlementCurrency` remains the required, immutable settlement choice.

### 2.3 Registration abuse controls

- CAPTCHA: choose Cloudflare Turnstile or hCaptcha before implementation. Verify tokens on the server and fail closed if verification is unavailable; never treat browser-only validation as sufficient.
- Registration rate limit: at most **5 registration attempts per hour per IP**, with a safe 429 response and Retry-After behavior. Apply limits before expensive registration work and avoid exposing whether an email/username already exists.
- Password-reset rate limit: at most **3 requests per hour per normalized email**. Use generic responses that do not disclose account existence. Do not put reset tokens in logs; persist only a hash of single-use reset tokens.
- Device fingerprint: best-effort risk signal only. It must not be an authentication factor or the sole reason for granting/blocking access. Minimize data, rotate/pseudonymize where practical, avoid logging raw fingerprint data, and document purpose/retention in the privacy review.
- Enforce registration uniqueness, terms acceptance, age and jurisdiction rules transactionally/server-side. A client-provided boolean or device fingerprint is never authoritative evidence of age or identity.

## 3. ADR-021 — threshold-based deposit eligibility

ADR-021 proposes replacing the current planning assumption of full KYC before every deposit with staged, threshold-based eligibility. This is **not approved policy yet** and conflicts with existing KYC-first wording. The owner requires Legal review before any deposit can be enabled.

Proposed levels:

| Level | Evidence | Proposed capability |
|---|---|---|
| Level 0 — Light | Email address, date of birth and country captured at registration; email verification is not required by default | Deposits only below jurisdiction- and currency-specific thresholds approved by Finance and Legal. Bonuses remain gated until Level 2. |
| Level 1 — Basic | Government ID and selfie, plus all prior eligibility checks | Deposits may use a higher approved threshold. |
| Level 2 — Full | ID, address and source-of-funds evidence | Withdrawal eligibility may be unlocked, subject to payment, AML/sanctions, fraud, limits and jurisdiction checks. |
| Level 3 — Enhanced | Enhanced high-value / PEP / sanctions / other risk review and manual review as required | Manual-review controls and restrictions determined by the approved risk/compliance policy. |

Threshold amounts and windows must not be invented in code. Finance and Legal must approve per-jurisdiction/per-currency values, transaction and rolling-period definitions, cumulative aggregation, treatment of chargebacks/reversals and risk-based escalation. PEP/sanctions screening obligations must be applied whenever required by law/policy; they must not be postponed merely because the player is below a monetary threshold.

Until Legal has documented the permitted model for each launch jurisdiction, **all deposit routes remain disabled**. ADR-021 approval alone is not legal approval and does not close Q-015. TND remains disabled for any provider without the written precision evidence tracked by Q-009.

See ADR-021 for alternatives, consequences and decision criteria.

## 4. ADR-022 — KYC lock and deposit overrides

Proposed player state:

- `players.kyc_lock BOOLEAN NOT NULL DEFAULT false`: when true, all deposits are blocked until the player reaches at least Level 2. This is a hard lock and takes precedence over deposit overrides; no override may bypass it.
- `players.deposit_kyc_override`: proposed values `none | require | waive`, with the owner-requested intent: `require` means additional KYC is required; `none` is described as a VIP exception limited to 30 days; `waive` means KYC requirements are waived under dual approval.

**The enum terminology requires explicit approval:** `none` conventionally means “no override,” which conflicts with “VIP exception.” The draft preserves the requested mapping for review, but the implementation must not rely on the value until the owner confirms whether to rename it (for example to a distinct VIP-exception value) or formally define the nonstandard meaning.

A single enum column cannot by itself record expiry, requester/approver, reason, evidence or review history. The proposed design therefore includes an audit-backed override record/history with at least override type, status, reason, requester, independent approver where required, created/expiry times, policy version and review outcome. An override must never be inferred from a VIP label alone. Expiry must fail closed back to normal policy and trigger an alert/review event.

Proposed admin API paths, only after contract and security approval:

- `PATCH /api/v1/admin/players/{playerId}/kyc-lock`
- `PATCH /api/v1/admin/players/{playerId}/deposit-kyc-override`

The request contracts must require the target state/value, a reason and audit metadata. A waive request must not become active from a single administrator's PATCH: dual control requires requester and approver to be different principals. Since the initial local installation has one administrator, waive operations must remain unavailable until a safe independent approval mechanism exists. The final request/approval HTTP flow must be specified before OpenAPI is changed.

New permissions:

- `players.kyc.lock`
- `players.deposit.override`
- `players.deposit.override.waive`

Every change requires server-side permission enforcement, reason capture, immutable audit events, alerting and periodic review. Permission hiding in the Backoffice UI is not authorization. No endpoint may enable deposits while Q-015 or other mandatory launch gates remain open.

See ADR-022 for the precedence rules, database proposal and unresolved decisions.

## 5. OpenAPI, database and implementation changes — proposed only

### OpenAPI

After approval, update `docs/planning/openapi.yaml` and the repository mirror consistently:

1. Extend RegisterRequest with dateOfBirth, acceptTerms, acceptAgeConfirmation, preferredLanguage, optional username and phoneNumber, and a CAPTCHA token contract.
2. Clarify the registration 201 response: player status is active after successful server-side eligibility validation; email verification is not a required challenge.
3. Specify PlayerSummary.verificationStatus as email-verification status, default not_required, without conflating it with KYC status. Confirm enum semantics and language-field naming before code generation.
4. Add the two proposed admin KYC control operations, strict request/response schemas, standard 400/401/403/409/422/429 envelopes, CSRF and Origin requirements, idempotency/concurrency semantics if applicable, audit behavior and permission requirements.
5. Keep generated API declarations generator-owned. Run OpenAPI lint, the static contract guard, generated-client regeneration/drift check and runtime contract tests for every implemented route.

### Database / migration planning

No migration is created by this note. Subject to ADR approval and schema review, the future canonical player schema will need the following registration attributes:

- date of birth;
- preferred language, non-null with default en;
- normalized optional username and a uniqueness constraint that remains correct under concurrent registrations;
- normalized optional E.164 phone number;
- terms accepted timestamp and terms version;
- age-confirmation timestamp and policy version;
- email-verification status defaulting to not_required, with the exact ownership/enum semantics approved first;
- kyc_lock defaulting to false;
- deposit KYC override state and/or a normalized, audit-backed override-history table supporting expiry and independent approval.

The repository currently has no players domain table, so implementation must not begin with an ALTER TABLE against a nonexistent table. The approved schema/migration sequence must establish the canonical player table first and must not create wallet, ledger, payment or provider-routing tables as a side effect of this identity addendum.

CAPTCHA provider configuration, IP rate-limit counters and device-risk signals should not automatically become permanent player columns; select bounded storage/retention based on the approved implementation and privacy review.

## 6. Additional acceptance tests

### Registration and email lifecycle

- Reject missing/invalid/future DOB and a DOB that does not meet the 18+ rule; test boundary dates and unsupported jurisdictions server-side.
- Reject missing/false acceptTerms and acceptAgeConfirmation; verify acceptance timestamp/version records.
- Verify the UI default and server behavior for preferredLanguage=en; reject unsupported language codes.
- Verify normalized username uniqueness under concurrent requests and reject reserved names; validate optional phoneNumber against E.164 rules.
- Verify CAPTCHA missing/invalid/expired/replayed/wrong-site tokens fail safely and a CAPTCHA-provider outage cannot silently bypass verification.
- Enforce 5 registrations/hour/IP and return a bounded 429 response with Retry-After; test parallel attempts and IP normalization/proxy trust rules.
- Confirm successful registration creates an active player with verificationStatus=not_required without sending or requiring an email verification challenge.
- Confirm optional email verification can be requested and consumed once, without changing KYC state.
- Enforce 3 password-reset requests/hour/normalized-email, generic account-enumeration-safe responses, single-use hashed tokens, expiry and rate-limit tests.
- Verify device fingerprint absence/change does not break ordinary registration or act as sole authorization evidence; ensure raw values/secrets are not logged.

### KYC lock and override controls

- Verify kyc_lock=true blocks every deposit eligibility path until Level 2, regardless of override value.
- Verify require causes the approved additional KYC step; expiry/invalid states fail closed.
- Verify the 30-day VIP exception cannot outlive its approved expiration; expiry triggers alert and returns to normal policy.
- Verify waive cannot activate without a distinct approver, and the one-admin installation rejects or leaves it pending.
- Verify permissions separately for lock, standard override and waive; enforce all permissions server-side.
- Verify every request, approval, denial, change, expiry and periodic review is auditable and produces the configured alert.
- Verify a KYC override cannot bypass jurisdiction, sanctions/AML, responsible-gambling, account-status, payment-method or other mandatory eligibility checks.
- Verify no deposit or real-money route is enabled by draft acceptance alone while Q-015, Q-011, Q-009 or the relevant route-level Q-020 requirements remain open.

## 7. Schedule and hard gates

The original Phase 4 estimate was 7–12 person-days. The additional registration controls, contract work, and KYC lock/override design and acceptance work add an estimated **4–6 person-days**, for a revised Phase 4 estimate of **11–18 person-days**. This estimate covers the planned local implementation and tests; external Legal/Finance review, vendor procurement and infrastructure lead time are separate dependencies and can extend calendar duration.

Fixed gates remain:

- **Q-020 — Open:** required until runtime contract coverage exists for each implemented route and approved provider callback route.
- **Q-011 — P0/Open:** no deployment; controlled exception is for local Phase 4 work only until the actual isolated restore drill passes.
- **Q-015 — Open:** no launch or deposits until jurisdiction-specific Legal/Compliance approval.
- **Q-009 — Open:** TND routing remains disabled without provider-specific written precision evidence and golden tests.
- **Phase 4:** local development only. No deposits, withdrawals, wallet postings, payment rails, provider callbacks or real-money routes.

## 8. Approval checklist

The Project Owner must explicitly approve each item before implementation:

- [ ] This Phase 4 addendum, including RegisterRequest and PlayerSummary semantics.
- [ ] ADR-021 threshold-based deposit eligibility, subject to separate Legal approval before activation.
- [ ] ADR-022 lock/override precedence, the meaning of the `none` value, and the dual-approval API flow.
- [ ] Final language field naming/default behavior and verificationStatus email-only semantics.
- [ ] Phase 4 estimate of 11–18 person-days.

**Until that approval is recorded, this commit is documentation-only. No migration, contract mutation, code, deposit eligibility change or new endpoint implementation is authorized.**
