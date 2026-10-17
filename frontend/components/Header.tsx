import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { WireframeFlag } from './Sidebar'

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="CampeonBet home"
      className={compact ? "flex shrink-0 items-center font-black leading-none tracking-[-0.075em]" : "flex shrink-0 items-center font-black leading-none tracking-[-0.075em]"}
    >
      <span className={compact ? "text-[25px] text-white" : "text-[30px] text-white"}>campeón</span>
      <span className={compact ? "text-[25px] text-[var(--cb-yellow)]" : "text-[30px] text-[var(--cb-yellow)]"}>bet</span>
    </Link>
  )
}

function AuthActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2.5">
      <Link
        to="/search"
        aria-label="Search"
         className={`flex items-center justify-center rounded-xl border border-[var(--cb-line)] bg-transparent text-white transition-colors hover:bg-[var(--cb-hover)] ${compact ? "h-9 w-9" : "h-[42px] w-[42px]"}` }
      >
        <Search className="h-[18px] w-[18px]" />
      </Link>
      <Link
        to="/login"
        className={`inline-flex items-center justify-center rounded-xl border border-[var(--cb-yellow)] bg-transparent font-bold text-white transition-colors hover:bg-[var(--cb-yellow)] hover:text-[#00151e] ${compact ? "h-9 min-w-[54px] px-2.5 text-xs" : "h-[42px] min-w-[72px] px-5 text-sm"}` }
      >
        Login
      </Link>
      <Link
        to="/register"
        className={`inline-flex items-center justify-center rounded-xl bg-[var(--cb-yellow)] font-bold text-[#00151e] transition-all hover:brightness-105 active:translate-y-px ${compact ? "h-9 min-w-[66px] px-2.5 text-xs" : "h-[42px] min-w-[90px] px-5 text-sm"}` }
      >
        Register
      </Link>
    </div>
  )
}

export function HeaderDesktop() {
  return (
    <header className="cb-nav sticky top-0 z-30 hidden h-[54px] w-full items-center border-b border-[var(--cb-line)] px-0 md:flex">
      <div
        className="ml-[clamp(40px,8vw,150px)] flex max-w-[1400px] items-center gap-4"
        style={{ width: 'min(1400px, calc(100% - clamp(40px, 8vw, 150px)))' }}
      >
        <Logo />
        <AuthActions />
      </div>
    </header>
  )
}

export function HeaderMobile() {
  return (
    <header className="cb-nav sticky top-0 z-40 flex h-[54px] w-full items-center border-b border-[var(--cb-line)] px-3 md:hidden cb-safe-top">
      <Logo compact />
      <AuthActions compact />
    </header>
  )
}

export { Logo, WireframeFlag as LanguageFlag }
export const HeaderLogo = Logo
