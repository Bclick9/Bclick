-- Up Migration
-- Migration 009: preserve the exact legacy storefront slugs before any frontend cutover.
-- Seeded routes are unresolved until a complete Standard Sandbox sync proves one exact
-- title + provider match. No fuzzy title matching or Premium imports are permitted.
DO $q005_alias_preconditions$
BEGIN
  IF to_regclass('public.casino_games') IS NULL
     OR to_regclass('public.casino_providers') IS NULL
     OR to_regclass('public.casino_game_sources') IS NULL THEN
    RAISE EXCEPTION 'Migration 009 stopped: the Phase 6 catalogue tables are required';
  END IF;
END
$q005_alias_preconditions$;

CREATE TABLE public.casino_game_legacy_slug_aliases (
  alias_slug text PRIMARY KEY
    CHECK (length(alias_slug) BETWEEN 1 AND 120 AND alias_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legacy_title text NOT NULL CHECK (length(btrim(legacy_title)) BETWEEN 1 AND 240),
  legacy_provider text NOT NULL CHECK (length(btrim(legacy_provider)) BETWEEN 1 AND 160),
  game_id uuid REFERENCES public.casino_games(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  resolution_status text NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending','resolved','unmatched','ambiguous')),
  last_matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT casino_game_legacy_slug_alias_resolution_check
    CHECK ((resolution_status = 'resolved' AND game_id IS NOT NULL)
        OR (resolution_status <> 'resolved' AND game_id IS NULL))
);

CREATE INDEX casino_game_legacy_slug_alias_target_idx
  ON public.casino_game_legacy_slug_aliases(game_id)
  WHERE game_id IS NOT NULL;
CREATE INDEX casino_game_legacy_slug_alias_exact_match_idx
  ON public.casino_game_legacy_slug_aliases(lower(btrim(legacy_title)), lower(btrim(legacy_provider)))
  WHERE resolution_status <> 'resolved';

-- This is the exact curated GAMES[] list in frontend/data/catalog.ts at migration authoring.
-- Promotional cards, jackpot widgets, payment methods, and other IDs are intentionally excluded.
INSERT INTO public.casino_game_legacy_slug_aliases
  (alias_slug, legacy_title, legacy_provider)
VALUES
  ('zeus-vs-hades', 'Zeus vs Hades: Gods of War', 'Pragmatic Play'),
  ('lucky-ladys-charm', 'Lucky Lady''s Charm Deluxe', 'Novomatic'),
  ('wild-clusters', 'Wild Clusters', 'BGaming'),
  ('raptor-doublemax', 'Raptor 2 Doublemax', 'Yggdrasil'),
  ('wealth-bells-40', 'Wealth Bells 40', 'EvoPlay'),
  ('le-bandit', 'Le Bandit', 'Hacksaw'),
  ('big-bass-trophy-catch', 'Big Bass Trophy Catch', 'Pragmatic Play'),
  ('silver-coins', 'Silver Coins', 'BF Games'),
  ('eggs-of-fortune', 'Eggs of Fortune', 'Popiplay'),
  ('blazing-coins', 'Blazing Coins: Hold and Win', 'Popiplay'),
  ('death-dominion', 'Death Dominion', 'Pragmatic Play'),
  ('coins-of-halloween', 'Coins of Halloween: Hold & Win', 'Betsoft'),
  ('wolf-power-megaways', 'Wolf Power Megaways', 'Playson'),
  ('spooky-kabuki', 'Spooky Kabuki', 'Yggdrasil'),
  ('vamp-hunt', 'Vamp Hunt', 'Pateplay'),
  ('halloween-bonanza', 'Halloween Bonanza', 'BGaming'),
  ('haunted-coins', 'Haunted Coins X1000', 'Pateplay'),
  ('halloween-jack', 'Halloween Jack', 'Netent'),
  ('devils-feast', 'Devil''s Feast', 'Pateplay'),
  ('book-of-dead', 'Book of Dead', 'Play''n GO'),
  ('sweet-bonanza', 'Sweet Bonanza', 'Pragmatic Play'),
  ('gates-of-olympus', 'Gates of Olympus', 'Pragmatic Play'),
  ('starburst', 'Starburst', 'Netent'),
  ('razor-shark', 'Razor Shark', 'Push Gaming'),
  ('wolf-gold', 'Wolf Gold', 'Pragmatic Play'),
  ('money-train-3', 'Money Train 3', 'Relax Gaming'),
  ('wanted-dead-or-a-wild', 'Wanted Dead or a Wild', 'Hacksaw'),
  ('sugar-rush', 'Sugar Rush', 'Pragmatic Play'),
  ('fire-in-the-hole', 'Fire In The Hole', 'Nolimit City'),
  ('mental', 'Mental', 'Nolimit City'),
  ('aviator', 'Aviator', 'Spribe'),
  ('jetx', 'JetX', 'SmartSoft'),
  ('spaceman', 'Spaceman', 'Pragmatic Play'),
  ('gates-of-hell', 'Gates of Hell', 'Pateplay'),
  ('mega-joker', 'Mega Joker', 'Novomatic'),
  ('european-roulette', 'European Roulette', 'Playtech'),
  ('blackjack-classic', 'Blackjack Classic', 'Netent'),
  ('baccarat-pro', 'Baccarat Pro', 'Netent'),
  ('lightning-roulette', 'Lightning Roulette', 'Evolution'),
  ('crazy-time', 'Crazy Time', 'Evolution'),
  ('blackjack-vip', 'Blackjack VIP', 'Evolution'),
  ('speed-baccarat', 'Speed Baccarat A', 'Evolution'),
  ('mega-wheel', 'Mega Wheel', 'Pragmatic Play Live'),
  ('monopoly-big-baller', 'Monopoly Big Baller', 'Evolution'),
  ('sweet-candyland', 'Sweet Bonanza Candyland', 'Pragmatic Play Live'),
  ('auto-roulette', 'Auto Roulette', 'Evolution'),
  ('lightning-dice', 'Lightning Dice', 'Evolution'),
  ('texas-holdem-bonus', 'Texas Hold’em Bonus Poker', 'Evolution'),
  ('mega-ball', 'Mega Ball', 'Evolution'),
  ('dream-catcher', 'Dream Catcher', 'Evolution'),
  ('boom-city', 'Boom City', 'Pragmatic Play Live'),
  ('funky-time', 'Funky Time', 'Evolution'),
  ('monopoly-live', 'MONOPOLY Live', 'Evolution'),
  ('crazy-coin-flip', 'Crazy Coin Flip', 'Evolution'),
  ('dragon-tiger', 'Dragon Tiger', 'Evolution'),
  ('xxxtreme-lightning-roulette', 'XXXtreme Lightning Roulette', 'Evolution'),
  ('super-sic-bo', 'Super Sic Bo', 'Evolution'),
  ('live-casino-holdem', 'Live Casino Hold’em', 'Evolution'),
  ('golden-wealth-baccarat', 'Golden Wealth Baccarat', 'Evolution');

-- Down Migration
-- The seeds represent persisted public routes and must not be discarded automatically.
DO $q005_alias_down_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.casino_game_legacy_slug_aliases) THEN
    RAISE EXCEPTION 'Migration 009 rollback refused: preserve legacy game routes; use a reviewed forward migration';
  END IF;
END
$q005_alias_down_guard$;

DROP TABLE public.casino_game_legacy_slug_aliases;
