-- Up Migration
-- Migration 005: reconcile local public player numbers created by the earlier
-- version of Migration 004 with the approved starting value of 100000000.
-- Preserve account order; gaps from deleted test accounts must not block a safe rebase.
DO $m005_reconcile$
DECLARE
  observed_migrations text[];
  player_count bigint;
  min_number bigint;
  max_number bigint;
  distinct_numbers bigint;
  sequence_last_value bigint;
  sequence_is_called boolean;
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
    RAISE EXCEPTION 'Migration 005 stopped: migration history differs from the approved six-migration state; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.players') IS NULL
     OR to_regclass('public.player_public_number_seq') IS NULL THEN
    RAISE EXCEPTION 'Migration 005 stopped: players table or public player-number sequence is missing';
  END IF;

  SELECT last_value, is_called
    INTO sequence_last_value, sequence_is_called
    FROM public.player_public_number_seq;

  SELECT count(*), min(player_number), max(player_number), count(DISTINCT player_number)
    INTO player_count, min_number, max_number, distinct_numbers
    FROM public.players;

  IF player_count = 0 THEN
    -- Migration 004 creates an empty sequence just below the approved start.
    -- Do not reset a sequence that had already issued numbers to now-deleted players.
    IF sequence_last_value <> 99999999 OR NOT sequence_is_called THEN
      RAISE EXCEPTION 'Migration 005 stopped: no players exist but the public ID sequence is not in the pristine empty state (last_value %, is_called %)',
        sequence_last_value, sequence_is_called;
    END IF;
    PERFORM setval('public.player_public_number_seq', 99999999::bigint, true);

  ELSIF min_number = 436222976
        AND distinct_numbers = player_count
        AND sequence_is_called
        AND sequence_last_value >= max_number THEN
    -- Legacy local databases used a sequence starting at 436222976. Deleted
    -- accounts can leave gaps, so require a unique legacy-range set that is
    -- covered by its own sequence, not a contiguous min/max span.
    -- Compact remaining legacy IDs in their previous relative order.
    WITH ordered_players AS (
      SELECT id, 99999999::bigint + row_number() OVER (ORDER BY player_number, id) AS corrected_number
        FROM public.players
    )
    UPDATE public.players AS p
       SET player_number = o.corrected_number
      FROM ordered_players AS o
     WHERE p.id = o.id;

    PERFORM setval(
      'public.player_public_number_seq',
      (SELECT max(player_number) FROM public.players),
      true
    );

  ELSIF min_number >= 100000000
        AND distinct_numbers = player_count
        AND sequence_is_called
        AND sequence_last_value >= max_number THEN
    -- IDs already in the approved namespace are never renumbered. Keep the
    -- sequence at or above its prior high-water mark so deleted IDs are not reused.
    PERFORM setval(
      'public.player_public_number_seq',
      GREATEST(sequence_last_value, max_number),
      true
    );

  ELSE
    RAISE EXCEPTION 'Migration 005 stopped: public IDs and sequence are not a recognized legacy or approved state; count %, min %, max %, distinct %, sequence last_value %, is_called %',
      player_count, min_number, max_number, distinct_numbers, sequence_last_value, sequence_is_called;
  END IF;

  SELECT count(*), min(player_number), max(player_number), count(DISTINCT player_number)
    INTO player_count, min_number, max_number, distinct_numbers
    FROM public.players;

  SELECT last_value, is_called
    INTO sequence_last_value, sequence_is_called
    FROM public.player_public_number_seq;

  IF player_count > 0
     AND (min_number < 100000000
          OR distinct_numbers <> player_count
          OR NOT sequence_is_called
          OR sequence_last_value < max_number) THEN
    RAISE EXCEPTION 'Migration 005 stopped: public player ID postcondition failed (count %, min %, max %, distinct %, sequence last_value %, is_called %)',
      player_count, min_number, max_number, distinct_numbers, sequence_last_value, sequence_is_called;
  END IF;
END
$m005_reconcile$;

-- Down Migration
-- Deliberately refuse rollback: public player numbers are identifiers that may
-- already have been shown to players. Use a separately reviewed forward migration.
DO $m005_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 005 rollback refused: preserve public player IDs; use a reviewed forward migration';
END
$m005_no_unsafe_rollback$;
