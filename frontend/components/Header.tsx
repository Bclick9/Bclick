import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { WireframeFlag } from './Sidebar'
import { SearchDialog } from './SearchDialog'
import { AuthModal } from '../pages/Auth'
import { useAuth } from '../contexts/AuthContext'

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
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [logoutError, setLogoutError] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const { player, isLoading, logout } = useAuth()
  const closeAuth = useCallback(() => setAuthMode(null), [])
  const handleLogout = async () => {
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Could not log out. Please try again.')
    }
  }

  useEffect(() => {
    const openSearchDialog = () => setSearchOpen(true)
    window.addEventListener('cb:open-search', openSearchDialog)
    return () => window.removeEventListener('cb:open-search', openSearchDialog)
  }, [])

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

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="px-2 text-xs text-[#91a6b5]" role="status">Checking session…</span>
          ) : player ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-label="Player account and demo balance"
                title="Demo balance only — wallet is not connected"
                className={compact
                  ? 'relative inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--cb-line)] px-2.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)]'
                  : 'relative inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--cb-line)] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)] lg:text-sm'}
              >
                <span className="relative inline-flex">
                  <UserRound className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                  <span aria-hidden="true" className="absolute -right-2 -top-1.5 h-4 w-4 rounded-full bg-[var(--cb-yellow)] text-[10px] leading-4 text-[#071722]">1</span>
                </span>
                <span className="whitespace-nowrap">€0.00</span>
              </button>
              {accountMenuOpen ? (
                <div role="menu" aria-label="Player account menu" className="absolute right-0 top-full z-[130] mt-2 w-56 rounded-xl border border-[var(--cb-line)] bg-[#0c1d28] p-2 shadow-xl">
                  <Link to="/account" role="menuitem" onClick={() => setAccountMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cb-hover)]">
                    My account
                  </Link>
                  <Link to="/account/personal-info" role="menuitem" onClick={() => setAccountMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white">
                    Personal information
                  </Link>
                  <p className="px-3 py-2 text-[11px] leading-relaxed text-[#91a6b5]">Demo balance only. The wallet is not connected.</p>
                  <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); void handleLogout() }}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-[var(--cb-hover)]">
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                aria-haspopup="dialog"
                className={compact
                  ? 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-line)] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)] outline-none'
                  : 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-line)] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--cb-hover)] outline-none lg:text-sm'}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                aria-haspopup="dialog"
                className={compact
                  ? 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-3 py-2.5 text-xs font-bold text-[#00151e] transition-colors hover:brightness-105 outline-none'
                  : 'inline-flex items-center justify-center rounded-[10px] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-4 py-2.5 text-xs font-bold text-[#00151e] transition-colors hover:brightness-105 outline-none lg:text-sm'}
              >
                Register
              </button>
            </>
          )}
        </div>
        {logoutError ? <p role="alert" className="absolute right-4 top-full mt-1 max-w-sm rounded bg-rose-950 px-3 py-2 text-xs text-rose-200">{logoutError}</p> : null}
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal
        open={authMode !== null}
        initialMode={authMode ?? 'login'}
        onClose={closeAuth}
      />
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
