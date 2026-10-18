import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, ChevronLeft, ChevronRight, Info, X,
  type LucideIcon,
} from 'lucide-react'
import { GameCard, Wireframe } from '../components/cards'
import { GAMES, CASINO_CATEGORIES } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const ICONS: Record<string, LucideIcon> = {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade, Trophy,
}

type CategoryStripProps = {
  active: string
  searchOpen: boolean
  searchQuery: string
  onSearchOpenChange: (open: boolean) => void
  onSearchQueryChange: (query: string) => void
}

function CategoryStrip({
  active,
  searchOpen,
  searchQuery,
  onSearchOpenChange,
  onSearchQueryChange,
}: CategoryStripProps) {
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
  }, [searchOpen])

  const scrollCategories = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({
      left: direction * Math.max(240, rail.clientWidth * 0.65),
      behavior: 'smooth',
    })
  }

  const openSearch = () => {
    onSearchQueryChange('')
    onSearchOpenChange(true)
  }

  const closeSearch = () => {
    onSearchQueryChange('')
    onSearchOpenChange(false)
  }

  return (
    <section className="mb-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {searchOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--cb-line)] bg-[var(--cb-card)] px-3 py-2 transition-colors focus-within:border-[var(--cb-yellow)]">
            <SearchIcon className="h-5 w-5 shrink-0 text-[#aebfca]" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              aria-label="Search games or providers"
              placeholder="Search games or providers..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#7f929f]"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close casino search"
              title="Close search"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
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
                  <li key={c.slug} className="min-w-0 shrink-0 grow-0 snap-start pl-2">
                    <Link
                      to={'/casino/' + c.slug}
                      aria-current={isActive ? 'page' : undefined}
                      data-status={isActive ? 'active' : undefined}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--cb-hover)]',
                        isActive ? 'bg-[var(--cb-item-active)] text-white' : 'bg-[var(--cb-card)]',
                      )}
                    >
                      <div className="flex items-center gap-x-1">
                        <Icon className="h-6 w-6 shrink-0 mix-blend-plus-lighter" aria-hidden="true" />
                        <span className="whitespace-nowrap">{c.label}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!searchOpen ? (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous casino categories"
              onClick={() => scrollCategories(-1)}
              disabled={!canScrollLeft}
              className="group rounded-[10px] bg-[var(--cb-card)] p-1 transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="rounded-[6px] p-1.5 transition-colors group-enabled:group-hover:bg-[var(--cb-hover)]">
                <ChevronLeft className="mx-auto h-5 w-5 text-slate-300 transition-transform group-enabled:group-active:scale-90" />
              </div>
            </button>
            <button
              type="button"
              aria-label="Next casino categories"
              onClick={() => scrollCategories(1)}
              disabled={!canScrollRight}
              className="group rounded-[10px] bg-[var(--cb-card)] p-1 transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="rounded-[6px] p-1.5 transition-colors group-enabled:group-hover:bg-[var(--cb-hover)]">
                <ChevronRight className="mx-auto h-5 w-5 text-slate-300 transition-transform group-enabled:group-active:scale-90" />
              </div>
            </button>
          </div>
        ) : null}

        {!searchOpen ? (
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search casino games"
            title="Search casino games"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cb-card)] px-2.5 py-2 font-semibold text-white transition-colors hover:bg-[var(--cb-hover)] sm:px-3"
          >
            <SearchIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="hidden text-sm sm:inline">Search</span>
          </button>
        ) : null}

        <Link
          to="/casino/rng/brands"
          aria-label="Providers"
          title="Providers"
          className="block shrink-0 rounded-lg bg-[var(--cb-card)] px-2.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--cb-hover)] sm:px-3"
        >
          <span className="flex items-center gap-x-2">
            <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <span className="hidden lg:inline">Providers</span>
          </span>
        </Link>
      </div>
    </section>
  )
}

function GameGrid({ ids, emptyMessage = 'No games in this category yet.' }: { ids: string[]; emptyMessage?: string }) {
  const [shown, setShown] = useState(100)
  const games = useMemo(
    () => ids.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean),
    [ids],
  )
  if (games.length === 0) {
    return <p className="text-muted-foreground text-sm py-10 text-center">{emptyMessage}</p>
  }
  const visible = games.slice(0, shown)
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9 gap-3">
        {visible.map((g) => (
          <GameCard key={g.id} game={g} className="w-full" />
        ))}
      </div>
      {shown < games.length ? (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShown((s) => s + 12)}
            className="h-10 px-6 rounded-lg bg-secondary hover:bg-accent text-sm font-bold text-foreground transition-colors"
          >
            Load more
          </button>
        </div>
      ) : null}
    </>
  )
}

