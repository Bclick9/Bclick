/* Static demonstration data for the CampeonBet frontend recreation.
   All values are display-only; no live data, no backend. */

export interface Game {
  id: string
  title: string
  provider: string
  image?: string
  imageShowsTitle?: boolean
  categories: string[]
  live?: boolean
}

export const GAMES: Game[] = [
  { id: 'zeus-vs-hades', title: 'Zeus vs Hades: Gods of War', provider: 'Pragmatic Play', image: 'https://casino-spa-api.toto.nl/assets/d00d2de6-b8b1-444d-b270-03c730cf4b10?c=52640948b55cf0ada088d923315b321e417a6b8befc03b66465a5d0ba78c4657&h=800&s=b&w=800&x=0&y=0', categories: ['top-picks', 'slot-games', 'new-games'] },
  { id: 'lucky-ladys-charm', title: "Lucky Lady's Charm Deluxe", provider: 'Novomatic', image: 'https://a.storyblok.com/f/272686/400x400/90f4482e99/lucky-ladys-charm-deluxe.webp/m/600x600', categories: ['slot-games', 'top-picks'] },
  { id: 'wild-clusters', title: 'Wild Clusters', provider: 'BGaming', image: 'https://cdn.prod.website-files.com/63b3249466615535f76d4b4e/67c71620fc52bc38b5d542a6_Wild_Clusters_1020x618.webp', categories: ['slot-games', 'new-games'] },
  { id: 'raptor-doublemax', title: 'Raptor 2 Doublemax', provider: 'Yggdrasil', image: 'https://media.leovegas.com/images/games/raptor-2/raptor-2-tile.jpg?tr=w-1536', categories: ['slot-games', 'bonus-buy'] },
  { id: 'wealth-bells-40', title: 'Wealth Bells 40', provider: 'EvoPlay', image: 'https://evoplay.games/wp-content/uploads/2026/07/580x580-2-270x270.webp', categories: ['slot-games'] },
  { id: 'le-bandit', title: 'Le Bandit', provider: 'Hacksaw', image: 'https://media.leovegas.com/images/games/le-bandit/le-bandit-tile.jpg?tr=w-1920', categories: ['slot-games', 'top-picks', 'bonus-buy'] },
  { id: 'big-bass-trophy-catch', title: 'Big Bass Trophy Catch', provider: 'Pragmatic Play', image: 'https://www.slottomat.com/storage/slot-images/big-bass-trophy-catch-42122.webp', categories: ['slot-games', 'new-games'] },
  { id: 'silver-coins', title: 'Silver Coins', provider: 'BF Games', image: 'https://bfgames.com/wp-content/uploads/2026/05/silver_coins_screens_web_1.jpg', imageShowsTitle: false, categories: ['slot-games'] },
  { id: 'eggs-of-fortune', title: 'Eggs of Fortune', provider: 'Popiplay', image: 'https://static-wazdan.com/vault/assets/107/6b426c9566e75ddf775ce129e168ca8934ffa8b3bdb4093b040ae5f3182496b2.png?save_as=EggsOfFortune_logo_vertical.png', categories: ['slot-games', 'new-games'] },
  { id: 'blazing-coins', title: 'Blazing Coins: Hold and Win', provider: 'Popiplay', image: 'https://shuffle.com/api/v1/images/og-image?gameID=3c4f6168-b2e0-4795-b333-f09f2a838a9b', categories: ['slot-games', 'jackpots'] },
  { id: 'death-dominion', title: 'Death Dominion', provider: 'Pragmatic Play', categories: ['halloween-games', 'slot-games'] },
  { id: 'coins-of-halloween', title: 'Coins of Halloween: Hold & Win', provider: 'Betsoft', categories: ['halloween-games', 'jackpots'] },
  { id: 'wolf-power-megaways', title: 'Wolf Power Megaways', provider: 'Playson', categories: ['halloween-games', 'slot-games'] },
  { id: 'spooky-kabuki', title: 'Spooky Kabuki', provider: 'Yggdrasil', categories: ['halloween-games', 'slot-games'] },
  { id: 'vamp-hunt', title: 'Vamp Hunt', provider: 'Pateplay', categories: ['halloween-games', 'slot-games'] },
  { id: 'halloween-bonanza', title: 'Halloween Bonanza', provider: 'BGaming', categories: ['halloween-games', 'slot-games'] },
  { id: 'haunted-coins', title: 'Haunted Coins X1000', provider: 'Pateplay', categories: ['halloween-games', 'slot-games'] },
  { id: 'halloween-jack', title: 'Halloween Jack', provider: 'Netent', categories: ['halloween-games', 'slot-games'] },
  { id: 'devils-feast', title: "Devil's Feast", provider: 'Pateplay', categories: ['halloween-games', 'slot-games'] },
  { id: 'book-of-dead', title: 'Book of Dead', provider: "Play'n GO", image: 'https://www.pokerlistings.com/slots-image/uploads/slot_819_logo_small-3.webp', categories: ['slot-games', 'top-picks'] },
  { id: 'sweet-bonanza', title: 'Sweet Bonanza', provider: 'Pragmatic Play', image: 'https://assets.casinotypist.com/images/articles/desktop/1672216872.webp', categories: ['slot-games', 'top-picks', 'bonus-buy'] },
  { id: 'gates-of-olympus', title: 'Gates of Olympus', provider: 'Pragmatic Play', image: 'https://media.leovegas.de/lv/games/aemb9PnNr/kg1noTVMjlq5Jw.jpg', categories: ['slot-games', 'vip-specials', 'top-picks'] },
  { id: 'starburst', title: 'Starburst', provider: 'Netent', image: 'https://cdn.rainbet.com/slots/netent-starburst.jpg', categories: ['slot-games', 'new-games'] },
  { id: 'razor-shark', title: 'Razor Shark', provider: 'Push Gaming', image: 'https://cdn.rainbet.com/slots/pushgaming-razor-shark.jpg', categories: ['slot-games', 'vip-specials'] },
  { id: 'wolf-gold', title: 'Wolf Gold', provider: 'Pragmatic Play', image: 'https://a.storyblok.com/f/48662/390x390/3dfa85b4da/dw_wolf_gold_390x390.png', categories: ['slot-games', 'jackpots'] },
  { id: 'money-train-3', title: 'Money Train 3', provider: 'Relax Gaming', image: 'https://media.leovegas.com/lv/games/eJeZDnZ5w/Ed57oU8AdWNRBa.jpg', categories: ['slot-games', 'bonus-buy', 'vip-specials'] },
  { id: 'wanted-dead-or-a-wild', title: 'Wanted Dead or a Wild', provider: 'Hacksaw', image: 'https://img.netbet.com.mx/gms/games/mobile_casino_new/preview/18313-wanted-dead-or-a-wild.jpg', categories: ['slot-games', 'bonus-buy'] },
  { id: 'sugar-rush', title: 'Sugar Rush', provider: 'Pragmatic Play', image: 'https://mediumrare.imgix.net/cafad5a2680956ba8bdc5f7ef147d23a8300f7debf44bb76510cd4ee97505aa4?auto=format&dpr=2&format=auto&q=50', categories: ['slot-games', 'new-games'] },
  { id: 'fire-in-the-hole', title: 'Fire In The Hole', provider: 'Nolimit City', image: 'https://media.slotboss.co.uk/images/games/fire-in-the-hole-xbomb/fire-in-the-hole-xbomb-square-auth.jpg', categories: ['slot-games', 'crash-games', 'bonus-buy'] },
  { id: 'mental', title: 'Mental', provider: 'Nolimit City', categories: ['slot-games', 'bonus-buy'] },
  { id: 'aviator', title: 'Aviator', provider: 'Spribe', categories: ['crash-games', 'top-picks'] },
  { id: 'jetx', title: 'JetX', provider: 'SmartSoft', categories: ['crash-games'] },
  { id: 'spaceman', title: 'Spaceman', provider: 'Pragmatic Play', categories: ['crash-games'] },
  { id: 'gates-of-hell', title: 'Gates of Hell', provider: 'Pateplay', categories: ['crash-games', 'new-games'] },
  { id: 'mega-joker', title: 'Mega Joker', provider: 'Novomatic', categories: ['table-games'] },
  { id: 'european-roulette', title: 'European Roulette', provider: 'Playtech', categories: ['table-games'] },
  { id: 'blackjack-classic', title: 'Blackjack Classic', provider: 'Netent', categories: ['table-games'] },
  { id: 'baccarat-pro', title: 'Baccarat Pro', provider: 'Netent', categories: ['table-games'] },
  { id: 'lightning-roulette', title: 'Lightning Roulette', provider: 'Evolution', image: 'https://www.casinobarcelona.es/v2005/img/logos/evolution/EVO-ruleta-lightning.webp?v=75', categories: ['live-casino'], live: true },
  { id: 'crazy-time', title: 'Crazy Time', provider: 'Evolution', image: 'https://rollbit.com/game-images/evolution_crazytime.webp', categories: ['live-casino'], live: true },
  { id: 'blackjack-vip', title: 'Blackjack VIP', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'speed-baccarat', title: 'Speed Baccarat A', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'mega-wheel', title: 'Mega Wheel', provider: 'Pragmatic Play Live', categories: ['live-casino'], live: true },
  { id: 'monopoly-big-baller', title: 'Monopoly Big Baller', provider: 'Evolution', image: 'https://cdn.quigioco.it/external_cms/QUIGIOCO/newsite/EVOLUTION/221004.jpg', categories: ['live-casino'], live: true },
  { id: 'sweet-candyland', title: 'Sweet Bonanza Candyland', provider: 'Pragmatic Play Live', image: 'https://cn.4win.bet.br/assets/images/products/4win_sweet_bonanza_candyland.webp', categories: ['live-casino'], live: true },
  { id: 'auto-roulette', title: 'Auto Roulette', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'lightning-dice', title: 'Lightning Dice', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'texas-holdem-bonus', title: 'Texas Hold’em Bonus Poker', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'mega-ball', title: 'Mega Ball', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'dream-catcher', title: 'Dream Catcher', provider: 'Evolution', categories: ['live-casino'], live: true },
  { id: 'boom-city', title: 'Boom City', provider: 'Pragmatic Play Live', categories: ['live-casino'], live: true },
]

