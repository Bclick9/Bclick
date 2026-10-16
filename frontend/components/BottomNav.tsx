import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, Coins, Volleyball, Gift, Search as SearchIcon } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { cn } from '../lib/shadcn/utils'

/* Persistent mobile bottom navigation. The first control opens the menu and,
   while the menu is open, becomes the Close control (X + "Close" label),
   exactly as in the reference open-state screenshot. */

const NAV_ITEMS = [
  { to: '/casino', icon: Coins, label: 'Casino' },
  { to: '/sports', icon: Volleyball, label: 'Sports' },
  { to: '/promotions', icon: Gift, label: 'Promotions' },
  { to: '/search', icon: SearchIcon, label: 'Search' },
]

export function BottomNav() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <>
      <nav
        className="cb-nav md:hidden fixed bottom-0 inset-x-0 z-50 cb-safe-bottom"
        aria-label="Mobile navigation"
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
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-white' : 'text-[#c3ced9] hover:text-white',
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
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
