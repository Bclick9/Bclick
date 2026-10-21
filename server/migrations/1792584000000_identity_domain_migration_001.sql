-- Up Migration
-- Migration 001: canonical table names plus additive player/identity metadata.
-- This migration is intentionally transactional and fails closed unless the
-- existing two-migration CI/owner-approved baseline is exact.
-- No records or legacy permissions are copied, deleted, or rewritten.
DO $m001_preconditions$
DECLARE
  source_name text;
  destination_name text;
  observed_migrations text[];
  observed_permission_codes text[];
  expected_permission_codes text[] := ARRAY[
    'admin.players.read',
    'admin.players.write',
    'admin.security.audit.read',
    'admin.security.manage',
    'admin.session.read'
  ];
  observed_role_permission_count integer;
BEGIN
  IF to_regclass('public.pgmigrations') IS NULL THEN
    RAISE EXCEPTION 'Migration 001 stopped: public.pgmigrations is missing';
  END IF;

  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 001 stopped: migration history is not the exact approved two-migration baseline; observed %',
      observed_migrations;
  END IF;

  FOREACH source_name IN ARRAY ARRAY[
    'identity_players',
    'identity_admins',
    'identity_sessions',
    'identity_admin_auth_challenges',
    'identity_admin_recovery_codes',
    'identity_one_time_tokens',
    'identity_rate_limits',
    'identity_security_audit_events',
    'identity_admin_roles',
    'identity_admin_permissions',
    'identity_admin_role_permissions',
    'identity_admin_account_roles'
  ] LOOP
    IF to_regclass(format('public.%I', source_name)) IS NULL THEN
      RAISE EXCEPTION 'Migration 001 stopped: required source table public.% is missing', source_name;
    END IF;
  END LOOP;

  FOREACH destination_name IN ARRAY ARRAY[
    'players',
    'admin_users',
    'auth_sessions',
    'admin_mfa_challenges',
    'admin_mfa_recovery_codes',
    'player_one_time_tokens',
    'rate_limits',
    'audit_events',
    'roles',
    'permissions',
    'role_permissions',
    'admin_role_assignments',
    'currencies'
  ] LOOP
    IF to_regclass(format('public.%I', destination_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Migration 001 stopped: destination table public.% already exists', destination_name;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.identity_players) <> 0 THEN
    RAISE EXCEPTION 'Migration 001 stopped: baseline player count differs from approved CI reference';
  END IF;
  IF (SELECT count(*) FROM public.identity_admins) <> 0 THEN
    RAISE EXCEPTION 'Migration 001 stopped: baseline administrator count differs from approved CI reference';
  END IF;
  IF (SELECT count(*) FROM public.identity_sessions) <> 0 THEN
    RAISE EXCEPTION 'Migration 001 stopped: sessions exist; owner review is required';
  END IF;
  IF (SELECT count(*) FROM public.identity_admin_roles) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.identity_admin_roles WHERE code = 'project-admin') THEN
    RAISE EXCEPTION 'Migration 001 stopped: role inventory differs from the approved baseline';
  END IF;
  IF (SELECT count(*) FROM public.identity_admin_account_roles) <> 0 THEN
    RAISE EXCEPTION 'Migration 001 stopped: admin-role assignment count differs from approved baseline';
  END IF;
  IF (SELECT count(*) FROM public.identity_admin_permissions) <> 5 THEN
    RAISE EXCEPTION 'Migration 001 stopped: legacy permission count differs from approved baseline';
  END IF;

  SELECT array_agg(code ORDER BY code)
    INTO observed_permission_codes
    FROM public.identity_admin_permissions;
  IF observed_permission_codes IS DISTINCT FROM expected_permission_codes THEN
    RAISE EXCEPTION 'Migration 001 stopped: legacy permission codes differ from approved baseline; observed %',
      observed_permission_codes;
  END IF;

  SELECT count(*)::integer
    INTO observed_role_permission_count
    FROM public.identity_admin_role_permissions rp
    JOIN public.identity_admin_roles r ON r.id = rp.role_id
    JOIN public.identity_admin_permissions p ON p.id = rp.permission_id
   WHERE r.code = 'project-admin'
     AND p.code = ANY(expected_permission_codes);
  IF observed_role_permission_count <> 5
     OR (SELECT count(*) FROM public.identity_admin_role_permissions) <> 5 THEN
    RAISE EXCEPTION 'Migration 001 stopped: the five legacy role-permission links are not intact';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.identity_admin_role_permissions rp
      JOIN public.identity_admin_roles r ON r.id = rp.role_id
     WHERE r.code <> 'project-admin'
  ) THEN
    RAISE EXCEPTION 'Migration 001 stopped: unexpected role-permission mapping exists';
  END IF;