export const PROVIDERS = [
  'Pragmatic Play', 'Netent', "Play'n GO", 'BGaming', 'Hacksaw', 'Yggdrasil',
  'EvoPlay', 'Novomatic', 'Betsoft', 'Playson', 'Pateplay', 'Popiplay',
  'Push Gaming', 'Nolimit City', 'Relax Gaming', 'Evolution', 'Playtech',
  'Big Time Gaming', 'Quickspin', 'BF Games', 'Spribe', 'SmartSoft',
]

export const CASINO_CATEGORIES = [
  { slug: 'lobby', label: 'Lobby', icon: 'Home' },
  { slug: 'slot-games', label: 'Slot Games', icon: 'Cherry' },
  { slug: 'halloween-games', label: 'Halloween Games', icon: 'Ghost' },
  { slug: 'top-picks', label: 'Top Picks', icon: 'Flame' },
  { slug: 'new-games', label: 'New Games', icon: 'Sparkles' },
  { slug: 'vip-specials', label: 'VIP Specials', icon: 'Crown' },
  { slug: 'bonus-buy', label: 'Bonus Buy', icon: 'ShoppingBag' },
  { slug: 'crash-games', label: 'Crash Games', icon: 'Rocket' },
  { slug: 'jackpots', label: 'Jackpots', icon: 'Gem' },
  { slug: 'table-games', label: 'Table Games', icon: 'Spade' },
  { slug: 'drop-and-wins', label: 'Drop & Wins', icon: 'Trophy' },
]

