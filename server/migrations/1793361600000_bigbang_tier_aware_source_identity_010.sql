-- Up Migration
-- Migration 010: include provider tier in BigBang source identity before any Premium import.
-- This is schema readiness only; it does not enable a Premium client or live-key sync.
DO $m010_preconditions$
BEGIN
  IF to_regclass('public.casino_game_sources') IS NULL THEN
    RAISE EXCEPTION 'Migration 010 stopped: the Phase 6 source table is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.casino_game_sources'::regclass
       AND conname='casino_game_sources_source_external_key'
       AND contype='u'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.casino_game_sources'::regclass
       AND conname='casino_game_sources_source_game_key'
       AND contype='u'
  ) THEN
    RAISE EXCEPTION 'Migration 010 stopped: the reviewed tier-blind source constraints are not present';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.casino_game_sources
     WHERE is_premium IS DISTINCT FROM (source_mode='premium')
  ) THEN
    RAISE EXCEPTION 'Migration 010 stopped: source_mode and is_premium disagree on existing rows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.casino_game_sources
     GROUP BY source_code,source_mode,external_game_id
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.casino_game_sources
     GROUP BY source_code,source_mode,game_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 010 stopped: existing rows conflict with the intended tier-aware identity';
  END IF;
END
$m010_preconditions$;

ALTER TABLE public.casino_game_sources
  DROP CONSTRAINT casino_game_sources_source_external_key;
ALTER TABLE public.casino_game_sources
  DROP CONSTRAINT casino_game_sources_source_game_key;

ALTER TABLE public.casino_game_sources
  ADD CONSTRAINT casino_game_sources_source_mode_external_key
    UNIQUE (source_code,source_mode,external_game_id),
  ADD CONSTRAINT casino_game_sources_source_mode_game_key
    UNIQUE (source_code,source_mode,game_id),
  ADD CONSTRAINT casino_game_sources_source_mode_premium_check
    CHECK (is_premium = (source_mode='premium'));

CREATE INDEX casino_game_sources_mode_available_idx
  ON public.casino_game_sources(source_code,source_mode,available,external_game_id);

-- Down Migration
-- Restore the former uniqueness only if no tier-distinct identity would collide.
DO $m010_down_preconditions$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.casino_game_sources
     GROUP BY source_code,external_game_id
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.casino_game_sources
     GROUP BY source_code,game_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 010 rollback refused: tier-distinct source rows would collide under the former identity keys';
  END IF;
END
$m010_down_preconditions$;

DROP INDEX public.casino_game_sources_mode_available_idx;

ALTER TABLE public.casino_game_sources
  DROP CONSTRAINT casino_game_sources_source_mode_external_key,
  DROP CONSTRAINT casino_game_sources_source_mode_game_key,
  DROP CONSTRAINT casino_game_sources_source_mode_premium_check;

ALTER TABLE public.casino_game_sources
  ADD CONSTRAINT casino_game_sources_source_external_key
    UNIQUE (source_code,external_game_id),
  ADD CONSTRAINT casino_game_sources_source_game_key
    UNIQUE (source_code,game_id);
