-- Up Migration
-- Migration 013: editable player-facing title overrides for canonical game UUIDs.
-- Do not mutate provider-owned titles, external IDs, slugs, tier identity, or catalogue sync inputs.
DO $m013_preconditions$
BEGIN
  IF to_regclass('public.casino_game_presentation') IS NULL
     OR to_regclass('public.casino_games') IS NULL
     OR to_regclass('public.casino_game_sources') IS NULL
     OR to_regclass('public.audit_events') IS NULL
     OR to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION 'Migration 013 stopped: Skin Games presentation, source catalogue and audit tables are required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='casino_game_presentation' AND column_name='title_override'
  ) THEN
    RAISE EXCEPTION 'Migration 013 stopped: title_override already exists; inspect schema history rather than guessing';
  END IF;
END
$m013_preconditions$;

ALTER TABLE public.casino_game_presentation
  ADD COLUMN title_override text
  CHECK (title_override IS NULL OR length(btrim(title_override)) BETWEEN 1 AND 120);

COMMENT ON COLUMN public.casino_game_presentation.title_override IS
  'Optional Bclick-facing title override. NULL uses the provider/catalogue source title; never used as game identity or sync key.';

-- Down Migration
-- Player-facing titles are operator-owned presentation state; preserve them via forward migration.
DO $m013_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 013 rollback refused: preserve audited player-facing title overrides; use a reviewed forward migration';
END
$m013_no_unsafe_rollback$;

ALTER TABLE public.casino_game_presentation DROP COLUMN title_override;
