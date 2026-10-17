import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Radio, Clock3, Star, Search as SearchIcon, Ticket, X, Info } from 'lucide-react'
import { SIDEBAR_ITEMS, LanguageFlag } from './Sidebar'
import { cn } from '../lib/shadcn/utils'

/* Mobile menu sheet: persistent bottom navigation remains on top, the Menu
   control becomes Close, active routes are highlighted, and language / Support
   controls stay pinned above the bottom navigation. */

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { pathname } = useLocation()
  const [betslipNoticeOpen, setBetslipNoticeOpen] = useState(false)
  const [betslipCommandAvailable, setBetslipCommandAvailable] = useState(false)
  const previousPathname = useRef(pathname)

  const handleBetslipClick = () => {
    /*
     * WinHouse's published embed API does not currently document openBetslip().
     * Feature-detect it in case the tenant has a newer/vendor-provided extension.
     */
    const api = (window as Window & {
      WinHouseEmbed?: { openBetslip?: () => void }
    }).WinHouseEmbed

    if (typeof api?.openBetslip === 'function') {
      api.openBetslip()
      setBetslipCommandAvailable(true)
      setBetslipNoticeOpen(false)
      onClose()
      return
    }

    setBetslipCommandAvailable(false)
    setBetslipNoticeOpen(true)
  }

  /* Close only when the route changes, not immediately when the menu opens. */
  useEffect(() => {
    if (previousPathname.current !== pathname && open) onClose()
    previousPathname.current = pathname
  }, [pathname, open, onClose])

  /* Scroll lock + Escape while open */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      id="mobile-menu-panel"
      className="md:hidden fixed inset-x-0 top-0 bottom-0 z-40 cb-nav cb-menu-panel flex flex-col cb-safe-top"
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      {/* Scrollable sheet body — the persistent bottom nav (z-50) stays visible above it */}
      <div className="flex-1 overflow-y-auto">
        {/* Drag-handle bar shown at the top of the reference sheet */}
        <div className="flex justify-center pt-2 pb-3">
          <span className="block w-[104px] h-1.5 rounded-full bg-white" aria-hidden />
        </div>

        {pathname.startsWith('/sports') ? (
          <div className="px-4 pt-1 pb-3">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7F95A6]">
              Sportsbook
            </p>
            <nav className="grid grid-cols-2 gap-2" aria-label="Sportsbook pages">
              {[
                { to: '/sports/live', label: 'Live', icon: Radio },
                { to: '/sports/my-bets', label: 'My Bets', icon: Clock3 },
                { to: '/sports/favorites', label: 'Favorites', icon: Star },
                { to: '/sports/search', label: 'Search events', icon: SearchIcon },
              ].map(({ to, label, icon: Icon }) => {
                const active = pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-12 items-center gap-2.5 rounded-xl px-3 text-sm transition-colors',
                      active
                        ? 'bg-[var(--cb-item-active)] font-bold text-white'
                        : 'bg-[var(--cb-card)] font-semibold text-[#dbe4ec] hover:bg-[var(--cb-hover)]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--cb-yellow)]" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={handleBetslipClick}
              className="mt-2.5 flex h-[58px] w-full items-center gap-3 rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] px-3.5 text-left transition-colors hover:border-[var(--cb-yellow)] hover:bg-[var(--cb-hover)]"
              aria-label="Open Betslip, preview badge shows 3 selections"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#17313E] text-[var(--cb-yellow)]">
                <Ticket className="h-5 w-5" />
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--cb-nav)] bg-[var(--cb-yellow)] px-1 text-[10px] font-black leading-none text-[#00151e]">
                  3
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">Betslip</span>
                <span className="block text-[11px] text-[#91A6B5]">3 selections · preview</span>
              </span>
              <span className="rounded-full bg-[#17313E] px-2.5 py-1 text-[10px] font-bold text-[#FFBF00]">OPEN</span>
            </button>
          </div>
        ) : null}

        <nav className="px-4 pt-1 space-y-2.5">
          {SIDEBAR_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3.5 h-[52px] px-4 rounded-xl transition-colors',
                  active
                    ? 'bg-[var(--cb-item-active)] text-white'
                    : 'bg-[var(--cb-card)] text-[#dbe4ec] hover:bg-[var(--cb-hover)]',
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-[#8fa3b8]')} />
                <span className={cn('text-[15px]', active ? 'font-bold text-white' : 'font-semibold')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {betslipNoticeOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBetslipNoticeOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="betslip-notice-title"
            className="w-full max-w-2xl overflow-hidden rounded-t-2xl border border-[var(--cb-line)] bg-[#0A1B26] shadow-2xl sm:rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--cb-line)] px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17313E] text-[var(--cb-yellow)]">
                <Ticket className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="betslip-notice-title" className="text-base font-black text-white">Betslip</h2>
                <p className="text-xs text-[#91A6B5]">CampeónBet · interface preview</p>
              </div>
              <button
                type="button"
                onClick={() => setBetslipNoticeOpen(false)}
                aria-label="Close Betslip notice"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#AFC0CC] hover:bg-[#17313E] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5 sm:p-7">
              <div className="flex items-start gap-3 rounded-xl border border-[#355061] bg-[#102531] p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-yellow)]" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white">
                    WinHouse does not document a public command to open its in-iframe Betslip.
                  </p>
                  <p className="text-sm leading-relaxed text-[#AFC0CC]">
                    The button and badge are a visual preview only. The displayed “3” is not connected to live selections yet.
                    Keep the native WinHouse Betslip button enabled until WinHouse provides an official open command and a selection-count event.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBetslipNoticeOpen(false)}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--cb-yellow)] px-4 text-sm font-black text-[#00151e] hover:brightness-105"
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Pinned footer row: language + support, sitting above the bottom nav */}
      <div className="shrink-0 px-4 pt-3 pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="flex items-center justify-center gap-2.5 h-[52px] rounded-xl bg-[var(--cb-card)] text-white hover:bg-[var(--cb-hover)] transition-colors"
            aria-label="Language: English (UK)"
          >
            <LanguageFlag />
            <span className="text-sm font-semibold">English (UK)</span>
          </button>
          <Link
            to="/info/contact"
            onClick={onClose}
            className="flex items-center justify-center gap-2.5 h-[52px] rounded-xl border-2 border-[var(--cb-yellow)] text-white hover:bg-[var(--cb-hover)] transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-[var(--cb-yellow)]" />
            <span className="text-sm font-semibold">Support</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
