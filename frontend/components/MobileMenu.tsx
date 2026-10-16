import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { SIDEBAR_ITEMS, LanguageFlag } from './Sidebar'
import { cn } from '../lib/shadcn/utils'

/* Mobile menu OPEN state — recreated from the supplied reference screenshot:
   a full-screen sheet above the page content (the persistent bottom nav stays
   visible on top, with its Menu control turned into a Close control), a small
   drag-handle bar at the very top, rounded item cards, the active route
   highlighted, and British English / Support buttons pinned at the bottom. */

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { pathname } = useLocation()

  /* Close whenever the user navigates to a different page */
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

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

      {/* Pinned footer row: language + support, sitting above the bottom nav */}
      <div className="shrink-0 px-4 pt-3 pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="flex items-center justify-center gap-2.5 h-[52px] rounded-xl bg-[var(--cb-card)] text-white hover:bg-[var(--cb-hover)] transition-colors"
            aria-label="Language: British English"
          >
            <LanguageFlag />
            <span className="text-sm font-semibold">British English</span>
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
