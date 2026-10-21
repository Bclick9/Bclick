# Migration 002 Planning — Split Player and Admin Sessions

**NOTE ID:** NOTE-MIGRATION-002-SESSION-SPLIT-PLAN-2026-10-21  
**Date:** 2026-10-21  
**Status:** **PLANNING / CI REHEARSAL PROPOSAL ONLY — Neon execution not authorized**  
**Scope:** Design and disposable CI rehearsal for replacing the mixed auth_sessions table with player_sessions and admin_sessions.  
**Fixed gates:** Migration 002 on Neon requires this NOTE plus successful CI evidence and separate explicit Project Owner approval. Migration B remains prohibited. Q-020, Q-011, Q-015, Q-009 remain unchanged; Q-011 remains P0/Open.

## 1. Proposed outcome

Migration 001 renamed the original identity session table to auth_sessions. It stores two principal kinds in one table via principal_type and principal_id. The IdentityService currently creates, resolves, revokes, and invalidates sessions through that mixed table.

Migration 002 proposes separate ownership and persistence:

| Table | Ownership | Principal FK | Admin MFA invariant | Browser cookie policy |
|---|---|---|---|---|
| player_sessions | Player | player_id → players(id), ON DELETE CASCADE | Not applicable | Session cookie SameSite=Lax; Secure; HttpOnly; Path=/; no Domain |
| admin_sessions | Admin | admin_id → admin_users(id), ON DELETE CASCADE | mfa_verified must be TRUE; only fully MFA-authenticated admin sessions are representable | Session cookie SameSite=Strict; Secure; HttpOnly; Path=/; no Domain |

Cookie attributes are HTTP application behavior and are not stored as SQL columns. The SQL table split enforces principal foreign keys and the database-level admin MFA-complete flag; service and route code must still issue the correct cookies, validate MFA, enforce CSRF, and authenticate on every request.

## 2. Evidence baseline and data-transfer decision

The owner-confirmed Migration 001 Neon postflight reported zero session rows. The current migration design is therefore **empty-source only**, not a speculative bulk migration:

1. In a transaction, assert migration history is exactly the three approved records through Migration 001.
2. Assert auth_sessions exists, both destination tables are absent, and the source has the expected polymorphic columns.
3. Count auth_sessions. If the count is non-zero, raise an exception before DDL and stop. Do not guess principal ownership, discard sessions, or copy records without a separately reviewed transfer design.
4. Since the expected row count is zero, create both strongly typed destination tables and their constraints/indexes, then drop the empty auth_sessions table.
5. Verify the session split schema and exact migration history.

If an environment has sessions at the time this migration is considered, it is outside this migration's preconditions. Capture counts grouped by principal_type, validate each referenced player/admin exists, define revocation/expiry/token-hash handling and an idempotent copy/checkpoint strategy, and seek separate owner approval before altering that environment. This NOTE does not authorize such a transfer.

## 3. SQL / pseudocode

The proposed reviewed SQL is stored in:

- server/migrations/1792670400000_identity_sessions_split_002.sql

Its precondition is fail-closed and requires exactly the baseline and Migration 001 history. The core DDL is:

    CREATE TABLE public.player_sessions (
      id uuid PRIMARY KEY,
      player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      authenticated_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      CHECK (expires_at > created_at)
    );

    CREATE TABLE public.admin_sessions (
      id uuid PRIMARY KEY,
      admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      authenticated_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      mfa_verified boolean NOT NULL CHECK (mfa_verified IS TRUE),
      CHECK (expires_at > created_at)
    );

    -- Only after the count(auth_sessions) = 0 precondition:
    DROP TABLE public.auth_sessions RESTRICT;

The full migration adds active-principal/expiry indexes, verifies the expected migration inventory, and ensures the down migration refuses if either new table has records.

## 4. Application compatibility included in this proposal

A schema-only split would break the existing IdentityService, which currently references auth_sessions. The proposal therefore updates the existing session persistence paths as part of the same reviewable PR:

- Session creation inserts into player_sessions or admin_sessions based on the server-determined principal context.
- Session resolution queries only the corresponding table and joins the appropriate owner table.
- Session revocation targets only the session's own context table.
- Player password reset revokes the player's sessions in player_sessions.
- Admin session creation must be post-MFA; admin_sessions rejects mfa_verified=false at database level.
- Existing route cookie behavior remains: player session cookie SameSite=Lax; admin session cookie SameSite=Strict. Runtime API tests explicitly assert those settings and HttpOnly attributes.
- MFA enrollment/password-only challenges remain in their existing dedicated admin challenge flow. They are not rows in admin_sessions.

No public auth contract, wallet domain, payment/provider table, provider callback or real-money flow is part of this migration.

## 5. Rollback design

Rollback is safe only when both split session tables are empty:

1. Down guard requires the exact four-migration history and both split tables.
2. If player_sessions or admin_sessions contains any row, raise before any DDL. The entire migration-down transaction must roll back, leaving both tables, the row(s), and migration history untouched.
3. If both tables are empty, recreate auth_sessions with the original column/check/index shape.
4. Drop admin_sessions and player_sessions with RESTRICT.
5. Verify auth_sessions exists empty, split tables are absent, the migration history returns to the previous three rows, RBAC/currency counts are unchanged.
6. Re-apply Migration 002 and verify the split schema again.

This rollback deliberately refuses to collapse populated session tables into a polymorphic table. There is no implicit row transfer in either direction. Do not attempt rollback on Neon without a new, explicit recovery plan and approval; rehearsal rollback operates only on a disposable CI database.

## 6. CI rehearsal test plan

Workflow proposal:

- .github/workflows/identity-migration-002-rehearsal.yml
- Script: server/scripts/identity-migration-002-rehearsal.mjs

Only GitHub Actions' disposable PostgreSQL 18.6 service is used. The workflow sets a localhost bclick_ci DATABASE_URL and a ci-disposable marker; it has no Neon secrets/environment and cannot target Neon by design.

Expected ordered steps:

1. Apply all reviewed migration files to the fresh disposable database.
2. Assert the migration history has four records; player_sessions and admin_sessions exist; auth_sessions is absent; both split tables have expected columns, FKs, indexes and zero rows; the reference tuple remains 0/0/1/5/0/5; five legacy permissions and three currencies/precision rows remain intact.
3. Run API runtime tests against the split schema, including player session creation, post-MFA admin login, logout isolation, and exact cookie policy.
4. Insert disposable player and MFA-enabled admin fixtures plus one session in each split table. Prove admin_sessions rejects mfa_verified=false.
5. Attempt node-pg-migrate down --count 1. It must fail while either split table contains rows. Assert both session records and four migration-history rows remain intact, then delete only known CI fixtures.
6. Clean rollback succeeds. Assert auth_sessions has the original columns and indexes, both split tables are absent, sessions remain zero, and migration history has three rows.
7. Re-apply exactly Migration 002; rerun schema checks and the API runtime suite.

No live DB, Neon connection, Neon Plugin write, or DATABASE_URL secret is involved in this workflow.

## 7. CI execution evidence

The actual CI rehearsal completed successfully on 2026-10-21. The authoritative execution record is [Migration 002 CI Rehearsal Results NOTE](./2026-10-21-migration-002-ci-rehearsal-results.md).

- **Run:** [39592634948](https://github.com/Bclick9/Bclick/actions/runs/39592634948)
- **Job:** [119197272325](https://github.com/Bclick9/Bclick/actions/runs/39592634948/job/119197272325)
- **Tested code commit:** `08b15a6725e2cd6697b983d275d2b48e7213c239`
- **Conclusion:** `completed / success`
- **Key results:** `MIGRATION_002_POSTCHECK=PASS`; `MIGRATION_002_MFA_GUARD=PASS`; `MIGRATION_002_ROLLBACK_GUARD=REFUSED_WITHOUT_DATA_LOSS`; `MIGRATION_002_ROLLBACK_POSTCHECK=PASS`; clean re-apply followed by a second `MIGRATION_002_POSTCHECK=PASS`.
- **Additional checks:** Migration 001's isolated rehearsal, Migration 001 CI gates, API tests/type checks, OpenAPI lint/generated client, and storefront/dashboard build all passed. The manual Neon job was skipped for the PR event as expected.

The tested CI database was a disposable local PostgreSQL 18.6 service only. This evidence does not authorize Migration 002 on Neon.

## 8. Known risks and limits

- Migration 002 drops auth_sessions only when empty; any non-empty source must stop and go through a separate design/approval.
- Schema migration and service-code compatibility must ship as one coordinated revision. Do not apply the schema change without the updated app code or a verified rollback/release plan.
- SameSite behavior is not enforceable by SQL; it is verified by route-level tests. Secure cookies require a secure browser origin in normal use.
- Admin MFA is enforced both by the existing auth service workflow and the admin_sessions table check, but Q-020 remains open and is not closed by these tests.
- Neon target is the branch named production and is not isolated staging. Q-011 remains P0/Open until the required restore drill is completed.
- CI rehearsal does not authorize production activation, deposits/withdrawals, provider callbacks or real-money usage.

## 9. Fixed gates and stop

- Q-020: unchanged / open.
- Q-011: unchanged / P0/Open; restore drill outstanding.
- Q-015: unchanged / open.
- Q-009: unchanged / open; TND provider routing remains blocked.
- Migration B: prohibited.
- Migration 002 on Neon: NOT AUTHORIZED until the Project Owner separately approves this NOTE after reviewing the actual CI rehearsal results.
- DATABASE_URL: do not change.
- Neon Plugin: read-only diagnostics only; no Plugin writes.
- No rollback or any other Neon operation is authorized by this proposal.

**STOP:** CI rehearsal and NOTE review only. Await separate explicit Project Owner approval before any Migration 002 operation on Neon.
