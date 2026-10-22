import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, ChevronLeft, ChevronRight, X,
  type LucideIcon,
} from 'lucide-react'
import { GameCard, SectionRow, Wireframe } from '../components/cards'
import { GAMES, CASINO_CATEGORIES } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const ICONS: Record<string, LucideIcon> = {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade, Trophy,
}

type CasinoFilterBarProps = {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  providersActive?: boolean
}

function CasinoFilterBar({ searchQuery, onSearchQueryChange, providersActive = false }: CasinoFilterBarProps) {
  return (
    <section aria-label="Casino filters" className="mb-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] px-3.5 transition-colors focus-within:border-[var(--cb-yellow)]">
          <SearchIcon className="h-5 w-5 shrink-0 text-[#9aaab5]" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search casino games or providers"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-[#aeb8c0]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              aria-label="Clear search"
              title="Clear search"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9aaab5] transition-colors hover:bg-[var(--cb-hover)] hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Link
          to="/casino/rng/brands"
          aria-label="Providers"
          title="Providers"
          aria-current={providersActive ? 'page' : undefined}
          className={cn(
            'flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition-colors sm:px-4 md:w-[210px]',
            providersActive
              ? 'bg-[var(--cb-item-active)]'
              : 'bg-[var(--cb-card)] hover:bg-[var(--cb-hover)]',
          )}
        >
          <LayoutGrid className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Providers</span>
        </Link>
      </div>
    </section>
  )
}