function HalloweenBanner({ games }: { games: string[] }) {
  const gamesRailRef = useRef<HTMLDivElement | null>(null)
  const [canScrollGamesLeft, setCanScrollGamesLeft] = useState(false)
  const [canScrollGamesRight, setCanScrollGamesRight] = useState(false)

  useEffect(() => {
    const rail = gamesRailRef.current
    if (!rail) return

    const updateScrollEdges = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth
      setCanScrollGamesLeft(rail.scrollLeft > 2)
      setCanScrollGamesRight(maxScroll > 2 && rail.scrollLeft < maxScroll - 2)
    }

    updateScrollEdges()
    rail.addEventListener('scroll', updateScrollEdges, { passive: true })
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollEdges)
      : null
    resizeObserver?.observe(rail)
    Array.from(rail.children).forEach((child) => resizeObserver?.observe(child))

    return () => {
      rail.removeEventListener('scroll', updateScrollEdges)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden mb-8">
      <img
        src="https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Halloween-2026.webp"
        alt="CampeonBet Halloween Games"
        loading="lazy"
        className="block w-full aspect-[5.2/1] object-cover"
      />
      <div className="relative p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-extrabold text-foreground">Halloween Games</h2>
          <div className="hidden md:flex items-center gap-2">
            <button aria-label="Scroll banner left" className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">&lsaquo;</button>
            <button aria-label="Scroll banner right" className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">&rsaquo;</button>
          </div>
        </div>
        <div className="relative isolate">
          <div ref={gamesRailRef} className="flex gap-3 overflow-x-auto no-scrollbar">
            {games.map((id) => {
              const g = GAMES.find((x) => x.id === id)!
              return <GameCard key={id} game={g} />
            })}
          </div>
          {canScrollGamesLeft ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black/90 via-black/55 to-transparent md:w-10" />
          ) : null}
          {canScrollGamesRight ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black/90 via-black/55 to-transparent md:w-10" />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CasinoCategory() {
  const { category = 'lobby' } = useParams()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  if (category === 'providers') return <Providers />
  const known = CASINO_CATEGORIES.some((c) => c.slug === category) || category === 'drop-and-wins'
  if (!known) return <Navigate to="/casino" replace />

  const cat = CASINO_CATEGORIES.find((c) => c.slug === category)
  const games = GAMES.filter((g) => g.categories.includes(category)).map((g) => g.id)
  const isLobby = category === 'lobby'
  const searchTerm = searchQuery.trim().toLocaleLowerCase()
  const searchResults = searchTerm
    ? GAMES.filter((g) => `${g.title} ${g.provider}`.toLocaleLowerCase().includes(searchTerm)).map((g) => g.id)
    : []

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <CategoryStrip
        active={category}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
      />

      {searchOpen && searchTerm ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {searchResults.length} games found
          </p>
          <GameGrid ids={searchResults} emptyMessage="No matching games found." />
        </div>
      ) : isLobby ? (
        <>
          <GameGrid ids={GAMES.map((g) => g.id)} />

          {!searchOpen ? (
            <>
              <HalloweenBanner games={['death-dominion', 'coins-of-halloween', 'wolf-power-megaways', 'spooky-kabuki', 'vamp-hunt', 'halloween-bonanza', 'haunted-coins', 'halloween-jack', 'devils-feast']} />

              <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Top Picks</h2>
              <GameGrid ids={GAMES.filter((g) => g.categories.includes('top-picks')).map((g) => g.id)} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground">{cat?.label ?? 'Games'}</h1>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> {games.length} games
            </span>
          </div>
          <GameGrid ids={searchOpen && searchTerm ? searchResults : games} emptyMessage={searchOpen && searchTerm ? "No matching games found." : "No games in this category yet."} />
        </>
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
  const [searchOpen, setSearchOpen] = useState(false)
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
      <CategoryStrip
        active=""
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
      />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-foreground">Providers</h1>
        {searchOpen && searchTerm ? <span className="text-xs text-muted-foreground">{filteredProviders.length} providers found</span> : null}
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
