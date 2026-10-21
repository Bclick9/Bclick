-- Up Migration
-- Migration 002: split the polymorphic session store by principal type.
-- This migration deliberately refuses non-empty auth_sessions. Current verified
-- baseline is 0 sessions; do not infer a principal mapping or silently discard sessions.
DO $m002_preconditions$
DECLARE
  observed_migrations text[];
BEGIN
  IF to_regclass('public.pgmigrations') IS NULL THEN
    RAISE EXCEPTION 'Migration 002 stopped: public.pgmigrations is missing';
  END IF;

  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions',
    '1792584000000_identity_domain_migration_001'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 002 stopped: migration history is not the approved three-migration baseline; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.players') IS NULL OR to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION 'Migration 002 stopped: canonical player/admin parent tables are missing';
  END IF;
  IF to_regclass('public.auth_sessions') IS NULL THEN
    RAISE EXCEPTION 'Migration 002 stopped: source public.auth_sessions is missing';
  END IF;

  -- Hold an exclusive table lock from the emptiness check through DROP TABLE.
  -- This prevents a concurrent login from inserting a session after the check.
  LOCK TABLE public.auth_sessions IN ACCESS EXCLUSIVE MODE;

  IF to_regclass('public.player_sessions') IS NOT NULL
     OR to_regclass('public.admin_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 002 stopped: one or both destination session tables already exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'auth_sessions' AND column_name = 'principal_type'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'auth_sessions' AND column_name = 'principal_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'auth_sessions' AND column_name = 'mfa_verified'
  ) THEN
    RAISE EXCEPTION 'Migration 002 stopped: auth_sessions does not match the reviewed polymorphic source schema';
  END IF;
  IF (SELECT count(*) FROM public.auth_sessions) <> 0 THEN
    RAISE EXCEPTION 'Migration 002 stopped: auth_sessions is not empty; record and approve a separate explicit session-transfer plan';
  END IF;
END
$m002_preconditions$;

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
CREATE INDEX player_sessions_player_idx
  ON public.player_sessions(player_id, authenticated_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX player_sessions_expiry_idx
  ON public.player_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  authenticated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  -- This table represents fully authenticated admin sessions, not password-only
  -- or MFA-enrollment challenges. Those remain in their dedicated challenge tables.
  mfa_verified boolean NOT NULL CHECK (mfa_verified IS TRUE),
  CHECK (expires_at > created_at)
);
CREATE INDEX admin_sessions_admin_idx
  ON public.admin_sessions(admin_id, authenticated_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX admin_sessions_expiry_idx
  ON public.admin_sessions(expires_at)
  WHERE revoked_at IS NULL;

-- The precondition above proves the mixed source has no session rows. There is
-- intentionally no automatic INSERT/SELECT routing: a non-empty source aborts.
DROP TABLE public.auth_sessions RESTRICT;

-- Down Migration
-- Safe rollback is limited to the empty split tables. Refuse if either contains
-- a live or revoked record so rollback can never discard session history.
DO $m002_down_guard$
DECLARE
  observed_migrations text[];
BEGIN
  IF to_regclass('public.auth_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 002 rollback stopped: auth_sessions already exists';
  END IF;
  IF to_regclass('public.player_sessions') IS NULL
     OR to_regclass('public.admin_sessions') IS NULL THEN
    RAISE EXCEPTION 'Migration 002 rollback stopped: one or both split session tables are missing';
  END IF;

  -- Prevent concurrent session issuance while rollback checks both tables.
  LOCK TABLE public.player_sessions, public.admin_sessions IN ACCESS EXCLUSIVE MODE;

  SELECT array_agg(name::text ORDER BY name)
    INTO observed_migrations
    FROM public.pgmigrations;
  IF observed_migrations IS DISTINCT FROM ARRAY[
    '1792497600000_api_skeleton_baseline',
    '1792512000000_identity_sessions',
    '1792584000000_identity_domain_migration_001',
    '1792670400000_identity_sessions_split_002'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 002 rollback stopped: migration history differs from the approved four-migration state; observed %',
      observed_migrations;
  END IF;

  IF EXISTS (SELECT 1 FROM public.player_sessions) THEN
    RAISE EXCEPTION 'Migration 002 rollback stopped: player_sessions contains records; no session data was removed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_sessions) THEN
    RAISE EXCEPTION 'Migration 002 rollback stopped: admin_sessions contains records; no session data was removed';
  END IF;
END
$m002_down_guard$;

CREATE TABLE public.auth_sessions (
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
CREATE INDEX auth_sessions_principal_idx
  ON public.auth_sessions(principal_type,principal_id)
  WHERE revoked_at IS NULL;
CREATE INDEX auth_sessions_expiry_idx
  ON public.auth_sessions(expires_at)
  WHERE revoked_at IS NULL;

DROP TABLE public.admin_sessions RESTRICT;
DROP TABLE public.player_sessions RESTRICT;