export interface Promotion {
  slug: string
  image: string
  tag: string
  title: string
  scope: 'casino' | 'sports'
  description: string
  terms: string[]
}

export const PROMOTIONS: Promotion[] = [
  {
    slug: 'welcome-casino-package',
    image: 'https://campeonbet.io/assets/cms/d7306129-2d7b-4787-898a-f25e88b47dd5/welcome-casino-bonus.webp',
    tag: 'Welcome Casino Package',
    title: 'Start with 350% up to €2000 & 1000 FS',
    scope: 'casino',
    description: 'Claim the three-part welcome package on your first three deposits and start your journey with up to €2000 in bonus funds and 1000 free spins.',
    terms: [
      'The welcome package applies to the first three (3) deposits after registration.',
      'Minimum qualifying deposit: €20 per step.',
      'Wagering requirement: 35x the bonus amount before withdrawal.',
      'Free spins are credited on selected slot titles and expire after 7 days.',
      'General Bonus Terms apply.',
    ],
  },
  {
    slug: 'welcome-sports-bonus',
    image: 'https://campeonbet.io/assets/cms/1c0a040c-6beb-420f-9d39-5dddb0cccf3b/welcome-sports-bonus.jpg',
    tag: 'Welcome Sports Bonus',
    title: 'Boost your bets with a 100% up to €100 Bonus!',
    scope: 'sports',
    description: 'Double your first sports deposit with a 100% match bonus up to €100 and get started on the Sportsbook right away.',
    terms: [
      'Minimum qualifying deposit: €10.',
      'Wagering requirement: 6x at minimum odds of 1.60.',
      'The bonus is valid for 30 days from activation.',
      'General Bonus Terms and Sports Betting Rules apply.',
    ],
  },
  {
    slug: 'welcome-sports-freebet',
    image: 'https://campeonbet.io/assets/cms/a5456fe7-a90b-4b43-a127-a9506dec060c/welcome-sports-freebet.jpg',
    tag: 'Welcome Sports Freebet',
    title: 'Kick off with a €25 Freebet!',
    scope: 'sports',
    description: 'Place your first qualifying bet and receive a €25 freebet to use on any sports market of your choice.',
    terms: [
      'A qualifying bet of €25 or more at odds of 1.80+ is required.',
      'The freebet stake is not returned with winnings.',
      'The freebet expires 7 days after being credited.',
      'Sports Betting Rules apply.',
    ],
  },
  {
    slug: 'welcome-crypto-combo',
    image: 'https://campeonbet.io/assets/cms/faab2744-96c6-4257-962e-4b0e597fee40/welcome-crypto-bonus.jpg',
    tag: 'Welcome Crypto COMBO',
    title: '150% Crypto Bonus up to 1 BTC & 150 FS!',
    scope: 'casino',
    description: 'Make your first deposit in cryptocurrency and receive a 150% match bonus up to 1 BTC together with 150 free spins.',
    terms: [
      'Applies to the first deposit made with a supported cryptocurrency.',
      'Wagering requirement: 40x the bonus amount.',
      'Free spins are credited on selected slot titles and expire after 7 days.',
      'General Bonus Terms apply.',
    ],
  },
  {
    slug: 'mondays-reload-bonus',
    image: 'https://campeonbet.io/assets/cms/28f6909b-a11e-42b9-8448-b23fa8a9e782/monday-reload-bonus.jpg',
    tag: "Monday's Reload Bonus",
    title: '100% Casino Reload Bonus lined up for you!',
    scope: 'casino',
    description: 'Every Monday, reload your account and get a 100% casino reload bonus to power up the start of your week.',
    terms: [
      'Available every Monday between 00:00 and 23:59 UTC.',
      'Minimum qualifying deposit: €20.',
      'Wagering requirement: 35x the bonus amount.',
      'The bonus can be claimed once per Monday.',
      'General Bonus Terms apply.',
    ],
  },
]

