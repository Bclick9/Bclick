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

/* Exact sportsbook iframe URL — every query parameter preserved */
const SPORTSBOOK_URL =
  'https://cmssport.cmswager.com/?language=en-US&token=guest&integration=2639142c806d9da449dd68a9c4150245&platform=desktop&defaultpage=sport'

/* /sports — the sportsbook itself, embedded in an iframe filling the content
   area between the app header and (on mobile) the bottom navigation. */
export default function Sports() {
  return (
    <div className="flex flex-col">
      <div className="h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-60px)] w-full">
        <iframe
          src={SPORTSBOOK_URL}
          title="CampeonBet sportsbook"
          loading="lazy"
          className="w-full h-full block border-0"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
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
