import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { WireframeFlag } from './Sidebar'

const OFFICIAL_LOGO = 'https://campeonbet.io/assets/cms/2e5b6402-2fa4-4053-b7e2-b3466495cd16/18.svg'

function Logo({ compact }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <Link to="/" aria-label="CampeonBet home" className="flex min-w-0 shrink-0 items-center">
      <img
        src={failed ? OFFICIAL_LOGO : '/assets/home/campeonbet-logo.svg'}
        onError={() => setFailed(true)}
        alt="CampeonBet"
        className={compact ? "h-[28px] w-[176px] object-contain object-left" : "h-[32px] w-[182px] object-contain object-left"}
      />
    </Link>
  )
}

function AuthActions() {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2.5">
      <Link
        to="/search"
        aria-label="Search"
        className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[var(--cb-line)] bg-transparent text-white transition-colors hover:bg-[var(--cb-hover)]"
      >
        <Search className="h-[18px] w-[18px]" />
      </Link>
      <Link
        to="/login"
        className="inline-flex h-[42px] min-w-[72px] items-center justify-center rounded-xl border border-[var(--cb-yellow)] bg-transparent px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--cb-yellow)] hover:text-[#00151e]"
      >
        Login
      </Link>
      <Link
        to="/register"
        className="inline-flex h-[42px] min-w-[90px] items-center justify-center rounded-xl bg-[var(--cb-yellow)] px-5 text-sm font-bold text-[#00151e] transition-all hover:brightness-105 active:translate-y-px"
      >
        Register
      </Link>
    </div>
  )
}

export function HeaderDesktop() {
  return (
    <header className="cb-nav sticky top-0 z-30 hidden h-[54px] w-full items-center border-b border-[var(--cb-line)] px-[14px] md:flex">
      <Logo />
      <AuthActions />
    </header>
  )
}

export function HeaderMobile() {
  return (
    <header className="cb-nav sticky top-0 z-40 flex h-[54px] w-full items-center border-b border-[var(--cb-line)] px-3 md:hidden cb-safe-top">
      <Logo compact />
      <AuthActions />
    </header>
  )
}

export { Logo, WireframeFlag as LanguageFlag }
export const HeaderLogo = Logo
