import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, Cherry, CircleDollarSign, Crown, Dices, Flame, Gamepad2, Gift,
  Ghost, Rocket, Search, SlidersHorizontal, Sparkles, Trophy, X, Zap,
  type LucideIcon,
} from 'lucide-react'
import { GameCard } from './cards'
import { GAMES, PROMOTIONS, PROVIDERS, CASINO_CATEGORIES } from '../data/catalog'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showAllProviders, setShowAllProviders] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) return
    setQuery('')
    setFiltersOpen(false)
    setSelectedProviders([])
    setSelectedCategories([])
    setShowAllProviders(false)
  }, [open])

  const searchTerm = query.trim().toLowerCase()
  const visibleGames = useMemo(() => {
    const base = searchTerm
      ? GAMES.filter((game) =>
          game.title.toLowerCase().includes(searchTerm) ||
          game.provider.toLowerCase().includes(searchTerm),
        )
      : GAMES.filter((game) => game.categories.includes('top-picks')).slice(0, 15)

    return base.filter((game) => {
      const providerMatch = selectedProviders.length === 0 || selectedProviders.includes(game.provider)
      const categoryMatch = selectedCategories.length === 0 ||
        selectedCategories.some((category) => game.categories.includes(category))
      return providerMatch && categoryMatch
    }).slice(0, 45)
  }, [searchTerm, selectedProviders, selectedCategories])

  const visiblePromotions = useMemo(() => {
    if (!searchTerm) return []
    return PROMOTIONS.filter((promo) =>
      promo.title.toLowerCase().includes(searchTerm) ||
      promo.tag.toLowerCase().includes(searchTerm),
    )
  }, [searchTerm])

  const filterCount = selectedProviders.length + selectedCategories.length
  const toggleValue = (
    value: string,
    current: string[],
    setCurrent: (next: string[]) => void,
  ) => {
    setCurrent(current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value])
  }

  if (!open) return null

  const providersToShow = showAllProviders ? PROVIDERS : PROVIDERS.slice(0, 12)
  const categories = CASINO_CATEGORIES.filter((category) => category.slug !== 'lobby')

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-0 md:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        tabIndex={-1}
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#071923] text-left text-white md:h-[85dvh] md:max-h-[780px] md:max-w-5xl md:rounded-md md:border md:border-[var(--cb-line)]"
      >
        <div className="flex shrink-0 items-stretch justify-between gap-2 px-2 py-4 md:px-5">
          <form
            className="relative min-w-0 flex-1 bg-[#071923]"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#aebfca]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              type="text"
              aria-label="Search games, providers and promotions"
              className="w-full rounded-[10px] bg-[var(--cb-item-active)] py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#aebfca]/70 focus:ring-1 focus:ring-[var(--cb-line)]"
            />
          </form>

          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-pressed={filtersOpen}
            aria-label={filtersOpen ? 'Hide search filters' : 'Show search filters'}
            className="relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[var(--cb-nav)] px-3 font-semibold text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="hidden sm:inline">Filter</span>
            {filterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cb-yellow)] px-1 text-[10px] font-black text-[#00151e]">
                {filterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex aspect-square shrink-0 items-center justify-center rounded-[10px] bg-[var(--cb-nav)] p-2 text-white transition-colors hover:bg-[var(--cb-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden px-2 pb-3 md:px-5">
          <div className="no-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-0 md:pr-1">
            <div className="space-y-2 pb-2">
              <div className="font-semibold text-sm md:text-base">
                {searchTerm || filterCount > 0 ? 'Results' : 'Recommended'}
              </div>

              {visibleGames.length > 0 ? (
                <div
                  className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
                  onClick={(event) => {
                    const target = event.target
                    if (target instanceof Element && target.closest('a')) onClose()
                  }}
                >
                  {visibleGames.map((game) => (
                    <GameCard key={game.id} game={game} className="w-full" />
                  ))}
                </div>
              ) : null}

              {visiblePromotions.length > 0 ? (
                <div className="space-y-2 pt-4">
                  <h3 className="font-semibold text-sm md:text-base">Promotions</h3>
                  {visiblePromotions.map((promo) => (
                    <Link
                      key={promo.slug}
                      to={'/promotions/' + promo.slug}
                      onClick={onClose}
                      className="block rounded-[10px] border border-[var(--cb-line)] bg-[var(--cb-nav)] px-3 py-2.5 transition-colors hover:bg-[var(--cb-hover)]"
                    >
                      <span className="block text-sm font-semibold">{promo.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--cb-yellow)]">{promo.tag}</span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {visibleGames.length === 0 && visiblePromotions.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#aebfca]">
                  No results. Try a different search.
                </div>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <aside className="absolute inset-0 z-20 flex flex-col overflow-hidden border-t border-[var(--cb-line)] bg-[#091b26] px-3 pb-3 md:static md:ml-3 md:w-[330px] md:shrink-0 md:border-l md:border-t-0 md:border-[var(--cb-line)] md:pl-4">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--cb-line)] py-3">
                <div>
                  <h2 className="font-bold text-white">Filters</h2>
                  <p className="mt-0.5 text-[11px] text-[#8fa3b8]">
                    {filterCount ? filterCount + ' selected' : 'Choose providers or categories'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProviders([])
                      setSelectedCategories([])
                    }}
                    disabled={filterCount === 0}
                    className="text-xs font-semibold text-[#aebfca] underline decoration-[#47606c] underline-offset-4 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filters"
                    className="rounded-md p-1 text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain py-4">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#b6c5ce]">Providers</h3>
                    <span className="rounded-full border border-[var(--cb-line)] bg-[#0b202b] px-2 py-0.5 text-[10px] font-bold text-[#8fa3b8]">
                      {PROVIDERS.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {providersToShow.map((provider) => {
                      const selected = selectedProviders.includes(provider)
                      return (
                        <label
                          key={provider}
                          className={cn(
                            'group relative flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-2 transition-colors focus-within:ring-2 focus-within:ring-[var(--cb-yellow)]/70',
                            selected
                              ? 'border-[var(--cb-yellow)] bg-[#17313e]'
                              : 'border-[var(--cb-line)] bg-[#0b202b] hover:border-[#47606c] hover:bg-[#102733]',
                          )}
                        >
                          <ProviderLogo provider={provider} />
                          <span className={cn('min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight', selected ? 'text-white' : 'text-[#c0cdd5')}>
                            {provider}
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleValue(provider, selectedProviders, setSelectedProviders)}
                            className="sr-only"
                          />
                          <span className={cn(
                            'absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-md border transition-colors',
                            selected
                              ? 'border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#00151e]'
                              : 'border-[#47606c] bg-[#091b26]/80 text-transparent group-hover:border-[#718a99]',
                          )}>
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {PROVIDERS.length > 12 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllProviders((value) => !value)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--cb-line)] bg-[#0b202b] py-2 text-xs font-semibold text-[#d3dde3] transition-colors hover:bg-[var(--cb-hover)]"
                    >
                      {showAllProviders ? 'Show less' : 'Show all ' + PROVIDERS.length + ' providers'}
                    </button>
                  ) : null}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#b6c5ce]">Categories</h3>
                    <span className="rounded-full border border-[var(--cb-line)] bg-[#0b202b] px-2 py-0.5 text-[10px] font-bold text-[#8fa3b8]">
                      {categories.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => {
                      const selected = selectedCategories.includes(category.slug)
                      const Icon = CATEGORY_ICONS[category.slug] ?? Gamepad2
                      return (
                        <label
                          key={category.slug}
                          className={cn(
                            'group relative flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-2 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-[var(--cb-yellow)]/70',
                            selected
                              ? 'border-[var(--cb-yellow)] bg-[#17313e]'
                              : 'border-[var(--cb-line)] bg-[#0b202b] hover:border-[#47606c] hover:bg-[#102733]',
                          )}
                        >
                          <span className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            selected ? 'bg-[var(--cb-yellow)]/15 text-[var(--cb-yellow)]' : 'bg-[#122c39] text-[#93a9b8]',
                          )}>
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                          </span>
                          <span className={cn('min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight', selected ? 'text-white' : 'text-[#c0cdd5')}>
                            {category.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleValue(category.slug, selectedCategories, setSelectedCategories)}
                            className="sr-only"
                          />
                          <span className={cn(
                            'absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-md border transition-colors',
                            selected
                              ? 'border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#00151e]'
                              : 'border-[#47606c] bg-[#091b26]/80 text-transparent group-hover:border-[#718a99]',
                          )}>
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </section>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}


const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'slot-games': Cherry,
  'halloween-games': Ghost,
  'top-picks': Flame,
  'new-games': Sparkles,
  'vip-specials': Crown,
  'bonus-buy': Zap,
  'crash-games': Rocket,
  jackpots: Trophy,
  'table-games': Dices,
  'drop-and-wins': Gift,
  'live-casino': CircleDollarSign,
}

const PROVIDER_DOMAINS: Record<string, string> = {
  'Pragmatic Play': 'pragmaticplay.com',
  Netent: 'netent.com',
  "Play'n GO": 'playngo.com',
  BGaming: 'bgaming.com',
  Hacksaw: 'hacksawgaming.com',
  Yggdrasil: 'yggdrasilgaming.com',
  EvoPlay: 'evoplay.com',
  Novomatic: 'novomatic.com',
  Betsoft: 'betsoft.com',
  Playson: 'playson.com',
  Pateplay: 'pateplay.com',
  Popiplay: 'popiplay.com',
  'Push Gaming': 'pushgaming.com',
  'Nolimit City': 'nolimitcity.com',
  'Relax Gaming': 'relax-gaming.com',
  Evolution: 'evolution.com',
  Playtech: 'playtech.com',
  'Big Time Gaming': 'bigtimegaming.com',
  Quickspin: 'quickspin.com',
  'BF Games': 'bfgames.com',
  Spribe: 'spribe.co',
  SmartSoft: 'smartsoftgaming.com',
}

function ProviderLogo({ provider }: { provider: string }) {
  const [failed, setFailed] = useState(false)
  const domain = PROVIDER_DOMAINS[provider]
  const initials = provider
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--cb-line)] bg-[#102733]">
      <span className="text-[10px] font-black tracking-tight text-[#aebfca]" aria-hidden="true">
        {initials}
      </span>
      {!failed && domain ? (
        <img
          src={'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64'}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full bg-[#f5f7f8] object-contain p-1"
        />
      ) : null}
    </span>
  )
}