export interface SportsEvent {
  id: string
  league: string
  country: string
  time: string
  date: string
  sport: string
  live: boolean
  home: string
  away: string
  markets: { label: string; odds: string }[]
  sportIcon: string
}

export const SPORTS_EVENTS: SportsEvent[] = [
  {
    id: 'allsvenskan-bromma-djurgarden',
    league: 'Allsvenskan', country: 'Sweden', time: '18:00', date: '16/10',
    sport: 'Football', live: true, home: 'IF Brommapojkarna', away: 'Djurgården',
    markets: [
      { label: 'IF Bromma', odds: '5.33' },
      { label: 'X', odds: '4.75' },
      { label: 'Djurgården', odds: '1.50' },
    ],
    sportIcon: 'Football',
  },
  {
    id: 'euroleague-besiktas-bayern',
    league: 'Euroleague', country: 'Europe', time: '18:00', date: '16/10',
    sport: 'Basketball', live: true, home: 'Besiktas', away: 'Bayern Munich',
    markets: [
      { label: 'Besiktas', odds: '1.55' },
      { label: 'Bayern Munich', odds: '2.35' },
    ],
    sportIcon: 'Basketball',
  },
  {
    id: 'bundesliga-rapid-hartberg',
    league: 'Bundesliga', country: 'Austria', time: '18:30', date: '16/10',
    sport: 'Football', live: true, home: 'Rapid Wien', away: 'Hartberg',
    markets: [
      { label: 'Rapid Wien', odds: '1.26' },
      { label: 'X', odds: '6.33' },
      { label: 'Hartberg', odds: '8.50' },
    ],
    sportIcon: 'Football',
  },
  {
    id: 'eredivisie-heerenveen-excelsior',
    league: 'Eredivisie', country: 'Netherlands', time: '19:00', date: '16/10',
    sport: 'Football', live: true, home: 'Heerenveen', away: 'Excelsior',
    markets: [
      { label: 'Heerenveen', odds: '1.54' },
      { label: 'X', odds: '4.50' },
      { label: 'Excelsior', odds: '5.20' },
    ],
    sportIcon: 'Football',
  },
  {
    id: 'allsvenskan-malmo-goteborg',
    league: 'Allsvenskan', country: 'Sweden', time: '19:30', date: '16/10',
    sport: 'Football', live: false, home: 'Malmö FF', away: 'IFK Göteborg',
    markets: [
      { label: 'Malmö FF', odds: '1.72' },
      { label: 'X', odds: '3.90' },
      { label: 'IFK Göteborg', odds: '4.60' },
    ],
    sportIcon: 'Football',
  },
  {
    id: 'nba-real-madrid-panathinaikos',
    league: 'Euroleague', country: 'Europe', time: '20:00', date: '16/10',
    sport: 'Basketball', live: false, home: 'Real Madrid', away: 'Panathinaikos',
    markets: [
      { label: 'Real Madrid', odds: '1.85' },
      { label: 'Panathinaikos', odds: '1.95' },
    ],
    sportIcon: 'Basketball',
  },
  {
    id: 'atp-sinner-alcaraz',
    league: 'ATP Finals', country: 'International', time: '21:00', date: '16/10',
    sport: 'Tennis', live: false, home: 'J. Sinner', away: 'C. Alcaraz',
    markets: [
      { label: 'Sinner', odds: '2.10' },
      { label: 'Alcaraz', odds: '1.74' },
    ],
    sportIcon: 'Tennis',
  },
]

