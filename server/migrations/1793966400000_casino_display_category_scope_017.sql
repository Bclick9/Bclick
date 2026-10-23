-- Up Migration
-- Migration 017: scope Bclick-managed storefront categories to a game type.
-- Existing categories default to Casino to preserve all current Lobby/category behavior.
DO $m017_preconditions$
BEGIN
  IF to_regclass('public.casino_display_categories') IS NULL THEN
    RAISE EXCEPTION 'Migration 017 stopped: curated display categories from Migration 015 are required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='casino_display_categories' AND column_name='category_type'
  ) THEN
    RAISE EXCEPTION 'Migration 017 stopped: category_type already exists; inspect migration history';
  END IF;
END
$m017_preconditions$;

ALTER TABLE public.casino_display_categories
  ADD COLUMN category_type text NOT NULL DEFAULT 'casino'
  CHECK (category_type IN ('casino','live-casino','crash-games'));

CREATE INDEX casino_display_categories_type_visible_order_idx
  ON public.casino_display_categories(category_type,visible,display_order,created_at,id);

COMMENT ON COLUMN public.casino_display_categories.category_type IS
  'Bclick storefront game-type scope: casino (normalized slot games), live-casino (live tables), or crash-games. Existing categories are preserved as casino.';

-- Down Migration
-- Category scope becomes operator-authored routing configuration after it is edited.
-- Refuse automatic rollback rather than discard those decisions.
DO $m017_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 017 rollback refused: preserve operator-selected category scopes; use a reviewed forward migration';
END
$m017_no_unsafe_rollback$;

DROP INDEX public.casino_display_categories_type_visible_order_idx;
ALTER TABLE public.casino_display_categories DROP CONSTRAINT casino_display_categories_category_type_check;
ALTER TABLE public.casino_display_categories DROP COLUMN category_type;
