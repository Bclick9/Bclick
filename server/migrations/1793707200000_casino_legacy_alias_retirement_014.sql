-- Up Migration
-- Migration 014: retire legacy storefront game aliases after the Owner's Q-005 decision.
-- Canonical game slugs remain resolvable; legacy aliases must not retarget to another game.
DO $m014_preconditions$
BEGIN
  IF to_regclass('public.casino_game_legacy_slug_aliases') IS NULL THEN
    RAISE EXCEPTION 'Migration 014 stopped: legacy alias inventory table is required to retire old links';
  END IF;
END
$m014_preconditions$;

DELETE FROM public.casino_game_legacy_slug_aliases;

-- Down Migration
-- The Owner's accepted decision retires these links permanently. Do not restore old aliases
-- from inferred titles/provider names; such links may target a different canonical game.
DO $m014_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 014 rollback refused: retired legacy game aliases must not be restored without new authoritative identity approval';
END
$m014_no_unsafe_rollback$;