export const SPORT_CATEGORIES = [
  { slug: 'football', label: 'Football', icon: 'Trophy' },
  { slug: 'tennis', label: 'Tennis', icon: 'CircleDot' },
  { slug: 'basketball', label: 'Basketball', icon: 'Dribbble' },
  { slug: 'ice-hockey', label: 'Ice Hockey', icon: 'Snowflake' },
  { slug: 'volleyball', label: 'Volleyball', icon: 'Volleyball' },
  { slug: 'table-tennis', label: 'Table Tennis', icon: 'CircleDot' },
  { slug: 'esports', label: 'Esports', icon: 'Gamepad2' },
  { slug: 'mma', label: 'MMA', icon: 'Swords' },
]

export interface Jackpot {
  id: string
  title: string
  provider: string
  amount: string
  type: 'Daily' | 'Grand' | 'Minor'
}

export const JACKPOTS: Jackpot[] = [
  { id: 'jackpot-grand', title: 'Grand Jackpot', provider: 'Network', amount: '€1,284,392.11', type: 'Grand' },
  { id: 'jackpot-major', title: 'Major Jackpot', provider: 'Network', amount: '€84,215.60', type: 'Grand' },
  { id: 'jackpot-minor', title: 'Minor Jackpot', provider: 'Network', amount: '€6,481.02', type: 'Minor' },
  { id: 'blazing-coins-jp', title: 'Blazing Coins: Hold and Win', provider: 'Popiplay', amount: '€32,118.44', type: 'Grand' },
  { id: 'coins-halloween-jp', title: 'Coins of Halloween: Hold & Win', provider: 'Betsoft', amount: '€11,905.28', type: 'Minor' },
  { id: 'wolf-gold-jp', title: 'Wolf Gold', provider: 'Pragmatic Play', amount: '€18,342.75', type: 'Minor' },
]

