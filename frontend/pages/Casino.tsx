import { useEffect, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, ChevronLeft, ChevronRight, Info, X,
  type LucideIcon,
} from 'lucide-react'
import { GameCard, Wireframe } from '../components/cards'
import type { Game } from '../data/catalog'
import { fetchCasinoCategories, fetchCasinoDisplayCategories, fetchCasinoGames, fetchCasinoProviders, getCatalogErrorMessage, type CasinoCatalogCategory, type CasinoCatalogGame, type CasinoCatalogProvider, type CasinoDisplayCategory } from '../lib/casinoCatalog'
import { cn } from '../lib/shadcn/utils'

// When an admin changes availability in another tab, refresh current catalogue views
// when this storefront becomes visible again. The API also sends Cache-Control: no-store.
function useRefreshOnVisibility(refresh: () => void) {
  const refreshRef = useRef(refresh)
  useEffect(() => { refreshRef.current = refresh }, [refresh])
  useEffect(() => {
    let lastRefreshAt = 0
    const handleReturn = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRefreshAt < 750) return
      lastRefreshAt = now
      refreshRef.current()
    }
    document.addEventListener('visibilitychange', handleReturn)
    window.addEventListener('focus', handleReturn)
    return () => {
      document.removeEventListener('visibilitychange', handleReturn)
      window.removeEventListener('focus', handleReturn)
    }
  }, [])
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

const CATEGORY_PRESENTATION: Record<string, { label: string; icon: string }> = {
  'slot-games': { label: 'Slot Games', icon: 'cherry' },
  'live-casino': { label: 'Live Casino', icon: 'spade' },
  'crash-games': { label: 'Crash Games', icon: 'rocket' },
  'halloween-games': { label: 'Halloween Games', icon: 'ghost' },
  'top-picks': { label: 'Top Picks', icon: 'flame' },
  'new-games': { label: 'New Games', icon: 'sparkles' },
  'vip-specials': { label: 'VIP Specials', icon: 'crown' },
  'bonus-buy': { label: 'Bonus Buy', icon: 'shopping-bag' },
  jackpots: { label: 'Jackpots', icon: 'gem' },
  'table-games': { label: 'Table Games', icon: 'spade' },
  'drop-and-wins': { label: 'Drop & Wins', icon: 'trophy' },
};

// Old category paths remain recognizable, but this presentation map never invents
// category membership or game cards. Every category's contents must come from the API.
const LEGACY_CATEGORY_ROUTE_SLUGS = new Set(Object.keys(CATEGORY_PRESENTATION));

const ICONS: Record<string, LucideIcon> = {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade, Trophy,
  home: Home, cherry: Cherry, ghost: Ghost, flame: Flame, sparkles: Sparkles,
  crown: Crown, 'shopping-bag': ShoppingBag, rocket: Rocket, gem: Gem, spade: Spade, trophy: Trophy,
};

