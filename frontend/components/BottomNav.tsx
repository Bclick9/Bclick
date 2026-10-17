import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  X, Coins, Volleyball, Gift, Search as SearchIcon,
  Radio, Monitor, Clock3, Star, Ticket,
  type LucideIcon,
} from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { cn } from '../lib/shadcn/utils'

type NavEntry = {
  to?: string
  icon: LucideIcon
  label: string
  action?: 'betslip'
}

const SITE_NAV_ITEMS: NavEntry[] = [
  { to: '/casino', icon: Coins, label: 'Casino' },
  { to: '/sports', icon: Volleyball, label: 'Sports' },
  { to: '/promotions', icon: Gift, label: 'Promotions' },
  { to: '/search', icon: SearchIcon, label: 'Search' },
]

const SPORTS_LANDING_ITEMS: NavEntry[] = [
  { to: '/sports/live', icon: Radio, label: 'Live' },
  { action: 'betslip', icon: Ticket, label: 'Betslip' },
  { to: '/sports/my-bets', icon: Clock3, label: 'My Bets' },
  { to: '/sports/favorites', icon: Star, label: 'Favorites' },
]

const SPORTS_LIVE_ITEMS: NavEntry[] = [
  { to: '/sports', icon: Monitor, label: 'Pre-Matches' },
  { action: 'betslip', icon: Ticket, label: 'Betslip' },
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

type WinHousePublicApi = {
  frame?: HTMLIFrameElement
  openBetslip?: () => void
  selectionCount?: number
  totalOdds?: number
}

declare global {
  interface Window {
    WinHouseEmbed?: WinHousePublicApi
  }
}

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

  const openBetslip = useCallback(() => {
    const api = window.WinHouseEmbed
    if (typeof api?.openBetslip === 'function') {
      api.openBetslip()
      closeMenu()
      return
    }

    // The published WinHouse API does not currently expose openBetslip().
    // Focus the embedded book so its own native betslip remains available.
    const frame = api?.frame ?? document.getElementById('winhouse-book-frame')
    if (frame instanceof HTMLIFrameElement) {
      closeMenu()
      frame.focus()
      frame.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [closeMenu])

  const selectionCount = typeof window !== 'undefined'
    && typeof window.WinHouseEmbed?.selectionCount === 'number'
    ? window.WinHouseEmbed.selectionCount
    : null
  const selectionBadge = selectionCount === null ? '—' : String(selectionCount)

  return (
    <>
      <nav
        className="cb-nav md:hidden fixed bottom-0 inset-x-0 z-50 cb-safe-bottom"
        aria-label={isSportsRoute ? 'Sportsbook navigation' : 'Mobile navigation'}
      >
        <div className="grid grid-cols-5">
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

          {activeItems.map((item) => {
            if (item.action === 'betslip') {
              return (
                <button
                  key="betslip"
                  type="button"
                  onClick={openBetslip}
                  aria-label={selectionCount === null
                    ? 'Betslip; live selection count is not exposed by the current WinHouse API'
                    : `Open Betslip, ${selectionCount} selections`}
                  title={selectionCount === null
                    ? 'WinHouse does not currently expose the live selection count to the parent page'
                    : `${selectionCount} selections`}
                  className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-[#c3ced9] transition-colors hover:text-white"
                >
                  <span className="relative inline-flex">
                    <Ticket className="w-5 h-5" />
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--cb-nav)] bg-[var(--cb-yellow)] px-1 text-[8px] font-black leading-none text-[#00151e]">
                      {selectionBadge}
                    </span>
                  </span>
                  <span>Betslip</span>
                </button>
              )
            }

            const to = item.to!
            const active = to === '/sports'
              ? pathname === '/sports'
              : pathname === to || (!isSportsRoute && to !== '/' && pathname.startsWith(to))
            const Icon = item.icon
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
                <span>{item.label}</span>
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
