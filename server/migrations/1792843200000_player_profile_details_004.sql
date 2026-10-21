-- Up Migration
-- Migration 004: add a stable public player number and editable personal profile fields.
-- The UUID players.id remains the internal primary key. The public number is a separate,
-- immutable sequence-backed identifier intended for display/support use.
DO $m004_preconditions$
DECLARE
  observed_migrations text[];
BEGIN
  IF to_regclass('public.pgmigrations') IS NULL THEN
    RAISE EXCEPTION 'Migration 004 stopped: public.pgmigrations is missing';
  END IF;

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
    RAISE EXCEPTION 'Migration 004 stopped: migration history is not the approved five-migration baseline; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.players') IS NULL
     OR to_regclass('public.player_profiles') IS NULL
     OR to_regclass('public.player_credentials') IS NULL THEN
    RAISE EXCEPTION 'Migration 004 stopped: expected player, profile, and credential tables are missing';
  END IF;

  IF to_regclass('public.player_public_number_seq') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='players'
          AND column_name IN ('player_number','first_name','last_name','gender','city','address','postal_code')
     ) THEN
    RAISE EXCEPTION 'Migration 004 stopped: one or more target sequence/columns already exist';
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='players' AND column_name='country_code'
     )
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='players' AND column_name='phone_number_e164'
     ) THEN
    RAISE EXCEPTION 'Migration 004 stopped: country_code or phone_number_e164 is missing from the reviewed players schema';
  END IF;
END
$m004_preconditions$;

CREATE SEQUENCE public.player_public_number_seq
  AS bigint START WITH 436222976 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER TABLE public.players
  ADD COLUMN player_number bigint,
  ADD COLUMN first_name text,
  ADD COLUMN last_name text,
  ADD COLUMN gender text,
  ADD COLUMN city text,
  ADD COLUMN address text,
  ADD COLUMN postal_code text;

-- Assign deterministic public numbers to existing players in creation order.
-- The concrete example provided by the product owner begins at 436222976 (9 digits).
WITH numbered_players AS (
  SELECT id, 436222975::bigint + row_number() OVER (ORDER BY created_at, id) AS assigned_number
    FROM public.players
)
UPDATE public.players AS p
   SET player_number = n.assigned_number
  FROM numbered_players AS n
 WHERE p.id = n.id;

SELECT setval(
  'public.player_public_number_seq',
  COALESCE((SELECT max(player_number) FROM public.players), 436222975::bigint),
  true
);

ALTER TABLE public.players
  ALTER COLUMN player_number SET DEFAULT nextval('public.player_public_number_seq'),
  ALTER COLUMN player_number SET NOT NULL,
  ADD CONSTRAINT players_player_number_key UNIQUE (player_number),
  ADD CONSTRAINT players_first_name_length_check CHECK (first_name IS NULL OR length(btrim(first_name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT players_last_name_length_check CHECK (last_name IS NULL OR length(btrim(last_name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT players_gender_check CHECK (gender IS NULL OR gender IN ('female','male','other','prefer_not_to_say')),
  ADD CONSTRAINT players_city_length_check CHECK (city IS NULL OR length(btrim(city)) BETWEEN 1 AND 120),
  ADD CONSTRAINT players_address_length_check CHECK (address IS NULL OR length(btrim(address)) BETWEEN 1 AND 250),
  ADD CONSTRAINT players_postal_code_length_check CHECK (postal_code IS NULL OR length(btrim(postal_code)) BETWEEN 1 AND 20);

-- Keep the Migration 003 compatibility mirrors complete for any accounts created
-- after that migration was first applied. Never log or transform password hashes.
INSERT INTO public.player_profiles (player_id, display_name, created_at, updated_at)
SELECT id, display_name, created_at, updated_at
  FROM public.players
ON CONFLICT (player_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;

INSERT INTO public.player_credentials
  (player_id, kind, identifier, identifier_norm, password_hash, password_changed_at, created_at, updated_at)
SELECT id, 'email_password', email, email_normalized, password_hash, NULL, created_at, updated_at
  FROM public.players
ON CONFLICT (player_id, kind) DO UPDATE
  SET identifier = EXCLUDED.identifier,
      identifier_norm = EXCLUDED.identifier_norm,
      password_hash = EXCLUDED.password_hash,
      updated_at = EXCLUDED.updated_at;

DO $m004_postconditions$
DECLARE
  player_count bigint;
  profile_count bigint;
  credential_count bigint;
  invalid_number_count bigint;
BEGIN
  SELECT count(*) INTO player_count FROM public.players;
  SELECT count(*) INTO profile_count FROM public.player_profiles;
  SELECT count(*) INTO credential_count FROM public.player_credentials;

  IF player_count <> profile_count OR player_count <> credential_count THEN
    RAISE EXCEPTION 'Migration 004 stopped: player/profile/credential row counts differ (%, %, %)',
      player_count, profile_count, credential_count;
  END IF;

  SELECT count(*) INTO invalid_number_count
    FROM public.players
   WHERE player_number IS NULL OR player_number < 436222976;
  IF invalid_number_count <> 0 THEN
    RAISE EXCEPTION 'Migration 004 stopped: % players have invalid public numbers', invalid_number_count;
  END IF;

  IF (SELECT count(DISTINCT player_number) FROM public.players) <> player_count THEN
    RAISE EXCEPTION 'Migration 004 stopped: public player numbers are not unique';
  END IF;
END
$m004_postconditions$;

-- Down Migration
-- Do not silently remove public IDs or user-entered profile information.
DO $m004_down_guard$
DECLARE
  observed_migrations text[];
BEGIN
  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions',
    '1792584000000_identity_domain_migration_001',
    '1792670400000_identity_sessions_split_002',
    '1792756800000_identity_player_credentials_003',
    '1792843200000_player_profile_details_004'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 004 rollback stopped: migration history differs from the approved six-migration state; observed %',
      observed_migrations;
  END IF;

  IF EXISTS (SELECT 1 FROM public.players WHERE player_number IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.players WHERE first_name IS NOT NULL OR last_name IS NOT NULL OR gender IS NOT NULL OR city IS NOT NULL OR address IS NOT NULL OR postal_code IS NOT NULL) THEN
    RAISE EXCEPTION 'Migration 004 rollback stopped: public player numbers or saved profile details exist; preserve this user data and add a forward migration instead';
  END IF;
END
$m004_down_guard$;

ALTER TABLE public.players
  DROP CONSTRAINT players_player_number_key,
  DROP CONSTRAINT players_first_name_length_check,
  DROP CONSTRAINT players_last_name_length_check,
  DROP CONSTRAINT players_gender_check,
  DROP CONSTRAINT players_city_length_check,
  DROP CONSTRAINT players_address_length_check,
  DROP CONSTRAINT players_postal_code_length_check,
  DROP COLUMN player_number,
  DROP COLUMN first_name,
  DROP COLUMN last_name,
  DROP COLUMN gender,
  DROP COLUMN city,
  DROP COLUMN address,
  DROP COLUMN postal_code;

DROP SEQUENCE public.player_public_number_seq;
