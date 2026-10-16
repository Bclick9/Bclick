import { Link, useLocation } from 'react-router-dom'
import {
  Home, Coins, Disc3, Volleyball, Gift, Trophy, Crown, MessageSquare,
  PanelLeft, Target,
} from 'lucide-react'
import { cn } from '../lib/shadcn/utils'

export const SIDEBAR_WIDTH = { collapsed: 70, expanded: 235 }

export const SIDEBAR_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/casino', icon: Coins, label: 'Casino' },
  { to: '/live-casino', icon: Disc3, label: 'Live Casino' },
  { to: '/sports', icon: Volleyball, label: 'Sports' },
  { to: '/promotions', icon: Gift, label: 'Promotions' },
  { to: '/jackpots', icon: Trophy, label: 'Jackpots' },
  { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/vip', icon: Crown, label: 'VIP' },
  { to: '/rewards', icon: Target, label: 'Rewards' },
]

/* Match the live site's English (UK) language selector. */
export function WireframeFlag() {
  return <span className="inline-flex w-6 h-4 items-center justify-center text-base leading-none" aria-hidden>🇬🇧</span>
}
export { WireframeFlag as LanguageFlag }

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const { pathname } = useLocation()
  const width = expanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed

  return (
    <aside
      className="cb-nav hidden md:flex fixed inset-y-0 left-0 z-40 flex-col overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width }}
      aria-label="Main navigation"
    >
      {/* collapse/expand control — toggles the sidebar presentation */}
      <div className="p-2.5 shrink-0">
        <button
          aria-label={expanded ? 'Collapse sidebar menu' : 'Expand sidebar menu'}
          aria-expanded={expanded}
          aria-controls="desktop-sidebar-nav"
          onClick={onToggle}
          className="w-10 h-10 rounded-lg bg-[var(--cb-card)] text-muted-foreground hover:text-foreground hover:bg-[var(--cb-hover)] flex items-center justify-center transition-colors"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>

      <nav id="desktop-sidebar-nav" className="flex-1 px-2.5 space-y-1.5">
        {SIDEBAR_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={cn(
                'flex items-center gap-3.5 h-11 rounded-xl px-4 transition-colors whitespace-nowrap',
                expanded ? 'justify-start' : 'justify-center px-0',
                active
                  ? 'bg-[var(--cb-item-active)] text-white'
                  : 'text-[#c3ced9] hover:text-white hover:bg-[var(--cb-hover)]',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {expanded ? <span className="text-[15px] font-semibold">{label}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 px-3.5 pb-4 pt-2 space-y-3">
        <button
          className={cn(
            'flex items-center gap-3 h-12 w-full rounded-xl bg-[var(--cb-card)] text-white hover:bg-[var(--cb-hover)] transition-colors',
            expanded ? 'justify-start px-3' : 'justify-center',
          )}
          aria-label="Language: English (UK)"
        >
          <WireframeFlag />
          {expanded ? <span className="text-sm font-semibold">English (UK)</span> : null}
        </button>
        <Link
          to="/info/contact"
          className={cn(
            'flex items-center gap-3 h-12 w-full rounded-xl border-2 border-[var(--cb-yellow)] text-white hover:bg-[var(--cb-hover)] transition-colors',
            expanded ? 'justify-start px-3' : 'justify-center',
          )}
          aria-label="Support"
          title="Support"
        >
          <MessageSquare className="w-5 h-5 text-[var(--cb-yellow)] shrink-0" />
          {expanded ? <span className="text-sm font-semibold">Support</span> : null}
        </Link>
      </div>
    </aside>
  )
}