END
$m001_preconditions$;

ALTER TABLE public.identity_players RENAME TO players;
ALTER TABLE public.identity_admins RENAME TO admin_users;
ALTER TABLE public.identity_sessions RENAME TO auth_sessions;
ALTER TABLE public.identity_admin_auth_challenges RENAME TO admin_mfa_challenges;
ALTER TABLE public.identity_admin_recovery_codes RENAME TO admin_mfa_recovery_codes;
ALTER TABLE public.identity_one_time_tokens RENAME TO player_one_time_tokens;
ALTER TABLE public.identity_rate_limits RENAME TO rate_limits;
ALTER TABLE public.identity_security_audit_events RENAME TO audit_events;
ALTER TABLE public.identity_admin_roles RENAME TO roles;
ALTER TABLE public.identity_admin_permissions RENAME TO permissions;
ALTER TABLE public.identity_admin_role_permissions RENAME TO role_permissions;
ALTER TABLE public.identity_admin_account_roles RENAME TO admin_role_assignments;

CREATE TABLE public.currencies (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  decimal_places smallint NOT NULL CHECK (decimal_places BETWEEN 0 AND 4)
);

INSERT INTO public.currencies (code, decimal_places) VALUES
  ('TND', 3),
  ('EUR', 2),
  ('USD', 2);

-- Expand-only fields: consent/DOB are nullable until the registration handler
-- records actual user consent and a server-selected policy version. Never infer
-- consent or invent a birth date during a schema migration. Age is derived
-- from date_of_birth and is deliberately not stored as a mutable integer.
ALTER TABLE public.players
  ADD COLUMN date_of_birth date,
  ADD COLUMN terms_accepted_at timestamptz,
  ADD COLUMN terms_version text,
  ADD COLUMN age_confirmation_at timestamptz,
  ADD COLUMN age_policy_version text,
  ADD COLUMN preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN username text,
  ADD COLUMN username_normalized text,
  ADD COLUMN phone_number_e164 text,
  ADD COLUMN email_verification_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN kyc_tier text NOT NULL DEFAULT 'none',
  ADD COLUMN kyc_lock boolean NOT NULL DEFAULT false,
  ADD COLUMN kyc_lock_reason text,
  ADD COLUMN deposit_kyc_override text,
  ADD COLUMN deposit_kyc_override_expires_at timestamptz,
  ADD COLUMN deposit_kyc_override_reason text,
  ADD COLUMN deposit_kyc_override_requested_by uuid,
  ADD COLUMN deposit_kyc_override_approved_by uuid,
  ADD COLUMN deposit_kyc_override_set_at timestamptz;

