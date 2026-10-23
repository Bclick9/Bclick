-- Up Migration
-- Migration 015: operator-managed curated casino display categories.
-- These collections are separate from provider-owned casino_game_categories.
DO $m015_preconditions$
BEGIN
  IF to_regclass('public.casino_games') IS NULL
     OR to_regclass('public.casino_game_sources') IS NULL
     OR to_regclass('public.casino_game_presentation') IS NULL
     OR to_regclass('public.admin_users') IS NULL
     OR to_regclass('public.audit_events') IS NULL THEN
    RAISE EXCEPTION 'Migration 015 stopped: canonical catalogue, game presentation and admin audit schema are required';
  END IF;

  IF to_regclass('public.casino_display_categories') IS NOT NULL
     OR to_regclass('public.casino_game_display_categories') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 015 stopped: curated display category tables already exist; inspect schema history';
  END IF;
END
$m015_preconditions$;

CREATE TABLE public.casino_display_categories (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 100),
  name text NOT NULL
    CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT ''
    CHECK (length(description) <= 500),
  icon text NOT NULL DEFAULT 'sparkles'
    CHECK (icon IN ('layers','gamepad','sparkles','trending','clock','users','money','gift','trophy','zap')),
  visible boolean NOT NULL DEFAULT true,
  display_order bigint NOT NULL DEFAULT 100 CHECK (display_order >= 0),
  created_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX casino_display_categories_visible_order_idx
  ON public.casino_display_categories(visible,display_order,created_at,id);

CREATE TABLE public.casino_game_display_categories (
  category_id uuid NOT NULL REFERENCES public.casino_display_categories(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.casino_games(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id,game_id)
);

CREATE INDEX casino_game_display_categories_game_idx
  ON public.casino_game_display_categories(game_id,category_id);

COMMENT ON TABLE public.casino_display_categories IS
  'Bclick-owned curated storefront shelves such as Trending Games. Separate from source/provider category membership.';
COMMENT ON TABLE public.casino_game_display_categories IS
  'Operator-selected canonical game UUID membership for curated storefront shelves. Never used as provider sync identity.';

-- Down Migration
-- Curated categories and assignments are operator-authored storefront configuration.
-- Do not silently discard that configuration with an automatic rollback.
DO $m015_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 015 rollback refused: preserve operator-managed display categories and game assignments; use a reviewed forward migration';
END
$m015_no_unsafe_rollback$;

DROP TABLE public.casino_game_display_categories;
DROP TABLE public.casino_display_categories;
