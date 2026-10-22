-- Up Migration
-- Migration 006: Phase 5 wallet/ledger foundation.
-- Local/disposable rehearsal only; no payment/provider routes are enabled by this schema.
DO $m006_preconditions$
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
    '1792929600000_player_public_number_reconcile_005'
  ]::text[] THEN
    RAISE EXCEPTION 'Migration 006 stopped: migration history differs from the approved seven-migration baseline; observed %',
      observed_migrations;
  END IF;

  IF to_regclass('public.players') IS NULL
     OR to_regclass('public.currencies') IS NULL THEN
    RAISE EXCEPTION 'Migration 006 stopped: canonical players/currencies tables are missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES ('TND',3),('EUR',2),('USD',2)) AS expected(code, decimal_places)
    LEFT JOIN public.currencies c ON c.code=expected.code
    WHERE c.code IS NULL OR c.decimal_places <> expected.decimal_places
  ) OR (SELECT count(*) FROM public.currencies WHERE code IN ('TND','EUR','USD')) <> 3 THEN
    RAISE EXCEPTION 'Migration 006 stopped: TND/EUR/USD currency exponents differ from approved TND=3, EUR=2, USD=2';
  END IF;

  IF to_regclass('public.wallet_accounts') IS NOT NULL
     OR to_regclass('public.account_balances') IS NOT NULL
     OR to_regclass('public.journal_transactions') IS NOT NULL
     OR to_regclass('public.ledger_entries') IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 006 stopped: one or more wallet destination tables already exist';
  END IF;
END
$m006_preconditions$;

