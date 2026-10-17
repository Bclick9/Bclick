import { useEffect, useRef } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  Trophy, CircleDot, Dribbble, Snowflake, Volleyball, Gamepad2, Swords,
  ChevronLeft, type LucideIcon,
} from 'lucide-react'
import { MatchCard, PageTitle } from '../components/cards'
import { SPORTS_EVENTS, SPORT_CATEGORIES } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const ICONS: Record<string, LucideIcon> = {
  Trophy, CircleDot, Dribbble, Snowflake, Volleyball, Gamepad2, Swords,
}

/* Frontend-only WinHouse sportsbook preview. This page intentionally mounts one raw iframe. */
const WINHOUSE_EMBED_KEY = 'ifr_42b9d5489dd29796a83719065721a1de8faa1b54'
const WINHOUSE_BOOK_URL =
  `https://iframe.winhouse.bet/book?key=${WINHOUSE_EMBED_KEY}&embed=1&lang=en`

export default function Sports() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const keep = iframeRef.current

    // A previous embed.js initialization during Vite Fast Refresh can leave a
    // detached/second frame in the document. Keep exactly the iframe rendered
    // by React and remove stale loader tags and foreign copies.
    document
      .querySelectorAll<HTMLIFrameElement>('iframe[src*="iframe.winhouse.bet/book"]')
      .forEach((frame) => {
        if (frame !== keep) frame.remove()
      })
    document
      .querySelectorAll<HTMLScriptElement>('script[src*="iframe.winhouse.bet/embed.js"]')
      .forEach((script) => script.remove())

    return () => {
      document
        .querySelectorAll<HTMLIFrameElement>('iframe[src*="iframe.winhouse.bet/book"]')
        .forEach((frame) => {
          if (frame !== keep) frame.remove()
        })
      document
        .querySelectorAll<HTMLScriptElement>('script[src*="iframe.winhouse.bet/embed.js"]')
        .forEach((script) => script.remove())
    }
  }, [])

  return (
    <section className="w-full min-w-0 overflow-hidden bg-[#06141e]">
      <iframe
        ref={iframeRef}
        id="winhouse-book-frame"
        src={WINHOUSE_BOOK_URL}
        title="WinHouse sportsbook preview"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; fullscreen"
        allowFullScreen
        className="block h-[calc(100dvh-54px)] w-full border-0"
        style={{ height: 'calc(100dvh - 54px)', minHeight: 0, width: '100%', border: 0 }}
      />
    </section>
  )
}

/* /sports/:category — original mock category pages remain for the local
   navigation paths (the embedded sportsbook is the /sports experience). */
export function SportsCategory() {
  const { category } = useParams()
  const known = !category || SPORT_CATEGORIES.some((c) => c.slug === category)
  if (!known) return <Navigate to="/sports" replace />

  const events = category
    ? SPORTS_EVENTS.filter((e) => e.sport.toLowerCase().replace(/[^a-z]+/g, '-') === category)
    : SPORTS_EVENTS
  const live = events.filter((e) => e.live)
  const upcoming = events.filter((e) => !e.live)
  const activeCat = SPORT_CATEGORIES.find((c) => c.slug === category)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      {category ? (
        <Link to="/sports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
          <ChevronLeft className="w-4 h-4" /> All sports
        </Link>
      ) : null}
      <PageTitle title={activeCat ? activeCat.label : 'Sports'} subtitle="Live betting and upcoming events." />

      {/* Sport category strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-8">
        <Link
          to="/sports"
          className={cn(
            'shrink-0 flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors',
            !category ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
          )}
        >
          <Trophy className="w-4 h-4" /> All
        </Link>
        {SPORT_CATEGORIES.map((c) => {
          const Icon = ICONS[c.icon] ?? Trophy
          const isActive = c.slug === category
          return (
            <Link
              key={c.slug}
              to={`/sports/${c.slug}`}
              className={cn(
                'shrink-0 flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
              )}
            >
              <Icon className="w-4 h-4" /> {c.label}
            </Link>
          )
        })}
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm py-10 text-center">
          No events scheduled for this sport right now.
        </p>
      ) : (
        <>
          {live.length > 0 ? (
            <>
              <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Live now</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-8">
                {live.map((e) => (
                  <MatchCard key={e.id} event={e} className="w-full" />
                ))}
              </div>
            </>
          ) : null}

          {upcoming.length > 0 ? (
            <>
              <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Upcoming</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((e) => (
                  <MatchCard key={e.id} event={e} className="w-full" />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
