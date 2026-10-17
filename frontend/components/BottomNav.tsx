import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  X, Coins, Volleyball, Gift, Search as SearchIcon,
  Radio, Monitor, Clock3, Star,
} from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { cn } from '../lib/shadcn/utils'

/*
 * Main site uses its standard five-item mobile nav.
 * On the sportsbook, show Menu + Live on the landing view. After entering
 * Live, keep Menu and replace Live with Pre-matches, Search, My Bets, Favorites.
 */
const SITE_NAV_ITEMS = [
  { to: '/casino', icon: Coins, label: 'Casino' },
  { to: '/sports', icon: Volleyball, label: 'Sports' },
  { to: '/promotions', icon: Gift, label: 'Promotions' },
  { to: '/search', icon: SearchIcon, label: 'Search' },
]

const SPORTS_LANDING_ITEMS = [
  { to: '/sports/live', icon: Radio, label: 'Live' },
]

const SPORTS_LIVE_ITEMS = [
  { to: '/sports', icon: Monitor, label: 'Pre-matches' },
  { to: '/sports/search', icon: SearchIcon, label: 'Search' },
  { to: '/sports/my-bets', icon: Clock3, label: 'My Bets' },
  { to: '/sports/favorites', icon: Star, label: 'Favorites' },
]

const SPORTS_PATHS = [
  '/sports',
  '/sports/live',
  '/sports/my-bets',
  '/sports/favorites',
  '/sports/search',
]

export function BottomNav() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const isSportsRoute = SPORTS_PATHS.includes(pathname)
  const isSportsLanding = pathname === '/sports'
  const activeItems = !isSportsRoute
    ? SITE_NAV_ITEMS
    : isSportsLanding
      ? SPORTS_LANDING_ITEMS
      : SPORTS_LIVE_ITEMS

  return (
    <>
      <nav
        className="cb-nav md:hidden fixed bottom-0 inset-x-0 z-50 cb-safe-bottom"
        aria-label={isSportsRoute ? 'Sportsbook navigation' : 'Mobile navigation'}
      >
        <div className={cn('grid', isSportsRoute && isSportsLanding ? 'grid-cols-2' : 'grid-cols-5')}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
              menuOpen ? 'text-white' : 'text-[#c3ced9] hover:text-white',
            )}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <MenuGlyph />}
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
          </button>

          {activeItems.map(({ to, icon: Icon, label }) => {
            const active = to === '/sports'
              ? pathname === '/sports'
              : pathname === to || (!isSportsRoute && to !== '/' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                onClick={closeMenu}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-white' : 'text-[#c3ced9] hover:text-white',
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  )
}

/* Hamburger glyph for the closed menu state */
function MenuGlyph() {
  return (
    <span className="flex flex-col gap-[3px]" aria-hidden>
      <span className="block w-5 h-[2px] bg-current rounded-full" />
      <span className="block w-5 h-[2px] bg-current rounded-full" />
      <span className="block w-5 h-[2px] bg-current rounded-full" />
    </span>
  )
}
