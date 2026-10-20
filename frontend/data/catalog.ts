/* Static demonstration data for the CampeonBet frontend recreation.
   All values are display-only; no live data, no backend. */

export interface Game {
  id: string
  title: string
  provider: string
  image?: string
  imageShowsTitle?: boolean
  imageFallback?: string
  spriteIndex?: number
  categories: string[]
  live?: boolean
}

export const GAMES: Game[] = [
  { id: 'zeus-vs-hades', title: 'Zeus vs Hades: Gods of War', provider: 'Pragmatic Play', spriteIndex: 0, image: '/assets/games/zeus-vs-hades.jpg', imageFallback: 'https://zeus-vs-hades.com/images/zeus-vs-hades-logo.jpg', categories: ['top-picks', 'slot-games', 'new-games'] },
  { id: 'lucky-ladys-charm', title: "Lucky Lady's Charm Deluxe", provider: 'Novomatic', spriteIndex: 1, image: '/assets/games/lucky-ladys-charm.jpg', imageFallback: 'https://www.novomatic.com/sites/default/files/styles/gallery_game_image/public/2021-05/1Q2YJMqq9DmYdqC.jpg?itok=CfNhqkxI', categories: ['slot-games', 'top-picks'] },
  { id: 'wild-clusters', title: 'Wild Clusters', provider: 'BGaming', spriteIndex: 2, image: '/assets/games/wild-clusters.png', imageFallback: 'https://777.ua/uploads/games_items/Wild-Clusters-_500h560-min.png', categories: ['slot-games', 'new-games'] },
  { id: 'raptor-doublemax', title: 'Raptor 2 Doublemax', provider: 'Yggdrasil', spriteIndex: 3, image: '/assets/games/raptor-doublemax.jpg', imageFallback: 'https://media.leovegas.com/images/games/raptor-2/raptor-2-tile.jpg?tr=w-1536', categories: ['slot-games', 'bonus-buy'] },
  { id: 'wealth-bells-40', title: 'Wealth Bells 40', provider: 'EvoPlay', spriteIndex: 4, image: '/assets/games/wealth-bells-40.webp', imageFallback: 'https://evoplay.games/wp-content/uploads/2026/07/580x580-2-270x270.webp', categories: ['slot-games'] },
  { id: 'le-bandit', title: 'Le Bandit', provider: 'Hacksaw', spriteIndex: 5, image: '/assets/games/le-bandit.jpg', imageFallback: 'https://www.slotark.com/images/slots/le-bandit.jpg', categories: ['slot-games', 'top-picks', 'bonus-buy'] },
  { id: 'big-bass-trophy-catch', title: 'Big Bass Trophy Catch', provider: 'Pragmatic Play', spriteIndex: 6, image: '/assets/games/big-bass-trophy-catch.webp', imageFallback: 'https://www.slottomat.com/storage/slot-images/big-bass-trophy-catch-42122.webp', categories: ['slot-games', 'new-games'] },
  { id: 'silver-coins', title: 'Silver Coins', provider: 'BF Games', spriteIndex: 7, image: '/assets/games/silver-coins.jpg', imageFallback: 'https://bfgames.com/wp-content/uploads/2026/05/silver_coins_screens_web_1.jpg', imageShowsTitle: false, categories: ['slot-games'] },
  { id: 'eggs-of-fortune', title: 'Eggs of Fortune', provider: 'Popiplay', spriteIndex: 8, image: '/assets/games/eggs-of-fortune.png', imageFallback: 'https://static-wazdan.com/vault/assets/107/6b426c9566e75ddf775ce129e168ca8934ffa8b3bdb4093b040ae5f3182496b2.png?save_as=EggsOfFortune_logo_vertical.png', categories: ['slot-games', 'new-games'] },
  { id: 'blazing-coins', title: 'Blazing Coins: Hold and Win', provider: 'Popiplay', spriteIndex: 9, image: '/assets/games/blazing-coins.jpg', imageFallback: 'https://shuffle.com/api/v1/images/og-image?gameID=3c4f6168-b2e0-4795-b333-f09f2a838a9b', categories: ['slot-games', 'jackpots'] },
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
  { id: 'lightning-roulette', title: 'Lightning Roulette', provider: 'Evolution', image: 'https://de.888casino.com/content/dam/holdings888/888casino/com/de/roulette/CAM-72869_Lightning-Roulette-Game-Info-Banner-Mobile-1674307858697_tcm1839-576944.jpg/jcr%3Acontent/renditions/basic-webp', categories: ['live-casino'], live: true },
  { id: 'crazy-time', title: 'Crazy Time', provider: 'Evolution', image: 'https://crazytime.net.in/img/crazy-time-hero.webp', categories: ['live-casino'], live: true },
  { id: 'blackjack-vip', title: 'Blackjack VIP', provider: 'Evolution', image: 'https://mediumrare.imgix.net/090fed78786a43c7a4e01368d2a5ae1be1df0eb1b0c46b61f230153d53615a40?q=85', categories: ['live-casino'], live: true },
  { id: 'speed-baccarat', title: 'Speed Baccarat A', provider: 'Evolution', image: 'https://www.onlinecasinoreports.co.kr/images/live-speed-baccarat-evolution-gaming.jpg', categories: ['live-casino'], live: true },
  { id: 'mega-wheel', title: 'Mega Wheel', provider: 'Pragmatic Play Live', image: 'https://www.pragmaticplay.com/wp-content/uploads/2026/10/image-94.jpg', categories: ['live-casino'], live: true },
  { id: 'monopoly-big-baller', title: 'Monopoly Big Baller', provider: 'Evolution', image: 'https://cdn.onlinecasinoground.nl/2022/08/thumbnail-monopoly-big-baller-livestream.jpg', categories: ['live-casino'], live: true },
  { id: 'sweet-candyland', title: 'Sweet Bonanza Candyland', provider: 'Pragmatic Play Live', image: 'https://d34lk2pr0k31uk.cloudfront.net/media/content/images/24480f1c-1d10-4f43-95ea-dfb6b62a60db.png', categories: ['live-casino'], live: true },
  { id: 'auto-roulette', title: 'Auto Roulette', provider: 'Evolution', image: 'https://www.casinowow.com/media/uploads/5-2026/auto-roulette-ezugi-main-game-banner.jpg', categories: ['live-casino'], live: true },
  { id: 'lightning-dice', title: 'Lightning Dice', provider: 'Evolution', image: 'https://media.royalpanda.com/images/games/lightning-dice/lightning-dice-thumb-hi-res.jpg', categories: ['live-casino'], live: true },
  { id: 'texas-holdem-bonus', title: 'Texas Hold’em Bonus Poker', provider: 'Evolution', image: 'https://www.onecasino.com/img/screenshots/holdem_20004_8_1000x660.jpg', categories: ['live-casino'], live: true },
  { id: 'mega-ball', title: 'Mega Ball', provider: 'Evolution', image: 'https://casino.guide/media/mega-ball-evolution-gaming.jpg', categories: ['live-casino'], live: true },
  { id: 'dream-catcher', title: 'Dream Catcher', provider: 'Evolution', image: 'https://olbgimages.co.uk/image-cache?h=628&src=https%3A%2F%2Folbgimages.co.uk%2Fstorage%2Fgallery%2Fcasino-guides-featured-images%2Fscreenshot-2025-03-06-at-091552.png&w=1116&zc=1', categories: ['live-casino'], live: true },
  { id: 'boom-city', title: 'Boom City', provider: 'Pragmatic Play Live', image: 'https://img.mrq.com/flicker-test/sharing_graphic_boom_city_372c9e66c2.jpg', categories: ['live-casino'], live: true },
  { id: 'funky-time', title: 'Funky Time', provider: 'Evolution', image: 'https://www.betandskill.com/images/stories/games/funky-time-wheel.jpg', categories: ['live-casino'], live: true },
  { id: 'monopoly-live', title: 'MONOPOLY Live', provider: 'Evolution', image: 'https://www.megacasino.co.uk/api/games/monopoly-live/monopoly-live-slots-megacasino-ss1.jpg', categories: ['live-casino'], live: true },
  { id: 'crazy-coin-flip', title: 'Crazy Coin Flip', provider: 'Evolution', image: 'https://d34lk2pr0k31uk.cloudfront.net/media/content/images/cf9a9e00-bcac-41b8-bb80-ff06089b6e69.png', categories: ['live-casino'], live: true },
  { id: 'dragon-tiger', title: 'Dragon Tiger', provider: 'Evolution', image: 'https://content.hollywoodbets.net/medium_dragon_tiger_thumbnail_1280x720_2024_01_c62bf7aa70.webp', categories: ['live-casino'], live: true },
  { id: 'xxxtreme-lightning-roulette', title: 'XXXtreme Lightning Roulette', provider: 'Evolution', image: 'https://content.hollywoodbets.net/large_xxxtreme_lightning_roulette_thumbnail_1280x720_2022_03_01_aba62d5324.webp', categories: ['live-casino'], live: true },
  { id: 'super-sic-bo', title: 'Super Sic Bo', provider: 'Evolution', image: 'https://storage.googleapis.com/kickthe/assets/images/games/super-sic-bo-live-evolution/gb/gbp/tile_large.jpg', categories: ['live-casino'], live: true },
  { id: 'live-casino-holdem', title: 'Live Casino Hold’em', provider: 'Evolution', image: 'https://www.onecasino.com/img/screenshots/holdem_20004_8_1000x660.jpg', categories: ['live-casino'], live: true },
  { id: 'golden-wealth-baccarat', title: 'Golden Wealth Baccarat', provider: 'Evolution', image: 'https://storage.googleapis.com/kickthe/assets/images/games/golden-wealth-baccarat-live-evolution/gb/gbp/tile_large.jpg', categories: ['live-casino'], live: true },
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
    slug: 'tuesday-on-the-reels',
    image: 'https://i.imgur.com/LX0CyyU.jpeg',
    tag: 'Tuesday on the reels',
    title: '1000 FS to spin you around!',
    scope: 'casino',
    description: 'A featured Tuesday promotion for casino players.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'wednesdays-double-fun',
    image: 'https://i.imgur.com/X75yedd.jpeg',
    tag: "Wednesday's double fun",
    title: 'Get €5 Live Casino Bonus & 150 FS',
    scope: 'casino',
    description: 'A featured midweek promotion for casino and live casino play.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'live-casino-thursday',
    image: 'https://i.imgur.com/v7bu7ga.jpeg',
    tag: 'Live Casino Thursday',
    title: '25% Cashback to fuel more action!',
    scope: 'casino',
    description: 'A featured live casino promotion.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'friday-featured-promotion',
    image: 'https://i.imgur.com/7dRXAXI.jpeg',
    tag: 'Friday Special',
    title: 'A featured offer for the weekend ahead.',
    scope: 'casino',
    description: 'Explore this featured promotion.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'saturday-featured-promotion',
    image: 'https://i.imgur.com/CmuEAMk.jpeg',
    tag: 'Saturday Special',
    title: 'Discover more special rewards.',
    scope: 'casino',
    description: 'Explore this featured promotion.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'sunday-featured-promotion',
    image: 'https://i.imgur.com/V9tDnF9.jpeg',
    tag: 'Sunday Special',
    title: 'A little extra for your Sunday.',
    scope: 'casino',
    description: 'Explore this featured promotion.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
  },
  {
    slug: 'crypto-featured-promotion',
    image: 'https://i.imgur.com/InQuRtL.jpeg',
    tag: 'Crypto Special',
    title: 'Explore a crypto-themed promotion.',
    scope: 'casino',
    description: 'Explore a crypto-themed promotion.',
    terms: ['Eligibility and reward conditions are subject to the published offer rules.', 'General Bonus Terms apply.'],
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
    id: 'atp-shanghai-zverev-davidovich',
    league: 'ATP Shanghai, China Men Singles', country: 'China', time: '09:30', date: '17/10',
    sport: 'Tennis', live: true, home: 'Alexander Zverev', away: 'Alejandro Davidovich Fokina',
    markets: [
      { label: 'Alexander Zverev', odds: '1.28' },
      { label: 'Alejandro Davidovich', odds: '3.66' },
    ],
    sportIcon: 'Tennis',
  },
  {
    id: 'wta-wuhan-kartal-ostapenko',
    league: 'WTA Wuhan, China Women Singles', country: 'China', time: '10:00', date: '17/10',
    sport: 'Tennis', live: true, home: 'Sonay Kartal', away: 'Jelena Ostapenko',
    markets: [
      { label: 'Sonay Kartal', odds: '1.71' },
      { label: 'Jelena Ostapenko', odds: '2.05' },
    ],
    sportIcon: 'Tennis',
  },
  {
    id: 'laliga-espanyol-atletico',
    league: 'LaLiga', country: 'Spain', time: '13:00', date: '17/10',
    sport: 'Football', live: true, home: 'RCD Espanyol', away: 'Atletico Madrid',
    markets: [
      { label: 'RCD Espanyol', odds: '5.22' },
      { label: 'X', odds: '4.31' },
      { label: 'Atletico Madrid', odds: '1.73' },
    ],
    sportIcon: 'Football',
  },
  {
    id: 'serie-a-venezia-napoli',
    league: 'Serie A', country: 'Italy', time: '14:00', date: '17/10',
    sport: 'Football', live: true, home: 'Venezia', away: 'Napoli',
    markets: [
      { label: 'Venezia', odds: '4.75' },
      { label: 'X', odds: '3.80' },
      { label: 'Napoli', odds: '1.85' },
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
