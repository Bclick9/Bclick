# Phase 4 Migration Plan — Logical Migration 001: players + currencies

**Prepared:** 2026-10-21  
**Status:** PLAN ONLY — awaiting explicit Project Owner approval  
**Scope:** local development only; no schema change or migration execution is authorized by this note  
**Current main head used for validation:** [bc74bc89a36b1a36943cb91578c796f799d3c82b](https://github.com/Bclick9/Bclick/commit/bc74bc89a36b1a36943cb91578c796f799d3c82b)

## 1. Purpose and approval boundary

This note proposes the schema, migration sequence, validation, and rollback rules for the first canonical player-domain migration. “Logical Migration 001” means the new players + currencies unit; the eventual migration filename must follow the repository’s existing timestamp-based node-pg-migrate convention.

**This is not the migration itself.** No migration file for players/currencies has been created, no migration has been applied as part of this task, and no existing migration file may be edited. Wait for explicit Project Owner approval of this exact note before creating logical Migration 001.

The scope is limited to the canonical player profile and currency metadata. It does not authorize authentication routes, a wallet implementation, ledger postings, payment/deposit routes, provider routing, launch, or deployment.

## 2. CI evidence completed before this plan

The updated OpenAPI contract and generated type declaration are now committed on main. These two main-branch Actions runs completed successfully against commit bc74bc89a36b1a36943cb91578c796f799d3c82b:

- [API skeleton and contract checks — run 39561585551](https://github.com/Bclick9/Bclick/actions/runs/39561585551)
- [Application builds — run 39561585301](https://github.com/Bclick9/Bclick/actions/runs/39561585301)

Validated on main:

- Redocly lint passed for both docs/planning/openapi.yaml and docs/planning/openapi-aggregator-callbacks.yaml.
- The contract validator passed, including YAML duplicate-key checks, internal reference resolution, unique operation IDs, and contract fixtures.
- openapi-typescript regenerated packages/api-client/src/generated/openapi.d.ts, and the generated-declaration drift check passed.
- API/shared-package typechecking, server tests, the PostgreSQL migration-chain test, API build, and current Schemathesis tests against implemented Health operations passed.
- Player frontend and Backoffice builds passed with the committed generated declaration.

Scope limitation: Schemathesis exercises implemented Health operations; it does not prove runtime behavior for future registration, KYC override, wallet, deposit, or provider routes. Q-020 remains open until the relevant routes and callback operations receive route-level runtime coverage.

## 3. Existing migration reality that this plan must preserve

The repository already contains two timestamped migration files:

1. 1792497600000_api_skeleton_baseline.sql — a no-op baseline.
2. 1792512000000_identity_sessions.sql — an existing identity/session scaffold.

The second file already creates legacy tables including identity_players, identity_admins, identity_sessions, identity_admin_auth_challenges, identity_one_time_tokens, identity_admin_roles, identity_admin_permissions, identity_admin_role_permissions, identity_admin_account_roles, plus recovery, rate-limit, and security-audit tables. Its identity_players table contains a password_hash and older verification_status field. It also inserts a fixed project-admin role definition and a small set of permission catalog rows; it does **not** create an administrator account.

These are existing repository facts, not a reason to alter either timestamped migration. Applied migrations are immutable: any future correction must be a new reviewed migration.

### Proposed transition rule

- The new canonical players table is created empty. Do not copy or backfill rows from identity_players, identity_admins, identity_sessions, or any other identity_* table.
- The canonical players table is the future source of truth for player profile, consent evidence, settlement currency, and the KYC current-state fields described below. It must not be treated as a second active player store alongside identity_players.
- The old identity_* schema is legacy scaffolding. Do not wire new player/auth routes to both table families, and do not silently rename, drop, or migrate credentials from the existing tables as a side effect of logical Migration 001.
- Before any application route uses the new canonical schema, a later reviewed cut-over/cleanup migration must confirm that no implemented code depends on the legacy tables and define how to retire those tables safely. That cleanup must be explicit, separately reviewed, and must not backfill old password hashes or sessions into the canonical schema.
- Before applying Migration 001 to any developer database, inspect whether the legacy identity_* tables contain data. If they do, stop and review the situation; do not assume the database is empty just because CI starts from a disposable database.

Logical Migration 001 creates only the new players and currencies tables, their constraints and indexes, and the three required currency metadata rows. It creates no administrator principal, no player account, no session, no wallet account, no balance, no ledger transaction, and no sample/test customer.

## 4. Logical Migration 001 — players + currencies

### 4.1 Table creation order within the migration

1. Create players first without currency foreign keys that point to a table not yet created.
2. Create currencies.
3. Insert the three fixed currency metadata rows.
4. Add player foreign keys to currencies and finalize all constraints and indexes.
5. Commit the migration as one transaction.

The migration must be safe on a clean database where the existing timestamped scaffold migrations have already run. It must not change those earlier files, and it must not perform data backfill.

### 4.2 Proposed players schema

Use UUID identity and PostgreSQL-native types. Exact DDL is deferred until approval, but the proposed columns and nullability are:

| Column | Required? | Proposed rule / intent |
|---|---|---|
| id | Yes | UUID primary key; generated by the server/database, never supplied as a trusted client identifier |
| email | Yes | Original accepted email representation |
| email_normalized | Yes | Server-normalized, trimmed, case-normalized email; unique across players |
| status | Yes | NOT NULL; default pending; constrained to active, pending, suspended, closed |
| country_code | Yes | NOT NULL; canonical two-letter country code validated against the registration contract |
| settlement_currency | Yes | NOT NULL; three-letter code, foreign key to currencies |
| display_name | No | Nullable; do not require it simply because the legacy identity_players table does |
| preferred_display_currency | No | Nullable; when present, foreign key to currencies |
| date_of_birth | Yes | NOT NULL date-only value; real calendar date, not in the future, and age >= 18 at server-recorded creation time |
| preferred_language | Yes | NOT NULL; default en; validate against the accepted LanguageCode contract |
| username | No | Nullable display/input value; normalize server-side when provided |
| username_normalized | No | Nullable canonical comparison value; partial unique index when not null |
| phone_number_e164 | No | Nullable; must be valid E.164 when provided; partial unique index when not null |
| terms_accepted_at | Yes | NOT NULL; generated by the server only after acceptTerms=true |
| terms_version | Yes | NOT NULL, non-empty active terms identifier captured by the server |
| age_confirmation_at | Yes | NOT NULL; generated by the server only after acceptAgeConfirmation=true |
| age_policy_version | Yes | NOT NULL, non-empty active age-policy identifier captured by the server |
| email_verification_status | Yes | NOT NULL; default not_required; constrained to the contract’s accepted lifecycle values |
| kyc_tier | Yes | NOT NULL; default none; constrained to none, basic, verified, enhanced |
| kyc_lock | Yes | NOT NULL; default false |
| kyc_lock_reason | No | Nullable reason/evidence reference; never use it as a substitute for audit history |
| deposit_kyc_override | No | Nullable; only require or waive are valid non-null values; NULL means no override |
| deposit_kyc_override_expires_at | No | Nullable; NULL with waive means permanent and invokes dual approval |
| deposit_kyc_override_reason | No | Nullable current-state reason; durable audit history is separate |
| deposit_kyc_override_requested_by | No | Nullable UUID; requester admin reference to be constrained when the canonical admin principal table exists |
| deposit_kyc_override_approved_by | No | Nullable UUID; approver admin reference to be constrained when the canonical admin principal table exists |
| deposit_kyc_override_set_at | No | Nullable server-recorded timestamp for the current override |
| created_at | Yes | NOT NULL timestamptz, database default; server-owned and not accepted from registration input |
| updated_at | Yes | NOT NULL timestamptz, database default and maintained by the server |

The new players table must **not** contain password_hash, a raw password, a session token, a wallet balance, or provider-specific wallet state. Credential material belongs in player_credentials in a later migration; opaque token values must never be stored as raw session credentials.

Do not add a separate free-form KYC case/status field to players without reconciling it against the current OpenAPI/ADR contract. KYC evidence, change history, approvals, expiry/revocation, and review records require a later normalized, append-only audit/history design; the current-state columns above do not replace that record.

### 4.3 Integrity constraints and uniqueness

Required database integrity:

- Unique index/constraint on email_normalized. Service normalization must be deterministic and atomic; duplicate checks must not rely on a pre-insert SELECT alone. Keep the database uniqueness constraint as the final race-safe arbiter.
- Partial unique index on username_normalized WHERE username_normalized IS NOT NULL.
- Partial unique index on phone_number_e164 WHERE phone_number_e164 IS NOT NULL.
- Check username and username_normalized are either both NULL or both present. Validate reserved/system usernames in the service, not by trusting frontend validation.
- Validate phone_number_e164 as E.164 at the request/service boundary. When absent, store NULL, not an empty string.
- Check all enum-like values (status, email_verification_status, kyc_tier, deposit_kyc_override) against the explicitly approved value sets.
- settlement_currency is required and must reference currencies. preferred_display_currency is nullable and, when set, must reference currencies.
- Do not use JavaScript floating-point numbers for currency values. Currency precision metadata is not a grant to route payments or enable provider methods.

Age enforcement must exist both in request/service validation and as a database constraint. Proposed database invariant:

    date_of_birth <= ((created_at AT TIME ZONE 'UTC')::date - INTERVAL '18 years')::date

The service must additionally reject invalid calendar dates and future birth dates using server time. created_at is server/database-owned and must not be client-controlled or updated by the registration path. Test the exact 18th-birthday boundary and the day before it.

Registration request booleans acceptTerms and acceptAgeConfirmation must be true. False or missing values must be rejected by request validation; do not store client-supplied timestamps or arbitrary client-supplied terms/policy versions. The service records server timestamps plus the currently configured version identifiers. Database NOT NULL constraints on terms_accepted_at, terms_version, age_confirmation_at, and age_policy_version must prevent creation that omits this evidence.

For a permanent waiver, the current-state database check should require a non-null requester and approver and distinct UUIDs whenever deposit_kyc_override='waive' and deposit_kyc_override_expires_at IS NULL. Foreign keys to the canonical admin principal table must be added only after that table exists, following the agreed logical table order. Database constraints cannot prove that two accounts are currently active; the server must do that.

### 4.4 Currency metadata

Proposed currencies columns:

- code: CHAR(3) primary key, uppercase ISO-style code.
- decimal_places: SMALLINT NOT NULL with a bounded non-negative range.
- Any display label/name column is descriptive metadata only; provider availability must not be inferred from it.

Seed exactly these canonical metadata values in Migration 001:

| code | decimal_places |
|---|---:|
| TND | 3 |
| EUR | 2 |
| USD | 2 |

Seed only currency metadata. Do not seed players, administrators, wallets, balances, transactions, provider connections, deposits, or sample data. The existing legacy project-admin role/permission rows are not admin accounts and are not copied into any new canonical table by Migration 001.

**Important:** TND=3 in currencies is precision metadata only. Q-009 remains open and blocks TND provider/payment routing until BigBang and WinHouse support, settlement precision, rounding, callbacks, and reconciliation semantics are independently evidenced and approved. A currency row must never be treated as proof of provider support.

## 5. Required migration order after approval

Keep this logical creation order exactly:

1. players
2. currencies
3. wallet_accounts
4. player_credentials
5. player_sessions
6. auth_challenges
7. admin_* principal/security tables
8. roles
9. permissions

Logical Migration 001 contains steps 1–2 only. Later migrations must use the existing timestamp-based filename convention and must be separately reviewed; this plan creates none of them.

Because some foreign-key dependencies point to tables later in the approved order, use an explicit two-stage constraint plan rather than reversing the order silently:

- Create players before currencies, then add currency foreign keys after currencies exists in the same Migration 001 transaction.
- wallet_accounts references the canonical player and currency rows but creates no opening balances.
- player_credentials owns the password hash and related credential metadata; one player must not have more than one current primary password credential unless a reviewed versioned-credential design says otherwise.
- player_sessions stores token hashes and server-side lifecycle metadata. Do not backfill from identity_sessions; do not re-use the legacy polymorphic session table as the canonical player-session store.
- auth_challenges needs an explicit principal/context model. Any FK that depends on an admin table created later must be added only after the canonical admin principal table is available.
- admin_* creates canonical admin principals and security persistence, but Migration 001 must not insert an admin row or fixed bootstrap password.
- roles is created before permissions as requested. Create role-to-permission junction structures and their foreign keys only once both canonical tables exist.
- Add the deferred requester/approver foreign keys for player KYC overrides after the canonical admin principal table exists. Until then, no KYC override mutation endpoint may be enabled.
- Any eventual compatibility cleanup for legacy identity_* tables is a distinct later migration after code review confirms nothing reads/writes them; no cleanup is implicit in Migration 001.

The literal logical order is a project sequencing rule; defer only the dependent foreign-key/junction constraints where needed to satisfy database dependency correctness.

## 6. Server-side permanent-waive guard and KYC override boundary

ADR-022 documents the normative check. The required guard logic is:

    if (deposit_kyc_override === 'waive' && expires_at === null) {
      if (active_admin_count < 2) return 422 "PERMANENT_WAIVE_REQUIRES_TWO_ADMINS";
      if (requested_by === approved_by) return 403 "REQUESTER_CANNOT_APPROVE_OWN";
    }

The server guard module and unit tests exist at:

- [permanent-waive-guard.ts](https://github.com/Bclick9/Bclick/blob/main/server/src/kyc/permanent-waive-guard.ts)
- [permanent-waive-guard.test.ts](https://github.com/Bclick9/Bclick/blob/main/server/test/permanent-waive-guard.test.ts)
- [ADR-022](https://github.com/Bclick9/Bclick/blob/main/docs/notes/2026-10-20-ADR-022-kyc-lock-deposit-override-draft.md)

The module also requires both distinct principals to be active admins and fails closed if the authoritative active-admin count cannot be read. CI runs its unit tests.

**Readiness limitation:** there is not yet a real KYC-override mutation route, and the canonical admin principal table has not yet been created. The helper’s passing unit tests are not route-level proof and do not make the override operational. Before any such route is introduced, call the guard inside the same protected service transaction before any state change, audit the requester/approver and decision, add route-level negative/positive acceptance tests, and prove the database constraints and foreign keys. No override request may be enabled until those tests and the audit/history table exist.

## 7. Transaction, locking, and rollback plan

### Apply

- Apply Migration 001 through the repository’s node-pg-migrate runner against a disposable local/PostgreSQL test database, with transaction support enabled.
- Create tables, checks, unique/partial indexes, and seed the three currency rows in one transaction. A failed constraint/index/seed operation must roll the transaction back completely.
- Before executing on a developer database, record whether any identity_* legacy tables contain rows. If they do, stop for explicit review; this plan authorizes no backfill or destructive cleanup.
- Verify the migration runner’s recorded order. Do not manually execute DDL out of band and do not amend a previously applied migration.

### Down / rollback

- A clean rollback is permitted only on a disposable local/test database where the new canonical players table is empty and no later table depends on players or currencies.
- The down path must use RESTRICT/default non-cascading drops, not DROP ... CASCADE. It must refuse to drop populated canonical players or currencies referenced by wallet_accounts or other later objects.
- On an eligible empty database, remove deferred foreign keys and indexes/checks, drop the newly created players table, then drop currencies and its seed rows as part of dropping the migration-owned table. Do not delete shared currency rows individually while dependent rows may exist.
- Test up → down → up against disposable PostgreSQL and verify that a failed up leaves no partial table/index/seed state.
- Once player or financial/accounting data may exist, prefer a reviewed forward-fix migration and restore plan over destructive down. Never roll back by deleting financial history or by deleting currencies with references.
- This plan does not run a migration, seed data, take a backup, or exercise rollback.

## 8. Migration 001 acceptance test plan

Before the migration can be considered complete, the implementation PR must demonstrate:

1. Clean PostgreSQL migration run from the existing baseline plus current legacy scaffold succeeds with no edits to those earlier files.
2. players and currencies are created in the intended order; the currency FK is present; a clean canonical players table contains zero rows after migration.
3. Exactly TND=3, EUR=2, and USD=2 exist in currencies; no other player/admin/wallet/transaction/provider seed data is created.
4. No query or INSERT...SELECT copies rows from identity_players to players; the old identity tables remain a separately reviewed transition concern.
5. Email normalization uniqueness is race-safe; normalized username and E.164 phone partial uniqueness allow NULL but reject duplicate non-null values.
6. Required consent evidence rejects NULL/empty version identifiers; registration cannot persist false terms/age confirmations.
7. Date-of-birth tests cover invalid/future dates, the day before age 18, the exact 18th birthday, and a date that satisfies the boundary; the server owns created_at.
8. Currency foreign keys, enum checks, permanent-waiver requester/approver distinctness, and expected NOT NULL constraints reject invalid rows.
9. The permanent-waive service guard returns 422 when fewer than two active admins exist; returns 403 for requester=approver; rejects inactive/unknown admins; succeeds only for two distinct active principals; and fails closed on database errors.
10. Migration up/down/up works only under the documented disposable-empty-database conditions; down refuses populated/referenced rows and does not cascade.
11. The full required CI passes, including OpenAPI lint for both specs, regenerated-client drift, API/shared typechecks, server tests, PostgreSQL migration validation, Schemathesis for implemented routes, and player/Backoffice builds.
12. The diff contains no admin-account seed, sample player, test balance, transaction, provider route, or accidental deposit/wallet enablement.

Q-020 stays Open until future implemented routes each receive real route-level runtime tests. Current Health-route Schemathesis is not evidence for unimplemented registration, KYC override, wallet, deposits, or provider callbacks.

## 9. Fixed safety and launch gates

- Q-009: Open; no TND provider routing from currency metadata alone.
- Q-011: P0/Open; no staging or production deployment until the required backup/restore drill and measured RPO/RTO evidence are complete.
- Q-015: Open; no launch or real deposits.
- Q-020: Open; static contract checks and Health-only Schemathesis do not close route-level runtime coverage.
- Phase 4 remains local-only. No wallet balance/ledger postings, real-money deposit/withdrawal, provider callbacks, payment processing, or production credentials are enabled by this plan.
- Legal/Compliance approval remains separate and required before any jurisdictional deposit/KYC policy can operate.

## 10. Project Owner approval required before Migration 001

Please review and approve or amend this exact plan, especially these explicit choices:

- [ ] Approve the proposed canonical players columns, required consent evidence, age constraint, indexes, currency FK, and KYC current-state columns.
- [ ] Approve creation of an empty canonical players table with no backfill, plus the separately reviewed retirement of the legacy identity_* scaffold before any new route treats the canonical schema as the only source of truth.
- [ ] Approve currency metadata seeds TND=3, EUR=2, USD=2, with no implication that provider routing is enabled.
- [ ] Approve the exact logical table order and deferred-FK strategy.
- [ ] Approve the transaction/rollback limits and the rule that populated or referenced data must not be destructively rolled back.
- [ ] Confirm there is no admin account seed, no fake player/accounting data, no route activation, and no deployment.

**Approval state: PENDING.** Do not create or apply logical Migration 001 until the Project Owner explicitly approves this note.