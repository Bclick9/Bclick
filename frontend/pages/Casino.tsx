import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade,
  Trophy, Search as SearchIcon, LayoutGrid, ChevronLeft, ChevronRight, Info,
  type LucideIcon,
} from 'lucide-react'
import { GameCard, PromoCard, Wireframe } from '../components/cards'
import { GAMES, CASINO_CATEGORIES, PROMOTIONS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const ICONS: Record<string, LucideIcon> = {
  Home, Cherry, Ghost, Flame, Sparkles, Crown, ShoppingBag, Rocket, Gem, Spade, Trophy,
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
    <section className="mb-6 has-[>div:empty]:mb-0">
      <div className="space-y-2 sm:space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between overflow-hidden text-sm">
          <div className="overflow-x-hidden">
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
                        isActive
                          ? 'bg-[var(--cb-item-active)] text-white'
                          : 'bg-[var(--cb-card)]',
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

          <div>
            <div className="flex items-center space-x-2 pl-4">
              <div className="hidden items-center space-x-2 md:flex">
                <button
                  type="button"
                  aria-label="Previous"
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
                  aria-label="Next"
                  onClick={() => scrollCategories(1)}
                  disabled={!canScrollRight}
                  className="group rounded-[10px] bg-[var(--cb-card)] p-1 transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="rounded-[6px] p-1.5 transition-colors group-enabled:group-hover:bg-[var(--cb-hover)]">
                    <ChevronRight className="mx-auto h-5 w-5 text-slate-300 transition-transform group-enabled:group-active:scale-90" />
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('cb:open-search'))}
                aria-label="Open search"
                className="relative hidden items-center gap-2 rounded-lg bg-[var(--cb-card)] px-3 py-2 font-semibold text-white transition-colors hover:bg-[var(--cb-hover)] lg:flex"
              >
                <SearchIcon className="h-6 w-6" />
                <span className="text-sm">Search</span>
              </button>

              <Link
                to="/casino/rng/brands"
                className="block rounded-lg bg-[var(--cb-card)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--cb-hover)]"
              >
                <span className="flex items-center gap-x-2">
                  <LayoutGrid className="h-6 w-6 shrink-0" />
                  <span className="hidden lg:inline">Providers</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GameGrid({ ids }: { ids: string[] }) {
  const [shown, setShown] = useState(12)
  const games = useMemo(
    () => ids.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean),
    [ids],
  )
  if (games.length === 0) {
    return <p className="text-muted-foreground text-sm py-10 text-center">No games in this category yet.</p>
  }
  const visible = games.slice(0, shown)
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
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
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {games.map((id) => {
            const g = GAMES.find((x) => x.id === id)!
            return <GameCard key={id} game={g} />
          })}
        </div>
      </div>
    </div>
  )
}

export function CasinoCategory() {
  const { category = 'lobby' } = useParams()
  if (category === 'providers') return <Providers />
  const known = CASINO_CATEGORIES.some((c) => c.slug === category) || category === 'drop-and-wins'
  if (!known) return <Navigate to="/casino" replace />

  const cat = CASINO_CATEGORIES.find((c) => c.slug === category)
  const games = GAMES.filter((g) => g.categories.includes(category)).map((g) => g.id)
  const isLobby = category === 'lobby'

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <CategoryStrip active={category} />

      {isLobby ? (
        <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-extrabold text-foreground">Promotions</h2>
              <div className="hidden md:flex items-center gap-2">
                <button aria-label="Scroll left" className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">&lsaquo;</button>
                <button aria-label="Scroll right" className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">&rsaquo;</button>
              </div>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-1">
              {PROMOTIONS.filter((p) => p.scope === 'casino').map((p) => (
                <PromoCard key={p.slug} promo={p} />
              ))}
            </div>
          </div>

          <HalloweenBanner games={['death-dominion', 'coins-of-halloween', 'wolf-power-megaways', 'spooky-kabuki', 'vamp-hunt', 'halloween-bonanza', 'haunted-coins', 'halloween-jack', 'devils-feast']} />

          <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Top Picks</h2>
          <GameGrid ids={GAMES.filter((g) => g.categories.includes('top-picks')).map((g) => g.id)} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground">{cat?.label ?? 'Games'}</h1>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> {games.length} games
            </span>
          </div>
          <GameGrid ids={games} />
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
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <CategoryStrip active="" />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-foreground">Providers</h1>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...new Set(GAMES.map((g) => g.provider))].map((p) => {
          const providerArt: Record<string, string> = {
            'Playson': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Playson.webp',
            'Endorphina': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Endorphina.webp',
            'Pateplay': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/Pateplay.webp',
            'Betsoft': 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Betsoft.webp',
            'Rubyplay': 'https://campeonbet.io/assets/cms/7bd14341-c013-4993-a5ba-c5a01d7fe36a/RubyPlay.webp',
            'Novomatic': 'https://campeonbet.io/assets/cms/87100fe1-7d84-4a62-a632-819515c15127/Novomatic.webp',
          }
          return (
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
    (g) => g.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-') === provider,
  )
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
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