function CategoryStrip({ active }: { active: string }) {
  const railRef = useRef<HTMLUListElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const updateScrollButtons = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth
      setCanScrollLeft(rail.scrollLeft > 2)
      setCanScrollRight(maxScroll > 2 && rail.scrollLeft < maxScroll - 2)
    }

    updateScrollButtons()
    rail.addEventListener('scroll', updateScrollButtons, { passive: true })
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollButtons)
      : null
    resizeObserver?.observe(rail)
    Array.from(rail.children).forEach((child) => resizeObserver?.observe(child))

    return () => {
      rail.removeEventListener('scroll', updateScrollButtons)
      resizeObserver?.disconnect()
    }
  }, [])

  const scrollCategories = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({
      left: direction * Math.max(240, rail.clientWidth * 0.65),
      behavior: 'smooth',
    })
  }

  return (
    <section className="mb-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <ul
            ref={railRef}
            aria-label="Casino categories"
            className="no-scrollbar -ml-2 flex snap-x snap-mandatory scroll-smooth flex-row overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
          >
            {CASINO_CATEGORIES.map((c) => {
              const Icon = ICONS[c.icon] ?? Gem
              const isActive = c.slug === active
              return (
                <li key={c.slug} className="min-w-0 shrink-0 grow-0 snap-start pl-2 basis-auto">
                  <Link
                    to={'/casino/' + c.slug}
                    aria-current={isActive ? 'page' : undefined}
                    data-status={isActive ? 'active' : undefined}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-base font-semibold text-slate-300 transition-colors hover:bg-[var(--cb-hover)]',
                      isActive ? 'bg-[var(--cb-hover)] text-white' : 'bg-[var(--cb-card)]',
                    )}
                  >
                    <span className="flex items-center gap-x-1">
                      <Icon className="h-6 w-6 shrink-0 mix-blend-plus-lighter" aria-hidden="true" />
                      <span className="whitespace-nowrap">{c.label}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <button
            type="button"
            aria-label="Previous casino categories"
            onClick={() => scrollCategories(-1)}
            disabled={!canScrollLeft}
            className="rounded-lg bg-[var(--cb-card)] p-1.5 text-slate-300 transition-colors enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next casino categories"
            onClick={() => scrollCategories(1)}
            disabled={!canScrollRight}
            className="rounded-lg bg-[var(--cb-card)] p-1.5 text-slate-300 transition-colors enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

const TRENDING_GAME_IDS = [
  'zeus-vs-hades', 'lucky-ladys-charm', 'wild-clusters', 'raptor-doublemax',
  'wealth-bells-40', 'le-bandit', 'big-bass-trophy-catch', 'silver-coins',
  'eggs-of-fortune', 'blazing-coins',
]

function TrendingGames() {
  const trending = TRENDING_GAME_IDS
    .map((id) => GAMES.find((game) => game.id === id))
    .filter((game): game is (typeof GAMES)[number] => Boolean(game))

  return (
    <SectionRow title="Trending Games" more="/casino/top-picks">
      {trending.map((game) => <GameCard key={game.id} game={game} />)}
    </SectionRow>
  )
}

function GameGrid({ ids, emptyMessage = 'No games in this category yet.' }: { ids: string[]; emptyMessage?: string }) {
  const [shown, setShown] = useState(48)
  const games = useMemo(
    () => ids.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean),
    [ids],
  )
  if (games.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }
  const visible = games.slice(0, shown)
  return (
    <>
      <div className="grid grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2">
        {visible.map((g) => (
          <GameCard key={g.id} game={g} className="w-full" />
        ))}
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 pb-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length} of {games.length} games
        </p>
        {shown < games.length ? (
          <button
            type="button"
            onClick={() => setShown((s) => s + 48)}
            className="h-10 min-w-[130px] rounded-xl bg-[var(--cb-card)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--cb-hover)]"
          >
            Load More
          </button>
        ) : null}
      </div>
    </>
  )
}

export function CasinoCategory() {
  const { category = 'lobby' } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  if (category === 'providers') return <Providers />
  const known = CASINO_CATEGORIES.some((c) => c.slug === category)
  if (!known) return <Navigate to="/casino" replace />

  const cat = CASINO_CATEGORIES.find((c) => c.slug === category)
  const isLobby = category === 'lobby'
  const categoryGames = isLobby
    ? GAMES.map((game) => game.id)
    : GAMES.filter((game) => game.categories.includes(category)).map((game) => game.id)
  const searchTerm = searchQuery.trim().toLocaleLowerCase()
  const searchResults = searchTerm
    ? GAMES.filter((game) => `${game.title} ${game.provider}`.toLocaleLowerCase().includes(searchTerm)).map((game) => game.id)
    : []

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-2 py-3 md:py-4">
      <CategoryStrip active={category} />
      <CasinoFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      {searchTerm ? (
        <section aria-labelledby="casino-search-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 id="casino-search-heading" className="text-lg font-extrabold text-white md:text-xl">Search results</h1>
            <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {searchResults.length} games found
            </p>
          </div>
          <GameGrid key={`search-${searchTerm}`} ids={searchResults} emptyMessage="No matching games found." />
        </section>
      ) : (
        <section aria-labelledby="casino-games-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 id="casino-games-heading" className="text-lg font-extrabold text-white md:text-xl">
              {isLobby ? 'Lobby' : (cat?.label ?? 'Games')}
            </h1>
            <p className="shrink-0 text-sm text-muted-foreground">
              {categoryGames.length} games
            </p>
          </div>
          <GameGrid
            key={category}
            ids={categoryGames}
            emptyMessage="No games in this category yet."
          />
        </section>
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
  const [searchQuery, setSearchQuery] = useState('')
  const providerNames = [...new Set(GAMES.map((g) => g.provider))]
  const searchTerm = searchQuery.trim().toLocaleLowerCase()
  const filteredProviders = providerNames.filter((provider) => !searchTerm || provider.toLocaleLowerCase().includes(searchTerm))

  const providerArt: Record<string, string> = {
    'Playson': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Playson.webp',
    'Endorphina': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Endorphina.webp',
    'Pateplay': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Pateplay.webp',
    'Betsoft': 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Betsoft.webp',
    'Rubyplay': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/RubyPlay.webp',
    'Novomatic': 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Novomatic.webp',
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <TrendingGames />
      <CasinoFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} providersActive />
      <CategoryStrip active="" />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-foreground">Providers</h1>
        {searchTerm ? <span className="text-xs text-muted-foreground">{filteredProviders.length} providers found</span> : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {filteredProviders.map((p) => (
          <Link
            key={p}
            to={`/casino/providers/${encodeURIComponent(p.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`}
            className="rounded-xl bg-card border border-border hover:border-primary/60 transition-colors overflow-hidden"
          >
            {providerArt[p] ? (
              <img src={providerArt[p]} alt={p} loading="lazy" className="aspect-[2/1] w-full object-cover" />
            ) : (
              <Wireframe className="aspect-[2/1] w-full rounded-none border-0" label={p} />
            )}
            <p className="text-xs font-bold text-foreground text-center px-2 py-3 truncate">{p}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ProviderPage() {
  const { provider = '' } = useParams()
  const name = PROVIDER_NAMES[provider] ?? provider.replace(/-/g, ' ')
  const games = GAMES.filter(
    (g) => g.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-') === provider,
  )
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <Link to="/casino/providers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Providers
      </Link>
      <h1 className="text-xl md:text-2xl font-extrabold text-foreground mb-6 capitalize">{name}</h1>
      <GameGrid ids={games.map((g) => g.id)} />
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
