import { Link } from 'react-router-dom'
import { Search, User2 } from 'lucide-react'
import { WireframeFlag } from './Sidebar'

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="CampeonBet home" className="flex min-w-0 items-center">
      <span className={compact ? "text-[21px] leading-none font-black tracking-[-0.075em] text-white" : "text-[24px] leading-none font-black tracking-[-0.075em] text-white"}>
        campeón<span className="text-[var(--cb-yellow)]">bet</span>
      </span>
    </Link>
  )
}

export function HeaderDesktop() {
  return (
    <header className="cb-nav hidden md:flex sticky top-0 z-30 h-[60px] items-center gap-4 px-6">
      <Logo />
      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/search"
          aria-label="Search"
          className="w-10 h-10 rounded-lg bg-secondary/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="w-5 h-5" />
        </Link>
        <Link
          to="/wallet/deposit"
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-secondary/70 hover:bg-accent transition-colors"
        >
          <User2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">€0.00</span>
        </Link>
        <Link
          to="/wallet/deposit"
          className="h-10 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm flex items-center hover:brightness-110 transition-all"
        >
          Deposit
        </Link>
      </div>
    </header>
  )
}

export function HeaderMobile() {
  return (
    <header className="cb-nav md:hidden sticky top-0 z-40 cb-safe-top">
      <div className="flex items-center gap-2 h-14 px-3">
        <Logo compact />
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/wallet/deposit"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-secondary border border-border"
          >
            <User2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">€0.00</span>
          </Link>
          <Link
            to="/wallet/deposit"
            className="h-9 px-4 rounded-lg cb-yellow text-primary-foreground font-bold text-sm flex items-center"
          >
            Deposit
          </Link>
        </div>
      </div>
    </header>
  )
}

export { Logo, WireframeFlag as LanguageFlag }
export const HeaderLogo = Logo
