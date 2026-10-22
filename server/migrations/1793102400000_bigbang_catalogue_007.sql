-- Up Migration
-- Phase 6: local BigBang catalogue snapshots. No launch or wallet operation is enabled.
DO $phase6_preconditions$
BEGIN
  IF to_regclass('public.wallet_accounts') IS NULL
     OR to_regclass('public.journal_transactions') IS NULL
     OR to_regclass('public.ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'Phase 6 catalogue migration requires the approved wallet-ledger foundation (Migration 006)';
  END IF;
END
$phase6_preconditions$;

CREATE TABLE public.casino_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.casino_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_slug text NOT NULL UNIQUE
    CHECK (length(game_slug) BETWEEN 1 AND 120 AND game_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  provider_id uuid NOT NULL REFERENCES public.casino_providers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  image_url text,
  game_type text NOT NULL CHECK (game_type IN ('slot','live','crash')),
  available boolean NOT NULL DEFAULT false,
  demo_available boolean NOT NULL DEFAULT false,
  real_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX casino_games_available_title_idx
  ON public.casino_games(title, id) WHERE available = true;
CREATE INDEX casino_games_provider_available_idx
  ON public.casino_games(provider_id, title, id) WHERE available = true;

CREATE TABLE public.casino_game_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.casino_games(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source_code text NOT NULL CHECK (source_code = 'bigbang'),
  external_game_id bigint NOT NULL CHECK (external_game_id > 0),
  launch_name text NOT NULL CHECK (length(btrim(launch_name)) BETWEEN 1 AND 240),
  source_provider_name text NOT NULL CHECK (length(btrim(source_provider_name)) BETWEEN 1 AND 160),
  source_category text,
  source_category_title text,
  source_mode text NOT NULL CHECK (source_mode IN ('standard','premium')),
  is_premium boolean NOT NULL,
  source_is_demo boolean NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('slot','live','crash')),
  available boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT casino_game_sources_source_external_key UNIQUE (source_code, external_game_id),
  CONSTRAINT casino_game_sources_source_game_key UNIQUE (source_code, game_id)
);

CREATE INDEX casino_game_sources_available_idx
  ON public.casino_game_sources(source_code, available, external_game_id);

CREATE TABLE public.casino_game_categories (
  game_id uuid NOT NULL REFERENCES public.casino_games(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  category_slug text NOT NULL
    CHECK (length(category_slug) BETWEEN 1 AND 80 AND category_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, category_slug)
);
CREATE INDEX casino_game_categories_slug_game_idx
  ON public.casino_game_categories(category_slug, game_id);

CREATE TABLE public.casino_catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL CHECK (source_code = 'bigbang'),
  status text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_reported integer CHECK (total_reported IS NULL OR total_reported >= 0),
  received_count integer NOT NULL DEFAULT 0 CHECK (received_count >= 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  error_code text CHECK (error_code IS NULL OR error_code ~ '^[A-Z0-9_]{1,80}$'),
  CHECK (
    (status = 'running' AND completed_at IS NULL)
    OR (status IN ('succeeded','failed') AND completed_at IS NOT NULL)
  )
);
CREATE INDEX casino_catalog_sync_runs_latest_idx
  ON public.casino_catalog_sync_runs(source_code, started_at DESC, id DESC);

-- Down Migration
DROP TABLE public.casino_catalog_sync_runs;
DROP TABLE public.casino_game_categories;
DROP TABLE public.casino_game_sources;
DROP TABLE public.casino_games;
DROP TABLE public.casino_providers;
