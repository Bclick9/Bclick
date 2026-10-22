import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, ChevronLeft, ChevronRight, Info, X,
  type LucideIcon,
} from 'lucide-react'
import { GameCard, SectionRow, Wireframe } from '../components/cards'
import { GAMES, CASINO_CATEGORIES, type Game } from '../data/catalog'
import { fetchCasinoGames, getCatalogErrorMessage, type CasinoCatalogGame } from '../lib/casinoCatalog'
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
            className="no-scrollbar -ml-1 flex snap-x snap-mandatory scroll-smooth flex-row overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
          >
            {CASINO_CATEGORIES.map((c) => {
              const Icon = ICONS[c.icon] ?? Gem
              const isActive = c.slug === active
              return (
                <li key={c.slug} className="min-w-0 shrink-0 grow-0 snap-start pl-1">
                  <Link
                    to={'/casino/' + c.slug}
                    aria-current={isActive ? 'page' : undefined}
                    data-status={isActive ? 'active' : undefined}
                    className={cn(
                      'block rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--cb-hover)]',
                      isActive ? 'bg-[var(--cb-item-active)] text-white' : 'bg-[var(--cb-card)]',
                    )}
                  >
                    <span className="flex items-center gap-x-1.5">
                      <Icon className="h-5 w-5 shrink-0 mix-blend-plus-lighter" aria-hidden="true" />
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

function CatalogGameGrid({
  games,
  total,
  nextCursor,
  loading,
  loadingMore,
  error,
  stale,
  onLoadMore,
  onRetry,
  emptyMessage,
}: {
  games: CasinoCatalogGame[]
  total: number
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: string
  stale: boolean
  onLoadMore: () => void
  onRetry: () => void
  emptyMessage: string
}) {
  if (loading && games.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground" role="status">Loading casino games…</p>
  }
  if (error && games.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="max-w-lg text-sm text-[#f3b9b9]" role="alert">{error}</p>
        <button type="button" onClick={onRetry} className="rounded-lg bg-[var(--cb-card)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--cb-hover)]">Retry</button>
      </div>
    )
  }
  if (games.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9 gap-3">
        {games.map((catalogGame) => {
          const game: Game = {
            id: catalogGame.id,
            title: catalogGame.title,
            provider: catalogGame.provider.name,
            image: catalogGame.imageUrl ?? undefined,
            imageShowsTitle: true,
            categories: catalogGame.categories,
          }
          return (
            <GameCard
              key={catalogGame.id}
              game={game}
              href={'/casino/play/demo/' + encodeURIComponent(catalogGame.slug)}
              className="w-full"
            />
          )
        })}
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 pb-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {games.length} of {total} games{stale ? ' · catalogue may be stale' : ''}
        </p>
        {error ? <p className="max-w-lg text-center text-sm text-[#f3b9b9]" role="alert">{error}</p> : null}
        {nextCursor ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="h-10 min-w-[130px] rounded-xl bg-[var(--cb-card)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--cb-hover)] disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        ) : null}
      </div>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogGames, setCatalogGames] = useState<CasinoCatalogGame[]>([])
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogNextCursor, setCatalogNextCursor] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [catalogStale, setCatalogStale] = useState(false)
  const [catalogReloadKey, setCatalogReloadKey] = useState(0)

  const searchTerm = searchQuery.trim()
  const catalogBackedCategory = ['lobby', 'slot-games', 'live-casino', 'crash-games'].includes(category)
  const useLiveCatalog = catalogBackedCategory || Boolean(searchTerm)

  useEffect(() => {
    if (category === 'providers' || !useLiveCatalog) return
    const controller = new AbortController()
    const selectedCategory = searchTerm || category === 'lobby' ? undefined : category
    setCatalogLoading(true)
    setCatalogError('')
    setCatalogGames([])
    setCatalogTotal(0)
    setCatalogNextCursor(null)
    setCatalogStale(false)

    void fetchCasinoGames({
      pageSize: 48,
      category: selectedCategory,
      query: searchTerm || undefined,
      signal: controller.signal,
    }).then((page) => {
      if (controller.signal.aborted) return
      setCatalogGames(page.data)
      setCatalogTotal(page.page.total)
      setCatalogNextCursor(page.page.nextCursor)
      setCatalogStale(page.meta.stale)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCatalogError(getCatalogErrorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setCatalogLoading(false)
    })

    return () => controller.abort()
  }, [category, searchTerm, useLiveCatalog, catalogReloadKey])

  if (category === 'providers') return <Providers />
  const known = CASINO_CATEGORIES.some((item) => item.slug === category) || category === 'drop-and-wins'
  if (!known) return <Navigate to="/casino" replace />

  const cat = CASINO_CATEGORIES.find((item) => item.slug === category)
  const games = GAMES.filter((game) => game.categories.includes(category)).map((game) => game.id)
  const isLobby = category === 'lobby'

  const loadMoreCatalog = async () => {
    if (!catalogNextCursor || catalogLoadingMore) return
    setCatalogLoadingMore(true)
    setCatalogError('')
    try {
      const page = await fetchCasinoGames({
        pageSize: 48,
        cursor: catalogNextCursor,
        category: searchTerm || category === 'lobby' ? undefined : category,
        query: searchTerm || undefined,
      })
      setCatalogGames((current) => {
        const ids = new Set(current.map((game) => game.id))
        return [...current, ...page.data.filter((game) => !ids.has(game.id))]
      })
      setCatalogTotal(page.page.total)
      setCatalogNextCursor(page.page.nextCursor)
      setCatalogStale(page.meta.stale)
    } catch (error) {
      setCatalogError(getCatalogErrorMessage(error))
    } finally {
      setCatalogLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 md:py-6">
      {isLobby ? <TrendingGames /> : null}

      <CasinoFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <CategoryStrip active={category} />

      {searchTerm ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-white md:text-xl">Search results</h1>
            <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {catalogLoading ? 'Searching…' : catalogTotal + ' games found'}
            </p>
          </div>
          <CatalogGameGrid
            games={catalogGames}
            total={catalogTotal}
            nextCursor={catalogNextCursor}
            loading={catalogLoading}
            loadingMore={catalogLoadingMore}
            error={catalogError}
            stale={catalogStale}
            onLoadMore={loadMoreCatalog}
            onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No matching games found."
          />
        </div>
      ) : isLobby ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-white md:text-xl">All Games</h1>
            <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {catalogLoading ? 'Loading…' : catalogTotal + ' games'}
            </p>
          </div>
          <CatalogGameGrid
            games={catalogGames}
            total={catalogTotal}
            nextCursor={catalogNextCursor}
            loading={catalogLoading}
            loadingMore={catalogLoadingMore}
            error={catalogError}
            stale={catalogStale}
            onLoadMore={loadMoreCatalog}
            onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No games are currently available in the catalogue."
          />
          <HalloweenBanner games={['death-dominion', 'coins-of-halloween', 'wolf-power-megaways', 'spooky-kabuki', 'vamp-hunt', 'halloween-bonanza', 'haunted-coins', 'halloween-jack', 'devils-feast']} />
          <h2 className="mb-4 text-lg font-extrabold text-foreground md:text-xl">Top Picks</h2>
          <GameGrid ids={GAMES.filter((game) => game.categories.includes('top-picks')).map((game) => game.id)} />
        </>
      ) : catalogBackedCategory ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold text-foreground md:text-2xl">{cat?.label ?? 'Games'}</h1>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> {catalogLoading ? 'Loading…' : catalogTotal + ' games'}
            </span>
          </div>
          <CatalogGameGrid
            games={catalogGames}
            total={catalogTotal}
            nextCursor={catalogNextCursor}
            loading={catalogLoading}
            loadingMore={catalogLoadingMore}
            error={catalogError}
            stale={catalogStale}
            onLoadMore={loadMoreCatalog}
            onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No games in this category yet."
          />
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-foreground md:text-2xl">{cat?.label ?? 'Games'}</h1>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> {games.length} games
            </span>
          </div>
          <GameGrid ids={games} emptyMessage="No games in this category yet." />
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
