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
    <div className="mx-auto w-full max-w-screen-2xl px-4 pt-4 pb-8">
      <SectionRow title="Promotions" more="/promotions" fadeEdges={false} compactHeader>
        {PROMOTIONS.map((promotion) => (
          <PromoCard
            key={promotion.slug}
            promo={promotion}
            className="basis-full sm:basis-[calc(50%_-_4px)] lg:basis-[calc(33.333333%_-_5.333333px)] 2xl:basis-[calc(25%_-_6px)]"
          />
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

