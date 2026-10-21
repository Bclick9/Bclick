-- Up Migration
-- Migration 003 (CI rehearsal candidate): expand player profile/credential storage.
-- Never drop or rewrite the legacy players columns in this migration. The current
-- IdentityService still reads/writes them; the new tables are exact, verifiable
-- mirrors until a separately tested application cutover is approved.
DO $m003_preconditions$
DECLARE
  observed_migrations text[];
  player_count bigint;
BEGIN
  IF to_regclass('public.pgmigrations') IS NULL THEN
    RAISE EXCEPTION 'Migration 003 stopped: public.pgmigrations is missing';
  END IF;

  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions',
    '1792584000000_identity_domain_migration_001',
    '1792670400000_identity_sessions_split_002'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 003 stopped: migration history is not the approved four-migration baseline; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.players') IS NULL
     OR to_regclass('public.player_sessions') IS NULL
     OR to_regclass('public.admin_sessions') IS NULL THEN
    RAISE EXCEPTION 'Migration 003 stopped: expected canonical player/session tables are missing';
  END IF;

  IF to_regclass('public.player_profiles') IS NOT NULL
     OR to_regclass('public.player_credentials') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 003 stopped: destination profile/credential tables already exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'players'
       AND column_name = 'age_confirmed_at'
  ) THEN
    RAISE EXCEPTION 'Migration 003 stopped: players.age_confirmed_at already exists';
  END IF;

  -- These fields were added earlier by the implemented Migration 001. Do not
  -- add duplicate v2/KYC columns. This gate ensures this migration's source
  -- schema still has the reviewed names and invariants.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='date_of_birth'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='terms_accepted_at'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='age_confirmation_at'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='preferred_language'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='kyc_tier'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='kyc_lock'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='deposit_kyc_override'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='deposit_kyc_override_expires_at'
  ) THEN
    RAISE EXCEPTION 'Migration 003 stopped: existing v2/KYC source columns differ from the reviewed Migration 001 schema';
  END IF;

  SELECT count(*) INTO player_count FROM public.players;
  IF EXISTS (
    SELECT 1
      FROM public.players
     WHERE email IS NULL
        OR btrim(email) = ''
        OR email_normalized IS NULL
        OR email_normalized <> lower(btrim(email))
        OR password_hash IS NULL
        OR btrim(password_hash) = ''
        OR display_name IS NULL
        OR btrim(display_name) = ''
  ) THEN
    RAISE EXCEPTION 'Migration 003 stopped: player profile/credential source contains blank or non-normalized values';
  END IF;

  IF (SELECT count(DISTINCT email_normalized) FROM public.players) <> player_count THEN
    RAISE EXCEPTION 'Migration 003 stopped: normalized email identifiers are not unique';
  END IF;
END
$m003_preconditions$;

-- The existing schema already carries display_name and player metadata on
-- players. Add one-to-one normalized profile/credential targets without
-- destructively removing source fields during the expand stage.
CREATE TABLE public.player_profiles (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE public.player_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('email_password')),
  identifier text NOT NULL CHECK (length(btrim(identifier)) BETWEEN 3 AND 254),
  identifier_norm text NOT NULL CHECK (identifier_norm = lower(btrim(identifier))),
  password_hash text NOT NULL CHECK (length(btrim(password_hash)) > 0),
  -- The legacy schema does not record password-change time separately. Leave
  -- it NULL instead of inferring a password reset from players.updated_at.
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT player_credentials_player_kind_key UNIQUE (player_id, kind),
  CONSTRAINT player_credentials_kind_identifier_norm_key UNIQUE (kind, identifier_norm)
);

CREATE INDEX player_credentials_player_idx
  ON public.player_credentials(player_id);

-- Exact data copy: do not re-hash, normalize, print or otherwise change hashes.
INSERT INTO public.player_profiles (player_id, display_name, created_at, updated_at)
SELECT id, display_name, created_at, updated_at
  FROM public.players;

INSERT INTO public.player_credentials
  (player_id, kind, identifier, identifier_norm, password_hash, password_changed_at, created_at, updated_at)
SELECT id, 'email_password', email, email_normalized, password_hash, NULL, created_at, created_at
  FROM public.players;

-- Compatibility name requested by the v2 domain vocabulary. Keep the existing
-- age_confirmation_at source used by the current server and expose its value
-- as a generated, read-only alias until an explicitly reviewed code cutover.
ALTER TABLE public.players
  ADD COLUMN age_confirmed_at timestamptz
  GENERATED ALWAYS AS (age_confirmation_at) STORED;

