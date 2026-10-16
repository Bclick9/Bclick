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

export default function Home() {
  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-0 py-6">
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
  )
}
