import { useCallback, useEffect, useRef, useState } from 'react'
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
  refit?: () => void
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
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // A text field inside the cross-origin WinHouse embed will not send focus
  // events to this page, but opening the mobile keyboard resizes visualViewport.
  // Hide the site's fixed bottom navigation while that reduced viewport is active.
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let largestHeight = Math.max(window.innerHeight, viewport.height)
    let lastWidth = window.innerWidth
    let lastCompactMode = window.matchMedia('(max-width: 767px)').matches
    let orientationAngle = window.screen.orientation?.angle

    const resetViewportBaseline = () => {
      lastWidth = window.innerWidth
      lastCompactMode = window.matchMedia('(max-width: 767px)').matches
      orientationAngle = window.screen.orientation?.angle
      largestHeight = Math.max(window.innerHeight, viewport.height)
      setKeyboardOpen(false)
    }

    const updateKeyboardState = () => {
      const nextCompactMode = window.matchMedia('(max-width: 767px)').matches
      const nextOrientationAngle = window.screen.orientation?.angle
      const widthChanged = Math.abs(window.innerWidth - lastWidth) > 80
      const breakpointChanged = nextCompactMode !== lastCompactMode
      const orientationChanged = nextOrientationAngle !== orientationAngle

      // Switching desktop/mobile layouts or rotating the device establishes
      // a new viewport baseline. Never treat the old desktop height as a keyboard.
      if (widthChanged || breakpointChanged || orientationChanged) {
        resetViewportBaseline()
        return
      }

      largestHeight = Math.max(largestHeight, viewport.height)
      const heightReduction = largestHeight - viewport.height

      setKeyboardOpen((wasOpen) => {
        if (heightReduction > 130) return true
        if (heightReduction < 80) return false
        return wasOpen
      })
    }

    const resetAndUpdate = () => {
      resetViewportBaseline()
      updateKeyboardState()
    }

    viewport.addEventListener('resize', updateKeyboardState)
    window.addEventListener('resize', updateKeyboardState)
    window.addEventListener('orientationchange', resetAndUpdate)
    updateKeyboardState()

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState)
      window.removeEventListener('resize', updateKeyboardState)
      window.removeEventListener('orientationchange', resetAndUpdate)
    }
  }, [])

  useEffect(() => {
    if (keyboardOpen) closeMenu()
  }, [keyboardOpen, closeMenu])

  const isSportsRoute = SPORTS_PATHS.includes(pathname)
  const isSportsLanding = pathname === '/sports'
  const activeItems = !isSportsRoute
    ? SITE_NAV_ITEMS
    : isSportsLanding
      ? SPORTS_LANDING_ITEMS
      : SPORTS_LIVE_ITEMS

  const [selectionCount, setSelectionCount] = useState<number | null>(null)

  useEffect(() => {
    const syncSelectionCount = () => {
      const value = window.WinHouseEmbed?.selectionCount
      setSelectionCount(typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)
    }
    syncSelectionCount()
    const poll = window.setInterval(syncSelectionCount, 1000)
    return () => window.clearInterval(poll)
  }, [])

  const openBetslip = useCallback(() => {
    // Never open the site Menu as a side effect of tapping Betslip.
    closeMenu()

    const api = window.WinHouseEmbed
    if (typeof api?.openBetslip === 'function') {
      api.openBetslip()
      return
    }

    // WinHouse's documented public API currently has no openBetslip command.
    // Focus its embed, but do not scroll to another view or display a fake slip.
    const frame = api?.frame ?? document.getElementById('winhouse-book-frame')
    if (frame instanceof HTMLIFrameElement) frame.focus()
  }, [closeMenu])

  return (
    <>
      <nav
        className={cn(
          'cb-nav md:hidden fixed bottom-0 inset-x-0 z-50 cb-safe-bottom',
          keyboardOpen && 'hidden',
        )}
        aria-hidden={keyboardOpen || undefined}
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
                    ? 'Betslip'
                    : `Betslip, ${selectionCount} selections`}
                  title={selectionCount === null
                    ? 'WinHouse has not exposed the live selection count'
                    : `${selectionCount} selections`}
                  className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-[#c3ced9] transition-colors hover:text-white"
                >
                  <span className="relative inline-flex">
                    <BetslipGlyph />
                    {selectionCount !== null ? (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--cb-nav)] bg-[var(--cb-yellow)] px-1 text-[8px] font-black leading-none text-[#00151e]">
                        {selectionCount}
                      </span>
                    ) : null}
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

      <MobileMenu open={menuOpen && !keyboardOpen} onClose={closeMenu} />
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


function BetslipGlyph() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z" />
      <path d="M14 6v12" />
    </svg>
  )
}