DO $m003_postconditions$
DECLARE
  source_count bigint;
  profile_count bigint;
  credential_count bigint;
  mismatch_count bigint;
BEGIN
  SELECT count(*) INTO source_count FROM public.players;
  SELECT count(*) INTO profile_count FROM public.player_profiles;
  SELECT count(*) INTO credential_count FROM public.player_credentials;

  IF profile_count <> source_count OR credential_count <> source_count THEN
    RAISE EXCEPTION 'Migration 003 stopped: row counts differ (players %, profiles %, credentials %)',
      source_count, profile_count, credential_count;
  END IF;

  SELECT count(*) INTO mismatch_count
    FROM public.players p
    LEFT JOIN public.player_profiles pp ON pp.player_id = p.id
    LEFT JOIN public.player_credentials pc ON pc.player_id = p.id AND pc.kind = 'email_password'
   WHERE pp.player_id IS NULL
      OR pp.display_name IS DISTINCT FROM p.display_name
      OR pp.created_at IS DISTINCT FROM p.created_at
      OR pp.updated_at IS DISTINCT FROM p.updated_at
      OR pc.player_id IS NULL
      OR pc.identifier IS DISTINCT FROM p.email
      OR pc.identifier_norm IS DISTINCT FROM p.email_normalized
      OR pc.password_hash IS DISTINCT FROM p.password_hash
      OR pc.password_changed_at IS NOT NULL;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Migration 003 stopped: % profile/credential rows do not exactly match their legacy sources',
      mismatch_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.players
     WHERE age_confirmed_at IS DISTINCT FROM age_confirmation_at
  ) THEN
    RAISE EXCEPTION 'Migration 003 stopped: age_confirmed_at compatibility alias differs from age_confirmation_at';
  END IF;
END
$m003_postconditions$;

-- Down Migration
-- Safe rollback only while the new tables remain exact mirrors. If credentials
-- or profiles have been independently changed, fail closed instead of dropping
-- the only copy of newer information. Legacy source columns remain in place.
DO $m003_down_guard$
DECLARE
  observed_migrations text[];
  player_count bigint;
  profile_count bigint;
  credential_count bigint;
  mismatch_count bigint;
BEGIN
  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions',
    '1792584000000_identity_domain_migration_001',
    '1792670400000_identity_sessions_split_002',
    '1792756800000_identity_player_credentials_003'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 003 rollback stopped: migration history differs from the approved five-migration state; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.player_profiles') IS NULL
     OR to_regclass('public.player_credentials') IS NULL THEN
    RAISE EXCEPTION 'Migration 003 rollback stopped: one or both target tables are missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='players' AND column_name='age_confirmed_at'
       AND is_generated='ALWAYS'
  ) THEN
    RAISE EXCEPTION 'Migration 003 rollback stopped: expected generated age_confirmed_at alias is missing';
  END IF;

  SELECT count(*) INTO player_count FROM public.players;
  SELECT count(*) INTO profile_count FROM public.player_profiles;
  SELECT count(*) INTO credential_count FROM public.player_credentials;
  IF profile_count <> player_count OR credential_count <> player_count THEN
    RAISE EXCEPTION 'Migration 003 rollback stopped: new tables are not one-to-one mirrors of players (players %, profiles %, credentials %)',
      player_count, profile_count, credential_count;
  END IF;

  SELECT count(*) INTO mismatch_count
    FROM public.players p
    LEFT JOIN public.player_profiles pp ON pp.player_id = p.id
    LEFT JOIN public.player_credentials pc ON pc.player_id = p.id AND pc.kind = 'email_password'
   WHERE pp.player_id IS NULL
      OR pp.display_name IS DISTINCT FROM p.display_name
      OR pp.created_at IS DISTINCT FROM p.created_at
      OR pp.updated_at IS DISTINCT FROM p.updated_at
      OR pc.player_id IS NULL
      OR pc.identifier IS DISTINCT FROM p.email
      OR pc.identifier_norm IS DISTINCT FROM p.email_normalized
      OR pc.password_hash IS DISTINCT FROM p.password_hash
      OR pc.password_changed_at IS NOT NULL;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Migration 003 rollback stopped: % credential/profile rows differ from legacy source; no tables were dropped',
      mismatch_count;
  END IF;
END
$m003_down_guard$;

DROP TABLE public.player_credentials RESTRICT;
DROP TABLE public.player_profiles RESTRICT;
ALTER TABLE public.players DROP COLUMN age_confirmed_at;
