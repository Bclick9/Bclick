import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ChevronLeft, ChevronRight, Gamepad2, LoaderCircle, RefreshCw, Search, ShieldX,
} from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import { useAdminAuth } from '../../components/AdminAuthGate'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../../lib/adminApi'
import { cn } from '../../lib/utils'

const PROVIDER_PERMISSION = 'casino.provider-settings.manage'
const PAGE_SIZE = 30

type Envelope<T> = { data: T; requestId?: string }
type BigBangSettings = {
  sourceCode: string
  selectedTier: string
  supportedTiers: string[]
  premiumAvailable: boolean
  premiumReason: string
  sync: { latestStatus: string | null; lastSucceededAt: string | null }
}
type ProviderRow = {
  id: string
  code: string
  name: string
  enabled: boolean
  updatedAt: string
  totalGames: number
  sourceAvailableGames: number
  enabledGames: number
}
type GameRow = {
  id: string
  slug: string
  title: string
  provider: { code: string; name: string }
  sourceAvailable: boolean
  catalogAvailable: boolean
  enabled: boolean
  providerEnabled: boolean
  updatedAt: string
}
type GamePage = { page: number; pageSize: number; total: number; nextPage: number | null }

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not recorded'
}
function StatusBadge({ enabled, enabledLabel = 'Enabled', disabledLabel = 'Blocked' }: {
  enabled: boolean
  enabledLabel?: string
  disabledLabel?: string
}) {
  return <Badge variant={enabled ? 'success' : 'danger'}>{enabled ? enabledLabel : disabledLabel}</Badge>
}

