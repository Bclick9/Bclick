import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Home, Coins, CircleDot, Volleyball, Gift, Trophy, Crown, Target, Headset,
  PanelLeftClose, Search, Maximize2, Minimize2, X, WalletCards, Play, Gamepad2, LockKeyhole,
} from 'lucide-react'
import { AuthModal } from './Auth'
import { GAMES } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const PLAY_NAV = [
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

export default function CasinoPlay() {
  const { mode = 'demo', gameId = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const game = GAMES.find((item) => item.id === gameId)
  const stageRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [poster, setPoster] = useState(game?.image || game?.imageFallback || '')
  const isReal = mode === 'real'

  useEffect(() => {
    setPoster(game?.image || game?.imageFallback || '')
  }, [gameId, game?.image, game?.imageFallback])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  if (!game) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-[#05090d] px-5 text-center text-white">
        <Gamepad2 className="h-12 w-12 text-[var(--cb-yellow)]" />
        <h1 className="text-xl font-extrabold">Game not found</h1>
        <p className="max-w-md text-sm text-[#a2b0bb]">Choose a game from the casino lobby to open its dedicated play page.</p>
        <Link to="/casino/lobby" className="rounded-lg bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold text-[#071722]">Back to Casino</Link>
      </div>
    )
  }

  const toggleFullscreen = async () => {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stage.requestFullscreen()
    } catch {
      // Fullscreen can be denied by the browser; keep the player screen usable.
    }
  }

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 bg-[#05090d] text-white md:grid-cols-[76px_minmax(0,1fr)]">
      <aside className="z-10 hidden border-r border-[var(--cb-line)] bg-[var(--cb-nav)] md:block">
        <div className="sticky top-0 flex h-[100dvh] min-h-0 flex-col px-2.5 pb-2.5">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/casino/lobby" aria-label="Back to casino lobby" title="Casino lobby" className="flex h-10 w-full items-center justify-center rounded-[10px] text-[#aebfca] transition-colors hover:bg-[var(--cb-hover)] hover:text-white">
              <PanelLeftClose className="h-7 w-7" />
            </Link>
          </div>
          <nav aria-label="Main navigation" className="scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {PLAY_NAV.map(({ to, label, icon: Icon }) => {
              const active = label === 'Casino' ? pathname.startsWith('/casino') : pathname === to || (to !== '/' && pathname.startsWith(`${to}/`))
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
            <Link to="/support" aria-label="Support" title="Support" className="flex h-11 items-center justify-center rounded-[10px] border border-[var(--cb-line)] text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white">
              <Headset className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        <header className="relative z-10 shrink-0 border-b border-[var(--cb-line)] bg-[var(--cb-nav)]">
          <div className="grid h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4 md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3">
            <div className="hidden min-w-0 items-center gap-2 xl:flex">
              <Link to="/" aria-label="CampeonBet home" className="shrink-0">
                <img src="https://campeonbet.io/full_logo.svg" alt="CampeonBet" className="h-10 w-auto" />
              </Link>
            </div>

            <div className="min-w-0 overflow-hidden text-left md:text-center">
              <div className="truncate text-sm font-semibold leading-5 sm:text-base">{game.title}</div>
              <div className="truncate text-xs leading-4 text-[#aebfca] sm:text-sm">{game.provider}</div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 md:gap-2">
              <div className="hidden items-center gap-1 rounded-[10px] bg-[#07141c] p-1 md:flex">
                <button
                  type="button"
                  aria-pressed={isReal}
                  onClick={() => navigate(`/casino/play/real/${game.id}`)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-bold transition-colors', isReal ? 'bg-[var(--cb-hover)] text-white' : 'text-[#aebfca] hover:text-white')}
                >
                  REAL
                </button>
                <button
                  type="button"
                  aria-pressed={!isReal}
                  onClick={() => navigate(`/casino/play/demo/${game.id}`)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-bold transition-colors', !isReal ? 'bg-[var(--cb-hover)] text-white' : 'text-[#aebfca] hover:text-white')}
                >
                  DEMO
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/casino/play/demo/${game.id}`)}
                className="inline-flex h-8 items-center rounded-lg border border-[var(--cb-line)] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--cb-hover)] md:hidden"
              >
                {isReal ? 'DEMO' : 'DEMO MODE'}
              </button>
              <Link to="/account/wallet/deposit" aria-label="Deposit" title="Deposit" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#071722] transition hover:brightness-105 md:h-10 md:w-10">
                <WalletCards className="h-5 w-5" />
              </Link>
              <Link to={`/search?q=${encodeURIComponent(game.title)}`} aria-label="Search games" title="Search games" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white sm:flex">
                <Search className="h-5 w-5" />
              </Link>
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white">
                {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <Link to="/casino/lobby" aria-label="Close game" title="Back to casino" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white">
                <X className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="h-0.5 w-full bg-[#122631]"><div className="h-full w-0 opacity-0" /></div>
        </header>

        <div ref={stageRef} id="casino-game-stage" className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden bg-black md:min-h-0">
          {isReal ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                <LockKeyhole className="h-10 w-10 text-[var(--cb-yellow)]" />
                <h1 className="text-xl font-bold">Login to play for real</h1>
                <p className="text-sm text-[#aebfca]">Real money play requires authentication. Log in to continue.</p>
                <button type="button" onClick={() => setAuthOpen(true)} className="rounded-[10px] bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold text-[#071722] transition hover:brightness-105">Login</button>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 items-center justify-center overflow-hidden px-4 py-8 md:min-h-[calc(100dvh-4rem)]">
              {poster ? (
                <img
                  src={poster}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
                  onError={() => {
                    if (poster !== game.imageFallback && game.imageFallback) setPoster(game.imageFallback)
                    else setPoster('')
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-b from-[#061018]/70 via-black/85 to-black" />
              <div className="relative z-10 flex max-w-lg flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--cb-yellow)]/40 bg-[var(--cb-yellow)]/10 text-[var(--cb-yellow)]">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </div>
                <span className="rounded-full border border-[var(--cb-yellow)]/40 bg-[var(--cb-yellow)]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--cb-yellow)]">Demo preview</span>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{game.title}</h1>
                <p className="text-sm text-[#b1bec7]">{game.provider}</p>
                <p className="max-w-md text-sm leading-relaxed text-[#8fa3b8]">This is the dedicated game screen for the UI template. The game provider launch is not connected yet, so no external game or real-money session is started.</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={() => navigate(`/casino/play/real/${game.id}`)} className="rounded-[10px] border border-[var(--cb-line)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--cb-hover)]">Try real mode</button>
                  <Link to="/casino/lobby" className="rounded-[10px] bg-[var(--cb-yellow)] px-4 py-2.5 text-sm font-bold text-[#071722] transition hover:brightness-105">Back to Casino</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} initialMode="login" onClose={() => setAuthOpen(false)} />
    </div>
  )
}
