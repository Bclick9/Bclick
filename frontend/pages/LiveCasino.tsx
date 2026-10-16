import { GameCard, PageTitle } from '../components/cards'
import { GAMES } from '../data/catalog'

export default function LiveCasino() {
  const live = GAMES.filter((g) => g.live)
  const tables = live.filter((g) => /roulette|baccarat|blackjack|hold'em|poker/i.test(g.title))
  const shows = live.filter((g) => !tables.includes(g))

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <PageTitle
        title="Live Casino"
        subtitle="Real dealers, real tables — streamed around the clock."
      />

      <div className="rounded-2xl bg-card border border-border overflow-hidden mb-8">
        <div className="flex items-center justify-between p-4 md:p-6 pb-0">
          <h2 className="text-lg md:text-xl font-extrabold text-foreground">Live Tables</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar p-4 md:p-6">
          {tables.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 pb-0">
          <h2 className="text-lg md:text-xl font-extrabold text-foreground">Game Shows</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar p-4 md:p-6">
          {shows.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </div>
    </div>
  )
}
