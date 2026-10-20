# Phase 4 CSRF Cookie Separation — Contract Amendment

**Date:** 2026-10-20  
**Status:** Project Owner-approved contract amendment recorded; static CI re-run after generated-client correction. Runtime acceptance tests remain pending because authentication/session/CSRF handlers do not exist yet.  
**Signer:** Project Owner — Bclick9 (acting API/Auth and Security lead)  
**Related decisions:** Q-003 Accepted with amendment; Q-001 and Q-002 remain accepted with their handler/contract tests pending.  
**Related issues:** [#55](https://github.com/Bclick9/Bclick/issues/55), [#56](https://github.com/Bclick9/Bclick/issues/56), [#57](https://github.com/Bclick9/Bclick/issues/57)  
**Phase 4 plan:** [2026-10-20-phase4-plan.md](./2026-10-20-phase4-plan.md)

## 1. Decision

The Project Owner approved three distinct, host-only CSRF cookie names:

- Player: `__Host-bclick_player_csrf`
- Full admin session: `__Host-bclick_admin_csrf`
- Restricted admin enrollment: `__Host-bclick_admin_enrollment_csrf`

This resolves cookie overwriting when player and Backoffice pages are on different ports of the same `localhost` host and avoids relying on an undocumented production subdomain assumption. Cookie scope is host-based, not port-based. The three names remain the default in production even if separate subdomains are later selected; production host/path topology remains an explicit deployment decision and is not assumed here.

The security contract remains signed session-bound double-submit CSRF + an exactly matching `X-CSRF-Token` header + strict per-environment exact-Origin validation. SameSite is defense-in-depth only.

## 2. Normative cookie lifecycle

| Context / cookie | Issued | Bound to | Rotated | Deleted / invalidated |
|---|---|---|---|---|
| Player — `__Host-bclick_player_csrf` | Successful player login/session establishment. If registration establishes an authenticated session, emit it atomically with that session. | Exact player server-side session ID/version | Player session rotation or privilege change | Player logout, session revocation or expiry |
| Admin — `__Host-bclick_admin_csrf` | Only after successful admin MFA verification creates the full `__Host-bclick_admin_session` | Exact full admin session ID/version; never a password/MFA challenge | Admin session rotation or privilege change | Admin logout, session revocation or expiry |
| Enrollment — `__Host-bclick_admin_enrollment_csrf` | Admin password step only when response `data.status === "enrollment_required"`, paired with the restricted enrollment cookie | Exact one-time enrollment challenge; TOTP enrollment endpoints only | Challenge renewal only, after invalidating the prior token | Enrollment expiry/revocation or successful TOTP verification |

On a successful enrollment-only TOTP verification, consume the challenge, delete both enrollment cookies, reject the old enrollment token immediately, and issue the full admin session plus a fresh admin CSRF cookie atomically. If TOTP verification is performed from an existing full admin session, rotate that admin CSRF token after the factor/privilege change. Logging out or revoking one context must not clear the other contexts' CSRF cookie.

Every CSRF cookie uses `Secure; SameSite=Strict; Path=/; no Domain` and is JavaScript-readable (not `HttpOnly`). Session cookies remain `Secure; HttpOnly`. The `__Host-` prefix requires `Secure`, `Path=/` and no `Domain`. Browser tests must use the project's verified secure local origin; do not drop `Secure` to accommodate plain HTTP development.

## 3. Files updated

The five source-of-truth planning files have been aligned in the shared Library:

1. `docs/planning/openapi.yaml` — normative `x-csrf-policy`, distinct cookie names and attributes, per-context lifecycle, conditional enrollment-only cookie emission, CSRF header description, logout clearing, and enrollment-to-full-admin TOTP transition. The same OpenAPI file is mirrored in the GitHub repository.
2. `docs/planning/04-api-contracts.md` — authentication/session security section and contract-hardening summary.
3. `docs/planning/08-frontend-integration.md` — parameterized `readCsrfToken(sessionType: 'player' | 'admin' | 'enrollment')` example and context-specific API-client middleware selection.
4. `docs/planning/05-security.md` — session/CSRF threat matrix and negative-test controls.
5. `docs/planning/12-open-questions.md` — Q-003 marked **Accepted with amendment (CSRF cookie separation)**, decision date/signer, lifecycle and link to this note.

Additional GitHub artifacts:

- `scripts/verify_openapi_contracts.py` now validates the three distinct names, all three lifecycle definitions, required `__Host-` attributes, strict Origin policy, cookie/header context mappings, conditional enrollment and TOTP transition, absence of the old shared cookie name, and a negative canary for cross-context name collision.
- `packages/api-client/src/generated/openapi.d.ts` has been synchronized to the OpenAPI generator's canonical output. This is generated contract typing only; it is not frontend middleware or authentication implementation.
- `docs/notes/2026-10-20-phase4-plan.md`, `docs/notes/2026-10-20-Q001-Q003-auth-csrf-owner-decisions.md`, `docs/notes/2026-10-20-PHASE-0-5-security-gates.md`, and `docs/notes/PROGRESS.md` record the owner approval and the pre-code gate.
- [Issue #55](https://github.com/Bclick9/Bclick/issues/55) records the amendment.

## 4. Verification and honest status

### Static / CI checks

- OpenAPI 3.1 parsing and lint: passed on the updated specification in the runs preceding the latest generated-client formatting correction.
- The static contract guard, including the new CSRF name/lifecycle/collision checks: passed in the initial run `39448361249` and again in `39449790248`.
- API types, tests, PostgreSQL migration and existing Health-contract job: passed in `39448361249`, `39449790248`, and `39449985230`.
- Application builds passed on the CSRF documentation/contract commits [39448360840](https://github.com/Bclick9/Bclick/actions/runs/39448360840) and [39450745256](https://github.com/Bclick9/Bclick/actions/runs/39450745256). These builds do not test runtime authentication/CSRF behavior. The latest OpenAPI/generated-client drift workflow is being re-run after aligning the generated declaration; see [API workflow run 39450975081](https://github.com/Bclick9/Bclick/actions/runs/39450975081).
- The generated-client drift step initially failed because the committed TOTP 204 response header type did not match the exact output order from `openapi-typescript`. It has been realigned with the generated output; commit `c36cbb7941806e796137c472c5faef037a61c4f5` is being checked by [API workflow run 39450975081](https://github.com/Bclick9/Bclick/actions/runs/39450975081). The final result below must be updated from the completed run before this note is considered accepted.

Static checks prove contract shape and generated-client reproducibility only. They do not execute authentication handlers.

### Runtime acceptance tests — pending, not claimed as passed

The following remain acceptance tests for when the relevant handlers and middleware are implemented:

- Player CSRF token on an admin endpoint returns 403.
- Admin CSRF token on a player endpoint returns 403.
- Enrollment CSRF on a full-admin endpoint returns 403.
- Successful TOTP verification invalidates the enrollment token and issues an admin CSRF token; the old token is rejected.
- Player logout does not affect admin CSRF and admin logout does not affect player CSRF.

These test names and expectations must be added to the actual runtime/integration test suite before the auth PR can merge. Do not simulate these results using unimplemented routes, and do not close Q-020 based on static guards.

## 5. Implementation gate

No CSRF middleware, authentication routes, database migration for identity, or UI authentication wiring is started by this amendment. First accept the contract amendment after CI's generated-client drift check is green; then follow the approved Phase 4 plan. Q-020 remains Open. Q-011 remains P0/Open under the controlled exception for local Phase 4 development only and continues to block any real deployment, provider integration/callback, wallet, payment or real-money route.
