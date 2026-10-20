# ADR-021 Draft — Threshold-Based Deposits Without Full KYC

**Date:** 2026-10-20  
**Status:** DRAFT v2 — awaiting Project Owner approval; Legal/Compliance review is mandatory before any deposit enablement.  
**Decision owners:** Project Owner, Legal/Compliance and Finance.  
**Related:** [Phase 4 Addendum v2](./2026-10-20-phase4-addendum-v2.md) · [ADR-022 draft](./2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

## 1. Context

Existing planning language assumes KYC-first deposit eligibility. The Project Owner proposes a threshold-based staged model as the target design, allowing limited deposits before full KYC only where expressly approved by Legal/Compliance and Finance. This is a material policy change with jurisdiction-specific legal, AML/CTF, sanctions, fraud, age-verification and responsible-gambling consequences.

Email verification is not mandatory for player activation. Email verification status must therefore remain distinct from KYC. A captured email is not proof of a verified address and does not, on its own, satisfy a legal identity or AML requirement.

This ADR is a policy proposal, not evidence that the model is lawful or commercially approved in any jurisdiction.

## 2. Decision proposed

Adopt a **threshold-based KYC eligibility target design** only after written Legal/Compliance approval for each intended launch jurisdiction and Finance approval of limits. Until those approvals and all operational gates exist, all deposit routes remain disabled.

### KYC tier enum and level mapping

The canonical player field is `kycTier`, with required enum values:

| `kycTier` | Level | Evidence / intent | Proposed capability |
|---|---:|---|---|
| `none` | 0 — Light | Email captured, date of birth and country; email verification is not required | Deposits only within explicitly approved jurisdiction/currency thresholds. No bonuses. |
| `basic` | 1 — Basic | Government ID + selfie, plus all required prior checks | Deposits may use a higher explicitly approved threshold. |
| `verified` | 2 — Full | ID + address + source of funds (SoF) | Withdrawals may be unlocked only when all applicable AML/CTF, sanctions, payment, fraud, responsible-gambling and jurisdiction checks also pass. Bonuses may be considered under separate product/finance policy. |
| `enhanced` | 3 — Enhanced | Enhanced due diligence/manual review for high value, PEP/sanctions or other policy-driven risk | Manual review and restrictions according to approved policy; not automatic approval. |

**Important terminology:** `kycTier=verified` means Level 2 KYC. It is unrelated to `emailVerificationStatus=verified`, which refers only to the email-verification lifecycle. Do not reuse `verificationStatus` as a combined KYC/email field.

Level 3 controls are a risk state and do not postpone screening that must legally occur earlier. PEP/sanctions screening and legally required checks must run at the stage required by law and policy regardless of deposit threshold.

### Threshold configuration

Thresholds are not defined by this ADR and must never be invented or hard-coded. For every jurisdiction/currency, Finance and Legal/Compliance must approve:

- per-transaction and cumulative limits, explicit time windows and aggregation rules;
- aggregation across methods/currencies/accounts where required;
- treatment of pending deposits, reversals, refunds and chargebacks;
- step-up triggers, manual review, expiry/reverification and audit rules;
- interactions with self-exclusion, sanctions/AML/fraud holds, player/account state, payment-method limits and responsible-gambling restrictions.

Missing, stale or ambiguous threshold configuration fails closed. Do not derive thresholds from display currency, infer vendor support or route TND without the written provider precision/currency evidence required by Q-009.

## 3. Eligibility invariants

1. Registration requires server-side DOB validation (age >= 18), country/jurisdiction validation and required terms/age confirmations. An age checkbox is not an age-verification substitute.
2. Email verification is optional and does not change `kycTier`.
3. The tier is server-controlled, evidence-backed and ordered by explicit rank: `none=0`, `basic=1`, `verified=2`, `enhanced=3`. Do not compare enum strings lexicographically.
4. The KYC-tier decision is only one part of deposit authorization. All player/account, jurisdiction, sanctions/AML, fraud, responsible-gambling/self-exclusion, payment-method/currency and other legal controls remain mandatory.
5. Bonuses remain ineligible below Level 2 (`kycTier=verified`) regardless of deposit thresholds.
6. Withdrawals remain ineligible below Level 2 under this proposal and still need separate payment/compliance eligibility.
7. Every decision records policy version, amount/currency, evaluation time, applicable threshold window/totals and a safe reason code. Avoid exposing investigation details to the player.
8. Unknown jurisdiction, missing evidence, unavailable mandatory checks or configuration errors fail closed.
9. The hard KYC lock in ADR-022 has precedence over every override while the tier is below Level 2.
10. Acceptance of this ADR does not enable a deposit route or authorize wallet postings, provider calls or callbacks.

## 4. Alternatives considered

### A. Full KYC before every deposit

Advantages: conservative and operationally simpler, with fewer threshold aggregation edge cases.  
Disadvantages: higher user friction and potentially unnecessary document collection for lower-risk activity.

This remains the safe operational fallback until a jurisdiction-specific alternative is approved. This ADR does not assert that full KYC is universally required by law.

### B. Threshold-based staged verification — proposed

Advantages: staged evidence collection and a policy that can permit limited lower-value activity where legal rules allow it.  
Disadvantages: greater complexity in aggregation, step-up logic, auditability, operational review and jurisdiction-by-jurisdiction compliance.

**Proposed direction:** B, conditionally. Without written Legal/Compliance approval, deposit eligibility remains disabled rather than assuming the proposal is permitted.

## 5. Required changes after approval

- Reconcile KYC-first wording across OpenAPI, KYC/payment specifications, domain specifications, frontend integration and roadmap; preserve legal gates and avoid contradictory requirements.
- Implement one server-side eligibility service used by every deposit path. The UI is not an authorization boundary.
- Define verified evidence sources, expiry/reverification, policy versioning, transition rules, audit data and reviewer separation.
- Add tests for threshold boundaries, rolling periods, currencies/methods, stale policy, reversals, concurrent deposits, step-up, Level 2 bonus/withdrawal gating and every hard-block control.
- Add negative tests proving direct API calls cannot bypass policy.
- Keep all deposit routes disabled until Legal/Compliance, operational and route-level acceptance requirements are met.

## 6. Dependencies and launch gates

- **Q-015 remains Open:** written jurisdiction-specific legal/compliance review is required before launch and before deposits.
- **Q-011 remains P0/Open:** no deployment until the real isolated restore drill and required backup monitoring evidence pass.
- **Q-009 remains Open:** TND routing stays disabled for each provider until written precision/currency evidence and golden tests pass.
- **Q-020 remains Open:** every implemented route needs runtime contract/security coverage.
- Provider settlement currency, signature, callback, payment-provider and tenant-specific constraints require independent evidence. This ADR does not assert vendor capability.

## 7. Consequences

If accepted and later legally approved, this model requires a versioned, auditable, fail-closed policy configured by jurisdiction and currency, with operational monitoring and review when rules or payment methods change.

If Legal rejects the model in a jurisdiction, that jurisdiction must remain disabled or use the alternative policy Legal approves. A global threshold cannot be assumed.

## 8. Approval record

- [ ] Project Owner approves threshold-based eligibility as the target design.
- [ ] Legal/Compliance grants written approval per intended launch jurisdiction.
- [ ] Finance approves threshold values, currencies, time windows and aggregation.
- [ ] Product/Compliance approves Level 2 bonus and withdrawal policy.
- [ ] Security/API approves the state machine, audit and runtime acceptance suite.

**No deposits may be enabled solely by accepting this ADR.**
