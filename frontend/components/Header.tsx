import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { WireframeFlag } from './Sidebar'
import { SearchDialog } from './SearchDialog'

function Logo({ compact = false }: { compact?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <Link to="/" aria-label="CampeonBet home" className="inline-block shrink-0 outline-none">
      {logoFailed ? (
        <span className="flex items-center font-black leading-none tracking-[-0.075em]">
          <span className={compact ? 'text-[25px] text-white' : 'text-[30px] text-white'}>campeón</span>
          <span className={compact ? 'text-[25px] text-[var(--cb-yellow)]' : 'text-[30px] text-[var(--cb-yellow)]'}>bet</span>
        </span>
      ) : (
        <>
          <img
            alt="Logo"
            aria-label="Logo"
            className="hidden h-11 md:block"
            src="https://campeonbet.io/full_logo.svg"
            onError={() => setLogoFailed(true)}
          />
          <img
            alt="Logo"
            aria-label="Logo"
            className="block h-9 md:hidden"
            src="https://campeonbet.io/compact_logo.svg"
            onError={() => setLogoFailed(true)}
          />
        </>
      )}
    </Link>
  )
}

function AuthActions({ compact = false }: { compact?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          className={compact
            ? 'flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--cb-line)] text-white transition-colors hover:bg-[var(--cb-hover)] md:hidden'
            : 'relative hidden items-center justify-center rounded-[10px] border border-[var(--cb-line)] px-2.5 py-2.5 text-white transition-colors hover:bg-[var(--cb-hover)] md:flex'}
        >
          <Search className={compact ? 'h-5 w-5' : 'size-4 lg:size-5'} />
        </button>

        <div className="flex gap-3">
          <Link
            to="/account"
            className={compact
              ? 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-line)] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)] outline-none'
              : 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-line)] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)] outline-none lg:text-sm'}
          >
            Login
          </Link>
          <Link
            to="/register"
            className={compact
              ? 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-3 py-2.5 text-xs font-bold text-[#00151e] transition-colors hover:brightness-105 outline-none'
              : 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-4 py-2.5 text-xs font-bold text-[#00151e] transition-colors hover:brightness-105 outline-none lg:text-sm'}
          >
            Register
          </Link>
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

export function HeaderDesktop() {
  return (
    <header className="cb-nav sticky top-0 left-0 z-[110] hidden h-14 w-full items-center border-b border-[var(--cb-line)] md:flex md:h-16">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        <div className="mx-auto flex w-full gap-3">
          <div className="flex flex-1 items-center justify-between gap-3">
            <Logo />
            <AuthActions />
          </div>
        </div>
      </div>
    </header>
  )
}

export function HeaderMobile() {
  return (
    <header className="cb-nav sticky top-0 left-0 z-30 flex h-14 w-full items-center border-b border-[var(--cb-line)] px-4 md:hidden">
      <Logo compact />
      <AuthActions compact />
    </header>
  )
}

export { Logo, WireframeFlag as LanguageFlag }
export const HeaderLogo = Logo
