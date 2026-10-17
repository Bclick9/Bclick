import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, SlidersHorizontal, ChevronLeft,
  ChevronRight, Info, type LucideIcon,
} from 'lucide-react'
import { GameCard, PromoCard, Wireframe } from '../components/cards'
import { GAMES, CASINO_CATEGORIES, PROMOTIONS, type Game } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const ICONS: Record<string, LucideIcon> = {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade, Trophy,
}

function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateButtons = () => {
      const maxScroll = element.scrollWidth - element.clientWidth
      setCanScrollLeft(element.scrollLeft > 2)
      setCanScrollRight(maxScroll > 2 && element.scrollLeft < maxScroll - 2)
    }

    updateButtons()
    element.addEventListener('scroll', updateButtons, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateButtons)
      : null
    resizeObserver?.observe(element)
    Array.from(element.children).forEach((child) => resizeObserver?.observe(child))

    return () => {
      element.removeEventListener('scroll', updateButtons)
      resizeObserver?.disconnect()
    }
  }, [])

  const scroll = (direction: -1 | 1) => {
    const element = ref.current
    if (!element) return
    element.scrollBy({
      left: direction * Math.max(280, element.clientWidth * 0.78),
      behavior: 'smooth',
    })
  }

  return { ref, canScrollLeft, canScrollRight, scroll }
}