ALTER TABLE public.players
  ADD CONSTRAINT players_date_of_birth_adult_check
    CHECK (date_of_birth IS NULL OR
      date_of_birth <= ((created_at AT TIME ZONE 'UTC')::date - INTERVAL '18 years')::date),
  ADD CONSTRAINT players_terms_acceptance_pair_check
    CHECK ((terms_accepted_at IS NULL) = (terms_version IS NULL)),
  ADD CONSTRAINT players_terms_version_nonempty_check
    CHECK (terms_version IS NULL OR length(btrim(terms_version)) > 0),
  ADD CONSTRAINT players_age_confirmation_pair_check
    CHECK ((age_confirmation_at IS NULL) = (age_policy_version IS NULL)),
  ADD CONSTRAINT players_age_policy_version_nonempty_check
    CHECK (age_policy_version IS NULL OR length(btrim(age_policy_version)) > 0),
  ADD CONSTRAINT players_preferred_language_nonempty_check
    CHECK (length(btrim(preferred_language)) BETWEEN 2 AND 12),
  ADD CONSTRAINT players_username_pair_check
    CHECK ((username IS NULL) = (username_normalized IS NULL)),
  ADD CONSTRAINT players_username_nonempty_check
    CHECK (username IS NULL OR length(btrim(username)) BETWEEN 1 AND 64),
  ADD CONSTRAINT players_username_normalized_nonempty_check
    CHECK (username_normalized IS NULL OR
      (length(btrim(username_normalized)) BETWEEN 1 AND 64
       AND username_normalized = lower(btrim(username_normalized)))),
  ADD CONSTRAINT players_phone_number_e164_check
    CHECK (phone_number_e164 IS NULL OR phone_number_e164 ~ '^\\+[1-9][0-9]{1,14}$'),
  ADD CONSTRAINT players_email_verification_status_check
    CHECK (email_verification_status IN ('pending','verified','rejected','expired','not_required')),
  ADD CONSTRAINT players_kyc_tier_check
    CHECK (kyc_tier IN ('none','basic','verified','enhanced')),
  ADD CONSTRAINT players_deposit_kyc_override_check
    CHECK (deposit_kyc_override IS NULL OR deposit_kyc_override IN ('require','waive')),
  ADD CONSTRAINT players_permanent_kyc_waiver_approval_check
    CHECK (
      deposit_kyc_override IS DISTINCT FROM 'waive'
      OR deposit_kyc_override_expires_at IS NOT NULL
      OR (
        deposit_kyc_override_requested_by IS NOT NULL
        AND deposit_kyc_override_approved_by IS NOT NULL
        AND deposit_kyc_override_requested_by <> deposit_kyc_override_approved_by
      )
    ),
  ADD CONSTRAINT players_kyc_override_set_at_pair_check
    CHECK ((deposit_kyc_override IS NULL) = (deposit_kyc_override_set_at IS NULL));

CREATE UNIQUE INDEX players_username_normalized_uidx
  ON public.players(username_normalized)
  WHERE username_normalized IS NOT NULL;
CREATE UNIQUE INDEX players_phone_number_e164_uidx
  ON public.players(phone_number_e164)
  WHERE phone_number_e164 IS NOT NULL;

