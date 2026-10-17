import { SectionRow, GameCard, MatchCard, PromoCard } from '../components/cards'
import { GAMES, PROMOTIONS, SPORTS_EVENTS } from '../data/catalog'
import {
  SlotGamesSection,
  SportsHubSection,
  TopPicksSection,
  HalloweenSection,
  NewGamesSection,
  HotRightNowSection,
  PopularProvidersSection,
  VipSpecialsSection,
  WinnersSection,
} from '../components/HomeSections'

const TRENDING_IDS = [
  'zeus-vs-hades', 'lucky-ladys-charm', 'wild-clusters', 'raptor-doublemax',
  'wealth-bells-40', 'le-bandit', 'big-bass-trophy-catch', 'silver-coins',
  'eggs-of-fortune', 'blazing-coins',
]
const TRENDING = TRENDING_IDS
  .map((id) => GAMES.find((game) => game.id === id))
  .filter((game): game is (typeof GAMES)[number] => Boolean(game))

export default function Home() {
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1800px] pt-4 pb-8">
      <SectionRow title="Promotions" more="/promotions">
        {PROMOTIONS.slice(0, 3).map((promotion) => (
          <PromoCard key={promotion.slug} promo={promotion} />
        ))}
      </SectionRow>

      <SectionRow title="Trending Games" more="/casino/top-picks">
        {TRENDING.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </SectionRow>

      <SectionRow>
        {SPORTS_EVENTS.slice(0, 4).map((event) => (
          <MatchCard key={event.id} event={event} />
        ))}
      </SectionRow>

      <SlotGamesSection />
      <SportsHubSection />
      <TopPicksSection />
      <HalloweenSection />
      <NewGamesSection />
      <HotRightNowSection />
      <PopularProvidersSection />
      <VipSpecialsSection />
      <WinnersSection />
    </div>
  )
}