export interface Tournament {
  id: string
  title: string
  subtitle: string
  prize: string
  endsIn: string
  scope: 'casino' | 'sports'
}

export const TOURNAMENTS: Tournament[] = [
  { id: 'halloween-drop', title: 'Halloween Drop', subtitle: 'Pateplay network promotion', prize: '€50,000', endsIn: '12 days', scope: 'casino' },
  { id: 'weekly-race', title: 'Weekly Race', subtitle: 'Top 100 players share the pot', prize: '€10,000', endsIn: '3 days', scope: 'casino' },
  { id: 'sports-streak', title: 'Sports Streak Challenge', subtitle: 'Win 5 bets in a row', prize: '€5,000', endsIn: '5 days', scope: 'sports' },
]

export interface VipTier {
  name: string
  cashback: string
  requirement: string
  perks: string[]
}

export const VIP_TIERS: VipTier[] = [
  { name: 'Bronze', cashback: '3%', requirement: '€0+', perks: ['Weekly cashback', 'Birthday bonus'] },
  { name: 'Silver', cashback: '5%', requirement: '€2,000+ wagered', perks: ['Weekly cashback', 'Reload bonus', 'Priority support'] },
  { name: 'Gold', cashback: '8%', requirement: '€10,000+ wagered', perks: ['Weekly cashback', 'Reload bonus', 'Personal VIP host'] },
  { name: 'Platinum', cashback: '12%', requirement: '€50,000+ wagered', perks: ['Weekly cashback', 'Custom offers', 'Personal VIP host', 'Higher limits'] },
  { name: 'Diamond', cashback: '15%', requirement: 'By invitation', perks: ['All Platinum perks', 'Exclusive events', 'Tailored rewards'] },
]

