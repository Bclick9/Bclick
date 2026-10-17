import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionRow, GameArtCard } from './cards'

type Tile = {
  title: string
  provider: string
  image: string
  fallbackImage: string
}

const slots: Tile[] = [
  { title: '1000 Olympus Rivals', provider: 'Amigo Gaming', image: '/assets/games/slot-olympus-rivals.webp', fallbackImage: 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640' },
  { title: 'Chicken Coin', provider: 'InOut', image: '/assets/games/slot-chicken-coin.webp', fallbackImage: 'https://chicken-coin.eu/media/chicken-coin-content-69ce19ca5d59b072709746.webp' },
  { title: 'Vikings Go To Hollywood', provider: 'Yggdrasil', image: '/assets/games/slot-vikings-hollywood.jpg', fallbackImage: 'https://assets.aboutslots.com/uploads/assets/Vikings_Go_To_Holly_Wood_Wild_Fight_Rushing_Wilds_Yggdrasil_Slot_Thumbnail_1042ec92e7.jpg' },
  { title: 'Book of Ra Magic', provider: 'Novomatic', image: '/assets/games/slot-book-of-ra-magic.jpg', fallbackImage: 'https://slotslaunch.nyc3.digitaloceanspaces.com/12736/book-of-ra-magic.jpg' },
  { title: 'Moneyfest', provider: 'Popiplay', image: '/assets/games/slot-moneyfest.jpg', fallbackImage: 'https://cdnpp.net/admin/files/upload/origin/58bs9vwi-8aabjldrs-wcexdcckpj.jpg' },
  { title: 'Silver Coins', provider: 'BF Games', image: '/assets/games/slot-silver-coins.jpg', fallbackImage: 'https://bfgames.com/wp-content/uploads/2026/05/silver_coins_screens_web_1.jpg' },
  { title: 'Bonbon Pop 1000', provider: 'Pateplay', image: '/assets/games/slot-bonbon-pop-1000.png', fallbackImage: 'https://images.sigma.world/bombone.png' },
  { title: 'Blazing Coins', provider: 'Popiplay', image: '/assets/games/slot-blazing-coins.jpg', fallbackImage: 'https://shuffle.com/api/v1/images/og-image?gameID=3c4f6168-b2e0-4795-b333-f09f2a838a9b' },
  { title: 'Sun Totem Hold & Win', provider: 'Novomatic', image: '/assets/games/slot-sun-totem.webp', fallbackImage: 'https://mediumrare.imgix.net/d392426cb16f39f298956bbb8e6580bfdd7ff8fcb2da2df96658d1f0d3d5d2c9?auto=format&fit=min&h=800&w=800' },
  { title: '3 Lucky Nuggets', provider: 'Popiplay', image: '/assets/games/slot-3-lucky-nuggets.jpg', fallbackImage: 'https://www.popiplay.com/wp-content/uploads/2026/06/3Lucky_Nuggets_1920x1080.jpg' },
]

const topPicks: Tile[] = [
  { title: 'Better Barn House Bonanza', provider: 'Pragmatic Play', image: '/assets/games/top-better-barn.webp', fallbackImage: 'https://www.thesunvegas.co.uk/library/2026/games/Q2/BetterBarnHouseBonanza_540x540.webp' },
  { title: 'Book of Ra', provider: 'Novomatic', image: '/assets/games/top-book-of-ra.jpg', fallbackImage: 'https://slotslaunch.nyc3.digitaloceanspaces.com/12736/book-of-ra-magic.jpg' },
  { title: '3 Peppers of Fire', provider: 'Gamebeat', image: '/assets/games/top-3-peppers.jpg', fallbackImage: 'https://assets.slotslaunch.com/111126/3-peppers-of-fire.jpg' },
  { title: 'Burning Chilli X', provider: 'BGaming', image: '/assets/games/top-burning-chilli.webp', fallbackImage: 'https://mediumrare.imgix.net/d74820446fac2adf5864d441266bc769b8a79711ebd3b359fef93d6cd92e3cb0?auto=format&dpr=2&format=auto&q=70' },
  { title: 'Raptor Doublemax', provider: 'Yggdrasil', image: '/assets/games/top-raptor-doublemax.jpg', fallbackImage: 'https://spike-images.s3.eu-central-1.amazonaws.com/raptor-double-max-slot-online-logo_972adb11fc.jpeg' },
  { title: 'Jokers Wild Chaos', provider: 'Mascot', image: '/assets/games/top-jokers-wild-chaos.webp', fallbackImage: 'https://mascot.games/wp-content/uploads/2026/08/jokers-wild-chaos.webp' },
  { title: 'Moneyfest', provider: 'Popiplay', image: '/assets/games/slot-moneyfest.jpg', fallbackImage: 'https://cdnpp.net/admin/files/upload/origin/58bs9vwi-8aabjldrs-wcexdcckpj.jpg' },
  { title: 'Volcano Golden Coins', provider: 'Gamebeat', image: '/assets/games/top-volcano-golden-coins.jpg', fallbackImage: 'https://static.tildacdn.net/tild3037-3636-4131-a132-343130393265/Volcano_Golden_Coins.jpg' },
  { title: "Fisherman's Luck", provider: 'Pragmatic Play', image: '/assets/games/top-fishermans-luck.webp', fallbackImage: 'https://www.x3000.ee/cdn-cgi/image/width%3D800%2Cquality%3D85%2Cblur%3D0%2Cformat%3Dwebp/https%3A/cdn.sanity.io/images/ol1w6ddr/paf-prod/b0e391fe0b5353204aeb55793dc98a0f0df89df8-900x900.jpg?q=100' },
  { title: 'The Jealous Ex', provider: 'Betsoft', image: '/assets/games/top-jealous-ex.jpg', fallbackImage: 'https://assets.aboutslots.com/uploads/assets/the_jealous_ex_betsoft_casino_slot_banner_dc809f1271.jpg' },
]

const halloweenGames: Tile[] = [
  { title: 'Death Dominion', provider: 'Pragmatic Play', image: '/assets/games/halloween-death-dominion.webp', fallbackImage: 'https://pragmaticspins.com/images/slots/death-dominion.webp' },
  { title: 'Coins of Halloween', provider: 'Betsoft', image: '/assets/games/halloween-coins-of-halloween.jpg', fallbackImage: 'https://assets.aboutslots.com/uploads/assets/coins_of_halloween_hold_and_win_betsoft_slot_banner_91f38cdb25.jpg' },
  { title: 'Wolf Power Megaways', provider: 'Playson', image: '/assets/games/halloween-wolf-power.webp', fallbackImage: 'https://media.royalpanda.com/images/games/wolf-power-megaways/wolf-power-megaways-tile.jpg' },
  { title: 'Spooky Kabuki', provider: 'Yggdrasil', image: '/assets/games/halloween-spooky-kabuki.webp', fallbackImage: 'https://assets.aboutslots.com/uploads/assets/spooky_kabuki_yggdrasil_slot_thumbnail.jpg' },
  { title: 'Vamp Hunt', provider: 'Pateplay', image: '/assets/games/halloween-vamp-hunt.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: 'Halloween Bonanza', provider: 'BGaming', image: '/assets/games/halloween-bonanza.webp', fallbackImage: 'https://pictures.tribuna.com/image/5f4d89cc-6ff9-449a-9935-9022c64fe184?quality=85&width=1200' },
  { title: 'Haunted Coins X1000', provider: 'Wazdan', image: '/assets/games/halloween-haunted-coins.jpg', fallbackImage: 'https://static-wazdan.com/vault/assets/220/dca0abdd4d775ec2e2478e7e288ad8d3841b0242fedd1faca11115ba46103dbd.jpg?save_as=HauntedCoinsx1000_icon_960x720.jpg' },
  { title: 'Halloween Jack', provider: 'Netent', image: '/assets/games/halloween-jack.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: "Devil's Feast", provider: 'Pateplay', image: '/assets/games/halloween-devils-feast.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
]

const newGames: Tile[] = [
  { title: 'Wicked Grin', provider: 'Hacksaw', image: '/assets/games/new-wicked-grin.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: '9 Orbs of Gold', provider: 'Yggdrasil', image: '/assets/games/new-9-orbs-of-gold.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: 'Divine Queen Power of Sun', provider: 'BGaming', image: '/assets/games/new-divine-queen-power-of-sun.png', fallbackImage: 'https://storage.googleapis.com/www.hellomillions.com/en-us/tiles-v2/DivineQueenPowerOfSun/source.png' },
  { title: 'Zeus Flip', provider: 'InOut', image: '/assets/games/new-zeus-flip.webp', fallbackImage: 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640' },
  { title: 'Spooky Wild 40', provider: 'Expanse Studios', image: '/assets/games/new-spooky-wild-40.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: "Candy's Extra Scatter", provider: 'Expanse Studios', image: '/assets/games/new-candys-extra-scatter.webp', fallbackImage: 'https://images.sigma.world/bombone.png' },
  { title: 'Crimson Heart', provider: 'Spadegaming', image: '/assets/games/new-crimson-heart.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
  { title: 'Mighty Wild Gorilla Halloween Edition', provider: 'Wazdan', image: '/assets/games/new-mighty-wild-gorilla.jpg', fallbackImage: 'https://categories.ivycasino.com/uploads/images/1767949180_mighty-wild-gorilla.jpg' },
  { title: 'Icarus Heat of Fortune', provider: 'Mancala', image: '/assets/games/new-icarus-heat-of-fortune.webp', fallbackImage: 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640' },
  { title: "Cat 'n Rat", provider: 'GameArt', image: '/assets/games/new-cat-n-rat.webp', fallbackImage: 'https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp' },
]

const vipGames: Tile[] = [
  { title: 'Starlight Princess 1000', provider: 'Pragmatic Play', image: '/assets/games/vip-starlight-princess-1000.jpg', fallbackImage: 'https://media.leovegas.com/lv/games/9KDqwYmpZ/Xj4pAflv75vKGe.jpg' },
  { title: 'Lord of the Ocean', provider: 'Novomatic', image: '/assets/games/vip-lord-of-the-ocean.webp', fallbackImage: 'https://media.leovegas.com/lv/games/9KDqwYmpZ/Xj4pAflv75vKGe.jpg' },
  { title: 'Gates of Olympus 1000', provider: 'Pragmatic Play', image: '/assets/games/vip-gates-of-olympus-1000.webp', fallbackImage: 'https://media.leovegas.de/lv/games/aemb9PnNr/kg1noTVMjlq5Jw.jpg' },
  { title: 'Lady Wolf Moon Megaways', provider: 'BGaming', image: '/assets/games/vip-lady-wolf-moon.webp', fallbackImage: 'https://bgaming.com/wp-content/uploads/2025/06/64fc11aa2a90afe306718e1e_63ef3a53bd155d7136b3dd83_LadyWolfMoonlogo_vertical.webp' },
  { title: '1000 Olympus Rivals', provider: 'Amigo Gaming', image: '/assets/games/slot-olympus-rivals.webp', fallbackImage: 'https://betfm.com/_next/image/?q=70&url=https%3A%2F%2Fs3.betfm.com%2Fgame-media%2Fgames%2Fst8%2Fago_1000_olympus_rivals.webp&w=640' },
  { title: 'The VIP', provider: 'Betsoft', image: '/assets/games/vip-the-vip.webp', fallbackImage: 'https://assets.aboutslots.com/uploads/assets/the_jealous_ex_betsoft_casino_slot_banner_dc809f1271.jpg' },
  { title: 'Dragon Pots', provider: 'InOut', image: '/assets/games/vip-dragon-pots.webp', fallbackImage: 'https://cdn1.svenskaspel.net/content/cms/images/640/auto/e3f2bc3a-2d64-49ab-ae4c-347cc4bac2f4/c_7017606366903/a97e7aa0-14ba-42da-b205-c8ce99de6c09/1.0/3-Dragon-Pots-Logo.jpg' },
  { title: 'Voltage Blitz Rapid Boost', provider: 'RubyPlay', image: '/assets/games/vip-voltage-blitz.webp', fallbackImage: 'https://content.hollywoodbets.net/voltage_blitz_rapid_b8bf2fd3df.webp' },
  { title: 'Le Hooligan', provider: 'Hacksaw', image: '/assets/games/vip-le-hooligan.webp', fallbackImage: 'https://media.leovegas.com/images/games/le-bandit/le-bandit-tile.jpg?tr=w-1920' },
  { title: 'Coins of Dragon', provider: 'Betsoft', image: '/assets/games/vip-coins-of-dragon.webp', fallbackImage: 'https://cdn1.svenskaspel.net/content/cms/images/640/auto/e3f2bc3a-2d64-49ab-ae4c-347cc4bac2f4/c_7017606366903/a97e7aa0-14ba-42da-b205-c8ce99de6c09/1.0/3-Dragon-Pots-Logo.jpg' },
]

const homeBanners = [
  {
    title: 'Prediction Markets',
    description: 'Explore a whole new world of possibilities',
    button: 'GET STARTED',
    image: '/assets/home/prediction-market.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/PredictionMarket.webp',
    href: '/sports',
  },
  {
    title: 'Your Champions League Hub',
    description: 'Your gateway to matchday action',
    button: 'GET STARTED',
    image: '/assets/home/champions-league.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/champions-league.webp',
    href: '/sports',
  },
  {
    title: 'Your Premier League, your way',
    description: 'The full lineup, all in ONE spot!',
    button: 'EXPLORE NOW',
    image: '/assets/home/premier-league.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/f9fa51ea-7845-4f4a-8cc3-eb2f0fca0245/premier-league.webp',
    href: '/sports',
  },
]

const hotNow = [
  {
    title: 'Novomatic adventures',
    description: 'Innovative features & immersive gameplay',
    image: '/assets/home/novomatic.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Novomatic.webp',
  },
  {
    title: 'The World of Endorphina',
    description: 'Top games, tournaments, promotions, rewards & more',
    image: '/assets/home/endorphina.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Endorphina.webp',
  },
  {
    title: 'Level Up with Ruby Play',
    description: 'Premium slots, immersive design & standout features',
    image: '/assets/home/rubyplay.webp',
    fallbackImage: 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/RubyPlay.webp',
  },
]

const providers = [
  { title: 'Pragmatic Play', short: 'PRAGMATIC PLAY', symbol: '◉' },
  { title: 'Hacksaw Gaming', short: 'HACKSAW', symbol: '✦' },
  { title: 'Nolimit', short: 'NOLIMIT CITY', symbol: 'N' },
  { title: 'Netent', short: 'NETENT', symbol: 'N' },
  { title: 'Pateplay', short: 'Pateplay', symbol: '☀' },
  { title: 'Three Oaks', short: 'THREE OAKS', symbol: '✥' },
  { title: 'Triav', short: 'Triav', symbol: '⋈' },
  { title: 'Popiplay', short: 'p◎piplay', symbol: '●' },
  { title: 'Mascot', short: 'MASCOT', symbol: '★' },
  { title: 'RubyPlay', short: 'RUBYPLAY', symbol: '◆' },
  { title: 'Endorphina', short: 'endorphina', symbol: '∞' },
  { title: 'Evoplay', short: 'EVOPLAY', symbol: 'E' },
]

export function SlotGamesSection() {
  return (
    <SectionRow title="Slot Games" more="/casino/slot-games">
      {slots.map((game, index) => <GameArtCard key={game.title} {...game} spriteSheet="/assets/home/casino-atlases.webp" spriteIndex={index} spriteCount={10} spriteRow={1} spriteRows={6} />)}
    </SectionRow>
  )
}

export function SportsHubSection() {
  return (
    <SectionRow title="Sports & Markets Hub" more="/sports">
      {homeBanners.map((banner, index) => <HomeBanner key={banner.title} {...banner} spriteSheet="/assets/home/banners-atlas.webp" spriteIndex={index} spriteCount={3} spriteRow={0} spriteRows={2} />)}
    </SectionRow>
  )
}

export function TopPicksSection() {
  return (
    <SectionRow title="Top Picks" more="/casino/top-picks">
      {topPicks.map((game, index) => <GameArtCard key={game.title} {...game} spriteSheet="/assets/home/casino-atlases.webp" spriteIndex={index} spriteCount={10} spriteRow={2} spriteRows={6} />)}
    </SectionRow>
  )
}

export function HalloweenSection() {
  const [imageSource, setImageSource] = useState('/assets/home/halloween-background.webp')
  const [fallbackUsed, setFallbackUsed] = useState(false)
  return (
    <section className="mb-6 relative isolate min-h-[390px] overflow-hidden rounded-xl bg-[#190f32]">
      <img
        src={imageSource}
        onError={() => {
          if (!fallbackUsed) {
            setFallbackUsed(true)
            setImageSource('https://campeonbet.io/assets/cms/79df88dc-e0a4-444b-bc40-432e5b703410/Halloween-2026.webp')
          }
        }}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="px-4 pt-10 md:px-14 md:pt-10">
        <h2 className="mb-4 text-base font-black text-white md:text-xl">Halloween Games</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {halloweenGames.map((game, index) => <GameArtCard key={game.title} {...game} spriteSheet="/assets/home/casino-atlases.webp" spriteIndex={index} spriteCount={10} spriteRow={3} spriteRows={6} className="w-[141px] md:w-[141px]" />)}
        </div>
      </div>
    </section>
  )
}

export function NewGamesSection() {
  return (
    <SectionRow title="New Games" more="/casino/new-games">
      {newGames.map((game, index) => <GameArtCard key={game.title} {...game} spriteSheet="/assets/home/casino-atlases.webp" spriteIndex={index} spriteCount={10} spriteRow={4} spriteRows={6} />)}
    </SectionRow>
  )
}

export function HotRightNowSection() {
  return (
    <SectionRow title="🔥 Hot Right Now" more="/casino/providers">
      {hotNow.map((banner, index) => <HomeBanner key={banner.title} {...banner} spriteSheet="/assets/home/banners-atlas.webp" spriteIndex={index} spriteCount={3} spriteRow={1} spriteRows={2} button="EXPLORE NOW" href="/casino/providers" />)}
    </SectionRow>
  )
}

export function PopularProvidersSection() {
  return (
    <SectionRow title="Popular Providers" more="/casino/rng/brands">
      {providers.slice(0, 8).map((provider, index) => (
        <Link
          key={provider.title}
          to="/casino/rng/brands"
          title={provider.title}
          className="cb-provider-card group relative block h-[103px] w-[176px] shrink-0 overflow-hidden rounded-lg bg-[var(--cb-card)] transition-colors hover:ring-1 hover:ring-[var(--cb-yellow)]"
        >
          <img
            src="/assets/home/popular-providers.webp"
            alt={provider.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute top-0 h-full max-w-none object-fill transition-transform duration-200 group-hover:scale-[1.02]"
            style={{ width: '800%', height: '100%', left: `${-index * 100}%`, top: 0 }}
          />
        </Link>
      ))}
    </SectionRow>
  )
}

export function VipSpecialsSection() {
  return (
    <SectionRow title="VIP Specials" more="/vip">
      {vipGames.map((game, index) => <GameArtCard key={game.title} {...game} spriteSheet="/assets/home/casino-atlases.webp" spriteIndex={index} spriteCount={10} spriteRow={5} spriteRows={6} />)}
    </SectionRow>
  )
}

const topWinners = [
  { title: 'Sugar Merge Up', provider: 'Pateplay', winner: 'Li****** ***ng', amount: '€5,295.69', image: '/assets/games/slot-blazing-coins.jpg' },
  { title: 'Crystal Clusters', provider: 'BGaming', winner: 'Li****** ***ng', amount: '€5,040.02', image: '/assets/games/slot-silver-coins.jpg' },
  { title: "Frank's Farm", provider: 'Pateplay', winner: 'Fl***** **us', amount: '€3,850.60', image: '/assets/games/slot-3-lucky-nuggets.jpg' },
  { title: 'Regal Spins 20', provider: 'Pateplay', winner: 'Ba***** ***ge', amount: '€3,670.00', image: '/assets/games/slot-moneyfest.jpg' },
  { title: 'Crystal Clusters', provider: 'BGaming', winner: 'Li****** ***ng', amount: '€3,495.10', image: '/assets/games/slot-silver-coins.jpg' },
  { title: 'Wild Cash', provider: 'Pragmatic Play', winner: 'Fl***** **us', amount: '€3,410.56', image: '/assets/games/top-fishermans-luck.webp' },
]

const liveWinners = [
  { title: 'Bigger Bass Bonanza', provider: 'Pragmatic Play', winner: 'Mo****** **in', amount: '€8,160.00', image: '/assets/games/top-fishermans-luck.webp' },
  { title: 'Big Bass Splash', provider: 'Pragmatic Play', winner: 'Li****** ***ng', amount: '€7,712.00', image: '/assets/games/top-fishermans-luck.webp' },
  { title: 'Big Bass Splash', provider: 'Pragmatic Play', winner: 'Li****** ***ng', amount: '€5,885.00', image: '/assets/games/top-fishermans-luck.webp' },
  { title: 'Bigger Bass Splash', provider: 'Pragmatic Play', winner: 'Po****** **e', amount: '€5,000.00', image: '/assets/games/top-fishermans-luck.webp' },
  { title: 'Sugar Merge Up', provider: 'Pateplay', winner: 'Al****** **u', amount: '€5,295.69', image: '/assets/games/slot-blazing-coins.jpg' },
  { title: 'Gates of Olympus', provider: 'Pragmatic Play', winner: 'Fl***** **us', amount: '€5,261.00', image: '/assets/games/vip-gates-of-olympus-1000.webp' },
]

export function WinnersSection() {
  const [activeTab, setActiveTab] = useState<'top' | 'live'>('top')
  const winners = activeTab === 'top' ? topWinners : liveWinners
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-[var(--cb-card)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('top')}
            className={`rounded-md px-2 py-1.5 text-xs font-black transition-colors ${activeTab === 'top' ? 'bg-[var(--cb-yellow)] text-[#00151e]' : 'text-slate-300 hover:text-white'}`}
          >
            Top winners
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`rounded-md px-2 py-1.5 text-xs font-black transition-colors ${activeTab === 'live' ? 'bg-[var(--cb-yellow)] text-[#00151e]' : 'text-slate-300 hover:text-white'}`}
          >
            Live winners
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {winners.map((winner, i) => (
          <div key={winner.title + i} className="flex w-[202px] shrink-0 items-center gap-2 rounded-lg bg-[var(--cb-card)] p-2">
            <img src={winner.image} alt="" className="h-[58px] w-[58px] rounded-md object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[10px] text-slate-400">{winner.title}</p>
              <p className="truncate text-[10px] text-slate-300">{winner.winner}</p>
              <p className="mt-1 text-sm font-black text-white">{winner.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HomeBanner({
  title,
  description,
  button,
  image,
  fallbackImage,
  spriteSheet,
  spriteIndex,
  spriteCount = 3,
  href = '/sports',
}: {
  title: string
  description: string
  button: string
  image: string
  fallbackImage: string
  spriteSheet?: string
  spriteIndex?: number
  spriteCount?: number
  href?: string
}) {
  const [imageSource, setImageSource] = useState(image)
  const [fallbackUsed, setFallbackUsed] = useState(false)
  const [spriteFailed, setSpriteFailed] = useState(false)
  const useSprite = Boolean(spriteSheet) && typeof spriteIndex === 'number' && !spriteFailed

  return (
    <Link to={href} className="cb-feature-banner group relative flex h-[240px] min-w-0 flex-1 shrink-0 overflow-hidden rounded-xl bg-[#06121c]">
      {useSprite ? (
        <img
          src={spriteSheet}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setSpriteFailed(true)}
          className="absolute top-0 h-full max-w-none object-fill transition-transform duration-300 group-hover:scale-[1.025]"
          style={{ width: `${spriteCount * 100}%`, left: `${-(spriteIndex ?? 0) * 100}%` }}
        />
      ) : (
        <img
          src={imageSource}
          onError={() => {
            if (!fallbackUsed) {
              setFallbackUsed(true)
              setImageSource(fallbackImage)
            }
          }}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
        />
      )}
      <span className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
      <div className="relative z-10 flex w-full max-w-[58%] flex-col items-start justify-between p-5 md:p-6">
        <div>
          <h3 className="text-base font-black leading-snug text-white md:text-xl">{title}</h3>
          <p className="mt-2 max-w-[230px] text-sm leading-snug text-slate-200 md:text-base">{description}</p>
        </div>
        <span className="inline-flex h-10 items-center rounded-lg bg-[var(--cb-yellow)] px-4 text-xs font-black text-[#00151e] transition-transform duration-150 group-hover:-translate-y-0.5">
          {button}
        </span>
      </div>
    </Link>
  )
}
