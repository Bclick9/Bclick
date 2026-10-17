import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Coins, Disc3, Volleyball, Gift, Trophy, Crown, MessageSquare, Target,
} from 'lucide-react'
import { cn } from '../lib/shadcn/utils'

export const SIDEBAR_WIDTH = { collapsed: 76, expanded: 235 }

/* Keep the mobile sheet's existing list separate from the desktop rail. */
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

type SidebarIconProps = { className?: string }
type SidebarGlyph = ComponentType<SidebarIconProps>

const DESKTOP_ITEMS: { to: string; icon: SidebarGlyph; label: string }[] = [
  { to: '/', icon: HomeGlyph, label: 'Home' },
  { to: '/casino', icon: CasinoGlyph, label: 'Casino' },
  { to: '/live-casino', icon: LiveCasinoGlyph, label: 'Live Casino' },
  { to: '/sports', icon: SportsGlyph, label: 'Sports' },
  { to: '/sports/live', icon: LiveSportsGlyph, label: 'Live' },
  { to: '/promotions', icon: PromotionsGlyph, label: 'Promotions' },
  { to: '/jackpots', icon: JackpotsGlyph, label: 'Jackpots' },
  { to: '/tournaments', icon: TournamentGlyph, label: 'Tournaments' },
  { to: '/vip', icon: VipGlyph, label: 'VIP' },
  { to: '/rewards', icon: RewardsGlyph, label: 'Rewards' },
]