export const PAYMENT_METHODS = [
  { id: 'skrill', name: 'Skrill', min: '€25.00', max: '€2,000.00' },
  { id: 'paysafecard', name: 'PaysafeCard', min: '€25.00', max: '€2,000.00' },
  { id: 'jeton', name: 'Jeton', min: '€25.00', max: '€2,000.00' },
  { id: 'neteller', name: 'NETELLER', min: '€25.00', max: '€2,000.00' },
  { id: 'mifinity', name: 'MiFinity', min: '€25.00', max: '€5,000.00' },
  { id: 'luxonpay', name: 'LuxonPay', min: '€20.00', max: '€5,000.00' },
  { id: 'polkadot', name: 'Polkadot', min: '€10.00', max: '€100,000.00' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', min: '€10.00', max: '€100,000.00' },
  { id: 'bnb', name: 'BNB', min: '€10.00', max: '€100,000.00' },
  { id: 'bitcoin', name: 'Bitcoin', min: '€10.00', max: '€100,000.00' },
  { id: 'dogecoin', name: 'Dogecoin', min: '€10.00', max: '€100,000.00' },
  { id: 'ethereum', name: 'Ethereum', min: '€10.00', max: '€100,000.00' },
  { id: 'litecoin', name: 'Litecoin', min: '€10.00', max: '€100,000.00' },
  { id: 'solana', name: 'Solana', min: '€10.00', max: '€100,000.00' },
  { id: 'tron', name: 'Tron', min: '€10.00', max: '€100,000.00' },
  { id: 'usdce', name: 'USDCE (ERC20)', min: '€10.00', max: '€100,000.00' },
  { id: 'usdcs', name: 'USDCS (SPL)', min: '€10.00', max: '€100,000.00' },
  { id: 'usdt-erc20', name: 'USDT (ERC20)', min: '€10.00', max: '€100,000.00' },
  { id: 'usdt-trc20', name: 'USDT (TRC20)', min: '€10.00', max: '€100,000.00' },
  { id: 'xrp', name: 'XRP', min: '€10.00', max: '€100,000.00' },
]

export const FOOTER_LINKS: { label: string; path: string }[] = [
  { label: 'About Us', path: '/info/about' },
  { label: 'Terms & Conditions', path: '/info/terms' },
  { label: 'Privacy Policy', path: '/info/privacy' },
  { label: 'General Bonus Terms', path: '/info/bonus-terms' },
  { label: 'Responsible Gaming & Self-Exclusion', path: '/info/responsible-gaming' },
  { label: 'Contact Us', path: '/info/contact' },
  { label: 'AML & KYC Policy', path: '/info/aml-kyc' },
  { label: 'Underage Gaming Policy', path: '/info/underage-gaming' },
  { label: 'Sports Betting Rules', path: '/info/sports-betting-rules' },
  { label: 'Payments & Withdrawals', path: '/info/payments' },
]

export const FAQ_ITEMS = [
  {
    q: 'How do I verify my account (KYC)?',
    a: 'Go to My profile > Verification and upload a valid ID document plus a proof of address issued within the last 3 months. Verification is usually completed within 24 hours.',
  },
  {
    q: 'How long do withdrawals take?',
    a: 'E-wallet withdrawals are usually processed within 24 hours. Cryptocurrency withdrawals are typically processed within 1 hour after approval. Bank transfers may take 3-5 business days.',
  },
  {
    q: 'What is the wagering requirement on bonuses?',
    a: 'Most casino bonuses carry a 35x wagering requirement on the bonus amount unless stated otherwise in the specific promotion terms. Sports bonuses carry a 6x requirement at minimum odds of 1.60.',
  },
  {
    q: 'Can I cancel a withdrawal?',
    a: 'A withdrawal can be cancelled while its status is Pending. Open Wallet > Pending withdrawals and select Cancel next to the transaction.',
  },
  {
    q: 'How do I set deposit limits?',
    a: 'Open Responsible gaming from your account menu to set daily, weekly or monthly deposit limits, loss limits, session reminders or take a break.',
  },
  {
    q: 'Is there a fee for deposits?',
    a: 'CampeonBet does not charge fees on deposits. Your payment provider may apply its own fees for certain methods or currencies.',
  },
]
