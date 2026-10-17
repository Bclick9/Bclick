import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
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
          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain pr-0 md:pr-1">
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
            <aside className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071923] px-3 pb-3 md:static md:ml-3 md:w-[280px] md:shrink-0 md:border-l md:border-[var(--cb-line)] md:pl-4">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--cb-line)] py-2">
                <h2 className="font-bold text-white">Filters</h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProviders([])
                      setSelectedCategories([])
                    }}
                    className="text-xs font-semibold text-[#aebfca] underline hover:text-white"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filters"
                    className="rounded-md p-1 text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-white">Providers</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
                    {providersToShow.map((provider) => (
                      <label key={provider} className="flex cursor-pointer items-center gap-2 text-sm text-[#aebfca] hover:text-white">
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(provider)}
                          onChange={() => toggleValue(provider, selectedProviders, setSelectedProviders)}
                          className="h-4 w-4 accent-[var(--cb-yellow)]"
                        />
                        <span className="truncate">{provider}</span>
                      </label>
                    ))}
                  </div>
                  {PROVIDERS.length > 12 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllProviders((value) => !value)}
                      className="mt-3 w-full text-center text-xs text-white underline"
                    >
                      {showAllProviders ? 'Show less' : 'Show more'}
                    </button>
                  ) : null}
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-white">Categories</h3>
                  <div className="flex flex-col gap-2">
                    {categories.map((category) => (
                      <label key={category.slug} className="flex cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--cb-nav)] px-2.5 py-2 text-xs text-white hover:bg-[var(--cb-hover)]">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.slug)}
                          onChange={() => toggleValue(category.slug, selectedCategories, setSelectedCategories)}
                          className="h-4 w-4 accent-[var(--cb-yellow)]"
                        />
                        <span className="truncate">{category.label}</span>
                      </label>
                    ))}
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
