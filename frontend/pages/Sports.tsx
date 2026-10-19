import { useEffect, useRef } from 'react'
import { useLocation, Link, useParams, Navigate } from 'react-router-dom'
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

/* WinHouse's supported embed.js loader manages the internal frame sizing.
   WinHouse is cross-origin, so the provider still renders its book in an iframe. */
const WINHOUSE_EMBED_KEY = 'ifr_42b9d5489dd29796a83719065721a1de8faa1b54'
const WINHOUSE_EMBED_SCRIPT = 'https://iframe.winhouse.bet/embed.js'
const WINHOUSE_BOOK_BASE =
  `https://iframe.winhouse.bet/book?key=${WINHOUSE_EMBED_KEY}&embed=1&lang=en`

const WINHOUSE_VIEWS: Record<string, string> = {
  '/sports': '/line',
  '/sports/live': '/live/overview',
  '/sports/my-bets': '/mybets',
  '/sports/favorites': '/favorites',
  '/sports/search': '/search/',
}

export default function Sports() {
  const { pathname } = useLocation()
  const view = WINHOUSE_VIEWS[pathname] ?? '/line'
  const targetRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    let disposed = false
    target.replaceChildren()

    const configureFrame = () => {
      if (disposed) return
      const frame = target.querySelector('iframe') ?? window.WinHouseEmbed?.frame
      if (!(frame instanceof HTMLIFrameElement)) return

      frame.id = 'winhouse-book-frame'
      frame.title = 'WinHouse sportsbook'
      frame.referrerPolicy = 'strict-origin-when-cross-origin'
      frame.allow = 'autoplay; fullscreen'
      frame.allowFullscreen = true

      const nextSrc = `${WINHOUSE_BOOK_BASE}#${viewRef.current}`
      if (frame.src !== nextSrc) frame.src = nextSrc
    }

    const script = document.createElement('script')
    script.src = WINHOUSE_EMBED_SCRIPT
    script.async = true
    script.dataset.key = WINHOUSE_EMBED_KEY
    script.dataset.target = '#winhouse-book-embed'
    script.dataset.embed = '1'
    script.dataset.lang = 'en'
    script.dataset.width = '100%'
    script.dataset.height = 'calc(100dvh - 54px)'
    // Intentionally omit data-bottom-gap: our fixed nav overlays the provider
    // tab bar rather than stacking a second bottom navigation below it.

    const observer = new MutationObserver(configureFrame)
    observer.observe(target, { childList: true, subtree: true })
    script.addEventListener('load', configureFrame)
    target.appendChild(script)

    return () => {
      disposed = true
      observer.disconnect()
      script.removeEventListener('load', configureFrame)
      script.remove()

      const frame = target.querySelector('iframe')
      if (frame) frame.remove()
      if (window.WinHouseEmbed?.frame === frame) window.WinHouseEmbed = undefined
      target.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const frame = targetRef.current?.querySelector('iframe') ?? window.WinHouseEmbed?.frame
    if (!(frame instanceof HTMLIFrameElement)) return

    const nextSrc = `${WINHOUSE_BOOK_BASE}#${view}`
    if (frame.src !== nextSrc) frame.src = nextSrc
    window.WinHouseEmbed?.refit?.()
  }, [view])

  return (
    <section
      className="relative w-full min-w-0 overflow-hidden bg-[#06141e]"
      style={{ height: 'calc(100dvh - 54px)', minHeight: 0 }}
    >
      <div id="winhouse-book-embed" ref={targetRef} className="h-full w-full" />
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
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
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
