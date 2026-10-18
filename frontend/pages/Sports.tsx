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

/* Use WinHouse's supported loader for responsive sizing. embed=1 suppresses
   WinHouse's own header and left rail so the site's Header and Sidebar remain
   the only navigation chrome. */
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
    script.dataset.height = 'calc(100dvh - 64px)'

    // The site has a fixed mobile bottom nav. WinHouse's loader subtracts this
    // gap on phones so its own bottom tabs and betslip remain tappable above it.
    const bottomNavSelector = 'nav[aria-label="Sportsbook navigation"]'
    const getBottomGap = () => {
      if (!window.matchMedia('(max-width: 767px)').matches) return 0
      const bottomNav = document.querySelector<HTMLElement>(bottomNavSelector)
      if (!bottomNav || window.getComputedStyle(bottomNav).display === 'none') return 0
      return Math.max(0, Math.ceil(bottomNav.getBoundingClientRect().height))
    }

    const updateBottomGap = () => {
      const nextGap = String(getBottomGap())
      if (script.dataset.bottomGap === nextGap) return
      script.dataset.bottomGap = nextGap
      window.WinHouseEmbed?.refit?.()
    }

    script.dataset.bottomGap = String(getBottomGap())

    const observer = new MutationObserver(configureFrame)
    const bottomNav = document.querySelector<HTMLElement>(bottomNavSelector)
    const bottomNavResizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateBottomGap)
      : null
    const bottomNavMutationObserver = bottomNav
      ? new MutationObserver(updateBottomGap)
      : null
    if (bottomNav) {
      bottomNavResizeObserver?.observe(bottomNav)
      bottomNavMutationObserver?.observe(bottomNav, { attributes: true, attributeFilter: ['class', 'style'] })
    }

    const refreshBottomGap = () => updateBottomGap()
    window.addEventListener('resize', refreshBottomGap, { passive: true })
    window.addEventListener('orientationchange', refreshBottomGap)
    window.visualViewport?.addEventListener('resize', refreshBottomGap, { passive: true })
    observer.observe(target, { childList: true, subtree: true })
    script.addEventListener('load', configureFrame)
    target.appendChild(script)

    return () => {
      disposed = true
      observer.disconnect()
      bottomNavResizeObserver?.disconnect()
      bottomNavMutationObserver?.disconnect()
      window.removeEventListener('resize', refreshBottomGap)
      window.removeEventListener('orientationchange', refreshBottomGap)
      window.visualViewport?.removeEventListener('resize', refreshBottomGap)
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
      className="relative h-[calc(100dvh-3.5rem)] w-full min-w-0 overflow-hidden bg-[#06141e] md:h-[calc(100dvh-4rem)]"
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
