import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Search, Maximize2, Minimize2, X, WalletCards, Play, Gamepad2, LockKeyhole, LoaderCircle, RotateCw,
} from 'lucide-react'
import { GAMES } from '../data/catalog'
import type { CasinoCatalogGame } from '../lib/casinoCatalog'
import { fetchCasinoGameBySlug, fetchCasinoGames, getCatalogErrorMessage, launchCasinoSandboxDemo } from '../lib/casinoCatalog'
import { SearchDialog } from '../components/SearchDialog'
import { Sidebar, SIDEBAR_WIDTH } from '../components/Sidebar'

interface DemoLaunchResult {
  game: CasinoCatalogGame
  gameUrl: string
}

function friendlyTitle(slug: string): string {
  return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

async function resolveLegacyGame(title: string, provider: string): Promise<CasinoCatalogGame> {
  const page = await fetchCasinoGames({ query: title, pageSize: 100 })
  const matches = page.data.filter((item) => item.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase())
  const providerMatch = matches.find((item) => item.provider.name.trim().toLocaleLowerCase() === provider.trim().toLocaleLowerCase())
  if (providerMatch) return providerMatch
  if (matches.length === 1) return matches[0]
  throw new Error('This legacy display item could not be matched to a unique game in the synced catalogue. Search the Lobby for its current listing.')
}

export default function CasinoPlay() {
  const { mode = 'demo', gameId = '' } = useParams()
  const localGame = GAMES.find((item) => item.id === gameId)
  const stageRef = useRef<HTMLDivElement>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const launchPromiseCache = useRef(new Map<string, Promise<DemoLaunchResult>>())
  const [fullscreen, setFullscreen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [catalogGame, setCatalogGame] = useState<CasinoCatalogGame | null>(null)
  const [launchUrl, setLaunchUrl] = useState('')
  const [launchStatus, setLaunchStatus] = useState<'loading' | 'ready' | 'error' | 'locked'>('loading')
  const [launchError, setLaunchError] = useState('')
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const isReal = mode === 'real'

  const title = catalogGame?.title ?? localGame?.title ?? friendlyTitle(gameId)
  const provider = catalogGame?.provider.name ?? localGame?.provider ?? 'BigBang Casino'
  const poster = catalogGame?.imageUrl ?? localGame?.image ?? localGame?.imageFallback ?? ''

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    setCatalogGame(null)
    setLaunchUrl('')
    setIframeLoaded(false)
    setLaunchError('')

    if (isReal) {
      setLaunchStatus('locked')
      return () => { cancelled = true }
    }

    setLaunchStatus('loading')
    const cacheKey = 'demo:' + gameId + ':' + retryCount
    let launchPromise = launchPromiseCache.current.get(cacheKey)
    if (!launchPromise) {
      launchPromise = (async () => {
        const currentLocalGame = GAMES.find((item) => item.id === gameId)
        const resolvedGame = currentLocalGame
          ? await resolveLegacyGame(currentLocalGame.title, currentLocalGame.provider)
          : await fetchCasinoGameBySlug(gameId)
        const launch = await launchCasinoSandboxDemo(resolvedGame.id, 'en')
        return { game: resolvedGame, gameUrl: launch.gameUrl }
      })()
      launchPromiseCache.current.set(cacheKey, launchPromise)
      if (launchPromiseCache.current.size > 30) {
        const newest = launchPromiseCache.current.get(cacheKey)
        launchPromiseCache.current.clear()
        if (newest) launchPromiseCache.current.set(cacheKey, newest)
      }
    }

    void launchPromise.then((result) => {
      if (cancelled) return
      setCatalogGame(result.game)
      setLaunchUrl(result.gameUrl)
      setLaunchStatus('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      setLaunchError(getCatalogErrorMessage(error))
      setLaunchStatus('error')
    })

    return () => { cancelled = true }
  }, [gameId, isReal, retryCount])

  const toggleFullscreen = async () => {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stage.requestFullscreen()
    } catch {
      // Fullscreen can be denied by the browser; the game remains usable in its normal frame.
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#05090d] text-white">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((expanded) => !expanded)} />
      <div
        className="flex min-h-[100dvh] min-w-0 flex-col transition-[padding] duration-200 ease-out md:pl-[var(--sbw)]"
        style={{ ['--sbw' as string]: String(sidebarExpanded ? SIDEBAR_WIDTH.expanded : SIDEBAR_WIDTH.collapsed) + 'px' }}
      >
        <header className="sticky top-0 z-[110] shrink-0 border-b border-[var(--cb-line)] bg-[var(--cb-nav)]">
          <div className="grid h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4 md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3">
            <div className="hidden min-w-0 items-center gap-2 xl:flex">
              <Link to="/" aria-label="Bclick home" className="shrink-0">
                <span className="text-xl font-black tracking-tight text-white">Bclick</span>
              </Link>
            </div>

            <div className="min-w-0 overflow-hidden text-left md:text-center">
              <div className="truncate text-sm font-semibold leading-5 sm:text-base">{title}</div>
              <div className="truncate text-xs leading-4 text-[#aebfca] sm:text-sm">{provider}</div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 md:gap-2">
              <span className="hidden rounded-md border border-[var(--cb-yellow)]/40 bg-[var(--cb-yellow)]/10 px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide text-[var(--cb-yellow)] sm:inline-flex">
                SANDBOX DEMO
              </span>
              <Link to="/account/wallet/deposit" aria-label="Deposit" title="Deposit" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[#071722] transition hover:brightness-105 md:h-10 md:w-10">
                <WalletCards className="h-5 w-5" />
              </Link>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search games" title="Search games" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--cb-line)] text-[#aebfca] transition hover:bg-[var(--cb-hover)] hover:text-white sm:flex">
                <Search className="h-5 w-5" />
              </button>
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
          {isReal || launchStatus === 'locked' ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                <LockKeyhole className="h-10 w-10 text-[var(--cb-yellow)]" />
                <h1 className="text-xl font-bold">Real-money play is disabled</h1>
                <p className="text-sm leading-relaxed text-[#aebfca]">This environment supports Sandbox demo sessions only. No real-money launch or wallet transaction has been started.</p>
                <Link to="/casino/lobby" className="rounded-[10px] bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold text-[#071722] transition hover:brightness-105">Back to Casino</Link>
              </div>
            </div>
          ) : launchStatus === 'loading' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
              <LoaderCircle className="h-10 w-10 animate-spin text-[var(--cb-yellow)]" />
              <h1 className="text-xl font-bold">Opening demo game…</h1>
              <p className="text-sm text-[#aebfca]">Connecting to the BigBang Sandbox demo service.</p>
            </div>
          ) : launchStatus === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8">
              <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
                <Gamepad2 className="h-12 w-12 text-[var(--cb-yellow)]" />
                <h1 className="text-xl font-extrabold">Demo could not be opened</h1>
                <p className="text-sm leading-relaxed text-[#aebfca]" role="alert">{launchError || 'The Sandbox demo service is temporarily unavailable.'}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => setRetryCount((value) => value + 1)} className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--cb-yellow)] px-4 py-2.5 text-sm font-bold text-[#071722]">
                    <RotateCw className="h-4 w-4" /> Retry
                  </button>
                  <Link to="/casino/lobby" className="rounded-[10px] border border-[var(--cb-line)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--cb-hover)]">Back to Casino</Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {poster ? (
                <img
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 blur-2xl"
                  onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
                />
              ) : null}
              {!iframeLoaded ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <LoaderCircle className="h-8 w-8 animate-spin text-[var(--cb-yellow)]" />
                </div>
              ) : null}
              <iframe
                key={launchUrl}
                src={launchUrl}
                title={title + ' Sandbox demo'}
                className="relative z-20 h-[calc(100dvh-3.5rem)] min-h-[520px] w-full flex-1 border-0 bg-black md:h-[calc(100dvh-4rem)]"
                allow="autoplay; fullscreen; gamepad"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setIframeLoaded(true)}
              />
            </>
          )}
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
