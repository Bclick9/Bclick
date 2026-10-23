-- Up Migration
-- Migration 012: real Skin Games presentation/order plus tier-specific provider controls.
-- This migration does not import Premium data, enable Premium launches or modify wallet paths.
DO $m012_preconditions$
BEGIN
  IF to_regclass('public.casino_providers') IS NULL
     OR to_regclass('public.casino_games') IS NULL
     OR to_regclass('public.casino_game_sources') IS NULL
     OR to_regclass('public.admin_users') IS NULL
     OR to_regclass('public.audit_events') IS NULL
     OR to_regclass('public.casino_integration_settings') IS NULL THEN
    RAISE EXCEPTION 'Migration 012 stopped: catalogue, admin audit and integration settings are required';
  END IF;

  IF to_regclass('public.casino_game_presentation') IS NOT NULL
     OR to_regclass('public.casino_provider_tier_settings') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 012 stopped: presentation/tier-control tables already exist';
  END IF;

  -- One canonical UUID represents one source-tier variant. Standard and Premium
  -- twins keep separate UUIDs, source IDs and enablement state; never merge by title.
  IF EXISTS (
    SELECT 1
      FROM public.casino_game_sources
     WHERE source_code='bigbang'
     GROUP BY game_id
    HAVING count(DISTINCT source_mode)>1
  ) THEN
    RAISE EXCEPTION 'Migration 012 stopped: a canonical game UUID is shared by multiple tiers; split and review source identity first';
  END IF;
END
$m012_preconditions$;

CREATE UNIQUE INDEX casino_game_sources_one_bigbang_tier_per_game_idx
  ON public.casino_game_sources(game_id)
  WHERE source_code='bigbang';

CREATE TABLE public.casino_provider_tier_settings (
  provider_id uuid NOT NULL REFERENCES public.casino_providers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source_code text NOT NULL CHECK (source_code='bigbang'),
  source_mode text NOT NULL CHECK (source_mode IN ('standard','premium')),
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider_id,source_code,source_mode)
);

-- Standard stays enabled to preserve current provider behavior. Any pre-existing
-- Premium source is fail-closed until integration entitlement and launch support are accepted.
INSERT INTO public.casino_provider_tier_settings(provider_id,source_code,source_mode,enabled)
SELECT DISTINCT p.id,'bigbang',s.source_mode,(s.source_mode='standard')
  FROM public.casino_providers p
  JOIN public.casino_games g ON g.provider_id=p.id
  JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
ON CONFLICT (provider_id,source_code,source_mode) DO NOTHING;

CREATE TABLE public.casino_game_presentation (
  game_id uuid PRIMARY KEY REFERENCES public.casino_games(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  description_override text CHECK (description_override IS NULL OR length(description_override)<=2000),
  custom_image_key text CHECK (
    custom_image_key IS NULL OR custom_image_key ~
      '^casino-games/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
  ),
  display_order bigint NOT NULL DEFAULT 0 CHECK (display_order>=0),
  updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  order_updated_by uuid REFERENCES public.admin_users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  order_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed an initial deterministic order by provider tier and title. BigBang's original
-- thumbnail remains the default; no image bytes or URL overrides are introduced here.
INSERT INTO public.casino_game_presentation(game_id,display_order)
SELECT g.id, (row_number() OVER (
  PARTITION BY s.source_mode
  ORDER BY lower(g.title),p.code,g.game_slug,g.id
) * 100)::bigint
  FROM public.casino_games g
  JOIN public.casino_providers p ON p.id=g.provider_id
  JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang';

CREATE INDEX casino_game_presentation_order_idx
  ON public.casino_game_presentation(display_order,game_id);
CREATE INDEX casino_provider_tier_settings_mode_idx
  ON public.casino_provider_tier_settings(source_code,source_mode,enabled,provider_id);

-- Down Migration
-- Presentation, ordering and per-tier enablement are operator-owned state. Do not
-- silently discard them or allow a tier rollback that could re-expose a source.
DO $m012_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 012 rollback refused: preserve game presentation, upload references, ordering and provider-tier state; use a reviewed forward migration';
END
$m012_no_unsafe_rollback$;

DROP INDEX public.casino_provider_tier_settings_mode_idx;
DROP INDEX public.casino_game_presentation_order_idx;
DROP TABLE public.casino_game_presentation;
DROP TABLE public.casino_provider_tier_settings;
DROP INDEX public.casino_game_sources_one_bigbang_tier_per_game_idx;
