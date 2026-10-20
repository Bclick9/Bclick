# ADR-021 Draft — Threshold-Based Deposits Without Full KYC

**Date:** 2026-10-20  
**Status:** DRAFT — not accepted; Legal/Compliance review required before any deposit enablement.  
**Decision owners:** Project Owner, Legal/Compliance and Finance.  
**Related:** [Phase 4 addendum](./2026-10-20-phase4-addendum.md) · [ADR-022 draft](./2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

## 1. Context

The current planning material describes KYC-first behavior before deposits. The Project Owner proposes a staged, threshold-based model so that a player may deposit below an approved threshold before completing full identity-document verification. This is a material policy change with jurisdiction-specific legal, AML/CTF, sanctions, fraud, age-verification and responsible-gambling consequences.

Email verification is not required for account activation. Consequently, possession of an email address must not be treated as proof that the address is verified. Every registration still requires a valid date of birth and country, server-side age >= 18 validation, supported-jurisdiction checks and terms/age acknowledgements.

This ADR is a policy proposal, not evidence that the proposed model is legal or commercially approved in any jurisdiction.

## 2. Decision proposed

Adopt a **threshold-based deposit eligibility model as the target design**, conditional on written Legal/Compliance approval for each launch jurisdiction and Finance approval of thresholds. Until those approvals exist, all deposit paths remain disabled.

| Level | Required evidence | Proposed eligibility |
|---|---|---|
| Level 0 — Light | Email captured, DOB and country; no mandatory email-verification step | Deposit permitted only up to low thresholds explicitly approved by jurisdiction, currency and time window. No bonuses. |
| Level 1 — Basic | Government ID and selfie, plus all prior required checks | Deposit may be permitted up to a higher approved threshold. |
| Level 2 — Full | ID, address and source-of-funds evidence | Withdrawal may be unlocked only after all applicable AML/CTF, sanctions, payment, fraud and jurisdiction rules also pass. Bonuses may become eligible, subject to product/finance rules. |
| Level 3 — Enhanced | Enhanced due diligence and manual review triggered by high-value activity, PEP/sanctions or other risk signals | Manual-review status and restrictions are determined by approved policy; no automatic approval merely because a document set is complete. |

Level 3 is an enhanced review/risk state, not a substitute for screening that must occur earlier. PEP/sanctions checks and legally required controls must run at the stage required by law and policy, regardless of deposit amount.

### Threshold configuration

Thresholds are not defined by this ADR and must not be hard-coded. For every permitted jurisdiction/currency, Finance and Legal/Compliance must approve:

- per-transaction and cumulative thresholds with explicit rolling-period boundaries;
- aggregation across payment methods, currencies and related accounts where required;
- treatment of pending deposits, reversals, refunds and chargebacks;
- step-up conditions, manual-review triggers, expiry/reverification and audit requirements;
- how self-exclusion, sanctions/AML holds, suspected fraud, player/account status, payment-method limits and responsible-gambling restrictions interact with thresholds.

A missing or stale threshold configuration fails closed. Do not infer a value, convert currencies using a display preference, or enable TND based on an unconfirmed provider capability.

## 3. Alternatives considered

### A. Full KYC before every deposit

Advantages: simpler enforcement and a conservative baseline; fewer threshold edge cases.  
Disadvantages: higher user friction and potentially unnecessary document collection for low-risk/low-value activity.

This remains the safe operational fallback until Legal approves an alternative. It is not a claim that full KYC is universally required by law.

### B. Threshold-based staged verification — proposed

Advantages: graduated evidence collection and a policy that can apply lower-risk limits before full KYC.  
Disadvantages: materially more complex rule evaluation, cumulative-limit aggregation, step-up behavior, audit and compliance exposure; legality varies by jurisdiction.

**Proposed direction:** B, but only after written Legal/Compliance approval. If no approval exists, deposit eligibility remains disabled rather than silently treating the proposal as accepted.

## 4. Security and eligibility invariants

1. Registration validates DOB and jurisdiction server-side; age acknowledgement alone is insufficient.
2. Email verification is optional and does not alter KYC level.
3. KYC level is not the sole authorization input. Every deposit/withdrawal decision also checks current player/wallet state, jurisdiction, sanctions/AML/fraud holds, responsible-gambling and self-exclusion state, payment-method/currency limits and any hard KYC lock.
4. Bonuses remain disabled below Level 2, regardless of deposit eligibility.
5. Withdrawals remain locked below Level 2 under this proposal and still require all applicable payment/compliance checks.
6. Level progression is evidence-backed; a UI flag or administrator-supplied status cannot make a player verified.
7. Threshold decisions record the policy version, amount/currency, evaluation time, relevant rolling-period totals and a safe reason code without exposing sensitive investigation details to the player.
8. Missing evidence, unknown jurisdiction, unavailable mandatory checks or configuration errors fail closed.
9. This ADR does not authorize deposits, wallet postings, payment-provider calls or provider callbacks.

## 5. Required implementation and contract changes after approval

- Reconcile all KYC-first assumptions across OpenAPI, KYC/payment specifications, domain specifications, frontend integration and the implementation roadmap. Do not leave contradictory normative rules.
- Define the server-side eligibility service as the single decision point used by every deposit path. UI gating is presentation only.
- Define explicit level/status enums, evidence source and expiry, policy versioning, transition rules, event/audit records and reviewer separation.
- Add tests for boundary thresholds, cumulative windows, multiple currencies/payment methods, stale policy, reversals, concurrent deposits, step-up, Level 2 gating for bonuses/withdrawals and every hard-block control.
- Add negative tests proving direct API calls cannot bypass UI or policy.
- Keep all deposit routes disabled until the jurisdiction decision and associated tests are accepted.

## 6. Dependencies and launch gates

- **Q-015 remains Open:** written jurisdiction-specific Legal/Compliance readiness is mandatory before launch and before enabling deposits.
- **Q-011 remains P0/Open:** no deployment until the actual isolated restore drill and required backup monitoring evidence pass.
- **Q-009 remains Open:** TND routing stays disabled for each provider until the written three-decimal precision contract and golden fixtures are accepted.
- **Q-020 remains Open:** actual route handlers require runtime contract/security tests.
- Provider currency, settlement, callback-signature and payment/PSP facts must be independently verified; this ADR does not assert vendor support.

## 7. Consequences

If accepted, the project must implement and maintain a versioned, auditable, fail-closed eligibility policy with per-jurisdiction and per-currency configuration. The policy will require legal maintenance, monitoring and review whenever a threshold, jurisdiction or payment method changes.

If Legal rejects threshold-based eligibility for a jurisdiction, that jurisdiction must remain disabled or use the legally approved alternative. There is no global assumption that this model is permitted.

## 8. Approval record

- [ ] Project Owner accepts the threshold-based target design.
- [ ] Legal/Compliance provides written approval per intended launch jurisdiction.
- [ ] Finance approves threshold values, currencies and windows.
- [ ] Product/Compliance approves Level 2 bonus and withdrawal rules.
- [ ] Security/API owners approve the final state machine, audit and runtime acceptance suite.

**No deposits may be enabled solely by accepting this ADR.**