export function CmsProvidersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const auth = useAdminAuth()
  const hasPermission = auth.permissions.includes(PROVIDER_PERMISSION)
  const [settings, setSettings] = useState<BigBangSettings | null>(null)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [providersSearch, setProvidersSearch] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [workingKey, setWorkingKey] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [gamePageNumber, setGamePageNumber] = useState(1)
  const [gameRows, setGameRows] = useState<GameRow[]>([])
  const [gamePage, setGamePage] = useState<GamePage>({ page: 1, pageSize: PAGE_SIZE, total: 0, nextPage: null })
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  async function loadMainData(): Promise<void> {
    setPageLoading(true)
    setPageError('')
    try {
      const [settingsResult, providerResult] = await Promise.all([
        requestAdminApi<Envelope<BigBangSettings>>('/api/v1/admin/bigbang/settings'),
        requestAdminApi<Envelope<ProviderRow[]>>('/api/v1/admin/bigbang/providers'),
      ])
      setSettings(settingsResult.data)
      setProviders(providerResult.data)
    } catch (error) {
      setPageError(errorMessage(error, 'Could not load BigBang provider settings.'))
      if (error instanceof AdminApiError && error.status === 401) void auth.signOut()
      throw error
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    if (!hasPermission) {
      setPageLoading(false)
      return
    }
    void loadMainData().catch(() => undefined)
    // This page is mounted only after AdminAuthGate confirms the server session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission])

  useEffect(() => {
    if (!hasPermission) return
    let active = true
    setGamesLoading(true)
    setGamesError('')
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(gamePageNumber), pageSize: String(PAGE_SIZE) })
      if (gameSearch.trim()) params.set('query', gameSearch.trim())
      if (providerFilter) params.set('providerCode', providerFilter)
      void requestAdminApi<{ data: GameRow[]; page: GamePage }>('/api/v1/admin/bigbang/games?' + params.toString())
        .then((result) => {
          if (!active) return
          setGameRows(result.data)
          setGamePage(result.page)
        })
        .catch((error: unknown) => {
          if (!active) return
          setGamesError(errorMessage(error, 'Could not load Standard Sandbox games.'))
          if (error instanceof AdminApiError && error.status === 401) void auth.signOut()
        })
        .finally(() => { if (active) setGamesLoading(false) })
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
    // The request is intentionally debounced for responsive server-side search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, gamePageNumber, gameSearch, providerFilter, reloadKey])

  const shownProviders = useMemo(() => {
    const query = providersSearch.trim().toLowerCase()
    return providers.filter((provider) => !query || (provider.name + ' ' + provider.code).toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [providers, providersSearch])

  async function toggleProvider(provider: ProviderRow): Promise<void> {
    const enabled = !provider.enabled
    if (!window.confirm('Are you sure you want to ' + (enabled ? 'enable' : 'block') + ' BigBang provider ' + provider.name + ' for Bclick Standard Sandbox?')) return
    setWorkingKey('provider:' + provider.code)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/providers/' + encodeURIComponent(provider.code), {
        method: 'PATCH', headers: getAdminCsrfHeaders(), body: JSON.stringify({ enabled }),
      })
      await loadMainData()
      setReloadKey((value) => value + 1)
      onNotify(provider.name + ' ' + (enabled ? 'enabled' : 'blocked') + ' in Bclick.')
    } catch (error) {
      setActionError(errorMessage(error, 'Could not update this provider.'))
    } finally {
      setWorkingKey('')
    }
  }

  async function toggleGame(game: GameRow): Promise<void> {
    const enabled = !game.enabled
    if (!window.confirm('Are you sure you want to ' + (enabled ? 'enable' : 'block') + ' the game "' + game.title + '" from ' + game.provider.name + ' in Bclick Standard Sandbox?')) return
    setWorkingKey('game:' + game.id)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/games/' + encodeURIComponent(game.id), {
        method: 'PATCH', headers: getAdminCsrfHeaders(), body: JSON.stringify({ enabled }),
      })
      await loadMainData()
      setReloadKey((value) => value + 1)
      onNotify('Game "' + game.title + '" ' + (enabled ? 'enabled' : 'blocked') + ' in Bclick.')
    } catch (error) {
      setActionError(errorMessage(error, 'Could not update this game.'))
    } finally {
      setWorkingKey('')
    }
  }

  if (!hasPermission) {
    return <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6 sm:p-8">
      <div className="flex items-start gap-3"><ShieldX className="h-6 w-6 shrink-0 text-rose-600" /><div><h2 className="text-base font-semibold text-slate-900">Provider-management permission required</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your authenticated administrator account does not have <code>{PROVIDER_PERMISSION}</code>. No provider or game settings were changed.</p></div></div>
    </div>
  }

  const blockedProviderCount = providers.filter((provider) => !provider.enabled).length
  const lastSuccess = settings?.sync.lastSucceededAt ?? null

  return <div className="page-enter min-w-0 w-full space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-slate-900">Provider & game availability</h2><Badge variant="info">Live API</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">Changes are persisted by the Bclick API and enforced on catalogue and Sandbox demo-launch routes.</p><p className="mt-1 text-[11px] text-slate-400">Signed in as {auth.admin.displayName || auth.admin.email || 'Administrator'}</p></div>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { void loadMainData().catch(() => undefined); setReloadKey((value) => value + 1) }} disabled={pageLoading || gamesLoading}><RefreshCw className={cn('h-4 w-4', (pageLoading || gamesLoading) && 'animate-spin')} /> Refresh</Button><Button type="button" variant="ghost" onClick={() => void auth.signOut()} disabled={auth.signOutBusy}>Sign out</Button></div>
    </div>
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><ShieldX className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-sky-950">BigBang · Standard Sandbox only</p><Badge variant="success">Sandbox</Badge><Badge variant="danger">Premium unavailable</Badge></div><p className="mt-1 text-xs leading-5 text-sky-900">Provider blocking makes its Standard catalogue games unavailable. Game blocking affects the selected game only. The server remains the source of truth.</p><p className="mt-2 text-[11px] text-sky-800">Selected tier: <strong>{settings?.selectedTier ?? 'Loading…'}</strong> · Latest sync: <strong>{settings?.sync.latestStatus ?? 'No run recorded'}</strong> · Last successful sync: {formatDate(lastSuccess)}</p></div></div>
    </div>
    {pageError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{pageError}</div> : null}
    {actionError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}</div> : null}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Standard providers</p><p className="mt-2 text-2xl font-semibold text-slate-900">{pageLoading ? '—' : providers.length}</p><p className="mt-1 text-[11px] text-slate-400">Loaded from local PostgreSQL via API</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Blocked providers</p><p className="mt-2 text-2xl font-semibold text-rose-700">{pageLoading ? '—' : blockedProviderCount}</p><p className="mt-1 text-[11px] text-slate-400">All Standard games under these providers are unavailable</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Matching games</p><p className="mt-2 text-2xl font-semibold text-slate-900">{gamesLoading ? '—' : gamePage.total.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Server-filtered Standard catalogue</p></div>
    </div>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Providers</h3><p className="mt-1 text-xs text-slate-500">Disable a provider to block every game sourced from it.</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search actual providers" value={providersSearch} onChange={(event) => setProvidersSearch(event.target.value)} placeholder="Search providers" className="h-9 pl-9 text-xs" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-0 text-left"><thead><tr className="bg-slate-50"><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Provider</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Bclick control</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Games</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Source available</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Enabled games</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Action</th></tr></thead>
        <tbody>{shownProviders.map((provider,index) => <tr key={provider.id} className={cn('hover:bg-slate-50',index%2===1&&'bg-slate-50/40')}>
          <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-800">{provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{provider.code}</p></td>
          <td className="border-b border-slate-100 px-4 py-3"><StatusBadge enabled={provider.enabled}/></td>
          <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums">{provider.totalGames.toLocaleString()}</td>
          <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums">{provider.sourceAvailableGames.toLocaleString()}</td>
          <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums">{provider.enabledGames.toLocaleString()}</td>
          <td className="border-b border-slate-100 px-4 py-3 text-right"><Button type="button" size="sm" variant={provider.enabled?'destructive':'default'} disabled={workingKey!==''||pageLoading} onClick={()=>void toggleProvider(provider)}>{workingKey==='provider:'+provider.code?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:null}{provider.enabled?'Block provider':'Enable provider'}</Button></td>
        </tr>)}{!pageLoading&&shownProviders.length===0?<tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">No provider matches this search.</td></tr>:null}{pageLoading?<tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading actual providers…</td></tr>:null}</tbody>
      </table></div>
    </section>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Games</h3><p className="mt-1 text-xs text-slate-500">Block a single game without disabling its provider.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 sm:min-w-[220px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Search Standard games" value={gameSearch} onChange={(event)=>{setGameSearch(event.target.value);setGamePageNumber(1)}} placeholder="Search games or providers" className="h-9 pl-9 text-xs"/></div><select aria-label="Filter games by provider" value={providerFilter} onChange={(event)=>{setProviderFilter(event.target.value);setGamePageNumber(1)}} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"><option value="">All providers</option>{providers.map(provider=><option key={provider.code} value={provider.code}>{provider.name}</option>)}</select></div></div>
      {gamesError?<div role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{gamesError}</div>:null}
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-separate border-spacing-0 text-left"><thead><tr className="bg-slate-50"><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Game</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Provider</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Source</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Effective state</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Action</th></tr></thead>
        <tbody>{gameRows.map((game,index)=>{const effectivelyAvailable=game.sourceAvailable&&game.catalogAvailable&&game.enabled&&game.providerEnabled;const working=workingKey==='game:'+game.id;return <tr key={game.id} className={cn('hover:bg-slate-50',index%2===1&&'bg-slate-50/40')}>
          <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-800">{game.title}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{game.slug}</p></td>
          <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs text-slate-700">{game.provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{game.provider.code}</p></td>
          <td className="border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap gap-1.5"><StatusBadge enabled={game.sourceAvailable} enabledLabel="Source on" disabledLabel="Source off"/><StatusBadge enabled={game.catalogAvailable} enabledLabel="Listed" disabledLabel="Source unavailable"/></div></td>
          <td className="border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap gap-1.5"><StatusBadge enabled={effectivelyAvailable} enabledLabel="Available" disabledLabel="Blocked"/>{!game.providerEnabled?<Badge variant="warning">Provider blocked</Badge>:null}{!game.enabled?<Badge variant="danger">Game blocked</Badge>:null}</div></td>
          <td className="border-b border-slate-100 px-4 py-3 text-right"><Button type="button" size="sm" variant={game.enabled?'destructive':'default'} disabled={workingKey!==''||gamesLoading||!game.providerEnabled} onClick={()=>void toggleGame(game)}>{working?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:null}{!game.providerEnabled?'Enable provider first':game.enabled?'Block game':'Enable game'}</Button></td>
        </tr>})}{!gamesLoading&&gameRows.length===0?<tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400"><Gamepad2 className="mb-2 inline h-5 w-5"/><p>No Standard Sandbox games match the selected filters.</p></td></tr>:null}{gamesLoading?<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading catalogue rows…</td></tr>:null}</tbody>
      </table></div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-500">Showing {gameRows.length?((gamePageNumber-1)*PAGE_SIZE+1).toLocaleString():'0'}–{Math.min(gamePageNumber*PAGE_SIZE,gamePage.total).toLocaleString()} of {gamePage.total.toLocaleString()} games</p><div className="flex items-center justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={gamesLoading||gamePageNumber<=1} onClick={()=>setGamePageNumber((page)=>Math.max(1,page-1))}><ChevronLeft className="h-3.5 w-3.5"/>Previous</Button><span className="text-[11px] tabular-nums text-slate-500">Page {gamePageNumber}</span><Button type="button" size="sm" variant="outline" disabled={gamesLoading||gamePage.nextPage===null} onClick={()=>setGamePageNumber((page)=>page+1)}>Next<ChevronRight className="h-3.5 w-3.5"/></Button></div></div>
    </section>
    <p className="text-[11px] leading-5 text-slate-400">Changes are protected by administrator MFA, session, CSRF and RBAC checks and are audited server-side. Controls apply only to the Standard Sandbox catalogue. Wallet callbacks, payments, wagers and real-money play remain unavailable.</p>
  </div>
}