/* English (UK), matching the flag displayed on the reference sidebar. */
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
      className="cb-nav hidden md:flex fixed inset-y-0 left-0 z-40 flex-col overflow-hidden px-2.5 pb-2.5 transition-[width] duration-200 ease-out"
      style={{ width }}
      aria-label="Main navigation"
    >
      <div className="flex min-h-16 shrink-0 items-center">
        <button
          type="button"
          aria-label={expanded ? 'Collapse sidebar menu' : 'Expand sidebar menu'}
          aria-expanded={expanded}
          aria-controls="desktop-sidebar-nav"
          onClick={onToggle}
          className="shrink-0 rounded-lg px-3 text-[#aebfca] outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--cb-yellow)]"
        >
          <SidebarToggleGlyph className="size-7" />
        </button>
      </div>

      <nav id="desktop-sidebar-nav" className="scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {DESKTOP_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = to === '/'
            ? pathname === '/'
            : to === '/sports'
              ? pathname === '/sports' || (pathname.startsWith('/sports/') && pathname !== '/sports/live')
              : pathname === to || pathname.startsWith(to + '/')

          return (
            <Link key={to} to={to} title={label} aria-label={label} aria-current={active ? 'page' : undefined} className="block w-full shrink-0 outline-none">
              <div
                className={cn(
                  'group flex w-full items-center gap-2 overflow-hidden rounded-[10px] px-3 py-2 transition-colors whitespace-nowrap',
                  active
                    ? 'bg-[var(--cb-item-active)] text-white'
                    : 'text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <Icon className="size-6 md:size-7" />
                </span>
                <span
                  aria-hidden={!expanded}
                  className={cn(
                    'truncate whitespace-nowrap font-semibold text-sm transition-opacity duration-200 ease-out',
                    expanded ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 pt-2">
        <div className="grid shrink-0 grid-cols-1 gap-2">
          <button
            type="button"
            className="relative w-full rounded-[10px] border border-[var(--cb-line)] p-0 text-white transition-colors hover:bg-[var(--cb-hover)] hover:border-[var(--cb-yellow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-yellow)]"
            aria-label="Language: British English"
            title="British English"
          >
            <div className="group flex w-full items-center gap-2 overflow-hidden rounded-[10px] px-3 py-2 transition-colors">
              <span className="flex size-8 shrink-0 items-center justify-center">
                <WireframeFlag />
              </span>
              <span className={cn('truncate whitespace-nowrap font-semibold text-sm transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0')} aria-hidden={!expanded}>
                British English
              </span>
            </div>
          </button>

          <Link
            to="/info/contact"
            className="relative block w-full rounded-[10px] border border-[var(--cb-yellow)] p-0 text-white transition-colors hover:bg-[var(--cb-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-yellow)]"
            aria-label="Support"
            title="Support"
          >
            <div className="group flex w-full items-center gap-2 overflow-hidden rounded-[10px] px-3 py-2 transition-colors">
              <span className="flex size-8 shrink-0 items-center justify-center">
                <SupportGlyph className="size-6 md:size-7" />
              </span>
              <span className={cn('truncate whitespace-nowrap font-semibold text-sm transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0')} aria-hidden={!expanded}>
                Support
              </span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  )
}

function SidebarToggleGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.31423 14.4064C8.51222 14.5987 8.82882 14.5944 9.02126 14.3966L11.0105 12.3488C11.199 12.1547 11.199 11.8455 11.0105 11.6515L9.02126 9.60364C8.82887 9.40569 8.51227 9.40061 8.31423 9.5929C8.11619 9.78528 8.11215 10.1019 8.30446 10.2999L9.95485 12.0001L8.30446 13.6993C8.11213 13.8973 8.11639 14.2139 8.31423 14.4064Z" />
      <path d="M14.1025 20.9414C16.1442 20.9414 17.8185 20.5254 18.9551 19.3555C20.0848 18.1924 20.4843 16.4874 20.4844 14.4004L20.4844 9.59961C20.4843 7.51268 20.0848 5.80762 18.9551 4.64453C17.8185 3.47456 16.1444 3.05859 14.1025 3.05859L9.44043 3.05859C7.39881 3.05859 5.72443 3.47456 4.58789 4.64453C3.45811 5.80762 3.05864 7.51265 3.05859 9.59961L3.05859 14.4004C3.05864 16.4873 3.45811 18.1924 4.58789 19.3555C5.72444 20.5254 7.39881 20.9414 9.44043 20.9414L13.5996 20.9414L13.5996 19.0586L9.44043 19.0586C7.59633 19.0586 6.54953 18.674 5.9375 18.0439C5.31911 17.4071 4.94146 16.3126 4.94141 14.4004L4.94141 9.59961C4.94146 7.6874 5.31911 6.59289 5.9375 5.95605C6.54953 5.32603 7.59633 4.94141 9.44043 4.94141L13.5996 4.94141L13.5996 19.0586L14.1025 19.0586Z" />
    </svg>
  )
}

function HomeGlyph({ className }: SidebarIconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.43 7.86998L13.82 4.63998C12.57 3.75998 10.7 3.75998 9.57 4.63998L5.43 7.87998C4.63 8.49998 4 9.77998 4 10.79V16.37C4 16.48 4 16.59 4.02 16.69C4.03 16.81 4.05 16.93 4.07 17.06C4.37 18.5 5.51 19.64 6.95 19.94C7.17 19.99 7.4 20.01 7.64 20.01H16.36C16.6 20.01 16.83 19.99 17.05 19.94C18.5 19.64 19.63 18.51 19.93 17.06C19.98 16.84 20 16.61 20 16.37V10.89C20 9.80998 19.31 8.47998 18.43 7.86998ZM13.86 17.27C13.86 17.88 13.37 18.37 12.77 18.37H11.24C10.63 18.37 10.14 17.88 10.14 17.27V14.68C10.14 14.08 10.63 13.59 11.24 13.59H12.77C13.37 13.59 13.86 14.08 13.86 14.68V17.27Z" /></svg>
}

function CasinoGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.25169 6.11162C8.08179 6.5409 7.93857 7.03278 7.80442 7.5872L6.92845 11.3362C5.94427 15.5503 7.38432 17.8771 11.5984 18.8792L13.1013 19.2366C13.1997 19.2635 13.3076 19.2812 13.406 19.2991C13.1734 19.3975 12.9224 19.4872 12.654 19.5765L11.2409 20.0423C7.68908 21.1875 5.81895 20.2297 4.66477 16.678L3.51927 13.1438C2.37405 9.59188 3.32277 7.71289 6.87474 6.56767L8.25169 6.11162Z" />
      <path d="M9.3347 5.82548C10.3815 3.66034 12.1619 3.07868 15.1501 3.78544L16.6443 4.13408C20.393 5.01087 21.5386 6.86306 20.6618 10.6028L19.7849 14.3431C19.0333 17.5727 17.548 18.879 14.7566 18.6106C14.3092 18.5748 13.8263 18.4937 13.3074 18.3685L11.8044 18.011C8.07352 17.1253 6.91883 15.2821 7.79563 11.5423L8.67259 7.79326C8.85149 7.03298 9.06637 6.37114 9.3347 5.82548ZM14.112 6.82744C13.2622 6.60399 12.3944 7.12293 12.1618 7.98173C11.6521 9.93204 13.1646 11.5424 13.8982 12.0345C13.9877 12.088 14.1485 12.1243 14.2468 12.1243C15.1237 12.0616 17.2261 11.3813 17.7361 9.43095H17.7273C17.951 8.57204 17.4407 7.69467 16.5818 7.47099C16.0808 7.33686 15.5709 7.46274 15.1863 7.76689C15.0073 7.31954 14.622 6.96164 14.112 6.82744Z" />
    </svg>
  )
}

function LiveCasinoGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.1a8.9 8.9 0 1 0 0 17.8 8.9 8.9 0 0 0 0-17.8Zm0 5.4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
      <path d="M12 3.1c2.3 2.3 3.6 5.4 3.6 8.9s-1.3 6.6-3.6 8.9C9.7 18.6 8.4 15.5 8.4 12S9.7 5.4 12 3.1Z" fill="var(--cb-nav)" />
      <path d="M3.1 12h17.8M5.3 5.7l13.4 12.6M18.7 5.7 5.3 18.3" fill="none" stroke="var(--cb-nav)" strokeWidth="1.15" />
    </svg>
  )
}

function SportsGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 6.5 3.5 2.2-1.3 3.9h-4.4l-1.3-3.9L12 6.5Z" fill="currentColor" stroke="none" />
      <path d="m12 6.5 0-3M15.5 8.7l3-1.3M14.2 12.6l2.3 3M9.8 12.6l-2.3 3M8.5 8.7l-3-1.3M12 16.1v4.8" />
    </svg>
  )
}

function LiveSportsGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z" fill="currentColor" stroke="none" />
      <path d="m12 7-1.5-3M15 9.2l3.8-.6M13.9 12.7l2.1 3.5M10.1 12.7 8 16.2M9 9.2 5.2 8.6M12 16.2V21" />
    </svg>
  )
}

function PromotionsGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.8359 11.5999C11.1841 11.5999 11.4685 11.902 11.4688 12.2776H11.4775V19.8216C11.4775 20.1974 11.193 20.5003 10.8447 20.5003H7.16992C5.85016 20.5003 4.77757 19.3728 4.77734 17.9798V12.2776C4.77758 11.9022 5.06124 11.6002 5.40918 11.5999H10.8359Z" />
      <path d="M18.499 11.5999C18.847 11.6001 19.1307 11.9021 19.1309 12.2776V17.9788C19.1309 19.3718 18.0589 20.5 16.7393 20.5003H13.082C12.7337 20.5003 12.4492 20.1974 12.4492 19.8216V12.2776C12.4494 11.902 12.7338 11.5999 13.082 11.5999H18.499Z" />
      <path d="M13.8047 3.74148C14.1272 3.41933 14.6591 3.4191 14.9814 3.74148L16.2188 4.97976C16.5323 5.2935 16.5413 5.79015 16.2451 6.11258H18.5371C19.8183 6.11258 20.2803 6.89699 20.2803 7.85574V8.72781C20.2801 9.68634 19.8181 10.471 18.5371 10.471H5.46289C4.12982 10.4709 3.71986 9.68627 3.71973 8.72781V7.85574C3.71973 6.89706 4.1296 6.1127 5.46289 6.11258H7.74707C7.45085 5.79021 7.45905 5.29356 7.77246 4.97976L9.01074 3.74148C9.33324 3.41925 9.86509 3.41911 10.1875 3.74148L12 5.55496L13.8047 3.74148Z" />
    </svg>
  )
}

function JackpotsGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16v3.4L12.1 20H7.5l6.6-12H4V4Z" />
      <path d="M3 4h2v3H3zM7 6h2v2H7z" />
    </svg>
  )
}

function TournamentGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.60354 4.97803H4.03837C3.33519 4.97803 2.77002 5.5432 2.77002 6.24637V9.34166C2.77002 10.0448 3.34176 10.6166 4.04494 10.6166H5.18185V5.55634C5.18185 5.23433 4.91898 4.97803 4.60354 4.97803Z" />
      <path d="M18.8315 5.55634V10.6166H19.9685C20.6716 10.6166 21.2434 10.0448 21.2434 9.34166V6.24637C21.2434 5.5432 20.6782 4.97803 19.975 4.97803H19.4099C19.0878 4.97803 18.8315 5.2409 18.8315 5.55634Z" />
      <path d="M18.1416 20.8751C18.1416 20.9474 18.0824 20.9999 18.0167 20.9999C16.8272 20.9999 7.1996 20.9999 6.01012 20.9999C5.93783 20.9999 5.88525 20.9474 5.88525 20.8751C5.88525 20.4873 6.02983 20.0668 6.35842 19.7513C6.68701 19.4359 7.20617 19.219 7.94221 19.219H10.308C10.6235 19.219 10.8798 18.9627 10.8798 18.6473V16.4392C10.8798 16.1237 10.6235 15.8674 10.308 15.8674H9.77572C7.8042 15.8674 6.20727 14.2705 6.20727 12.299V6.54868C6.2007 4.5903 7.79106 2.99994 9.74944 2.99994H14.2577C16.492 2.99994 17.8195 4.32086 17.813 6.54868V12.3252C17.813 14.5465 16.4855 15.874 14.2511 15.874H13.7188C13.4033 15.874 13.147 16.1303 13.147 16.4457V18.6538C13.147 18.9693 13.4033 19.2256 13.7188 19.2256H16.0846C17.4384 19.2256 18.1481 20.1062 18.1416 20.8816V20.8751Z" />
    </svg>
  )
}

function VipGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.4686 17.2656C19.0506 17.2656 19.5233 17.7373 19.5233 18.3193V18.583C19.5232 18.814 19.3359 20 19.1053 20H4.90707C4.67663 19.9992 4.49016 18.8139 4.49008 18.583V18.3193C4.49008 17.7375 4.96199 17.2658 5.54379 17.2656H18.4686Z" />
      <path d="M11.9901 4C12.0999 4.00001 12.1989 4.02152 12.2977 4.06543C12.3965 4.10934 12.4838 4.17588 12.5496 4.26367L16.3163 9.19434C16.481 9.4139 16.7341 9.56741 17.0086 9.61133C17.283 9.65513 17.5682 9.58914 17.7987 9.43555L20.5116 7.59082C20.6213 7.51408 20.7528 7.46977 20.8954 7.46973C21.0381 7.46973 21.1703 7.51395 21.2801 7.59082C21.5105 7.75549 21.6093 8.05181 21.5545 8.32617L20.3465 14.6846C20.2916 14.9261 20.1594 15.1461 19.9618 15.2998C19.7642 15.4533 19.5227 15.541 19.2704 15.541H4.72055C4.46817 15.541 4.22671 15.4533 4.02914 15.2998C3.8315 15.1461 3.69929 14.9261 3.64438 14.6846L2.45883 8.31543C2.42589 8.18366 2.42565 8.04071 2.46957 7.91992C2.51351 7.78832 2.6011 7.67837 2.71078 7.60156C2.93039 7.43686 3.22726 7.41489 3.45785 7.55762L6.785 9.49023C7.02658 9.63299 7.31223 9.67721 7.58676 9.61133C7.86123 9.54542 8.10297 9.38022 8.25668 9.13867L11.452 4.30762C11.5069 4.21979 11.5946 4.14279 11.6825 4.08789C11.7813 4.03299 11.8803 4.01098 11.9901 4Z" />
    </svg>
  )
}

function RewardsGlyph({ className }: SidebarIconProps) {
  return <img className={cn('object-contain', className)} src="https://campeonbet.io/assets/rewards-DYB6diur.png" alt="" />
}

function SupportGlyph({ className }: SidebarIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.25 8.51104V6.63731C20.25 5.01589 19.0983 3.61065 17.4903 3.40191C15.4478 3.13676 13.365 3 11.2503 3C9.13533 3 7.05233 3.13678 5.00963 3.40199C3.40173 3.61074 2.25 5.01598 2.25 6.63738V12.8626C2.25 14.484 3.40173 15.8893 5.00964 16.098C5.58661 16.1729 6.16679 16.2376 6.75 16.2918V21L10.9049 16.8451C12.309 16.963 13.725 17.013 15.146 16.995" />
      <path d="M20.25 8.51104C21.1341 8.79549 21.75 9.6392 21.75 10.6082V14.8938C21.75 16.0304 20.9026 16.9943 19.7697 17.0867C19.4308 17.1144 19.0909 17.1386 18.75 17.1592V20.25L15.75 17.25C14.3963 17.25 13.0556 17.1948 11.7302 17.0866C11.4319 17.0623 11.1534 16.9775 10.9049 16.8451" />
    </svg>
  )
}
