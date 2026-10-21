# Migration 003 — Player Credentials, Profile, v2 and KYC Planning

**NOTE ID:** NOTE-MIGRATION-003-CREDENTIALS-PLAN-2026-10-21  
**Date:** 2026-10-21  
**Status:** **PLANNING + CI-ONLY REHEARSAL CANDIDATE — AWAITING PROJECT OWNER REVIEW**  
**Scope:** Plan the credential/profile split, preserve existing registration v2 and KYC invariants, and rehearse the candidate migration on disposable PostgreSQL only.

## 1. Decision requested

Review the Migration 003 plan and the CI-only SQL candidate:

- server/migrations/1792756800000_identity_player_credentials_003.sql
- .github/workflows/identity-migration-003-rehearsal.yml
- server/scripts/identity-migration-003-rehearsal.mjs
- server/test/identity-registration-required-fields.test.ts

This work is not permission to change Neon. There is deliberately no Neon-target workflow in this change. The candidate SQL can be reviewed and rehearsed in CI only. Migration 003 on Neon remains blocked until CI evidence has been reviewed and a separate, explicit Project Owner authorization is given.

## 2. Known starting point — implemented schema, not the earlier paper plan

The verified migration history on main before Migration 003 is exactly:

1. 1792497600000_api_skeleton_baseline
2. 1792512000000_identity_sessions
3. 1792584000000_identity_domain_migration_001
4. 1792670400000_identity_sessions_split_002

The intended CI engine is PostgreSQL 18.6 on the disposable database bclick_ci.

**Implementation discrepancy identified:** although the earlier strategy planned to introduce some player metadata during Migration 003, the implemented Migration 001 already added these columns to players:

- v2: date_of_birth, terms_accepted_at, terms_version, age_confirmation_at, age_policy_version, preferred_language
- KYC: kyc_tier, kyc_lock, kyc_lock_reason, deposit_kyc_override, deposit_kyc_override_expires_at, plus override reason/approval metadata

These fields must not be added a second time. Migration 003 validates the existing constraints and adds the required compatible name age_confirmed_at as a generated, read-only alias of the existing age_confirmation_at. This avoids breaking the current IdentityService while the naming difference is reconciled. A later code cutover can adopt the canonical name only with coordinated tests and its own review.

The requested KYC expires_at is currently represented with its explicit meaning as deposit_kyc_override_expires_at. This plan does not add a generic expires_at column to players, because that name is ambiguous and could be confused with session/token expiry.

## 3. Goals and non-goals

### Goals

1. Create player_profiles with one profile row per player.
2. Create player_credentials with a separate password credential row keyed to the player.
3. Backfill existing display_name, email identifier, normalized email identifier and password hash without transforming or printing password hashes.
4. Prove source/target row counts, identifier equality, hash equality and rollback safety.
5. Preserve the present registration contract: request validation rejects a missing date of birth, missing terms acceptance or missing age confirmation; explicit false consent values are also rejected.
6. Keep all existing v2/KYC constraints and the prior six-number reference tuple unchanged outside explicitly seeded CI fixtures.

### Non-goals

- No Neon connection or Neon SQL operations; no Neon Plugin writes.
- No deletion of the existing players.password_hash column in this migration. Current IdentityService login, registration and password-reset paths still use it. Removing it before an explicitly tested application cutover would break compatibility.
- No password re-hashing, reset, conversion to plaintext, display/logging of hashes, wallet, ledger, provider, payment or real-money migration.
- No change to Q-020, Q-011, Q-015 or Q-009.

## 4. Data model and SQL / pseudocode

### 4.1 player_profiles

One row per players.id. The first cut moves the profile representation additively; the existing players.display_name remains available as the rollback/reference source until a reviewed application cutover.

~~~sql
CREATE TABLE public.player_profiles (
  player_id uuid PRIMARY KEY
    REFERENCES public.players(id) ON DELETE CASCADE,
  display_name text NOT NULL
    CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

INSERT INTO public.player_profiles
  (player_id, display_name, created_at, updated_at)
SELECT id, display_name, created_at, updated_at
FROM public.players;
~~~

### 4.2 player_credentials

Use a row per credential kind. The initial supported kind is email_password; the model does not imply support for social/phone credentials yet. Password hashes are copied byte-for-byte.

~~~sql
CREATE TABLE public.player_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('email_password')),
  identifier text NOT NULL
    CHECK (length(btrim(identifier)) BETWEEN 3 AND 254),
  identifier_norm text NOT NULL
    CHECK (identifier_norm = lower(btrim(identifier))),
  password_hash text NOT NULL
    CHECK (length(btrim(password_hash)) > 0),
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (player_id, kind),
  UNIQUE (kind, identifier_norm)
);

CREATE INDEX player_credentials_player_idx
  ON public.player_credentials(player_id);

INSERT INTO public.player_credentials
  (player_id, kind, identifier, identifier_norm, password_hash,
   password_changed_at, created_at, updated_at)
SELECT id, 'email_password', email, email_normalized, password_hash,
       NULL, created_at, created_at
FROM public.players;
~~~

The legacy schema does not record password-change time separately. The copy deliberately leaves password_changed_at NULL rather than falsely treating general player updated_at as a password-reset timestamp. Credential created_at/updated_at begin from account creation time, and must not be misinterpreted as a verified historical password-change date.

The candidate migration's precondition requires the exact four-migration history, both session tables, no destination profile/credential tables, unique normalized identifiers, non-empty source hashes, and normalized email values consistent with email. It aborts on any mismatch.

### 4.3 v2 and KYC fields

At this baseline, these are pre-existing columns, not new columns to duplicate:

| Domain | Current stored field | Migration 003 action |
|---|---|---|
| Date of birth | players.date_of_birth | Preserve and verify required constraint |
| Terms consent | players.terms_accepted_at, terms_version | Preserve and verify required constraint |
| Age confirmation | players.age_confirmation_at, age_policy_version | Preserve source; add generated age_confirmed_at compatibility alias |
| Language | players.preferred_language | Preserve and verify required constraint |
| KYC tier | players.kyc_tier | Preserve existing enum/check constraint |
| KYC lock | players.kyc_lock, kyc_lock_reason | Preserve existing lock state and reason |
| Deposit KYC override | players.deposit_kyc_override plus reason/requester/approver/set-time metadata | Preserve existing override and dual-control guards |
| Override expiry | players.deposit_kyc_override_expires_at | Preserve explicit expiry semantics; do not add ambiguous generic expires_at |

Compatibility alias:

~~~sql
ALTER TABLE public.players
  ADD COLUMN age_confirmed_at timestamptz
  GENERATED ALWAYS AS (age_confirmation_at) STORED;
~~~

This is a read-only alias; the current server continues writing age_confirmation_at. Postflight must assert both values are identical for every row. The Down migration removes the generated alias and leaves the original column intact.

## 5. Migration execution contract

### Up

1. Fail closed unless migration history is exactly the four records listed in Section 2.
2. Validate required source tables/columns and normalized email/hash/profile data before DDL.
3. Create player_profiles and player_credentials with FKs, checks and unique constraints.
4. Copy one profile and one email_password credential per player without hash transformation; add the generated age_confirmed_at alias.
5. Assert player/profile/credential row counts match exactly; compare profile values, identifier, normalized identifier and hash equality; verify no unknown/orphan credential rows.
6. Verify existing v2/KYC fields and consent constraints remain present.

All DDL and backfill run through the repository's ordered node-pg-migrate mechanism. If any assertion fails, the migration fails as a single transaction; it must not attempt a partial repair.

### Down / rollback

Rollback is safe only while new tables remain exact mirrors of the legacy player rows. Before dropping any new table, Down must verify:

- Migration history is exactly the five-migration state.
- Profile and credential row counts each equal the current player count.
- Every row's profile values, identifier, normalized identifier and password hash still match the legacy source.
- No extra/unmapped credential rows exist and no password-change timestamp or other post-cutover mutation requires separate reconciliation.

If any check differs, Down must fail before dropping tables. It must not reset passwords or discard a credential row. The current players.password_hash and profile fields remain in place so rollback does not need to reconstruct values from the copies.

### Re-apply

After a clean rollback, re-apply exactly Migration 003 and re-run all row/hash equality, constraint and registration-contract checks. The rehearsal then deletes only its two known synthetic player fixtures and verifies the six-number reference tuple is restored to 0 / 0 / 1 / 5 / 0 / 5.

## 6. CI-only Apply / Rollback / Re-apply rehearsal

The dedicated workflow is:

- .github/workflows/identity-migration-003-rehearsal.yml
- Script: server/scripts/identity-migration-003-rehearsal.mjs
- Registration contract test: server/test/identity-registration-required-fields.test.ts

Safety boundary:

- A disposable PostgreSQL 18.6 service named bclick_ci runs inside GitHub Actions.
- The rehearsal script exits unless CI=true, the explicit target marker is ci-disposable, and the connection host/database are localhost/bclick_ci.
- The workflow defines a localhost-only connection string; it does not read DATABASE_URL from GitHub Secrets and has no Neon protected environment.
- It creates two synthetic CI-only players with visibly non-real hash sentinels. Those are fixtures only, not user credentials, and are deleted after the final re-apply checks.

Expected sequence:

1. Build precisely the four-migration pre-M003 schema on disposable PostgreSQL.
2. Seed two synthetic players and record the legacy source checkpoint.
3. Apply exactly Migration 003; verify target table shape/counts, profile values, exact password-hash equality, no plaintext field, v2/KYC columns and the six-number reference tuple (with two test players).
4. Type-check and run the server test suite, including registration payloads missing dateOfBirth, acceptTerms or acceptAgeConfirmation; each must receive HTTP 400 from route schema validation before a service/database operation. Explicit false consent must also be rejected.
5. Roll back exactly Migration 003; verify profile/credential tables and generated alias are gone, migration history returns to four rows, and original player rows and hashes are unchanged.
6. Re-apply exactly Migration 003; repeat schema, row-count/hash and registration/API tests.
7. Delete the two known disposable fixtures; verify zero player/profile/credential/session rows and the reference tuple returns to 0 / 0 / 1 / 5 / 0 / 5.

The official CI results NOTE will record the actual run/job IDs, step results and markers after the workflow has completed. No CI PASS by itself authorizes a Neon operation.

## 7. Fixed gates and owner approvals

- **Migration 003 on Neon: NOT AUTHORIZED by this plan or CI rehearsal.** It requires successful CI evidence review followed by separate explicit Project Owner approval.
- **Migration 004, 005 and 006:** not in scope and not authorized by Migration 003 approval; each requires the same separate planning, CI rehearsal, results NOTE and owner approval protocol.
- **Migration B:** prohibited.
- **Q-020, Q-011, Q-015, Q-009:** unchanged. Q-011 remains **P0/Open** until the VPS restore drill is complete.
- **DATABASE_URL:** do not change.
- **Neon Plugin writes:** prohibited; read-only diagnostics only.
- **Real-money flows / production activation:** not authorized.

**STOP:** planning and disposable-CI rehearsal only. Await Project Owner review of this NOTE and results NOTE before any separate decision about Migration 003 on Neon.
