# Phase 4 real Identity acceptance checkpoint — 2026-10-24

**Status: in review; do not mark Issue #55 complete until the acceptance PR's required CI is green and the owner reviews the runbooks/evidence.**

## Existing real-service integration evidence on main

server/test/identity.test.ts exercises the production IdentityService, PgIdentityRepository, Fastify routes and migrations against disposable PostgreSQL via Testcontainers. It already covers browser-bound MFA challenges, no full admin session before MFA, TOTP enrollment/verification, cross-context player/admin/enrollment CSRF rejection, challenge expiry and replay, the five-attempt limit, logout/revocation isolation, live RBAC resolution, locked/disabled admin rejection and expired session rejection.

These are runtime integration tests, not stubs. The separate Q-020b route-contract fixtures that stub IdentityService are not counted as this Phase 4 evidence.

## This acceptance increment

This branch adds a PostgreSQL-backed flow in which the real authenticated administrator:
1. regenerates ten recovery codes through the protected route after step-up TOTP;
2. verifies that PostgreSQL persists only hashes and initially has ten unconsumed records;
3. redeems one code in a new browser-bound MFA challenge and obtains a fresh full admin session;
4. attempts to redeem the same code in a later fresh challenge and is rejected;
5. confirms exactly one recovery record is consumed, the other nine remain usable, and the replay is audited as denied;
6. asserts that audit-event metadata has only the intended factor/count/reason-length fields and does not contain test passwords, TOTP material, recovery codes or session/challenge/CSRF cookie values.

The branch also adds bootstrap and MFA recovery runbooks. The local bootstrap path is restricted to local development; the one-admin break-glass path for a shared environment remains explicitly blocked until a reviewed command/procedure is implemented and rehearsed.

## Hard boundaries

- Passing CI proves the selected tested cases only. It does not by itself close Issue #55, Q-004, Q-020b, Q-006, Q-010, Q-011, Q-013, or any deployment/compliance gate.
- No wallet posting, callback, deposits/withdrawals, FX execution, wager settlement, Premium or real-money feature is added/enabled by this increment.
- Historical Issue #55 text that says PR #82 is open is stale: GitHub currently reports PR #82 merged/closed. The accepted migration/Identity CI evidence should be assessed at the current main commit, not by treating that historical PR as pending.
