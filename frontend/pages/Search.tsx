import { useEffect, useState } from 'react'
import { Search as SearchIcon, X, Clock } from 'lucide-react'
import { GameCard, PageTitle } from '../components/cards'
import { GAMES, PROMOTIONS } from '../data/catalog'

const RECENT = ['bonanza', 'roulette', 'welcome bonus']

export default function Search() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) {
      setQuery(q)
      setSubmitted(q)
    }
  }, [])

  const q = submitted.trim().toLowerCase()
  const games = q
    ? GAMES.filter((g) => g.title.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q))
    : []
  const promos = q
    ? PROMOTIONS.filter((p) => p.title.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q))
    : []

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Search" subtitle="Find games, providers and promotions." />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(query)
        }}
        className="relative mb-8"
      >
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games, providers, promotions..."
          className="w-full h-12 pl-12 pr-10 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setSubmitted('')
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </form>

      {q ? (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {games.length + promos.length} results for “{submitted}”
          </p>

          {games.length > 0 ? (
            <>
              <h2 className="text-base font-extrabold text-foreground mb-4">Games</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                {games.map((g) => (
                  <GameCard key={g.id} game={g} className="w-full" />
                ))}
              </div>
            </>
          ) : null}

          {promos.length > 0 ? (
            <>
              <h2 className="text-base font-extrabold text-foreground mb-4">Promotions</h2>
              <ul className="space-y-2 mb-4">
                {promos.map((p) => (
                  <li key={p.slug} className="rounded-lg bg-card border border-border px-4 py-3">
                    <p className="text-sm font-bold text-foreground">{p.title}</p>
                    <p className="text-xs text-primary mt-0.5">{p.tag}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {games.length + promos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No results. Try a different term.
            </p>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent searches
          </p>
          <div className="flex flex-wrap gap-2">
            {RECENT.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setQuery(r)
                  setSubmitted(r)
                }}
                className="h-9 px-4 rounded-full bg-secondary text-sm text-foreground hover:bg-accent transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
