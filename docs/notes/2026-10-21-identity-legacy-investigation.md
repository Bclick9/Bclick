# Identity Legacy Investigation — Facts Before Migration Approval

**Date:** 2026-10-21  
**Status:** INVESTIGATION COMPLETE — no option approved; no migration authorized  
**Repository/ref examined:** \`Bclick9/Bclick\`, \`main\` at \`a5ae585c1292c5fc3a40a9691d56df0d47332ed8\` before this note  
**Scope:** committed source, migration DDL, GitHub history, CI configuration and the approved Planning Library versions of \`current-state-audit.md\` and \`04-api-contracts.md\`  
**Hard boundary:** this note creates documentation only. It does not create \`players\`, alter/drop/rename \`identity_*\`, change existing migrations, connect to a non-test database, or authorize Migration 001.

## 1. Executive finding

The \`identity_*\` schema is **not an unused migration leftover**. It was added with a local-only Fastify Identity implementation. Current source includes a PostgreSQL connection, credential persistence, player/admin authentication handlers, session/challenge/MFA flows, service SQL that reads and writes the \`identity_*\` tables, and PostgreSQL-backed runtime tests in CI.

At the same time, the evidence reviewed here does **not** establish that this Identity implementation or its database has been deployed to production. The implementation is explicitly opt-in for local development/test, \`.env.example\` sets \`BCLICK_IDENTITY_ENABLED=false\`, and the Identity configuration rejects both \`staging\` and \`production\`. The repository cannot tell us whether a developer has populated a private local database, or whether any external database exists outside the repository.

The apparent contradiction with the approved current-state audit is mainly a **snapshot/timeline mismatch**: that audit describes a main revision inspected on 2026-10-19, before the API skeleton and Identity were added to main on 2026-10-20. The audit was accurate for the source snapshot it inspected but is stale as a description of today’s main. Its “no reviewed source indicates a production server API” wording remains distinct from the stronger, now-false statement that the current repository contains no server/database/credential code.

**Tech Lead’s provisional recommendation:** Option **A — Adopt + Extend**, subject to the local-database data check and contract/security reconciliation described below. This is a recommendation for the Project Owner to consider, not a decision or approval. Do not change schema until the Project Owner chooses an option and separately approves the revised migration plan.

## 2. How schema was inspected and what is not known

The migration source of record is [\`1792512000000_identity_sessions.sql\`](https://github.com/Bclick9/Bclick/blob/main/server/migrations/1792512000000_identity_sessions.sql). It contains the committed PostgreSQL DDL below.

PostgreSQL does not provide MySQL’s \`SHOW CREATE TABLE\` command. No connection string to a developer database was provided for this investigation, and no production database connection was used. Therefore, the DDL reproduced below is the **repository-defined schema from the migration**, not a claim that a live database’s catalogs or row contents were queried.

CI does apply the existing migration chain to a disposable PostgreSQL service and runs the API/Identity tests against that CI database. See [successful API workflow run 39561585551](https://github.com/Bclick9/Bclick/actions/runs/39561585551). That proves the migration and tests run in CI; it does not tell us whether a local developer database contains old accounts or sessions.

For a later, explicitly authorized local-only catalog check, the PostgreSQL equivalent would be a schema-only dump such as:

\`\`\`sh
pg_dump --schema-only --table=public.identity_players "$DATABASE_URL"
pg_dump --schema-only --table=public.identity_admins "$DATABASE_URL"
pg_dump --schema-only --table=public.identity_sessions "$DATABASE_URL"
\`\`\`

Do not point these commands at a production database as part of this investigation.

## 3. Requested DDL — three primary tables

### 3.1 \`identity_players\`

Committed DDL:

\`\`\`sql
CREATE TABLE identity_players (
 id uuid PRIMARY KEY,
 email text NOT NULL,
 email_normalized text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 display_name text NOT NULL,
 country_code char(2) NOT NULL,
 settlement_currency text NOT NULL CHECK (settlement_currency IN ('TND','EUR','USD')),
 language text NOT NULL DEFAULT 'en',
 preferred_display_currency text CHECK (preferred_display_currency IS NULL OR preferred_display_currency IN ('TND','EUR','USD')),
 status text NOT NULL CHECK (status IN ('active','pending','suspended','closed')) DEFAULT 'pending',
 verification_status text NOT NULL CHECK (verification_status IN ('pending','verified','rejected','expired','not_required')) DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_players_status_idx ON identity_players(status);
\`\`\`

Column / integrity inventory:

| Column | Type | Nullability / default | Constraint or meaning |
|---|---|---|---|
| \`id\` | \`uuid\` | NOT NULL | Primary key; no SQL default in this migration |
| \`email\` | \`text\` | NOT NULL | Original email; no DB format check |
| \`email_normalized\` | \`text\` | NOT NULL | UNIQUE; normalization is performed in service code |
| \`password_hash\` | \`text\` | NOT NULL | Password hash lives on the player profile row in this schema |
| \`display_name\` | \`text\` | NOT NULL | Required by schema although it is not part of the current v2 registration contract |
| \`country_code\` | \`char(2)\` | NOT NULL | No SQL-level country-code format/list check |
| \`settlement_currency\` | \`text\` | NOT NULL | CHECK limits values to \`TND\`, \`EUR\`, \`USD\`; no FK to a currency table |
| \`language\` | \`text\` | NOT NULL, default \`'en'\` | Legacy field name; no language-code CHECK |
| \`preferred_display_currency\` | \`text\` | NULL allowed, no default | CHECK allows NULL or \`TND\`, \`EUR\`, \`USD\`; no FK |
| \`status\` | \`text\` | NOT NULL, default \`'pending'\` | CHECK: \`active\`, \`pending\`, \`suspended\`, \`closed\` |
| \`verification_status\` | \`text\` | NOT NULL, default \`'pending'\` | CHECK: \`pending\`, \`verified\`, \`rejected\`, \`expired\`, \`not_required\`; predates separate email-verification/KYC semantics |
| \`created_at\` | \`timestamptz\` | NOT NULL, default \`now()\` | Creation timestamp |
| \`updated_at\` | \`timestamptz\` | NOT NULL, default \`now()\` | Update timestamp; timestamp does not auto-update without application SQL |

Indexes / constraints:

- Primary-key index on \`id\`.
- Unique constraint/index on \`email_normalized\`.
- \`identity_players_status_idx\` on \`status\`.
- No username, phone, date-of-birth, consent timestamp/version, age-confirmation timestamp/version, \`kyc_tier\`, \`kyc_lock\`, or KYC override columns.
- No FK from \`settlement_currency\` or \`preferred_display_currency\` to a \`currencies\` table.

### 3.2 \`identity_admins\`

Committed DDL:

\`\`\`sql
CREATE TABLE identity_admins (
 id uuid PRIMARY KEY,
 email text NOT NULL,
 email_normalized text NOT NULL UNIQUE,
 display_name text NOT NULL,
 password_hash text NOT NULL,
 status text NOT NULL CHECK (status IN ('active','locked','disabled')),
 mfa_enabled boolean NOT NULL DEFAULT false,
 totp_secret_encrypted text,
 totp_pending_secret_encrypted text,
 totp_pending_challenge_id uuid,
 totp_pending_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((mfa_enabled = false) OR totp_secret_encrypted IS NOT NULL),
 CHECK (
   (totp_pending_secret_encrypted IS NULL
     AND totp_pending_challenge_id IS NULL
     AND totp_pending_expires_at IS NULL)
   OR (totp_pending_secret_encrypted IS NOT NULL
     AND totp_pending_expires_at IS NOT NULL)
 )
);
\`\`\`

Column / integrity inventory:

| Column | Type | Nullability / default | Constraint or meaning |
|---|---|---|---|
| \`id\` | \`uuid\` | NOT NULL | Primary key; no SQL default |
| \`email\` | \`text\` | NOT NULL | Original email |
| \`email_normalized\` | \`text\` | NOT NULL | UNIQUE |
| \`display_name\` | \`text\` | NOT NULL | Administrator display name |
| \`password_hash\` | \`text\` | NOT NULL | Password hash |
| \`status\` | \`text\` | NOT NULL | CHECK: \`active\`, \`locked\`, \`disabled\`; no default |
| \`mfa_enabled\` | \`boolean\` | NOT NULL, default \`false\` | When true, \`totp_secret_encrypted\` must not be NULL |
| \`totp_secret_encrypted\` | \`text\` | NULL | Encrypted TOTP secret material |
| \`totp_pending_secret_encrypted\` | \`text\` | NULL | Pending encrypted TOTP secret |
| \`totp_pending_challenge_id\` | \`uuid\` | NULL | No FK is declared for this column |
| \`totp_pending_expires_at\` | \`timestamptz\` | NULL | Pending enrollment expiry |
| \`created_at\` | \`timestamptz\` | NOT NULL, default \`now()\` | Creation timestamp |
| \`updated_at\` | \`timestamptz\` | NOT NULL, default \`now()\` | Updated by application SQL |

Indexes / constraints:

- Primary-key index on \`id\`.
- Unique constraint/index on \`email_normalized\`.
- CHECK: if \`mfa_enabled=true\`, \`totp_secret_encrypted\` is required.
- CHECK: pending enrollment fields are all NULL, or the pending secret and expiry are both NOT NULL. In the second branch, the SQL does **not** require \`totp_pending_challenge_id\` to be non-NULL; that is a schema-hardening question to review separately.
- No admin row is inserted by this CREATE TABLE statement or by the migration seed section.

### 3.3 \`identity_sessions\`

Committed DDL:

\`\`\`sql
CREATE TABLE identity_sessions (
 id uuid PRIMARY KEY,
 principal_type text NOT NULL CHECK (principal_type IN ('player','admin')),
 principal_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE,
 session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 authenticated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 mfa_verified boolean NOT NULL DEFAULT false,
 CHECK (expires_at > created_at)
);
CREATE INDEX identity_sessions_principal_idx
  ON identity_sessions(principal_type,principal_id)
  WHERE revoked_at IS NULL;
CREATE INDEX identity_sessions_expiry_idx
  ON identity_sessions(expires_at)
  WHERE revoked_at IS NULL;
\`\`\`

Column / integrity inventory:

| Column | Type | Nullability / default | Constraint or meaning |
|---|---|---|---|
| \`id\` | \`uuid\` | NOT NULL | Primary key; no SQL default |
| \`principal_type\` | \`text\` | NOT NULL | CHECK: \`player\` or \`admin\` |
| \`principal_id\` | \`uuid\` | NOT NULL | Polymorphic ID; **no FK** to either \`identity_players\` or \`identity_admins\` |
| \`token_hash\` | \`text\` | NOT NULL | UNIQUE; raw token is not the stored value |
| \`session_version\` | \`integer\` | NOT NULL, default \`1\` | CHECK \(> 0\) |
| \`created_at\` | \`timestamptz\` | NOT NULL, default \`now()\` | Creation timestamp |
| \`authenticated_at\` | \`timestamptz\` | NOT NULL | Authentication timestamp |
| \`expires_at\` | \`timestamptz\` | NOT NULL | Expiry timestamp |
| \`revoked_at\` | \`timestamptz\` | NULL | NULL means not revoked in the active-session indexes |
| \`mfa_verified\` | \`boolean\` | NOT NULL, default \`false\` | Used for admin-session MFA status |

Indexes / constraints:

- Primary-key index on \`id\`.
- Unique constraint/index on \`token_hash\`.
- \`identity_sessions_principal_idx\` on \`(principal_type, principal_id)\` WHERE \`revoked_at IS NULL\`.
- \`identity_sessions_expiry_idx\` on \`expires_at\` WHERE \`revoked_at IS NULL\`.
- CHECK: \`expires_at > created_at\`; no declared FK protects \`principal_id\` from an orphaned or mismatched principal.

## 4. Remaining tables created by the same migration

The legacy migration creates **12 tables** in total. This is the complete inventory beyond the three DDL blocks above:

| Table | Columns and constraints in the committed DDL | Indexes / foreign keys |
|---|---|---|
| \`identity_admin_auth_challenges\` | \`id uuid PK\`; \`admin_id uuid NOT NULL\`; \`status text NOT NULL\` CHECK \`mfa_required/enrollment_required\`; \`browser_token_hash text NOT NULL\`; nullable \`enrollment_token_hash text\`; \`expires_at timestamptz NOT NULL\`; \`attempt_count integer NOT NULL DEFAULT 0 CHECK >=0\`; \`max_attempts integer NOT NULL DEFAULT 5 CHECK BETWEEN 1 AND 10\`; nullable \`consumed_at\`; \`created_at timestamptz NOT NULL DEFAULT now()\`; CHECK pairs \`mfa_required\` with NULL enrollment token or \`enrollment_required\` with a non-NULL enrollment token | FK \`admin_id → identity_admins(id) ON DELETE CASCADE\`; partial indexes on \`expires_at\` and \`admin_id\` WHERE \`consumed_at IS NULL\` |
| \`identity_admin_recovery_codes\` | \`id uuid PK\`; \`admin_id uuid NOT NULL\`; \`code_hash text NOT NULL\`; \`created_at timestamptz NOT NULL DEFAULT now()\`; nullable \`consumed_at\` | FK \`admin_id → identity_admins(id) ON DELETE CASCADE\`; partial index on \`admin_id\` WHERE \`consumed_at IS NULL\` |
| \`identity_one_time_tokens\` | \`id uuid PK\`; \`principal_type text NOT NULL CHECK = 'player'\`; \`principal_id uuid NOT NULL\`; \`token_type text NOT NULL CHECK email_verification/password_reset\`; \`token_hash text NOT NULL UNIQUE\`; \`expires_at timestamptz NOT NULL\`; nullable \`consumed_at\`; \`created_at timestamptz NOT NULL DEFAULT now()\` | FK \`principal_id → identity_players(id) ON DELETE CASCADE\`; partial index on \`(token_type, expires_at)\` WHERE \`consumed_at IS NULL\` |
| \`identity_rate_limits\` | \`scope text NOT NULL\`; \`subject_hash text NOT NULL\`; \`window_started_at timestamptz NOT NULL\`; \`attempt_count integer NOT NULL CHECK >0\` | Composite primary key \`(scope, subject_hash)\` |
| \`identity_security_audit_events\` | \`id uuid PK\`; \`action text NOT NULL\`; \`actor_type text NOT NULL CHECK player/admin/system\`; nullable \`actor_id uuid\`; nullable \`subject_type text\`; nullable \`subject_id uuid\`; \`outcome text NOT NULL CHECK success/denied/failure\`; \`request_id text NOT NULL\`; \`metadata jsonb NOT NULL DEFAULT '{}'::jsonb\`; \`created_at timestamptz NOT NULL DEFAULT now()\` | Indexes on \`created_at DESC\` and \`(actor_type, actor_id, created_at DESC)\`; no FK on actor/subject IDs |
| \`identity_admin_roles\` | \`id uuid PK DEFAULT gen_random_uuid()\`; \`code text NOT NULL UNIQUE\`; \`display_name text NOT NULL\` | PK and unique \`code\` indexes |
| \`identity_admin_permissions\` | \`id uuid PK DEFAULT gen_random_uuid()\`; \`code text NOT NULL UNIQUE\`; \`description text NOT NULL\` | PK and unique \`code\` indexes |
| \`identity_admin_role_permissions\` | \`role_id uuid NOT NULL\`; \`permission_id uuid NOT NULL\` | Composite PK \`(role_id, permission_id)\`; FKs to roles and permissions, both \`ON DELETE CASCADE\` |
| \`identity_admin_account_roles\` | \`admin_id uuid NOT NULL\`; \`role_id uuid NOT NULL\` | Composite PK \`(admin_id, role_id)\`; FK \`admin_id → identity_admins(id)\` and \`role_id → identity_admin_roles(id)\`, both \`ON DELETE CASCADE\` |

Foreign-key conclusion from the complete migration directory (two migration files, one no-op baseline and the Identity migration): no other database tables in the repository’s migrations reference the \`identity_*\` tables. The FKs listed above are internal to the Identity migration. \`identity_sessions.principal_id\`, \`identity_admins.totp_pending_challenge_id\`, and audit actor/subject IDs have no declared FK.

The down section of the legacy migration drops its junction tables before roles/admins/players, then drops the remaining Identity tables. The fact that a down script exists does not authorize running it against a populated database.

## 5. Seed data and permission-registry comparison

### 5.1 What the migration seeds

The migration inserts one role definition:

| Role code | Display name |
|---|---|
| \`project-admin\` | \`Project Administrator\` |

It inserts five permission definitions:

| Seeded permission code | Seeded description |
|---|---|
| \`admin.session.read\` | Read the authenticated administrator session |
| \`admin.players.read\` | Read player administration records |
| \`admin.players.write\` | Change permitted player account fields |
| \`admin.security.audit.read\` | Read security audit records |
| \`admin.security.manage\` | Manage administrator identity security |

The migration links **all five** seeded permissions to the \`project-admin\` role using a role/permission cross join. It inserts no row in \`identity_admins\` or \`identity_admin_account_roles\`; therefore it does not create an administrator account and does not assign the role to an account by itself.

### 5.2 Does the seed match the approved \`04-api-contracts.md\` Initial permission set?

**No. Exact-code overlap is 0 of the 5 seeded permission codes.** The approved Planning Library file \`04-api-contracts.md\` (Library version last modified 2026-10-20 15:27 UTC) defines the following initial registry, which is additive and must be synchronized with OpenAPI:

\`\`\`text
players.read
players.status.write
players.profile.sensitive.read
wallet.read
wallet.adjust.request
wallet.adjust.approve
wallet.status.manage
kyc.review
kyc.documents.read
rg.case.read
rg.case.manage
payments.review
payments.approve
payments.execute
payments.methods.manage
payments.reconcile
payments.audit
reports.read
reports.export
catalog.read
catalog.sync
cms.write
cms.approve
cms.publish
cms.media.write
bonuses.manage
bonuses.grant
bonuses.grant.approve
admin.users.read
admin.users.write
admin.roles.read
admin.roles.write
admin.mfa.manage
audit.read
ops.read
ops.provider.replay
\`\`\`

Similar-looking codes are still mismatches: \`admin.players.read\` is not \`players.read\`; \`admin.players.write\` is not \`players.status.write\`; and \`admin.security.audit.read\` is not \`audit.read\`. The other two seed codes have no exact counterpart either. Do not silently rename codes or give the \`project-admin\` role broader permissions. A reviewed migration/seed reconciliation must select the canonical registry and least-privilege role mapping before permission-protected business routes are built.

### 5.3 Is there any administrator seed?

Separate three things:

1. **Migration seed:** no admin account. The migration seeds a role, five permission catalogue rows and their role-permission links only.
2. **Local bootstrap command:** [\`server/src/identity/bootstrap-admin.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/identity/bootstrap-admin.ts) and the \`admin:bootstrap\` package script can provision a first admin in local development/test when the operator explicitly supplies \`IDENTITY_BOOTSTRAP_EMAIL\`, \`IDENTITY_BOOTSTRAP_DISPLAY_NAME\` and \`IDENTITY_BOOTSTRAP_PASSWORD\`. The service refuses production, requires a non-default password of at least 16 characters, checks that the admin table is empty, hashes the password, creates an active admin with MFA not yet enabled, assigns \`project-admin\`, and writes an audit record. No default \`admin/admin\` password is committed.
3. **CI runtime fixture:** \`server/test/identity.test.ts\` inserts a temporary admin in the disposable test database for route/MFA acceptance tests and cleans it up. This is test data, not migration seed and not an administrator account on main or a production server.

The \`.env.example\` defaults \`BCLICK_IDENTITY_ENABLED=false\` and leaves bootstrap fields blank. The repository provides no evidence that the local bootstrap command has been run against any developer’s database.

## 6. Runtime and code dependencies

### 6.1 Server activation and persistence

Evidence in current main:

- [\`server/src/index.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/index.ts) constructs a PostgreSQL \`Pool\` from \`DATABASE_URL\` and configures the API.
- [\`server/src/identity/config.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/identity/config.ts) throws if Identity is asked to run in \`staging\` or \`production\`; it returns \`null\` unless \`BCLICK_IDENTITY_ENABLED=true\`.
- [\`server/src/app.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/app.ts) registers Identity routes only when both the service and Identity config are present.
- [\`server/src/identity/service.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/identity/service.ts) performs parameterized SQL reads/writes against \`identity_players\`, \`identity_admins\`, and \`identity_sessions\), plus challenges, one-time tokens, recovery codes, role links and audit tables. It stores password hashes in \`identity_players.password_hash\` / \`identity_admins.password_hash\`, writes session-token hashes, and revokes sessions in the database.
- [\`server/test/identity.test.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/test/identity.test.ts) is a PostgreSQL-backed runtime integration test. CI sets a disposable \`DATABASE_URL\` and explicitly turns Identity on for tests.

Relevant current route handlers include player register/login/logout/session/profile, password reset and email verification, plus admin login/MFA/TOTP/recovery-code/logout/session routes. This is a local/test implementation, not merely a schema-only migration; it does not implement the whole product API.

### 6.2 Exact-name source scan (the requested grep equivalent)

I scanned the text source files in current main for the exact identifiers \`identity_players\`, \`identity_admins\`, and \`identity_sessions\`:

| Area | Result |
|---|---|
| \`frontend/\` | No exact identifier hits in the 41 tracked path entries; no database access through these table names found |
| \`backend/\` | No exact identifier hits in the 36 tracked path entries; this remains a UI prototype, not a DB consumer |
| \`packages/\` | No exact identifier hits in its tracked text files, including the generated API declaration; no package-layer SQL reference found |
| \`server/migrations/1792512000000_identity_sessions.sql\` | Table definitions, indexes, internal FK references and drop statements |
| \`server/src/identity/service.ts\` | Actual application SQL reads/writes the player, admin and session tables (and supporting Identity tables) |
| \`server/test/identity.test.ts\` | Test admin inserts, session cleanup, and player/admin cleanup |

The scans covered the tracked text files in the three UI/package roots and server sources, excluding binary artwork/fonts; no external table-name match was found in the UI workspaces. UI pages may still show demo players and local form state, but they do not query these Identity tables by name.

### 6.3 Does the current service conform to the later approved Identity v2 registration contract?

Not yet. This is a material reason to treat the schema/code as **existing local implementation that needs reconciliation**, not as the final canonical model.

Current [\`server/src/identity/routes.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/identity/routes.ts) registration handler requires only \`email\`, \`password\`, \`countryCode\`, and \`settlementCurrency\`, with legacy optional \`language\` and \`preferredDisplayCurrency\`. The current OpenAPI contract and approved Phase 4 Addendum v2 additionally require \`dateOfBirth\`, \`acceptTerms=true\`, \`acceptAgeConfirmation=true\`, \`preferredLanguage\`, and \`captchaToken\`, with optional \`username\` and \`phoneNumber\`.

Those v2 required fields are not persisted by the current \`identity_players\` schema; there is no DOB/age gate or server-recorded terms/age-policy evidence in that table. The legacy schema uses \`verification_status\` for a broader lifecycle rather than the approved separate \`email_verification_status\` and KYC-tier semantics. The player password hash is embedded in the player table rather than a separate \`player_credentials\` table; currency support is a hardcoded CHECK rather than a \`currencies\` FK. Consequently, adoption still requires contract, schema, service, test and seed reconciliation. Green OpenAPI lint and Health-only Schemathesis do not prove the Identity endpoints match the current contract.

## 7. Git history, author and pull-request evidence

The following path-specific history records the creation and follow-up changes for the actual Identity migration and code:

| UTC date/time | Commit | Author | Finding |
|---|---|---|---|
| 2026-10-20 11:58:12 | [\`fe0659148b\`](https://github.com/Bclick9/Bclick/commit/fe0659148bd24216a9d73a642c75a042c426e015) | Bclick9 | Added Fastify health/readiness skeleton |
| 2026-10-20 12:03:31 | [\`37f85d52d5\`](https://github.com/Bclick9/Bclick/commit/37f85d52d59a28fc11dbd9041f469a516966a181) | Bclick9 | Added no-op API baseline migration and CI migration checks |
| 2026-10-20 16:54:33 | [\`5e5128533f\`](https://github.com/Bclick9/Bclick/commit/5e5128533f45f27d745bce4ddacb0b2d122d6a46) | Bclick9 | Added Identity migration, service/repository/routes/crypto/config, bootstrap command, tests and opt-in local/test wiring |
| 2026-10-20 16:57:00 | [\`bddf75c27c\`](https://github.com/Bclick9/Bclick/commit/bddf75c27c378597fd7ee4d28048153dd81dc4f8) | Bclick9 | Corrected Identity type contracts and generated client |
| 2026-10-20 17:00:00 | [\`216746bc83\`](https://github.com/Bclick9/Bclick/commit/216746bc83786b6ee4bab6ac5a72f39b9a30bf5c) | Bclick9 | Validated Identity request bodies and blocked player states |

The Identity planning note [\`f019bd55d8\`](https://github.com/Bclick9/Bclick/commit/f019bd55d8bf00a1737c7d670fac49b08e4c6f3b) was committed at 16:09:27 UTC on 2026-10-20. It records **PLANNING ONLY** and says not to create Identity implementation until explicit Project Owner approval. The implementation commit is later the same day at 16:54:33 UTC. The repository/commit metadata inspected here does not contain a separate approval artifact linked to the Identity commit. This is a traceability question to reconcile against the contemporaneous project-owner conversation/decision record; by itself, the absence of such an artifact in Git is not proof that approval was or was not given.

For commit \`5e5128533f45f27d745bce4ddacb0b2d122d6a46\`, GitHub’s associated-pull-request endpoint returned an empty list, and the repository PR search returned no matching Identity PR. The commit is a normal linear commit on \`main\`, not a merge commit. No associated PR was found for this implementation in the available GitHub metadata.

This is the remote main-branch history relevant to the Identity paths. No statement is made about unpushed commits/branches in a developer’s local clone.

## 8. Why the approved current-state audit did not mention these tables

The archived \`current-state-audit.md\` is preserved in the approved Planning Library bundle. Its stated observation was main revision \`d7468e9de0eece35e302640f349de557c9bbcc2a\`, dated **2026-10-19 14:32:05 UTC**, and it says its inspection occurred on 2026-10-19. At that snapshot, the audit recorded that the repository did not yet have \`server/\` or \`packages/\` and that \`backend/\` was only the Backoffice UI.

The main tree changed on 2026-10-20:

- 11:58 UTC: the Fastify health/readiness skeleton was added.
- 12:03 UTC: the baseline migration/CI chain was added.
- 16:54 UTC: the Identity migration and local/test server implementation were added.

The repository note [\`2026-10-20-IR-002-repository-audit.md\`](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-20-IR-002-repository-audit.md), committed at 11:32 UTC on 2026-10-20, still cites the older 2026-10-19 main snapshot. It therefore cannot describe the Identity implementation added later that day.

**Conclusion:** the approved audit is historical evidence about its reviewed revision, not a live inventory of current main. Its statement should be superseded/annotated by a future audit update after the owner selects the migration direction. The correct present-day wording is: Bclick has a local/test-only Fastify API and Identity persistence scaffold on main; no production deployment or production database is evidenced by the repository reviewed here; external deployment/database status cannot be inferred from Git alone.

## 9. Is \`identity_*\` a starting point or leftover?

It is both a **real starting point** and a **legacy-shaped scaffold requiring reconciliation**:

- It is a real starting point because there is a concrete migration, server-side SQL, registered route handlers, credential/session/challenge persistence, a one-time local bootstrap, and passing PostgreSQL-backed integration tests.
- It is “legacy” relative to the later approved model because the names and fields predate Identity Addendum v2; it embeds the player password hash, has no DOB/consent evidence, uses old verification semantics, hardcodes currencies, has a polymorphic session table without subject FKs, and seeds permission codes that do not match the initial approved permission registry.
- Nothing in the inspected source proves that live production player/admin data exists. Equally, the repository cannot prove that all individual local/dev databases are empty. Check only the relevant disposable/local databases under owner direction before any cutover.
- It must not be treated as an approved final schema simply because CI passes. The current route implementation is not yet contract-aligned with the later registration contract, and the KYC override domain route is not implemented.

## 10. Option assessment

Effort values below are relative planning estimates for the schema + route/test reconciliation, not commitments for the whole Phase 4 schedule. They assume local-only development and must be recalibrated after the owner chooses an option and the local data state is known.

| Option | Pros | Cons / work required | Effort | Main risks |
|---|---|---|---|---|
| **A. Adopt + Extend** — make the existing player identity the canonical player record (rename \`identity_players\` to \`players\` in a new reviewed migration), then extend/reconcile it | One source of truth; avoids creating an empty parallel player identity while current code already reads/writes this table; preserves existing local accounts if any; reuses the current testable auth flows and related schema as a starting point | Update every SQL reference and test for the rename; align field names/status with v2; add DOB/consent/version evidence and enforce age/terms server-side; add currency FK; move password hash into the planned \`player_credentials\` table through a reviewed, safe follow-up; reconcile \`identity_sessions\` versus planned \`player_sessions\`/admin sessions; map/reseed least-privilege permissions to the approved registry; add/verify route-level contract tests | **Medium**, rough 3–5 focused engineering days for schema/code reconciliation; may increase | A blind rename is insufficient; password moves and session FK/context decisions must be transactional and tested; local records must be discovered before migration; no dual writes/source of truth |
| **B. Fresh + Deprecate** — create a separate empty \`players\` table and keep \`identity_players\` only as legacy temporarily | Clean profile/credentials boundary and freedom to implement the newly approved schema without inheriting old constraints; allows a deliberate rewrite | Current routes/service/tests still depend on \`identity_players\`; must either rewrite them before use or maintain a risky bridge; without backfill existing local accounts are left behind; two player tables can diverge during transition; eventually requires separate retirement work | **High**, rough 4–6 focused engineering days plus cutover/deprecation follow-up | Duplicate source of truth, accidental use of the wrong table, broken local login, implicit migration/backfill assumptions |
| **C. Drop + Rebuild** — retire old schema and replace it with a newly designed schema | Conceptually clean reset if every relevant database is confirmed disposable and code is rewritten in the same reviewed change | Existing route/service/tests are coupled to the old schema; migration is already committed and must not be edited/replayed destructively; any removal must be a new reviewed migration; local data would be lost; a rebuild still needs the v2 contract and permission reconciliation | **Medium–High**, rough 3–5 focused engineering days if truly empty; otherwise higher | Data loss, regression across auth/MFA/session tests, destructive rollback assumptions, accidental use of old handler code against new schema |

### Provisional Tech Lead recommendation (not a decision)

**Prefer Option A conditionally.** Based on the committed facts, the old schema is actively used by local/test server code and already contains the closest existing canonical player/admin/session persistence. Adopting the player record and extending it avoids inventing a second player source of truth. However, A should mean a reviewed, staged migration/refactor—not a blind table rename—and must include the v2 registration fields, credential separation, currency FK, permission-registry reconciliation, session-model decision and runtime tests.

Change this recommendation if the local-only data inspection finds no data and the owner prefers a clean replacement, or if the owner decides that the existing Identity code should be discarded. No option is approved by this report.

## 11. Permanent KYC waiver guard — wiring status

The server-side permanent-waive guard and its unit tests exist:

- [\`permanent-waive-guard.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/src/kyc/permanent-waive-guard.ts)
- [\`permanent-waive-guard.test.ts\`](https://github.com/Bclick9/Bclick/blob/main/server/test/permanent-waive-guard.test.ts)
- [ADR-022](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

**Guard is implemented but not wired to route; it will be connected when \`PATCH /admin/players/{id}/deposit-kyc-override\` is built.** The corresponding override route is not currently registered in \`server/src/identity/routes.ts\` and no \`deposit-kyc-override\` path was found in the current OpenAPI mirror. When it is built, the contract should use the canonical API prefix and route path, and the handler must invoke the guard inside the server-side transaction before any state mutation. Add positive/negative route-level tests for active-admin count, distinct requester/approver, inactive identities, DB failure/fail-closed behavior, audit/history and DB constraints before treating the route as operational.

The current guard’s passing unit tests are not proof of a real route-level KYC override. No override endpoint or real-money path is authorized by this note.

## 12. Fixed gates, impact and next decision

- **Q-020:** remains **Open** until each implemented route/method and provider callback receives the specified runtime contract coverage. Current Health-route Schemathesis is not coverage for unimplemented routes.
- **Q-011:** remains **P0/Open**. No staging/production deployment until the required restore drill and measured RPO/RTO evidence are complete.
- **Q-015:** remains **Open**. No launch or real deposits.
- **Q-009:** remains **Open** and blocks TND provider/payment routing. A TND currency code or precision row is not proof of provider support.
- **Phase 4:** local development/test only; no production Identity deployment, wallet activation, payments, provider callbacks or real-money operations.
- **Current project estimate:** 11–18 days remains a working estimate; contract reconciliation and the selected migration path may increase it.

### What must happen next

1. Project Owner reviews these findings and chooses **A**, **B**, or **C** (or asks for additional evidence).
2. Only after that decision, update \`docs/notes/2026-10-20-phase4-migration-plan.md\` so it reflects the selected path and accurately handles the existing Identity schema/route dependencies.
3. Wait for explicit approval of the revised migration-plan note.
4. Only then author Migration 001 for the approved path.

**Approval status:** investigation note only. **Migration 001 has not been created or applied.** No \`identity_*\` file/table was changed or deleted by this investigation.