function ScrollArrow({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
  label: string
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-arrow-bg)] text-[var(--cb-arrow-icon)] shadow-lg transition-colors hover:bg-[var(--cb-hover)] hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function CategoryStrip({ active }: { active: string }) {
  const rail = useHorizontalScroll()

  return (
    <nav className="horizontal-scroll casinoCategories relative mb-3" aria-label="Casino categories">
      <div
        ref={rail.ref}
        className="horizontal-scroll__inner flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pr-1 scroll-smooth"
      >
        {CASINO_CATEGORIES.map((category) => {
          const Icon = category.slug === 'lobby' ? LayoutGrid : (ICONS[category.icon] ?? Gem)
          const isActive = category.slug === active
          return (
            <Link
              key={category.slug}
              to={'/casino/' + category.slug}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'ds-chip flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-4 text-[11px] font-extrabold uppercase tracking-[0.07em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]',
                isActive
                  ? 'ds-chip--selected border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#00151e]'
                  : 'border-[var(--cb-line)] bg-[var(--cb-card)] text-slate-200 hover:bg-[var(--cb-hover)] hover:border-slate-500',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{category.slug === 'lobby' ? 'Games' : category.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-[var(--cb-content)] to-transparent pl-8">
        <div className="pointer-events-auto hidden items-center gap-1.5 md:flex">
          <ScrollArrow
            direction="left"
            disabled={!rail.canScrollLeft}
            onClick={() => rail.scroll(-1)}
            label="Scroll casino categories left"
          />
          <ScrollArrow
            direction="right"
            disabled={!rail.canScrollRight}
            onClick={() => rail.scroll(1)}
            label="Scroll casino categories right"
          />
        </div>
      </div>
    </nav>
  )
}

function CasinoNavigationAndFilters({
  active,
  searchQuery,
  onSearchQueryChange,
  selectedProvider,
  onProviderChange,
}: {
  active: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedProvider: string
  onProviderChange: (value: string) => void
}) {
  const providers = useMemo(
    () => [...new Set(GAMES.map((game) => game.provider))].sort((a, b) => a.localeCompare(b)),
    [],
  )

  return (
    <div className="casinoNavigationAndFilters mb-6">
      <CategoryStrip active={active} />

      <div className="casinoGameProviderFilters grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(210px,280px)]">
        <label className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] px-3.5 transition-colors focus-within:border-[var(--cb-yellow)]">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-[var(--cb-yellow)]" />
          <span className="flex min-w-0 flex-1 flex-col py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Game Search</span>
            <input
              type="search"
              aria-label="Game Search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search games..."
              className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:ring-0"
            />
          </span>
          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear game search"
              onClick={() => onSearchQueryChange('')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[var(--cb-hover)] hover:text-white"
            >
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          ) : null}
        </label>

        <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] px-3.5 transition-colors focus-within:border-[var(--cb-yellow)]">
          <SlidersHorizontal className="h-[18px] w-[18px] shrink-0 text-slate-400" />
          <span className="flex min-w-0 flex-1 flex-col py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Providers</span>
            <select
              aria-label="Filter by provider"
              value={selectedProvider}
              onChange={(event) => onProviderChange(event.target.value)}
              className="w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none focus:ring-0"
            >
              <option value="all" className="bg-[var(--cb-nav)] text-white">All providers</option>
              {providers.map((provider) => (
                <option key={provider} value={provider} className="bg-[var(--cb-nav)] text-white">
                  {provider}
                </option>
              ))}
            </select>
          </span>
          <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" />
        </label>
      </div>
    </div>
  )
}

function GameRail({
  title,
  games,
  more,
}: {
  title: string
  games: Game[]
  more?: string
}) {
  const rail = useHorizontalScroll()
  const columns: Game[][] = []
  for (let index = 0; index < games.length; index += 2) {
    columns.push(games.slice(index, index + 2))
  }

  return (
    <section className="casinoHorizontalGamesList mb-8 min-w-0">
      <div className="sectionTitle mb-3 flex min-h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="sectionTitleText truncate text-lg font-extrabold text-white md:text-xl">{title}</h2>
          <span className="shrink-0 text-xs font-semibold text-slate-400">{games.length}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {more ? (
            <Link
              to={more}
              className="hidden text-xs font-bold text-[var(--cb-yellow)] transition-colors hover:text-white sm:inline-flex"
            >
              View all
            </Link>
          ) : null}
          <div className="hidden items-center gap-1.5 sm:flex">
            <ScrollArrow
              direction="left"
              disabled={!rail.canScrollLeft}
              onClick={() => rail.scroll(-1)}
              label={'Scroll ' + title + ' left'}
            />
            <ScrollArrow
              direction="right"
              disabled={!rail.canScrollRight}
              onClick={() => rail.scroll(1)}
              label={'Scroll ' + title + ' right'}
            />
          </div>
        </div>
      </div>

      {games.length === 0 ? (
        <p className="rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] px-4 py-10 text-center text-sm text-slate-400">
          No games match these filters.
        </p>
      ) : (
        <div
          ref={rail.ref}
          role="list"
          aria-label={title}
          className="carouselWrapper carousel flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 scroll-smooth snap-x snap-mandatory"
        >
          {columns.map((column) => (
            <div
              key={column.map((game) => game.id).join('-')}
              role="listitem"
              className="casinoGamesWidgetColumn flex w-[112px] shrink-0 snap-start flex-col gap-3 sm:w-[124px] md:w-[141px]"
            >
              {column.map((game) => (
                <GameCard key={game.id} game={game} className="w-full min-w-0" />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function GameGrid({
  ids,
  title = 'Casino games',
  more,
}: {
  ids: string[]
  title?: string
  more?: string
}) {
  const games = useMemo(
    () => ids.map((id) => GAMES.find((game) => game.id === id)).filter((game): game is Game => Boolean(game)),
    [ids],
  )
  return <GameRail title={title} games={games} more={more} />
}

function HalloweenBanner({ games }: { games: string[] }) {
  const rail = useHorizontalScroll()
  const halloweenGames = games
    .map((id) => GAMES.find((game) => game.id === id))
    .filter((game): game is Game => Boolean(game))

  return (
    <div className="rounded-2xl border border-[var(--cb-line)] bg-[var(--cb-card)] mb-8 overflow-hidden">
      <img
        src="https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Halloween-2026.webp"
        alt="CampeonBet Halloween Games"
        loading="lazy"
        className="block aspect-[5.2/1] w-full object-cover"
      />
      <div className="relative p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white md:text-xl">Halloween Games</h2>
          <div className="hidden items-center gap-2 md:flex">
            <ScrollArrow
              direction="left"
              disabled={!rail.canScrollLeft}
              onClick={() => rail.scroll(-1)}
              label="Scroll Halloween games left"
            />
            <ScrollArrow
              direction="right"
              disabled={!rail.canScrollRight}
              onClick={() => rail.scroll(1)}
              label="Scroll Halloween games right"
            />
          </div>
        </div>
        <div ref={rail.ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {halloweenGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CasinoCategory() {
  const { category = 'lobby' } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')

  useEffect(() => {
    setSearchQuery('')
    setSelectedProvider('all')
  }, [category])

  const cat = CASINO_CATEGORIES.find((item) => item.slug === category)
  const known = CASINO_CATEGORIES.some((item) => item.slug === category) || category === 'drop-and-wins'
  const categoryGames = useMemo(
    () => GAMES.filter((game) => category === 'lobby' || game.categories.includes(category)),
    [category],
  )
  const visibleGames = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return categoryGames.filter((game) => (
      (selectedProvider === 'all' || game.provider === selectedProvider) &&
      (!query || game.title.toLocaleLowerCase().includes(query) || game.provider.toLocaleLowerCase().includes(query))
    ))
  }, [categoryGames, searchQuery, selectedProvider])

  if (category === 'providers') return <Providers />
  if (!known) return <Navigate to="/casino" replace />

  const isLobby = category === 'lobby'
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedProvider !== 'all'

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-8 md:py-6">
      <CasinoNavigationAndFilters
        active={category}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
      />

      {hasActiveFilters ? (
        <GameRail title="Casino games" games={visibleGames} />
      ) : isLobby ? (
        <>
          <GameRail title="Casino games" games={visibleGames} more="/casino/slot-games" />

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-white md:text-xl">Promotions</h2>
              <Link
                to="/promotions"
                className="text-xs font-bold text-[var(--cb-yellow)] transition-colors hover:text-white"
              >
                View all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 md:gap-4">
              {PROMOTIONS.filter((promo) => promo.scope === 'casino').map((promo) => (
                <PromoCard key={promo.slug} promo={promo} />
              ))}
            </div>
          </div>

          <HalloweenBanner games={[
            'death-dominion', 'coins-of-halloween', 'wolf-power-megaways', 'spooky-kabuki',
            'vamp-hunt', 'halloween-bonanza', 'haunted-coins', 'halloween-jack', 'devils-feast',
          ]} />

          <GameGrid
            title="Top Picks"
            more="/casino/top-picks"
            ids={GAMES.filter((game) => game.categories.includes('top-picks')).map((game) => game.id)}
          />
        </>
      ) : (
        <GameRail
          title={cat?.label ?? 'Casino games'}
          games={visibleGames}
          more={category === 'slot-games' ? undefined : '/casino/' + category}
        />
      )}
    </div>
  )
}

export function CasinoLobby() {
  return <CasinoCategory />
}

/* Casino landing alias */
export function CasinoIndex() {
  return <Navigate to="/casino/lobby" replace />
}

export function Providers() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-8 md:py-6">
      <CategoryStrip active="" />
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-extrabold text-white md:text-2xl">Providers</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...new Set(GAMES.map((game) => game.provider))].sort((a, b) => a.localeCompare(b)).map((provider) => {
          const providerArt: Record<string, string> = {
            Playson: 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Playson.webp',
            Endorphina: 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Endorphina.webp',
            Pateplay: 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Pateplay.webp',
            Betsoft: 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Betsoft.webp',
            Rubyplay: 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/RubyPlay.webp',
            Novomatic: 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Novomatic.webp',
          }
          return (
            <Link
              key={provider}
              to={'/casino/providers/' + encodeURIComponent(provider.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
              className="overflow-hidden rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] transition-colors hover:border-[var(--cb-yellow)]"
            >
              {providerArt[provider] ? (
                <img src={providerArt[provider]} alt={provider} loading="lazy" className="aspect-[2/1] w-full object-cover" />
              ) : (
                <Wireframe className="aspect-[2/1] w-full rounded-none border-0" label={provider} />
              )}
              <p className="truncate px-2 py-3 text-center text-xs font-bold text-white">{provider}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function ProviderPage() {
  const { provider = '' } = useParams()
  const name = PROVIDER_NAMES[provider] ?? provider.replace(/-/g, ' ')
  const games = GAMES.filter(
    (game) => game.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-') === provider,
  )
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-8 md:py-6">
      <CategoryStrip active="" />
      <Link to="/casino/providers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Providers
      </Link>
      <GameRail title={name} games={games} />
    </div>
  )
}

const PROVIDER_NAMES: Record<string, string> = {
  'pragmatic-play': 'Pragmatic Play',
  netent: 'Netent',
  'play-n-go': "Play'n GO",
  bgaming: 'BGaming',
  hacksaw: 'Hacksaw',
  yggdrasil: 'Yggdrasil',
  evoplay: 'EvoPlay',
  novomatic: 'Novomatic',
  betsoft: 'Betsoft',
  playson: 'Playson',
  pateplay: 'Pateplay',
  popiplay: 'Popiplay',
  'push-gaming': 'Push Gaming',
  'nolimit-city': 'Nolimit City',
  'relax-gaming': 'Relax Gaming',
  evolution: 'Evolution',
  playtech: 'Playtech',
  'big-time-gaming': 'Big Time Gaming',
  quickspin: 'Quickspin',
  'bf-games': 'BF Games',
  spribe: 'Spribe',
  smartsoft: 'SmartSoft',
}
