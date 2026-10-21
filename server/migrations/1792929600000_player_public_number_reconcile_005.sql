-- Up Migration
-- Migration 005: reconcile public player numbers created by the earlier local
-- version of Migration 004 with the approved starting value of 100000000.
-- This preserves relative account order and refuses any unrecognized numbering state.
DO $m005_reconcile$
DECLARE
  observed_migrations text[];
  player_count bigint;
  min_number bigint;
  max_number bigint;
  distinct_numbers bigint;
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

  SELECT count(*), min(player_number), max(player_number), count(DISTINCT player_number)
    INTO player_count, min_number, max_number, distinct_numbers
    FROM public.players;

  IF player_count = 0 THEN
    -- setval(..., true) makes the next nextval return 100000000.
    PERFORM setval('public.player_public_number_seq', 99999999::bigint, true);
  ELSIF min_number = 436222976
        AND max_number - min_number + 1 = player_count
        AND distinct_numbers = player_count THEN
    -- Local databases that already applied the pre-change Migration 004 have
    -- IDs beginning at 436222976. Renumber only this exact contiguous state,
    -- preserving each account's relative public-ID order.
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
  ELSIF min_number = 100000000
        AND max_number - min_number + 1 = player_count
        AND distinct_numbers = player_count THEN
    -- Fresh databases already using the approved start need no renumbering.
    PERFORM setval(
      'public.player_public_number_seq',
      (SELECT max(player_number) FROM public.players),
      true
    );
  ELSE
    RAISE EXCEPTION 'Migration 005 stopped: public player IDs are not the exact contiguous legacy or approved sequence; count %, min %, max %, distinct %',
      player_count, min_number, max_number, distinct_numbers;
  END IF;

  SELECT count(*), min(player_number), max(player_number), count(DISTINCT player_number)
    INTO player_count, min_number, max_number, distinct_numbers
    FROM public.players;

  IF player_count > 0
     AND (min_number <> 100000000
          OR max_number <> 99999999::bigint + player_count
          OR distinct_numbers <> player_count) THEN
    RAISE EXCEPTION 'Migration 005 stopped: public player ID postcondition failed';
  END IF;
END
$m005_reconcile$;

-- Down Migration
-- Deliberately refuse rollback: public player numbers are identifiers that may
-- already have been shown to users. Use a separately reviewed forward migration.
DO $m005_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 005 rollback refused: preserve public player IDs; use a reviewed forward migration';
END
$m005_no_unsafe_rollback$;
