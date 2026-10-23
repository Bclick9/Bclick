import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, LoaderCircle, RefreshCw, Search, ShieldCheck, ShieldX, LockKeyhole } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input } from '../../components/ui'
import { useAdminAuth } from '../../components/AdminAuthGate'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../../lib/adminApi'
import { cn } from '../../lib/utils'

const PROVIDER_PERMISSION = 'casino.provider-settings.manage'

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
  tiers: {
    standard: { enabled: boolean; sourceAvailableGames: number }
    premium: { enabled: boolean; sourceAvailableGames: number; available: boolean }
  }
}

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
  const permitted = auth.permissions.includes(PROVIDER_PERMISSION)
  const [settings, setSettings] = useState<BigBangSettings | null>(null)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [workingKey, setWorkingKey] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  async function loadData(): Promise<void> {
    setLoading(true)
    setError('')
    try {
      const [settingsResult, providersResult] = await Promise.all([
        requestAdminApi<Envelope<BigBangSettings>>('/api/v1/admin/bigbang/settings'),
        requestAdminApi<Envelope<ProviderRow[]>>('/api/v1/admin/bigbang/providers'),
      ])
      setSettings(settingsResult.data)
      setProviders(providersResult.data)
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load provider settings from the API.'))
      if (caught instanceof AdminApiError && caught.status === 401) void auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permitted) { setLoading(false); return }
    void loadData()
    // loadData is intentionally refreshed by the explicit reload key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitted, reloadKey])

  const filteredProviders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return providers.filter((provider) => !term || (provider.name + ' ' + provider.code).toLocaleLowerCase().includes(term))
  }, [providers, search])

  async function toggleMaster(provider: ProviderRow): Promise<void> {
    const enabled = !provider.enabled
    if (!window.confirm('Are you sure you want to ' + (enabled ? 'enable' : 'block') + ' ' + provider.name + ' across Bclick?')) return
    setWorkingKey('master:' + provider.code)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/providers/' + encodeURIComponent(provider.code), {
        method: 'PATCH', headers: getAdminCsrfHeaders(), body: JSON.stringify({ enabled }),
      })
      await loadData()
      onNotify(provider.name + ' ' + (enabled ? 'enabled' : 'blocked') + ' across Bclick.')
    } catch (caught) {
      setActionError(errorMessage(caught, 'Could not save provider availability.'))
    } finally {
      setWorkingKey('')
    }
  }

  async function toggleTier(provider: ProviderRow, mode: 'standard' | 'premium'): Promise<void> {
    if (mode === 'premium' && !settings?.premiumAvailable) {
      setActionError(settings?.premiumReason || 'Premium integration is not available.')
      return
    }
    const currentEnabled = provider.tiers?.[mode]?.enabled ?? false
    const enabled = !currentEnabled
    if (enabled && !provider.enabled) {
      setActionError('Enable the provider first before enabling its tier.')
      return
    }
    if (!window.confirm('Are you sure you want to ' + (enabled ? 'enable' : 'disable') + ' the ' + mode.toUpperCase() + ' source for ' + provider.name + '?')) return
    setWorkingKey('tier:' + mode + ':' + provider.code)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/providers/' + encodeURIComponent(provider.code) + '/tiers/' + mode, {
        method: 'PATCH', headers: getAdminCsrfHeaders(), body: JSON.stringify({ enabled }),
      })
      await loadData()
      onNotify(provider.name + ' ' + mode.toUpperCase() + ' source ' + (enabled ? 'enabled' : 'disabled') + '.')
    } catch (caught) {
      setActionError(errorMessage(caught, 'Could not save provider tier availability.'))
    } finally {
      setWorkingKey('')
    }
  }

  if (!permitted) {
    return <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6 sm:p-8"><div className="flex items-start gap-3"><ShieldX className="h-6 w-6 shrink-0 text-rose-600"/><div><h2 className="text-base font-semibold text-slate-900">Provider-management permission required</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your administrator account needs <code>{PROVIDER_PERMISSION}</code>. No settings were changed.</p></div></div></div>
  }

  const blockedCount = providers.filter((provider) => !provider.enabled).length
  const standardOffCount = providers.filter((provider) => !provider.tiers?.standard?.enabled).length

  return <div className="page-enter min-w-0 w-full space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-slate-900">Providers</h2><Badge variant="info">Live API</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">Manage provider-wide visibility and source-tier availability. Individual games are managed in CMS → Skin Games.</p><p className="mt-1 text-[11px] text-slate-400">Signed in as {auth.admin.displayName || auth.admin.email || 'Administrator'}</p></div>
      <Button type="button" variant="outline" onClick={() => setReloadKey((value) => value + 1)} disabled={loading || workingKey !== ''}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')}/>Refresh</Button>
    </div>

    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-800"/><div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-sky-950">BigBang integration</p><Badge variant="success">Standard Sandbox</Badge><Badge variant="warning">Premium locked</Badge></div>
        <p className="mt-1 text-xs leading-5 text-sky-900">The master provider switch blocks all tiers. A tier switch controls only that provider's Standard/Premium source. A game is still separately enabled from Skin Games. Premium source rows require an authorized Premium catalog integration and launch path before they can be enabled.</p>
        <p className="mt-2 text-[11px] text-sky-800">Current integration tier: <strong>{settings?.selectedTier ?? 'Loading…'}</strong> · Latest sync: <strong>{settings?.sync.latestStatus ?? 'No run recorded'}</strong> · Last success: {formatDate(settings?.sync.lastSucceededAt)}</p>
      </div></div>
    </div>

    {error ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div> : null}
    {actionError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{actionError}</div> : null}

    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Providers</p><p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '—' : providers.length.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Actual source provider records</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Master-blocked</p><p className="mt-2 text-2xl font-semibold text-rose-700">{loading ? '—' : blockedCount.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Provider-wide kill switch</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Standard tier disabled</p><p className="mt-2 text-2xl font-semibold text-amber-700">{loading ? '—' : standardOffCount.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Independent of individual game state</p></CardContent></Card>
    </div>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Provider availability</h3><p className="mt-1 text-xs text-slate-500">The master switch disables all tiers; tier switches disable that source tier for this provider.</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Search providers" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search providers" className="h-9 pl-9 text-xs"/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
        <thead><tr className="bg-slate-50"><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Provider</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Master</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Standard</th><th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Premium</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Standard source games</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Premium source games</th><th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Action</th></tr></thead>
        <tbody>
          {filteredProviders.map((provider,index)=><tr key={provider.id} className={cn('hover:bg-slate-50',index%2===1&&'bg-slate-50/40')}>
            <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-800">{provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{provider.code}</p></td>
            <td className="border-b border-slate-100 px-4 py-3"><StatusBadge enabled={provider.enabled}/><p className="mt-1 text-[10px] text-slate-400">All tiers</p></td>
            <td className="border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><StatusBadge enabled={provider.tiers?.standard?.enabled ?? false}/><Button type="button" size="sm" variant={provider.tiers?.standard?.enabled?'destructive':'default'} disabled={workingKey!==''||!provider.enabled} onClick={()=>void toggleTier(provider,'standard')}>{workingKey==='tier:standard:'+provider.code?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:null}{provider.tiers?.standard?.enabled?'Disable':'Enable'}</Button></div><p className="mt-1 text-[10px] text-slate-400">{provider.tiers?.standard?.sourceAvailableGames ?? 0} source available</p></td>
            <td className="border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><Badge variant="warning">Locked</Badge><Button type="button" size="sm" variant="outline" disabled title={settings?.premiumReason || 'Premium integration is not yet available'} onClick={()=>void toggleTier(provider,'premium')}><LockKeyhole className="h-3.5 w-3.5"/>Unavailable</Button></div><p className="mt-1 text-[10px] text-slate-400">{provider.tiers?.premium?.sourceAvailableGames ?? 0} source available</p></td>
            <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums">{provider.tiers?.standard?.sourceAvailableGames?.toLocaleString() ?? '0'}</td>
            <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums">{provider.tiers?.premium?.sourceAvailableGames?.toLocaleString() ?? '0'}</td>
            <td className="border-b border-slate-100 px-4 py-3 text-right"><Button type="button" size="sm" variant={provider.enabled?'destructive':'default'} disabled={workingKey!==''||loading} onClick={()=>void toggleMaster(provider)}>{workingKey==='master:'+provider.code?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:null}{provider.enabled?'Block provider':'Enable provider'}</Button></td>
          </tr>)}
          {!loading&&filteredProviders.length===0?<tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">No provider matches this search.</td></tr>:null}
          {loading?<tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading provider records…</td></tr>:null}
        </tbody>
      </table></div>
    </section>
  </div>
}
