# Q-001–Q-003 — API/Auth and Security Owner Decisions

**Date:** 2026-10-20  
**Branch:** `feature/BE-001-api-skeleton`  
**Status:** **Decision requested; no owner approval recorded; authentication implementation remains blocked.**  
**Decision issue:** [#55](https://github.com/Bclick9/Bclick/issues/55)

This note summarizes the contract review and proposed defaults for the API/Auth and Security owners. The recommendations below are not approvals. The planning register identifies accountable roles but does not map them to named GitHub users, so implementation is gated until named approvers are assigned and their decisions recorded.

## Q-001 — Canonical admin session bootstrap

### Current source contract
`GET /api/v1/admin/session` currently describes:
- `200` with `AdminSessionResponse`;
- `401` via the standard `Unauthorized` response;
- `403` via the standard `Forbidden` response;
- an authoritative response whose `roles[]` and effective `permissions[]` are computed server-side.

Two fields conflict with the other planning guidance:
1. `AdminSessionResponse.data.admin.status` permits `active`, `locked`, and `disabled`, even though the frontend integration guidance expects locked/disabled or unacceptable states to receive `403`.
2. The same successful schema permits `mfa.enabled=false` and `mfa.method=null`, while the admin-login contract says a full admin session cannot be issued until MFA is verified.

### Proposed owner decision (not yet approved)
- Return **200** only for an active admin with a valid, fully authenticated server-side session and completed mandatory MFA. Tighten the successful schema to `admin.status=active`, `mfa.enabled=true`, and `mfa.method=totp`.
- Return **401** for absent, malformed, expired, revoked, or MFA-incomplete authentication.
- Return **403** when the account is known but locked, disabled, or otherwise barred from Backoffice access; do not return a successful session document in this case.
- Return only minimal admin identity plus stable role names, effective permissions, MFA state, and session timestamps. Derive roles/permissions from the authoritative server-side RBAC state; every protected handler independently authorizes its action. No client/local-storage permission list can authorize anything.

### Acceptance evidence required
Runtime tests for active+MFA 200; absent/expired/revoked/challenge-only 401; locked/disabled 403; no token/credential/secret leakage; permissions are server-derived and permission revocation cannot leave a usable stale privilege; unknown states fail closed.

**Blocked work:** Do not implement this handler until API/Auth and Security approve the response semantics and OpenAPI schema.

## Q-002 — Admin MFA, bootstrap and recovery

### Current source contract
The planning contract defines password login returning an MFA challenge (202), TOTP/recovery-code verification before a full session, an enrollment-only cookie for an admin without enrolled MFA, rate limits, and single-use recovery codes. The full admin session cookie is returned only after factor verification.

### Items requiring an explicit decision
- `AdminLoginResponse.data.status` distinguishes `mfa_required` from `enrollment_required`, while the 202 response defines an `AdminEnrollmentCookie` header whose prose says it is used only for enrollment. The test contract must make conditional cookie emission explicit.
- The challenge ID is included in the verification request, but the challenge-binding model (server-side one-time state and its binding to principal/environment/browser context) should be made normative.
- The first-admin bootstrap and MFA-reset approval procedure are operational gates, not merely response schemas.

### Proposed owner decision (not yet approved)
- No public admin self-registration. Bootstrap the first admin only through a tested, out-of-band, one-time procedure, with no default or committed bootstrap secret.
- Password acceptance creates only a short-lived challenge; never create a full session until TOTP or a single-use recovery code succeeds. Limit challenge lifetime to at most 5 minutes and cap attempts.
- Define and test the separate MFA-required and enrollment-required outcomes. The enrollment cookie is scoped to enrollment endpoints only, expires within the approved short lifetime, and never grants access to Backoffice data or general mutations.
- Encrypt TOTP secrets at rest and never log seeds, QR payloads, passwords, or codes. Show recovery codes once; store salted hashes with a server-held pepper and atomically consume each code once.
- MFA reset requires a ticket/reason, a distinct authorized approver (requester cannot approve their own reset), audit records, invalidation/rotation of factors and recovery codes, and approved session revocation semantics.

### Acceptance evidence required
Challenge expiry/replay/attempt tests; TOTP success/failure; recovery success exactly once; no full session before MFA; enrollment-only authorization boundaries; reset cannot self-approve; tested bootstrap/recovery runbook and audit redaction.

**Blocked work:** Do not implement login, MFA, session issuance, recovery, or reset handlers until API/Auth + Security approve the lifecycle and operational runbook.

## Q-003 — Player/admin CSRF policy

### Current source contract
The planning extension specifies signed session-bound double-submit CSRF for unsafe cookie-authenticated methods, a cookie/header match, exact configured `Origin`, rotation on login/MFA/session/privilege changes/logout, and CSRF checks waived for unauthenticated login/registration/reset while Origin and abuse controls remain in force.

### Item requiring an explicit decision
The policy describes the same `__Host-bclick_csrf` cookie name for player session, admin session, and restricted enrollment. If both applications share a hostname, one cookie name cannot hold independent session-bound values at once. If player/admin use separate hosts, that topology needs to be an approved, tested invariant.

### Proposed owner decision (not yet approved)
- Enforce a per-environment exact-origin allowlist; reject unsafe cookie-authenticated requests with absent or untrusted Origin. No wildcard and no reliance on SameSite alone.
- CSRF values must bind cryptographically to the exact active session ID/version or restricted enrollment challenge, have bounded expiry, be checked using constant-time comparison after format/length validation, and never be logged.
- Choose one of:
  - **A:** approved separate player/admin hosts, enforced and tested in staging; or
  - **B (recommended):** distinct host-only CSRF cookie namespaces for player, admin, and restricted admin enrollment, preventing same-host token overwrite.
- Require cookie/header equality and signature/session binding for every unsafe method authenticated by player/admin/enrollment cookies. Apply strict Origin and rate limits to unauthenticated login/register/reset as well. Rotate/clear CSRF material at login, MFA completion, session rotation, privilege changes, logout and revocation. Enrollment-only cookies must remain restricted to the enrollment route set.

### Acceptance evidence required
Negative tests for missing cookie/header, mismatch, invalid signature, expiry, wrong session/version, malformed/duplicate cookie values, absent/untrusted Origin, plus positive same-origin unsafe method, rotation/logout/revocation, and denial of enrollment-cookie access to Backoffice reads/mutations.

**Blocked work:** No cookie-authenticated mutation handlers or CSRF middleware implementation until Security, API/Auth and Frontend/Platform approve cookie naming/origin topology and the negative-test matrix.

## Decisions / owners

| Decision | Accountable roles from the planning register | Status |
|---|---|---|
| Q-001 response/status/permissions contract | API/Auth lead + Security + Tech Lead | Requested in issue #55 |
| Q-002 MFA, recovery, reset and bootstrap lifecycle | API/Auth lead + Security/Operations | Requested in issue #55 |
| Q-003 CSRF/session binding and origin topology | Security + API/Auth + Frontend/Platform | Requested in issue #55 |

**Current gate status:** Q-001/Q-002/Q-003 remain open. This note proposes a review path but records no accepted owner decision. No authentication or sensitive cookie-auth implementation was introduced by this task.