ALTER TABLE public.players
  ADD CONSTRAINT players_settlement_currency_fk
    FOREIGN KEY (settlement_currency) REFERENCES public.currencies(code)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT players_preferred_display_currency_fk
    FOREIGN KEY (preferred_display_currency) REFERENCES public.currencies(code)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT players_deposit_kyc_override_requested_by_fk
    FOREIGN KEY (deposit_kyc_override_requested_by) REFERENCES public.admin_users(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT players_deposit_kyc_override_approved_by_fk
    FOREIGN KEY (deposit_kyc_override_approved_by) REFERENCES public.admin_users(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

-- Down Migration
-- Reverse only on a disposable, empty rehearsal database. If player rows or
-- unexpected currency references/data exist, refuse rather than lose state.
DO $m001_down_guard$
DECLARE
  observed_currency_rows text[];
BEGIN
  IF to_regclass('public.players') IS NULL OR to_regclass('public.currencies') IS NULL THEN
    RAISE EXCEPTION 'Migration 001 rollback stopped: canonical players/currencies tables are missing';
  END IF;

  IF EXISTS (SELECT 1 FROM public.players) THEN
    RAISE EXCEPTION 'Migration 001 rollback stopped: canonical players table is populated; use a reviewed forward fix';
  END IF;

  SELECT array_agg(code || ':' || decimal_places::text ORDER BY code)
    INTO observed_currency_rows
    FROM public.currencies;
  IF observed_currency_rows IS DISTINCT FROM ARRAY['EUR:2','TND:3','USD:2']::text[] THEN
    RAISE EXCEPTION 'Migration 001 rollback stopped: currencies differ from the three migration-owned seed rows; observed %',
      observed_currency_rows;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE contype = 'f'
       AND confrelid = 'public.currencies'::regclass
       AND NOT (
         conrelid = 'public.players'::regclass
         AND conname IN ('players_settlement_currency_fk','players_preferred_display_currency_fk')
       )
  ) THEN
    RAISE EXCEPTION 'Migration 001 rollback stopped: another table references currencies';
  END IF;
END
$m001_down_guard$;

ALTER TABLE public.players
  DROP CONSTRAINT players_settlement_currency_fk,
  DROP CONSTRAINT players_preferred_display_currency_fk,
  DROP CONSTRAINT players_deposit_kyc_override_requested_by_fk,
  DROP CONSTRAINT players_deposit_kyc_override_approved_by_fk,
  DROP CONSTRAINT players_date_of_birth_adult_check,
  DROP CONSTRAINT players_terms_acceptance_pair_check,
  DROP CONSTRAINT players_terms_version_nonempty_check,
  DROP CONSTRAINT players_age_confirmation_pair_check,
  DROP CONSTRAINT players_age_policy_version_nonempty_check,
  DROP CONSTRAINT players_preferred_language_nonempty_check,
  DROP CONSTRAINT players_username_pair_check,
  DROP CONSTRAINT players_username_nonempty_check,
  DROP CONSTRAINT players_username_normalized_nonempty_check,
  DROP CONSTRAINT players_phone_number_e164_check,
  DROP CONSTRAINT players_email_verification_status_check,
  DROP CONSTRAINT players_kyc_tier_check,
  DROP CONSTRAINT players_deposit_kyc_override_check,
  DROP CONSTRAINT players_permanent_kyc_waiver_approval_check,
  DROP CONSTRAINT players_kyc_override_set_at_pair_check;

DROP INDEX public.players_username_normalized_uidx;
DROP INDEX public.players_phone_number_e164_uidx;

ALTER TABLE public.players
  DROP COLUMN date_of_birth,
  DROP COLUMN terms_accepted_at,
  DROP COLUMN terms_version,
  DROP COLUMN age_confirmation_at,
  DROP COLUMN age_policy_version,
  DROP COLUMN preferred_language,
  DROP COLUMN username,
  DROP COLUMN username_normalized,
  DROP COLUMN phone_number_e164,
  DROP COLUMN email_verification_status,
  DROP COLUMN kyc_tier,
  DROP COLUMN kyc_lock,
  DROP COLUMN kyc_lock_reason,
  DROP COLUMN deposit_kyc_override,
  DROP COLUMN deposit_kyc_override_expires_at,
  DROP COLUMN deposit_kyc_override_reason,
  DROP COLUMN deposit_kyc_override_requested_by,
  DROP COLUMN deposit_kyc_override_approved_by,
  DROP COLUMN deposit_kyc_override_set_at;

DROP TABLE public.currencies RESTRICT;

ALTER TABLE public.admin_role_assignments RENAME TO identity_admin_account_roles;
ALTER TABLE public.role_permissions RENAME TO identity_admin_role_permissions;
ALTER TABLE public.permissions RENAME TO identity_admin_permissions;
ALTER TABLE public.roles RENAME TO identity_admin_roles;
ALTER TABLE public.audit_events RENAME TO identity_security_audit_events;
ALTER TABLE public.rate_limits RENAME TO identity_rate_limits;
ALTER TABLE public.player_one_time_tokens RENAME TO identity_one_time_tokens;
ALTER TABLE public.admin_mfa_recovery_codes RENAME TO identity_admin_recovery_codes;
ALTER TABLE public.admin_mfa_challenges RENAME TO identity_admin_auth_challenges;
ALTER TABLE public.auth_sessions RENAME TO identity_sessions;
ALTER TABLE public.admin_users RENAME TO identity_admins;
ALTER TABLE public.players RENAME TO identity_players;
