# Phase 4 — Identity and Sessions: Planning Note

**Date:** 2026-10-20  
**Status:** PLANNING ONLY — awaiting explicit Project Owner approval before the first line of identity implementation code.  
**Owner:** Project Owner Bclick9 (also acting API/Auth and Security lead for the current single-person team)  
**Target:** `main`; local development only  
**Depends on:** approved Phase 4 plan; Q-001/Q-002 accepted decisions; Q-003 accepted CSRF amendment; Q-020 runtime coverage requirements; Q-011 controlled local-only exception.

## 1. Purpose and hard gate

This note scopes the Phase 4 Identity work on the existing Fastify service in `server/`. It is a plan, not authorization to implement. **Do not create authentication routes, services, middleware, identity migrations, frontend auth wiring, or identity tests until the Project Owner explicitly approves this note.**

The existing Phase 3 API is only a skeleton: `server/src/app.ts` currently has Health routes and `server/test/app.test.ts` has Health/error-boundary tests. The existing `server/migrations/1792497600000_api_skeleton_baseline.sql` is a no-op migration. Do not mistake the OpenAPI auth paths for implemented handlers.

### Approved evidence referenced by this plan

- CSRF separation amendment: [`2026-10-20-phase4-csrf-update.md`](./2026-10-20-phase4-csrf-update.md).
- Generated declaration commit: [`c36cbb7941806e796137c472c5faef037a61c4f5`](https://github.com/Bclick9/Bclick/commit/c36cbb7941806e796137c472c5faef037a61c4f5).
- CSRF amendment verification commit and checked `main` head: [`308fca40168e855628863731c645e913ebda1dd7`](https://github.com/Bclick9/Bclick/commit/308fca40168e855628863731c645e913ebda1dd7).
- API contract CI: [run 39450975081](https://github.com/Bclick9/Bclick/actions/runs/39450975081); application build: [run 39450975053](https://github.com/Bclick9/Bclick/actions/runs/39450975053).
- Decision and tracking register: [Issue #55](https://github.com/Bclick9/Bclick/issues/55), [Q-020 runtime coverage #56](https://github.com/Bclick9/Bclick/issues/56), and [Q-011 restore drill #57](https://github.com/Bclick9/Bclick/issues/57).

## 2. Scope

### In scope

- Player registration, login, logout, session lookup/revocation, email verification and password-reset flows already represented in the canonical OpenAPI contract.
- Admin password login challenge, mandatory TOTP enrollment/verification, one-time recovery-code verification, full admin session issuance, session lookup/logout, recovery-code regeneration and guarded MFA reset workflow.
- Separate player, full-admin and restricted-enrollment security contexts; server-derived roles and permissions; per-request server-side authorization.
- Session-bound CSRF with the three accepted cookie names, exact Origin validation, explicit token selection and independent logout/revocation.
- Security/audit events for authentication, session, MFA, recovery and administrative security actions, without recording secret values.
- Local browser tests on a verified secure local origin; no staging or production activity.

### Explicitly out of scope

- Any provider integration, provider sessions, callbacks, Aggregator, BigBang or WinHouse.
- Real-money workflows, wallet/ledger implementation or postings, TND/currency routing, deposits, withdrawals, payments or payment-provider rails.
- Deployment to staging/production or provisioning external production credentials.
- CMS/media publishing, catalogue migration, sportsbook mutations and any unrelated domain feature.
- Declaring Q-020 closed or Q-011 satisfied based only on planning, static guards, a runbook or Health-route tests.

## 3. Contract prerequisites — first implementation stage

Before any database or handler implementation, reconcile the accepted Q-001/Q-002 decisions with `docs/planning/openapi.yaml`, shared planning files and contract fixtures.

1. **Q-001 `GET /api/v1/admin/session`:** require `displayName`; constrain successful status to an active admin; require `mfa.enabled=true` and `mfa.method=totp`; match the exact accepted `authenticatedAt`/`expiresAt` schema. A valid full session after mandatory MFA is 200; absent/malformed/expired/revoked/challenge-only/MFA-incomplete auth is 401; a known locked/disabled/barred admin is 403 with the standard error envelope and no successful session body. Roles and effective permissions must be server-derived.
2. **Q-002 challenge binding:** password success must not yield a full session. Specify `mfa_required` versus `enrollment_required`, maximum five-minute lifetime, bounded attempts, one-time consumption, environment/principal binding, and browser binding. Challenge ID is a locator, not a bearer secret; bind challenge state to a random short-lived browser challenge credential stored by hash. Only the enrollment case emits enrollment cookies/CSRF material.
3. Define TOTP seed handling, one-time hashed recovery-code redemption/regeneration, password-reset/email-verification token lifetime and consumption, and the one-admin out-of-band bootstrap/recovery behavior in contract prose and fixtures. Do not ship a fixed or committed `admin/admin` credential.
4. Keep Q-003's accepted three names and cookie lifecycle normative:
   - `__Host-bclick_player_csrf`
   - `__Host-bclick_admin_csrf`
   - `__Host-bclick_admin_enrollment_csrf`
   Each uses `Secure; SameSite=Strict; Path=/; no Domain`; JavaScript-readable and not `HttpOnly`. Session/enrollment cookies are Secure and HttpOnly. Exact per-environment Origin allowlist; no wildcard.
5. Regenerate, do not hand-edit, `packages/api-client/src/generated/openapi.d.ts` with `pnpm api:client:generate`. The CI job must rerun generation and require `git diff --exit-code -- packages/api-client/src/generated/openapi.d.ts`. Keep OpenAPI lint and the static guard required.

**Contract gate:** no implementation starts until all mismatches above are reconciled and contract CI is green. Generated declarations must always be generator output.

## 4. Candidate target files and boundaries

These paths are planned additions/changes, not a statement that the files already exist. Confirm exact module names against the post-approval repository tree before creating them.

| Layer | Candidate files | Responsibility |
|---|---|---|
| OpenAPI/contracts | `docs/planning/openapi.yaml`; shared `docs/planning/04-api-contracts.md`, `05-security.md`, `08-frontend-integration.md`, `12-open-questions.md`; contract fixtures and `scripts/verify_openapi_contracts.py` | Accepted Q-001/Q-002 schema and lifecycle semantics, request/response statuses, Origin/CSRF headers, safe error fixtures and negative canaries. |
| Database migrations | `server/migrations/<timestamp>_identity_sessions.sql` (exact name after approval) | Add reviewed identity/session/challenge/MFA/recovery/token/audit persistence with constraints and indexes. No wallet tables. |
| Repositories | Candidate `server/src/repositories/player-auth.repository.ts`, `admin-auth.repository.ts`, `session.repository.ts`, `auth-challenge.repository.ts`, `mfa.repository.ts`, `audit.repository.ts` | Parameterized SQL, transaction boundaries, atomic consumption/revocation and no logging of secret-bearing records. |
| Services | Candidate `server/src/services/player-auth.service.ts`, `admin-auth.service.ts`, `session.service.ts`, `mfa.service.ts`, `csrf.service.ts`, `password-reset.service.ts`, `email-verification.service.ts` | Business lifecycle, password hashing, challenge binding, TOTP, recovery, expiry, token hashing, session rotation and audit intent. Separate services by security context where practical. |
| Middleware / authorization | Candidate `server/src/plugins/authentication.ts`, `server/src/plugins/csrf.ts`, `server/src/plugins/origin.ts`, `server/src/middleware/require-player-session.ts`, `require-admin-session.ts`, `require-permission.ts` | Parse/validate opaque cookies, resolve current server-side session, enforce principal/context boundaries, exact Origin and session-bound CSRF before unsafe handlers, and authorize permissions server-side. |
| Routes | Candidate `server/src/routes/auth.ts`, `server/src/routes/admin-auth.ts`; register with `server/src/app.ts` | Implement only the reviewed OpenAPI operations for player auth and admin auth/MFA/session, with schema validation and stable error envelope. No protected business-domain routes in this phase except the security-related endpoints explicitly in the accepted contract. |
| Client generation | `packages/api-client/src/generated/openapi.d.ts`; existing `packages/api-client/package.json`; `.github/workflows/api-skeleton.yml` | Generator-owned types and CI drift enforcement; no manual declaration edits. |
| Tests | `server/test/app.test.ts` or focused new `server/test/auth-*.test.ts`; repository/service test files as appropriate; contract test/fixture files; secure-browser integration tests | Unit, PostgreSQL-backed integration, Fastify inject runtime contract tests, and real browser cookie behavior on secure local HTTPS. Runtime tests become mandatory as the relevant route lands. |

### Planned identity persistence domains

Exact table names and DDL are subject to schema review during the approved contract/DB stage. Expected persistence domains are:

- Player/admin principals or links to the existing canonical principal tables; active/locked/disabled state and password hash/algorithm metadata.
- Opaque sessions with hashed token material, principal/context, creation/authentication/expiry/revocation timestamps, session version and relevant MFA completion time.
- Short-lived, one-time admin MFA challenges with hashed challenge/browser-binding secret, principal/environment binding, attempt count, expiry and consumed timestamp.
- Encrypted TOTP secret/credential state and recovery-code hashes with one-time consumed state and rotation metadata.
- One-time email verification and password-reset tokens stored hashed, expiring and atomically consumed.
- Security/audit records with actor/subject, action, outcome, request ID, safe metadata and timestamps; never raw passwords, raw cookies, CSRF tokens, TOTP seeds, recovery codes or reset/challenge secrets.

The DB stage must settle ownership/foreign keys, unique constraints, indexes, retention, migration down/rollback strategy, transaction/isolation requirements and encrypted-secret key configuration before applying migrations. Avoid duplicate representations of player/admin identity.

## 5. Planned order of execution

1. **Contracts and generated client:** reconcile Q-001 and Q-002 gaps; specify challenge/browser binding and every status/cookie transition; add static negative fixtures; lint both canonical contract files; regenerate the client and verify no drift.
2. **DB design and migration:** review principal/session/challenge/MFA/recovery/token/audit shapes; write and review migration; run up/down or approved forward-fix tests against disposable PostgreSQL; enforce atomic single-use and uniqueness in the database.
3. **Repositories and services:** implement parameterized data access and short, explicit transactions. Hash opaque session/challenge/reset tokens at rest; encrypt TOTP seed material using configured key management; store recovery codes as salted hashes with a server-held pepper; rate-limit attempts. Never hold DB transactions across mail delivery or other external calls.
4. **Middleware / route enforcement:** implement session lookup and revocation, explicit player/admin/enrollment context, permission checks, strict Origin and CSRF checks, safe error handling and redacted audit/log fields. Register only the reviewed player and admin identity/MFA/session routes.
5. **Runtime acceptance tests and client integration:** cover each implemented route's success and failure statuses plus session rotation, expiry, replay, permissions, cookie attributes and browser behavior. Include all five required CSRF acceptance tests below. Only wire the two existing React SPAs after their API contract can be exercised locally, and keep session tokens out of browser storage.
6. **Merge gate:** run generated-client drift, OpenAPI lint, static canaries, typechecks, unit tests, PostgreSQL integration/migration tests, route-level runtime contract tests and secure-browser tests. Review the diff for accidental provider/financial routes or secrets. Phase 4 code does not make any out-of-scope capability available.

Although the plan lists runtime tests in stage 5 for sequencing clarity, their cases should be specified with the contract and added alongside each route; a route may not merge with its relevant runtime coverage missing.

## 6. CSRF runtime acceptance — to run when routes exist

**Status for every item below: Acceptance — to run when routes exist. Not run; not passed.** Use Fastify runtime/integration tests and secure local browser tests where real cookie attribute/browser behavior is part of the assertion. Assertions must exercise actual middleware/handlers, not mocks that pre-decide an HTTP status.

1. **Player token against admin route:** use a valid player session/token and call a real unsafe admin endpoint; expect **403** with standard error envelope and no state change.
2. **Admin token against player route:** use a valid full admin session/token and call a real unsafe player endpoint; expect **403** with standard error envelope and no state change.
3. **Enrollment token against full-admin route:** establish an enrollment-only challenge, then call an unsafe full-admin route using its enrollment CSRF token; expect **403** and no privilege escalation/state change.
4. **TOTP transition and replay:** complete enrollment-only TOTP verification; assert the enrollment challenge and both enrollment cookies are invalidated, the prior enrollment CSRF token now fails, and a fresh full admin session plus admin CSRF token are issued atomically. Reuse/replay of the challenge/token must fail.
5. **Independent logout:** log out player and prove admin CSRF/session remain valid; separately log out admin and prove player CSRF/session remain valid. Each logout clears/revokes only its own context.

Additional required runtime coverage (not a replacement for these five): missing/mismatched token, bad signature, expiry, wrong session/version/challenge, absent or untrusted Origin, duplicate/malformed cookies, same-origin success, session-fixation prevention, invalid/expired/replayed TOTP, recovery-code double redemption, challenge attempt limits, insufficient permission, locked/disabled account, rate limits, safe 401/403/409/422/429 envelopes, request IDs and log redaction.

## 7. Security risks and required mitigations

| Risk | Planned mitigation / proof |
|---|---|
| Session fixation | Rotate to a new cryptographically random opaque session identifier after login and MFA completion; never promote/reuse a pre-auth session ID as the authenticated session; revoke predecessor; test attacker-chosen/pre-auth identifier reuse and verify it cannot authenticate after transition. |
| CSRF replay or cross-context confusion | Signed token bound to current server-side session ID/version or the one-time enrollment challenge; separate cookie names; constant-time equality/signature verification after length/format checks; atomic challenge consumption; rotation and context-negative tests; exact Origin validation. A captured token from an earlier session/version must fail. |
| MFA bypass | No full admin session at password step; challenge-only state; require valid TOTP or one-time recovery-code redemption; bind challenge to admin/browser/environment and expiry; attempt limits; atomic one-time use; no enrollment cookie on `mfa_required`; test status/payload/cookie transitions and replay. |
| Password / token leakage | Modern password hashing (Argon2id per the accepted security plan), hash random one-time tokens at rest, encrypt TOTP seeds, show recovery codes once, redact headers/bodies and logs, never return credentials. |
| Privilege escalation / stale permission | Compute roles and effective permissions on the server; re-evaluate authorization for every protected handler; verify status and permission changes revoke or invalidate relevant sessions. |
| Single-admin MFA recovery deadlock | Preserve requester ≠ approver ≠ target; do not permit self-approval; use only the reviewed one-time out-of-band break-glass/bootstrap route while no distinct principals exist. |
| Accidental nonlocal enablement | Refuse default bootstrap credentials and fail closed if required secrets/config are missing; no staging/prod settings or provider secrets in this local phase. |

## 8. Fixed operating gates

- **Q-003:** Accepted with amendment; see the [CSRF amendment verification commit](https://github.com/Bclick9/Bclick/commit/308fca40168e855628863731c645e913ebda1dd7). The frontend guide documents the parameterized token selector and the same-host versus separate-subdomain alternatives. Future middleware must be configured with the literal matching security context.
- **Q-020:** remains **Open** until every actually implemented route/method has appropriate runtime contract tests and approved provider callbacks receive their own runtime coverage. Passing static guards and Health-route Schemathesis is not route-level evidence.
- **Q-011:** remains **P0/Open**; actual isolated base+WAL restore, archive freshness/failure alerts and measured RPO/RTO are still required. The controlled exception is local Phase 4 work only. No staging/prod deploy, provider integration/callback, wallet, payments, Aggregator or real-money operation is authorized.
- **Credentials:** the intended initial administrator name may be `admin`; no fixed or committed `admin/admin` secret. Use the documented one-time out-of-band bootstrap. Do not bind the local API to a public interface.
- **Production topology:** remains undecided until before deployment. Keep the three cookie names under either host layout and retain strict per-environment exact Origin allowlists.

## 9. Approval required

The Project Owner must explicitly approve this exact planning note before any Phase 4 Identity implementation begins. Until then, only documentation/contract planning is authorized; no authentication or CSRF code is to be written.