CREATE TABLE public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('player','system')),
  owner_id uuid NOT NULL,
  player_id uuid REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  account_code text NOT NULL CHECK (length(btrim(account_code)) BETWEEN 1 AND 128),
  currency_code text NOT NULL REFERENCES public.currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  account_kind text NOT NULL CHECK (account_kind IN (
    'player-available','held','bonus-restricted',
    'provider-clearing','payment-clearing','fx-clearing','operator-bonus-clearing','operator-equity'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  status_reason text,
  status_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_accounts_owner_kind_check CHECK (
    (owner_type='player' AND player_id=owner_id
      AND account_kind IN ('player-available','held','bonus-restricted'))
    OR
    (owner_type='system' AND player_id IS NULL
      AND account_kind IN ('provider-clearing','payment-clearing','fx-clearing','operator-bonus-clearing','operator-equity'))
  ),
  CONSTRAINT wallet_accounts_id_currency_key UNIQUE (id,currency_code),
  CONSTRAINT wallet_accounts_owner_code_currency_key UNIQUE (owner_type,owner_id,account_code,currency_code)
);

CREATE INDEX wallet_accounts_player_currency_kind_idx
  ON public.wallet_accounts(player_id,currency_code,account_kind)
  WHERE player_id IS NOT NULL;

CREATE TABLE public.account_balances (
  wallet_account_id uuid PRIMARY KEY REFERENCES public.wallet_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  balance_minor bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  ledger_sequence bigint NOT NULL DEFAULT 0 CHECK (ledger_sequence >= 0)
);

CREATE TABLE public.journal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL CHECK (movement_type IN (
    'opening_balance','wallet_adjustment','internal_transfer',
    'deposit_confirmed','deposit_refund',
    'withdrawal_hold','withdrawal_settled','withdrawal_released','withdrawal_refund',
    'bet_debit','bet_stake','win_credit','bet_refund','bet_rollback',
    'provider_debit','provider_credit','provider_refund','provider_rollback',
    'bonus_grant','bonus_wagering_release','bonus_expiry','bonus_cancel','bonus_forfeit','bonus_win_credit',
    'fx_conversion'
  )),
  status text NOT NULL DEFAULT 'posted' CHECK (status='posted'),
  source_type text CHECK (source_type IS NULL OR length(btrim(source_type)) BETWEEN 1 AND 64),
  source_id text CHECK (source_id IS NULL OR length(btrim(source_id)) BETWEEN 1 AND 255),
  reference text CHECK (reference IS NULL OR length(btrim(reference)) BETWEEN 1 AND 255),
  idempotency_scope text,
  idempotency_key text,
  request_digest text,
  reversal_of_id uuid REFERENCES public.journal_transactions(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  posting_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_idempotency_pair_check CHECK (
    (idempotency_scope IS NULL) = (idempotency_key IS NULL)
    AND (idempotency_scope IS NULL) = (request_digest IS NULL)
  ),
  CONSTRAINT journal_idempotency_scope_check CHECK (idempotency_scope IS NULL OR length(btrim(idempotency_scope)) BETWEEN 1 AND 128),
  CONSTRAINT journal_idempotency_key_check CHECK (idempotency_key IS NULL OR length(btrim(idempotency_key)) BETWEEN 1 AND 128),
  CONSTRAINT journal_request_digest_check CHECK (request_digest IS NULL OR request_digest ~ '^[a-f0-9]{64}$')
);

CREATE UNIQUE INDEX journal_transactions_idempotency_key_uidx
  ON public.journal_transactions(idempotency_scope,idempotency_key);
CREATE INDEX journal_transactions_posted_id_idx
  ON public.journal_transactions(posted_at DESC,id DESC);
CREATE INDEX journal_transactions_reversal_idx
  ON public.journal_transactions(reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.journal_transactions(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  wallet_account_id uuid NOT NULL,
  currency_code text NOT NULL REFERENCES public.currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
  entry_sequence integer NOT NULL CHECK (entry_sequence > 0),
  posting_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_account_currency_fk FOREIGN KEY (wallet_account_id,currency_code)
    REFERENCES public.wallet_accounts(id,currency_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT ledger_entries_journal_sequence_key UNIQUE (journal_id,entry_sequence)
);

CREATE INDEX ledger_entries_account_created_idx
  ON public.ledger_entries(wallet_account_id,created_at DESC,id DESC);
CREATE INDEX ledger_entries_currency_created_idx
  ON public.ledger_entries(currency_code,created_at DESC);

CREATE FUNCTION public.wallet_initialize_account_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $wallet_initialize_account_balance$
BEGIN
  INSERT INTO public.account_balances(wallet_account_id,balance_minor,updated_at,ledger_sequence)
  VALUES (NEW.id,0,now(),0)
  ON CONFLICT (wallet_account_id) DO NOTHING;
  RETURN NEW;
END
$wallet_initialize_account_balance$;

CREATE TRIGGER wallet_accounts_initialize_balance
AFTER INSERT ON public.wallet_accounts
FOR EACH ROW EXECUTE FUNCTION public.wallet_initialize_account_balance();

CREATE FUNCTION public.wallet_reject_posted_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $wallet_reject_posted_mutation$
BEGIN
  RAISE EXCEPTION 'WALLET_LEDGER_APPEND_ONLY: posted journal transactions and ledger entries cannot be updated or deleted'
    USING ERRCODE='55000';
END
$wallet_reject_posted_mutation$;

CREATE TRIGGER journal_transactions_append_only
BEFORE UPDATE OR DELETE ON public.journal_transactions
FOR EACH ROW EXECUTE FUNCTION public.wallet_reject_posted_mutation();

CREATE TRIGGER ledger_entries_append_only
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.wallet_reject_posted_mutation();

CREATE FUNCTION public.wallet_validate_posted_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $wallet_validate_posted_journal$
DECLARE
  target_journal_id uuid;
  journal_xid xid8;
  entry_count bigint;
  currency_total record;
  account_to_lock record;
  account_to_update record;
  ledger_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'journal_transactions' THEN
    target_journal_id := NEW.id;
  ELSE
    target_journal_id := NEW.journal_id;
  END IF;

  SELECT jt.posting_xid
    INTO journal_xid
    FROM public.journal_transactions jt
   WHERE jt.id=target_journal_id;

  IF journal_xid IS NULL THEN
    RAISE EXCEPTION 'WALLET_JOURNAL_MISSING: journal % does not exist',target_journal_id
      USING ERRCODE='23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ledger_entries le
     WHERE le.journal_id=target_journal_id
       AND le.posting_xid <> journal_xid
  ) THEN
    RAISE EXCEPTION 'WALLET_JOURNAL_CLOSED: journal entries must be inserted in the same transaction as the journal'
      USING ERRCODE='23514';
  END IF;

  SELECT count(*) INTO entry_count
    FROM public.ledger_entries le
   WHERE le.journal_id=target_journal_id;
  IF entry_count < 2 THEN
    RAISE EXCEPTION 'WALLET_JOURNAL_UNBALANCED: journal % must contain at least two entries',target_journal_id
      USING ERRCODE='23514';
  END IF;

  FOR currency_total IN
    SELECT le.currency_code,sum(le.amount_minor) AS total_minor
      FROM public.ledger_entries le
     WHERE le.journal_id=target_journal_id
     GROUP BY le.currency_code
    HAVING sum(le.amount_minor) <> 0
  LOOP
    RAISE EXCEPTION 'WALLET_JOURNAL_UNBALANCED: journal % is not balanced for currency % (sum %)',
      target_journal_id,currency_total.currency_code,currency_total.total_minor
      USING ERRCODE='23514';
  END LOOP;

  -- Acquire all touched wallet locks in stable ID order before checking the
  -- ledger-derived balance, so concurrent debits serialize on the same account.
  FOR account_to_lock IN
    SELECT DISTINCT le.wallet_account_id
      FROM public.ledger_entries le
     WHERE le.journal_id=target_journal_id
     ORDER BY le.wallet_account_id
  LOOP
    PERFORM 1
      FROM public.wallet_accounts wa
     WHERE wa.id=account_to_lock.wallet_account_id
     FOR UPDATE;
  END LOOP;

  FOR account_to_update IN
    SELECT DISTINCT wa.id,wa.account_kind,wa.currency_code
      FROM public.wallet_accounts wa
      JOIN public.ledger_entries le ON le.wallet_account_id=wa.id
     WHERE le.journal_id=target_journal_id
     ORDER BY wa.id
  LOOP
    SELECT COALESCE(sum(le.amount_minor),0)
      INTO ledger_total
      FROM public.ledger_entries le
     WHERE le.wallet_account_id=account_to_update.id
       AND le.currency_code=account_to_update.currency_code;

    IF account_to_update.account_kind IN ('player-available','held') AND ledger_total < 0 THEN
      RAISE EXCEPTION 'WALLET_OVERDRAFT: wallet account % would have balance % minor units',
        account_to_update.id,ledger_total
        USING ERRCODE='23514';
    END IF;

    UPDATE public.account_balances
       SET balance_minor=ledger_total::bigint,
           updated_at=now(),
           ledger_sequence=(SELECT count(*)::bigint FROM public.ledger_entries le WHERE le.wallet_account_id=account_to_update.id)
     WHERE wallet_account_id=account_to_update.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'WALLET_PROJECTION_MISSING: wallet account % has no account_balances row',account_to_update.id
        USING ERRCODE='23514';
    END IF;
  END LOOP;

  RETURN NULL;
END
$wallet_validate_posted_journal$;

CREATE CONSTRAINT TRIGGER journal_transactions_validate_posted
AFTER INSERT ON public.journal_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.wallet_validate_posted_journal();

CREATE CONSTRAINT TRIGGER ledger_entries_validate_posted
AFTER INSERT ON public.ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.wallet_validate_posted_journal();

-- Provision empty player accounts only. This does not create opening money,
-- deposits, or credits and respects the immutable settlement currency.
INSERT INTO public.wallet_accounts
  (owner_type,owner_id,player_id,account_code,currency_code,account_kind,status)
SELECT 'player',p.id,p.id,account.account_code,p.settlement_currency,account.account_kind,'active'
  FROM public.players p
 CROSS JOIN (VALUES ('available','player-available'),('held','held')) AS account(account_code,account_kind)
ON CONFLICT (owner_type,owner_id,account_code,currency_code) DO NOTHING;

-- Explicit zero-balance system chart-of-accounts rows, one per supported currency.
INSERT INTO public.wallet_accounts
  (owner_type,owner_id,player_id,account_code,currency_code,account_kind,status)
SELECT 'system','00000000-0000-0000-0000-000000000001'::uuid,NULL,account.account_code,c.code,account.account_kind,'active'
  FROM public.currencies c
 CROSS JOIN (VALUES
   ('operator-equity','operator-equity'),
   ('payments','payment-clearing'),
   ('providers','provider-clearing'),
   ('fx','fx-clearing'),
   ('bonus','operator-bonus-clearing')
 ) AS account(account_code,account_kind)
 WHERE c.code IN ('TND','EUR','USD')
ON CONFLICT (owner_type,owner_id,account_code,currency_code) DO NOTHING;

DO $m006_postconditions$
DECLARE
  player_count bigint;
  player_wallet_count bigint;
  missing_projection_count bigint;
BEGIN
  SELECT count(*) INTO player_count FROM public.players;
  SELECT count(*) INTO player_wallet_count
    FROM public.wallet_accounts wa
   WHERE wa.owner_type='player'
     AND wa.account_kind IN ('player-available','held');
  IF player_wallet_count <> player_count*2 THEN
    RAISE EXCEPTION 'Migration 006 stopped: expected two player cash accounts per player (players %, accounts %)',
      player_count,player_wallet_count;
  END IF;

  SELECT count(*) INTO missing_projection_count
    FROM public.wallet_accounts wa
    LEFT JOIN public.account_balances ab ON ab.wallet_account_id=wa.id
   WHERE ab.wallet_account_id IS NULL;
  IF missing_projection_count <> 0 THEN
    RAISE EXCEPTION 'Migration 006 stopped: % wallet accounts have no balance projection',
      missing_projection_count;
  END IF;
END
$m006_postconditions$;

-- Down Migration
-- Financial rows are append-only. Do not drop even an empty wallet schema
-- implicitly; rollback must be a separately reviewed, forward-safe operation.
DO $m006_no_unsafe_rollback$
BEGIN
  RAISE EXCEPTION 'Migration 006 rollback refused: preserve wallet accounts and financial history; use a reviewed forward migration';
END
$m006_no_unsafe_rollback$;
