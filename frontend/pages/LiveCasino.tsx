import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, CircleDot, Club, Dices, Flame, Gamepad2, Spade, Tv,
} from 'lucide-react'
import { GameCard, SectionRow } from '../components/cards'
import { GAMES } from '../data/catalog'
import { WinnersSection } from '../components/HomeSections'

const LIVE_GAMES = GAMES.filter((game) => game.live)

const LIVE_CATEGORIES = [
  { id: 'live-casino', label: 'Live Casino', icon: CircleDot },
  { id: 'live-roulettes', label: 'Live Roulettes', icon: CircleDot },
  { id: 'live-blackjack', label: 'Live Blackjack', icon: Spade },
  { id: 'baccarat', label: 'Baccarat', icon: Club },
  { id: 'card-games', label: 'Card Games', icon: Dices },
  { id: 'game-shows', label: 'Game Shows', icon: Tv },
]

const rouletteGames = LIVE_GAMES.filter((game) => /roulette/i.test(game.title))
const blackjackGames = LIVE_GAMES.filter((game) => /blackjack|hold.?em|poker/i.test(game.title))
const baccaratGames = LIVE_GAMES.filter((game) => /baccarat/i.test(game.title))
const cardGames = LIVE_GAMES.filter((game) => /baccarat|dragon tiger|hold.?em|poker/i.test(game.title))
const gameShowGames = LIVE_GAMES.filter((game) =>
  /crazy|mega|dream|boom|monopoly|funky|sweet bonanza|coin flip|sic bo/i.test(game.title),
)
const popularIds = [
  'crazy-time',
  'lightning-roulette',
  'sweet-candyland',
  'monopoly-big-baller',
  'mega-wheel',
  'dream-catcher',
  'funky-time',
  'mega-ball',
  'boom-city',
  'xxxtreme-lightning-roulette',
]
const popularGames = popularIds
  .map((id) => LIVE_GAMES.find((game) => game.id === id))
  .filter((game): game is (typeof LIVE_GAMES)[number] => Boolean(game))

function LiveCasinoCategories() {
  return (
    <section className="mb-6">
      <nav aria-label="Live casino categories" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {LIVE_CATEGORIES.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to={`#${id}`}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cb-card)] px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--cb-hover)] hover:text-white"
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}

function ShufflePick() {
  const [pickedId, setPickedId] = useState('crazy-time')
  const pickedGame = LIVE_GAMES.find((game) => game.id === pickedId) ?? LIVE_GAMES[0]

  const shuffle = () => {
    if (LIVE_GAMES.length < 2) return
    const alternatives = LIVE_GAMES.filter((game) => game.id !== pickedId)
    const next = alternatives[Math.floor(Math.random() * alternatives.length)]
    if (next) setPickedId(next.id)
  }

  if (!pickedGame) return null

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white md:text-xl">Not sure what game to play next?</h2>
          <p className="mt-1 text-sm text-slate-400">Let us pick a live game for you.</p>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--cb-yellow)] px-4 text-sm font-extrabold text-[#00151e] transition hover:brightness-105"
        >
          <Flame className="h-4 w-4" />
          Shuffle
        </button>
      </div>
      <div className="border-t border-[var(--cb-line)] p-4 md:p-6">
        <GameCard game={pickedGame} />
      </div>
    </section>
  )
}

export default function LiveCasino() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <LiveCasinoCategories />

      <div id="live-casino" className="scroll-mt-24">
        <SectionRow title="Live Casino" more="/live-casino#live-casino">
          {LIVE_GAMES.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="live-roulettes" className="scroll-mt-24">
        <SectionRow title="Live Roulettes" more="/live-casino#live-roulettes">
          {rouletteGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="live-blackjack" className="scroll-mt-24">
        <SectionRow title="Live Blackjack" more="/live-casino#live-blackjack">
          {blackjackGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="baccarat" className="scroll-mt-24">
        <SectionRow title="Baccarat" more="/live-casino#baccarat">
          {baccaratGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="card-games" className="scroll-mt-24">
        <SectionRow title="Card Games" more="/live-casino#card-games">
          {cardGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="game-shows" className="scroll-mt-24">
        <SectionRow title="Game Shows" more="/live-casino#game-shows">
          {gameShowGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <div id="popular-games" className="scroll-mt-24">
        <SectionRow title="Popular Games" more="/live-casino#popular-games">
          {popularGames.map((game) => <GameCard key={game.id} game={game} />)}
        </SectionRow>
      </div>

      <WinnersSection />
      <ShufflePick />
    </div>
  )
}
