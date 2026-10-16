import { Link } from 'react-router-dom'
import { SectionRow, PromoCard, GameCard, MatchCard } from '../components/cards'
import { GAMES, PROMOTIONS, SPORTS_EVENTS } from '../data/catalog'

const byId = (id: string) => GAMES.find((g) => g.id === id)!

const TRENDING = [
  'zeus-vs-hades', 'lucky-ladys-charm', 'wild-clusters', 'raptor-doublemax',
  'wealth-bells-40', 'le-bandit', 'big-bass-trophy-catch', 'silver-coins',
  'eggs-of-fortune', 'blazing-coins',
].map(byId)

const SLOTS = [
  'book-of-dead', 'sweet-bonanza', 'gates-of-olympus', 'starburst', 'razor-shark',
  'money-train-3', 'wanted-dead-or-a-wild', 'sugar-rush', 'fire-in-the-hole', 'wolf-gold',
].map(byId)

const LIVE_GAMES = GAMES.filter((g) => g.live)

export function HomeHero() {
  return (
    <div className="mx-4 md:mx-0 mt-4 rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground leading-tight">
            Start with 350% up to €2000 &amp; 1000 FS
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-xl">
            Grab the Welcome Casino Package on your first deposits and kick off your
            CampeonBet journey with a champion-sized boost.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              to="/promotions/welcome-casino-package"
              className="h-11 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm flex items-center hover:brightness-110 transition-all"
            >
              Claim bonus
            </Link>
            <Link
              to="/promotions"
              className="h-11 px-6 rounded-lg border border-border bg-secondary font-bold text-sm flex items-center text-foreground hover:bg-accent transition-colors"
            >
              All promotions
            </Link>
          </div>
        </div>
        <div className="w-full md:w-[420px] aspect-[16/9] rounded-xl bg-zinc-300 dark:bg-zinc-600/70 border border-zinc-400/60 flex items-center justify-center text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Hero banner placeholder
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <HomeHero />

      <div className="mt-8">
        <SectionRow title="Promotions" more="/promotions">
          {PROMOTIONS.slice(0, 3).map((p) => (
            <PromoCard key={p.slug} promo={p} />
          ))}
        </SectionRow>

        <SectionRow title="Trending Games" more="/casino/top-picks">
          {TRENDING.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </SectionRow>

        <SectionRow title="Live Matches" more="/sports">
          {SPORTS_EVENTS.slice(0, 4).map((e) => (
            <MatchCard key={e.id} event={e} />
          ))}
        </SectionRow>

        <SectionRow title="Slot Games" more="/casino/slot-games">
          {SLOTS.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </SectionRow>

        <SectionRow title="Live Casino" more="/live-casino">
          {LIVE_GAMES.slice(0, 8).map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </SectionRow>
      </div>
    </div>
  )
}
