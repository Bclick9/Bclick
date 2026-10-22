-- Up Migration
-- Migration 008: adopt the provider-compatible TND precision contract (0.01 TND).
-- The currency exponent change is safe only before any TND ledger posting exists.
-- Never rewrite prior minor-unit values implicitly.
DO $m008_preconditions$
DECLARE
  observed_migrations text[];
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
    '1792843200000_player_profile_details_004',
    '1792929600000_player_public_number_reconcile_005',
    '1793016000000_wallet_ledger_foundation_006',
    '1793102400000_bigbang_catalogue_007'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 008 stopped: migration history is not the exact approved nine-migration pre-state; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.currencies') IS NULL
     OR to_regclass('public.wallet_accounts') IS NULL
     OR to_regclass('public.account_balances') IS NULL
     OR to_regclass('public.ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'Migration 008 stopped: currency and wallet-ledger tables are required';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM (VALUES ('TND',3),('EUR',2),('USD',2)) AS expected(code, decimal_places)
      LEFT JOIN public.currencies c ON c.code=expected.code
     WHERE c.code IS NULL OR c.decimal_places <> expected.decimal_places
  ) OR (SELECT count(*) FROM public.currencies WHERE code IN ('TND','EUR','USD')) <> 3 THEN
    RAISE EXCEPTION 'Migration 008 stopped: currencies do not match the expected pre-state TND=3, EUR=2, USD=2';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.ledger_entries
     WHERE currency_code='TND'
  ) THEN
    RAISE EXCEPTION 'Migration 008 stopped: TND ledger history exists; a reviewed balance-preserving conversion is required';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.wallet_accounts wa
      JOIN public.account_balances ab ON ab.wallet_account_id=wa.id
     WHERE wa.currency_code='TND'
       AND ab.balance_minor <> 0
  ) THEN
    RAISE EXCEPTION 'Migration 008 stopped: a TND account has a non-zero projected balance; a reviewed balance-preserving conversion is required';
  END IF;
END
$m008_preconditions$;

UPDATE public.currencies
   SET decimal_places=2
 WHERE code='TND';

DO $m008_postconditions$
BEGIN
  IF (SELECT count(*) FROM public.currencies WHERE code='TND' AND decimal_places=2) <> 1
     OR (SELECT count(*) FROM public.currencies WHERE code='EUR' AND decimal_places=2) <> 1
     OR (SELECT count(*) FROM public.currencies WHERE code='USD' AND decimal_places=2) <> 1 THEN
    RAISE EXCEPTION 'Migration 008 stopped: currency exponent postcondition failed';
  END IF;
END
$m008_postconditions$;

-- Down Migration
-- Do not restore TND=3 in place; already posted cent-denominated values would
-- change meaning. Reversal requires a separately reviewed forward migration.
DO $m008_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 008 rollback refused: preserve the accepted TND=2 currency contract; use a reviewed forward migration';
END
$m008_no_unsafe_rollback$;