function CategoryStrip({ active, categories }: { active: string; categories: CasinoCatalogCategory[] }) {
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
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollButtons) : null
    resizeObserver?.observe(rail)
    Array.from(rail.children).forEach((child) => resizeObserver?.observe(child))
    return () => {
      rail.removeEventListener('scroll', updateScrollButtons)
      resizeObserver?.disconnect()
    }
  }, [categories])

  const scrollCategories = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: direction * Math.max(240, rail.clientWidth * 0.65), behavior: 'smooth' })
  }
  // These routes are game types, not operator-defined categories. Keep direct routes working
  // while excluding the type pages from the category strip and curated category list.
  const gameTypeSlugs = new Set(['crash-games', 'live-casino', 'slot-games'])
  const items = [{ slug: 'lobby', title: 'Lobby', icon: 'home' }, ...categories.filter((item) => item.slug !== 'lobby' && !gameTypeSlugs.has(item.slug))]

  return (
    <section className="mb-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <ul ref={railRef} aria-label="Casino categories" className="no-scrollbar -ml-1 flex snap-x snap-mandatory scroll-smooth flex-row overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const presentation = CATEGORY_PRESENTATION[item.slug]
              const Icon = ICONS[presentation?.icon ?? item.icon ?? 'gem'] ?? Gem
              const isActive = item.slug === active
              return (
                <li key={item.slug} className="min-w-0 shrink-0 grow-0 snap-start pl-1">
                  <Link to={'/casino/' + item.slug} aria-current={isActive ? 'page' : undefined} data-status={isActive ? 'active' : undefined}
                    className={cn('block rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--cb-hover)]', isActive ? 'bg-[var(--cb-item-active)] text-white' : 'bg-[var(--cb-card)]')}>
                    <span className="flex items-center gap-x-1.5">
                      <Icon className="h-5 w-5 shrink-0 mix-blend-plus-lighter" aria-hidden="true" />
                      <span className="whitespace-nowrap">{presentation?.label ?? item.title}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <button type="button" aria-label="Previous casino categories" onClick={() => scrollCategories(-1)} disabled={!canScrollLeft}
            className="rounded-lg bg-[var(--cb-card)] p-1.5 text-slate-300 transition-colors enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next casino categories" onClick={() => scrollCategories(1)} disabled={!canScrollRight}
            className="rounded-lg bg-[var(--cb-card)] p-1.5 text-slate-300 transition-colors enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
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

function catalogGameToCardGame(catalogGame: CasinoCatalogGame): Game {
  return {
    id: catalogGame.id,
    title: catalogGame.title,
    provider: catalogGame.provider.name,
    image: catalogGame.imageUrl ?? undefined,
    imageShowsTitle: true,
    categories: catalogGame.categories,
  }
}

function CatalogGameRail({ category, title, bannerImage }: { category: CasinoDisplayCategory; title?: string; bannerImage?: string }) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const games = category.games
  const heading = title ?? category.name

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const updateEdges = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth
      setCanScrollLeft(rail.scrollLeft > 2)
      setCanScrollRight(maxScroll > 2 && rail.scrollLeft < maxScroll - 2)
    }
    updateEdges()
    rail.addEventListener('scroll', updateEdges, { passive: true })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null
    observer?.observe(rail)
    Array.from(rail.children).forEach((child) => observer?.observe(child))
    return () => {
      rail.removeEventListener('scroll', updateEdges)
      observer?.disconnect()
    }
  }, [games])

  if (games.length === 0) return null
  const scroll = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * Math.max(260, (railRef.current?.clientWidth ?? 400) * 0.7), behavior: 'smooth' })
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card" data-display-category={category.slug}>
      {bannerImage ? <img src={bannerImage} alt={heading} loading="lazy" className="block aspect-[5.2/1] w-full object-cover" /> : null}
      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {category.iconUrl ? <img src={category.iconUrl} alt="" loading="lazy" className="h-8 w-8 rounded-md object-cover" /> : null}
              <h2 className="text-lg font-extrabold text-foreground md:text-xl">{heading}</h2>
            </div>
            {category.description ? <p className="mt-1 text-xs text-muted-foreground">{category.description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{games.length} games</span>
            <button type="button" aria-label={'Scroll ' + heading + ' left'} onClick={() => scroll(-1)} disabled={!canScrollLeft}
              className="hidden h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors enabled:hover:text-foreground disabled:opacity-40 md:flex">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label={'Scroll ' + heading + ' right'} onClick={() => scroll(1)} disabled={!canScrollRight}
              className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors disabled:opacity-40 md:flex">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div ref={railRef} className="flex gap-3 overflow-x-auto no-scrollbar">
          {games.map((catalogGame) => (
            <GameCard key={catalogGame.id} game={catalogGameToCardGame(catalogGame)} href={'/casino/play/demo/' + encodeURIComponent(catalogGame.slug)} />
          ))}
        </div>
      </div>
    </section>
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
  const [catalogCategories, setCatalogCategories] = useState<CasinoCatalogCategory[]>([])
  const [displayCategories, setDisplayCategories] = useState<CasinoDisplayCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  useRefreshOnVisibility(() => setCatalogReloadKey((value) => value + 1))

  useEffect(() => {
    const controller = new AbortController()
    void fetchCasinoDisplayCategories(controller.signal).then((categories) => {
      if (!controller.signal.aborted) setDisplayCategories(categories)
    }).catch(() => {
      // Curated shelves are optional on the Home page; the full catalogue still renders.
      if (!controller.signal.aborted) setDisplayCategories([])
    })
    return () => controller.abort()
  }, [catalogReloadKey])

  useEffect(() => {
    const controller = new AbortController()
    setCategoriesLoading(true)
    setCategoriesError('')
    void fetchCasinoCategories(controller.signal).then((page) => {
      if (!controller.signal.aborted) setCatalogCategories(page.data)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setCatalogCategories([])
        setCategoriesError(getCatalogErrorMessage(error))
      }
    }).finally(() => {
      if (!controller.signal.aborted) setCategoriesLoading(false)
    })
    return () => controller.abort()
  }, [catalogReloadKey])

  const searchTerm = searchQuery.trim()
  const isLobby = category === 'lobby'
  const availableCategory = catalogCategories.some((item) => item.slug === category)
  const known = isLobby || availableCategory || LEGACY_CATEGORY_ROUTE_SLUGS.has(category)
  const useLiveCatalog = known || Boolean(searchTerm)

  useEffect(() => {
    if (category === 'providers' || !useLiveCatalog) return
    const controller = new AbortController()
    const selectedCategory = searchTerm || isLobby ? undefined : category
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
  }, [category, searchTerm, useLiveCatalog, isLobby, catalogReloadKey])

  if (category === 'providers') return <Providers />
  if (!known && !categoriesLoading) return <Navigate to="/casino" replace />

  const categoryInfo = catalogCategories.find((item) => item.slug === category)
  const categoryTitle = CATEGORY_PRESENTATION[category]?.label
    ?? categoryInfo?.title
    ?? category.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

  const loadMoreCatalog = async () => {
    if (!catalogNextCursor || catalogLoadingMore) return
    setCatalogLoadingMore(true)
    setCatalogError('')
    try {
      const page = await fetchCasinoGames({
        pageSize: 48,
        cursor: catalogNextCursor,
        category: searchTerm || isLobby ? undefined : category,
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
      <CasinoFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <CategoryStrip active={category} categories={catalogCategories} />

      {categoriesError && catalogCategories.length === 0 ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground" role="status">
          Casino categories are temporarily unavailable. Game results are still loaded from the catalogue where possible.
        </div>
      ) : null}

      {searchTerm ? (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-white md:text-xl">Search results</h1>
            <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {catalogLoading ? 'Searching…' : catalogTotal + ' games found'}
            </p>
          </div>
          <CatalogGameGrid games={catalogGames} total={catalogTotal} nextCursor={catalogNextCursor}
            loading={catalogLoading} loadingMore={catalogLoadingMore} error={catalogError} stale={catalogStale}
            onLoadMore={loadMoreCatalog} onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No matching games found." />
        </div>
      ) : isLobby ? (
        <>
          {displayCategories.map((displayCategory) => (
            <CatalogGameRail key={displayCategory.id} category={displayCategory} />
          ))}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-white md:text-xl">All Games</h1>
            <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {catalogLoading ? 'Loading…' : catalogTotal + ' games'}
            </p>
          </div>
          <CatalogGameGrid games={catalogGames} total={catalogTotal} nextCursor={catalogNextCursor}
            loading={catalogLoading} loadingMore={catalogLoadingMore} error={catalogError} stale={catalogStale}
            onLoadMore={loadMoreCatalog} onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No games are currently available in the catalogue." />
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-extrabold text-foreground md:text-2xl">{categoryTitle}</h1>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> {catalogLoading ? 'Loading…' : catalogTotal + ' games'}
            </span>
          </div>
          <CatalogGameGrid games={catalogGames} total={catalogTotal} nextCursor={catalogNextCursor}
            loading={catalogLoading} loadingMore={catalogLoadingMore} error={catalogError} stale={catalogStale}
            onLoadMore={loadMoreCatalog} onRetry={() => setCatalogReloadKey((key) => key + 1)}
            emptyMessage="No games in this category yet." />
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
  const [providers, setProviders] = useState<CasinoCatalogProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  useRefreshOnVisibility(() => setReloadKey((value) => value + 1))
  const searchTerm = searchQuery.trim().toLocaleLowerCase()
  const filteredProviders = providers.filter((provider) =>
    !searchTerm || (provider.name + ' ' + provider.code).toLocaleLowerCase().includes(searchTerm),
  )

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetchCasinoProviders(controller.signal).then((page) => {
      if (!controller.signal.aborted) setProviders(page.data)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setProviders([])
        setError(getCatalogErrorMessage(reason))
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [reloadKey])

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <CasinoFilterBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} providersActive />
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-extrabold text-foreground">Providers</h1>
        {!loading && !error ? <span className="text-xs text-muted-foreground">{filteredProviders.length} providers available</span> : null}
      </div>
      {loading ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading available providers…</p> : null}
      {!loading && error ? <div className="flex flex-col items-center gap-3 py-10 text-center"><p role="alert" className="max-w-lg text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg bg-[var(--cb-card)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--cb-hover)]">Retry</button></div> : null}
      {!loading && !error && filteredProviders.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No providers currently have enabled Standard Sandbox games.</p> : null}
      {!loading && !error ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {filteredProviders.map((provider) => (
          <Link
            key={provider.code}
            to={`/casino/providers/${encodeURIComponent(provider.code)}`}
            className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60"
          >
            <Wireframe className="aspect-[2/1] w-full rounded-none border-0" label={provider.name} />
            <p className="truncate px-2 py-3 text-center text-xs font-bold text-foreground">{provider.name}</p>
          </Link>
        ))}
      </div> : null}
      <p className="mt-4 text-[11px] text-muted-foreground">Only providers with available, enabled Standard Sandbox games are listed. Disabled providers are omitted by the Bclick catalogue API.</p>
    </div>
  )
}

export function ProviderPage() {
  const { provider = '' } = useParams()
  const [providerName, setProviderName] = useState('')
  const [resolvedProviderCode, setResolvedProviderCode] = useState('')
  const [games, setGames] = useState<CasinoCatalogGame[]>([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useRefreshOnVisibility(() => setReloadKey((value) => value + 1))

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setGames([])
    setTotal(0)
    setNextCursor(null)
    setStale(false)
    void fetchCasinoProviders(controller.signal).then(async (page) => {
      const selected = page.data.find((item) =>
        item.code === provider || item.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-') === provider,
      )
      if (!selected) throw new Error('This provider has no currently enabled Standard Sandbox games.')
      setProviderName(selected.name)
      setResolvedProviderCode(selected.code)
      return fetchCasinoGames({ provider: selected.code, pageSize: 48, signal: controller.signal })
    }).then((page) => {
      if (controller.signal.aborted) return
      setGames(page.data)
      setTotal(page.page.total)
      setNextCursor(page.page.nextCursor)
      setStale(page.meta.stale)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(getCatalogErrorMessage(reason))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [provider, reloadKey])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const page = await fetchCasinoGames({ provider: resolvedProviderCode || provider, pageSize: 48, cursor: nextCursor })
      setGames((current) => {
        const existing = new Set(current.map((game) => game.id))
        return [...current, ...page.data.filter((game) => !existing.has(game.id))]
      })
      setTotal(page.page.total)
      setNextCursor(page.page.nextCursor)
      setStale(page.meta.stale)
    } catch (reason) {
      setError(getCatalogErrorMessage(reason))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <Link to="/casino/providers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Providers
      </Link>
      <h1 className="mb-6 text-xl font-extrabold text-foreground md:text-2xl">{providerName || provider.replace(/-/g, ' ')}</h1>
      <CatalogGameGrid
        games={games}
        total={total}
        nextCursor={nextCursor}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        stale={stale}
        onLoadMore={loadMore}
        onRetry={() => setReloadKey((value) => value + 1)}
        emptyMessage="No enabled Standard Sandbox games are currently available for this provider."
      />
    </div>
  )
}
