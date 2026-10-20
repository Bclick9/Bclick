# Q-001–Q-003 — API/Auth and Security Owner Decisions

**Date:** 2026-10-20  
**Branch:** `feature/BE-001-api-skeleton`  
**Status:** Project Owner decisions recorded on 2026-10-20: Q-001 and Q-002 Accepted; Q-003 policy Accepted, with cookie-namespace compatibility requiring contract reconciliation before implementation.  
**Decision issue:** [#55](https://github.com/Bclick9/Bclick/issues/55)

This note records the read-back of the current contracts and the Project Owner's explicit decision. Project Owner Bclick9 acts as API/Auth lead and Security lead for the current single-person team; Frontend/Platform is not a separate approver at this stage. The policy decisions are accepted, but implementation is still blocked until the contract mismatches described here are reconciled and the contract/test PR passes CI.

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

### Accepted Project Owner decision — 2026-10-20
- Return **200** only for an active admin with a valid, fully authenticated server-side session and completed mandatory MFA. Tighten the successful schema to `admin.status=active`, `mfa.enabled=true`, and `mfa.method=totp`.
- Return **401** for absent, malformed, expired, revoked, or MFA-incomplete authentication.
- Return **403** when the account is known but locked, disabled, or otherwise barred from Backoffice access; do not return a successful session document in this case.
- Return only minimal admin identity plus stable role names, effective permissions, MFA state, and session timestamps. Derive roles/permissions from the authoritative server-side RBAC state; every protected handler independently authorizes its action. No client/local-storage permission list can authorize anything.

### Acceptance evidence required
Runtime tests for active+MFA 200; absent/expired/revoked/challenge-only 401; locked/disabled 403; no token/credential/secret leakage; permissions are server-derived and permission revocation cannot leave a usable stale privilege; unknown states fail closed.

**Implementation gate:** The Project Owner has approved these semantics. Before handler code, update OpenAPI so the successful schema requires the accepted active+MFA state and the agreed fields, add contract fixtures, regenerate the client and get the contract/test PR green.

## Q-002 — Admin MFA, bootstrap and recovery

### Current source contract
The planning contract defines password login returning an MFA challenge (202), TOTP/recovery-code verification before a full session, an enrollment-only cookie for an admin without enrolled MFA, rate limits, and single-use recovery codes. The full admin session cookie is returned only after factor verification.

### Items requiring an explicit decision
- `AdminLoginResponse.data.status` distinguishes `mfa_required` from `enrollment_required`, while the 202 response defines an `AdminEnrollmentCookie` header whose prose says it is used only for enrollment. The test contract must make conditional cookie emission explicit.
- The challenge ID is included in the verification request, but the challenge-binding model (server-side one-time state and its binding to principal/environment/browser context) should be made normative.
- The first-admin bootstrap and MFA-reset approval procedure are operational gates, not merely response schemas.

### Accepted Project Owner decision — 2026-10-20
- No public admin self-registration. Bootstrap the first admin only through a tested, out-of-band, one-time procedure, with no default or committed bootstrap secret.
- Password acceptance creates only a short-lived challenge; never create a full session until TOTP or a single-use recovery code succeeds. Limit challenge lifetime to at most 5 minutes and cap attempts.
- Define and test the separate MFA-required and enrollment-required outcomes. The enrollment cookie is scoped to enrollment endpoints only, expires within the approved short lifetime, and never grants access to Backoffice data or general mutations.
- Encrypt TOTP secrets at rest and never log seeds, QR payloads, passwords, or codes. Show recovery codes once; store salted hashes with a server-held pepper and atomically consume each code once.
- MFA reset requires a ticket/reason, a distinct authorized approver (requester cannot approve their own reset), audit records, invalidation/rotation of factors and recovery codes, and approved session revocation semantics.

### Acceptance evidence required
Challenge expiry/replay/attempt tests; TOTP success/failure; recovery success exactly once; no full session before MFA; enrollment-only authorization boundaries; reset cannot self-approve; tested bootstrap/recovery runbook and audit redaction.

**Implementation gate:** The Project Owner has approved this lifecycle. Before handler code, make the MFA-required/enrollment-required cookie condition and browser/challenge binding explicit in the contract and tests. No fixed admin/admin default credential is permitted; the one-admin recovery path must remain out-of-band.

## Q-003 — Player/admin CSRF policy

### Current source contract
The planning extension specifies signed session-bound double-submit CSRF for unsafe cookie-authenticated methods, a cookie/header match, exact configured `Origin`, rotation on login/MFA/session/privilege changes/logout, and CSRF checks waived for unauthenticated login/registration/reset while Origin and abuse controls remain in force.

### Accepted with amendment — Project Owner, 2026-10-20
The owner approved three distinct CSRF cookie names: `__Host-bclick_player_csrf`, `__Host-bclick_admin_csrf`, and `__Host-bclick_admin_enrollment_csrf`. The names are different because browser cookie scope is host-based, not port-based. The same three names remain the default for production; production must not assume the admin UI is on a separate subdomain.
- Enforce a per-environment exact-Origin allowlist; reject unsafe cookie-authenticated requests with absent or untrusted Origin. No wildcard and no reliance on SameSite alone.
- CSRF values bind cryptographically to the exact active session ID/version or restricted enrollment challenge, have bounded expiry, are checked using constant-time comparison after format/length validation, and are never logged.
- Each CSRF cookie uses `Secure; SameSite=Strict; Path=/; no Domain; not HttpOnly`. A `__Host-` cookie requires `Secure`, `Path=/` and no `Domain`. Player CSRF is issued with successful player session establishment, rotated on player session rotation/privilege change, and cleared on player logout/revocation. Admin CSRF is issued only after full admin session creation following successful MFA, rotated on admin session rotation/privilege change, and cleared on admin logout/revocation. Enrollment CSRF is issued only when login returns `enrollment_required`, bound to the restricted enrollment challenge, and deleted on expiry/revocation or successful TOTP verification as fresh admin session/CSRF are issued. Logout in one context must not clear another context's CSRF cookie.
- The lifecycle and header contract have been amended in the five planning files and OpenAPI mirror; see [Phase 4 CSRF update note](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-20-phase4-csrf-update.md). Exact production host/path topology remains a deployment decision, not an assumed subdomain split.
- Require cookie/header equality and signature/session binding for every unsafe method authenticated by player/admin/enrollment cookies. Apply strict Origin and rate limits to unauthenticated login/register/reset as well. Enrollment-only cookies remain restricted to TOTP enrollment routes.

### Acceptance evidence required
Negative tests for missing cookie/header, mismatch, invalid signature, expiry, wrong session/version, malformed/duplicate cookie values, absent/untrusted Origin, plus positive same-origin unsafe method, rotation/logout/revocation, and denial of enrollment-cookie access to Backoffice reads/mutations.

**Implementation gate:** Project Owner policy approval is recorded. No CSRF middleware or cookie-authenticated mutation handler may be implemented until the shared-host cookie namespace conflict is resolved in OpenAPI and browser-negative-test fixtures and the contract/test PR is green.

## Decisions / owners

| Decision | Accountable roles from the planning register | Status |
|---|---|---|
| Q-001 response/status/permissions contract | Project Owner Bclick9 (acting API/Auth + Security) | **Accepted 2026-10-20; OpenAPI/test alignment pending** |
| Q-002 MFA, recovery, reset and bootstrap lifecycle | Project Owner Bclick9 (acting API/Auth + Security) | **Accepted 2026-10-20; contract/test alignment pending** |
| Q-003 CSRF/session binding and Origin policy | Project Owner Bclick9 (acting API/Auth + Security) | **Accepted with amendment 2026-10-20; distinct cookie names/lifecycle recorded; runtime auth tests pending** |

**Current gate status:** Q-003 cookie names/lifecycle are aligned in the shared planning contracts and GitHub OpenAPI mirror; the amendment note and static CI result are being finalized. Issue #55 remains open until the contract/generated-client/static guard run is green and the required runtime tests are added with actual handlers. No authentication or sensitive cookie-auth implementation has started.
