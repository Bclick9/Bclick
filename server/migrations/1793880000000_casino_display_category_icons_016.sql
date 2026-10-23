-- Up Migration
-- Migration 016: persistent custom icons for Bclick-managed casino display categories.
DO $m016_preconditions$
BEGIN
  IF to_regclass('public.casino_display_categories') IS NULL THEN
    RAISE EXCEPTION 'Migration 016 stopped: curated display categories from Migration 015 are required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='casino_display_categories' AND column_name='custom_icon_key'
  ) THEN
    RAISE EXCEPTION 'Migration 016 stopped: custom_icon_key already exists; inspect migration history';
  END IF;
END
$m016_preconditions$;

ALTER TABLE public.casino_display_categories
  ADD COLUMN custom_icon_key text NULL;

ALTER TABLE public.casino_display_categories
  ADD CONSTRAINT casino_display_categories_custom_icon_key_check
  CHECK (
    custom_icon_key IS NULL OR custom_icon_key ~
    '^casino-display-categories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
  );

COMMENT ON COLUMN public.casino_display_categories.custom_icon_key IS
  'Relative key for an operator-uploaded, validated PNG/JPEG/WebP category icon in persistent Bclick upload storage. Never a remote URL.';

-- Down Migration
DO $m016_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 016 rollback refused: uploaded category icons are operator-authored persistent content; use a reviewed forward migration';
END
$m016_no_unsafe_rollback$;

ALTER TABLE public.casino_display_categories
  DROP CONSTRAINT casino_display_categories_custom_icon_key_check;
ALTER TABLE public.casino_display_categories
  DROP COLUMN custom_icon_key;
