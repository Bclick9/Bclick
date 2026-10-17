import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Home, Coins, CircleDot, Volleyball, Gift, Trophy, Crown, Target, Headset,
  PanelLeftClose, Search, Maximize2, Minimize2, X, WalletCards, Play, LockKeyhole,
  Timer, Flag,
} from 'lucide-react'
import { AuthModal } from './Auth'
import { cn } from '../lib/shadcn/utils'
import { SearchDialog } from '../components/SearchDialog'

const KIRON_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/casino/lobby', label: 'Casino', icon: Coins },
  { to: '/live-casino', label: 'Live Casino', icon: CircleDot },
  { to: '/sports', label: 'Sports', icon: Volleyball },
  { to: '/promotions', label: 'Promotions', icon: Gift },
  { to: '/jackpots', label: 'Jackpots', icon: Trophy },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/vip', label: 'VIP', icon: Crown },
  { to: '/rewards', label: 'Rewards', icon: Target },
]

export default function VirtualSportsKiron() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [isReal, setIsReal] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const openSearchDialog = () => setSearchOpen(true)
    window.addEventListener('cb:open-search', openSearchDialog)
    return () => window.removeEventListener('cb:open-search', openSearchDialog)
  }, [])

  const toggleFullscreen = async () => {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stage.requestFullscreen()
    } catch {
      // Keep the virtual-sports preview usable if fullscreen is denied.
    }
  }

  const openRealMode = () => {
    setIsReal(true)
    setAuthOpen(true)
  }

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 bg-[#05090d] text-white md:grid-cols-[76px_minmax(0,1fr)]">
      <aside className="z-10 hidden border-r border-[var(--cb-line)] bg-[var(--cb-nav)] md:block">
        <div className="sticky top-0 flex h-[100dvh] min-h-0 flex-col px-2.5 pb-2.5">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/sports" aria-label="Back to sports" title="Back to sports" className="flex h-10 w-full items-center justify-center rounded-[10px] text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white">
              <PanelLeftClose className="h-7 w-7" />
            </Link>
          </div>
          <nav aria-label="Main navigation" className="scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {KIRON_NAV.map(({ to, label, icon: Icon }) => {
              const active = label === 'Sports'
                ? window.location.pathname.startsWith('/sports') || window.location.pathname.startsWith('/virtual-sports')
                : label === 'Casino'
                  ? window.location.pathname.startsWith('/casino')
                  : window.location.pathname === to || (to !== '/' && window.location.pathname.startsWith(`${to}/`))
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  aria-label={label}
                  className={cn(
                    'flex h-12 shrink-0 items-center justify-center rounded-[10px] transition-colors',
                    active ? 'bg-[#233d4b] text-white' : 'text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              )
            })}
          </nav>
          <div className="flex shrink-0 flex-col gap-2 pt-2">
            <button type="button" aria-label="English language" title="British English" className="flex h-11 items-center justify-center rounded-[10px] border border-[var(--cb-line)] text-lg hover:bg-[var(--cb-hover)]">🇬🇧</button>
            <Link to="/info/contact" aria-label="Support" title="Support" className="flex h-11 items-center justify-center rounded-[10px] border border-[var(--cb-line)] text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white">
              <Headset className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        <header className="sticky top-0 z-[110] shrink-0 border-b border-[var(--cb-line)] bg-[var(--cb-nav)]">
          <div className="grid h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4 md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3">
            <div className="hidden min-w-0 items-center gap-2 xl:flex">
              <Link to="/" aria-label="CampeonBet home" className="shrink-0">
                <img src="https://campeonbet.io/full_logo.svg" alt="CampeonBet" className="h-10 w-auto" />
              </Link>
            </div>

            <div className="min-w-0 overflow-hidden text-left md:text-center">
              <div className="truncate text-sm font-semibold leading-5 sm:text-base">Kiron Virtual Sports</div>
              <div className="truncate text-xs leading-4 text-[#aebfca] sm:text-sm">Kiron Interactive</div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 md:gap-2">
              <div className="hidden items-center gap-1 rounded-[10px] bg-[#07141c] p-1 md:flex">
                <button
                  type="button"
                  aria-pressed={isReal}
                  onClick={openRealMode}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-bold transition-colors', isReal ? 'bg-[var(--cb-hover)] text-white' : 'text-[#aebfca] hover:text-white')}
                >REAL</button>
                <button
                  type="button"
                  aria-pressed={!isReal}
                  onClick={() => setIsReal(false)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-bold transition-colors', !isReal ? 'bg-[var(--cb-hover)] text-white' : 'text-[#aebfca] hover:text-white')}
                >DEMO</button>
              </div>
              <button
                type="button"
                onClick={() => isReal ? setIsReal(false) : openRealMode()}
                className="inline-flex h-8 items-center rounded-lg border border-[var(--cb-line)] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--cb-hover)] md:hidden"
              >{isReal ? 'DEMO' : 'DEMO MODE'}</button>
              <Link to="/account/wallet/deposit" aria-label="Deposit" title="Deposit" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#071722] transition hover:brightness-105 md:h-10 md:w-10">
                <WalletCards className="h-5 w-5" />
              </Link>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search games" title="Search games" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white sm:flex">
                <Search className="h-5 w-5" />
              </button>
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white">
                {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <Link to="/sports" aria-label="Close game" title="Back to sports" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white">
                <X className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="h-0.5 w-full bg-[#122631]"><div className="h-full w-0 opacity-0" /></div>
        </header>

        <div ref={stageRef} id="kiron-virtual-sports-stage" className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden bg-[#05090d] md:min-h-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(25,75,88,0.42),transparent_58%),linear-gradient(180deg,#07151e_0%,#071018_58%,#020609_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] opacity-70" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(29,126,85,.3), transparent 68%), linear-gradient(180deg, transparent, rgba(3,18,17,.55))' }} />
          <div className="pointer-events-none absolute inset-x-[8%] bottom-[-18%] h-[55%] rounded-t-[50%] border border-emerald-300/15 bg-emerald-900/10" />

          {isReal ? (
            <div className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] flex-1 items-center justify-center px-4 py-8 md:min-h-0">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                <LockKeyhole className="h-10 w-10 text-[var(--cb-yellow)]" />
                <h1 className="text-xl font-bold">Login to continue</h1>
                <p className="text-sm text-[#aebfca]">Real-money virtual sports require authentication. Sign in to continue.</p>
                <button type="button" onClick={() => setAuthOpen(true)} className="rounded-[10px] bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold text-[#071722] transition hover:brightness-105">Login</button>
                <button type="button" onClick={() => setIsReal(false)} className="rounded-[10px] border border-[var(--cb-line)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cb-hover)]">Back to demo</button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] flex-1 items-center justify-center overflow-y-auto px-4 py-10 md:min-h-0">
              <div className="w-full max-w-4xl">
                <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--cb-yellow)]/35 bg-[var(--cb-yellow)]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--cb-yellow)]">
                    <span className="size-1.5 rounded-full bg-[var(--cb-yellow)]" /> Virtual sports
                  </span>
                  <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Kiron Virtual Sports</h1>
                  <p className="mt-3 text-sm text-[#aebfca] sm:text-base">Fast-paced simulated sports by Kiron Interactive</p>
                </div>

                <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1b24]/80 p-5 text-center shadow-xl backdrop-blur">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><Play className="ml-0.5 h-5 w-5 fill-current" /></div>
                    <h2 className="mt-3 text-sm font-bold">Virtual Football</h2>
                    <p className="mt-1 text-xs text-[#8fa3b8]">Short-format football simulations</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0b1b24]/80 p-5 text-center shadow-xl backdrop-blur">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><Timer className="h-5 w-5" /></div>
                    <h2 className="mt-3 text-sm font-bold">Rapid Events</h2>
                    <p className="mt-1 text-xs text-[#8fa3b8]">A new simulated event every few minutes</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0b1b24]/80 p-5 text-center shadow-xl backdrop-blur">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Flag className="h-5 w-5" /></div>
                    <h2 className="mt-3 text-sm font-bold">Multiple Sports</h2>
                    <p className="mt-1 text-xs text-[#8fa3b8]">Explore the available virtual sports formats</p>
                  </div>
                </div>

                <div className="mx-auto mt-5 flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-[var(--cb-line)] bg-black/25 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
                  <div>
                    <p className="text-sm font-semibold text-white">Provider preview</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#8fa3b8]">The Kiron Interactive game launcher is not connected in this UI preview yet.</p>
                  </div>
                  <button type="button" onClick={openRealMode} className="shrink-0 rounded-[10px] bg-[var(--cb-yellow)] px-4 py-2.5 text-sm font-bold text-[#071722] transition hover:brightness-105">Try real mode</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal open={authOpen} initialMode="login" onClose={() => setAuthOpen(false)} />
    </div>
  )
}
