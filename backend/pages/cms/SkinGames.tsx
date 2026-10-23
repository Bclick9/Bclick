import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, GripVertical, Image as ImageIcon,
  LoaderCircle, Pencil, RefreshCw, RotateCcw, Search, ShieldX,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from '../../components/ui'
import { useAdminAuth } from '../../components/AdminAuthGate'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../../lib/adminApi'
import { cn } from '../../lib/utils'

const PERMISSION = 'casino.provider-settings.manage'
const PAGE_SIZE = 50

type Tier = 'standard' | 'premium'
type ModeFilter = 'all' | Tier

type Provider = {
  id: string
  code: string
  name: string
  enabled: boolean
  totalGames: number
  sourceAvailableGames: number
  enabledGames: number
  tiers?: {
    standard: { enabled: boolean; sourceAvailableGames: number }
    premium: { enabled: boolean; sourceAvailableGames: number; available: boolean }
  }
}

type SkinGame = {
  id: string
  slug: string
  title: string
  sourceTitle: string
  titleOverride: string | null
  orderPosition: number
  tierTotal: number
  provider: { code: string; name: string }
  sourceMode: Tier
  externalGameId: string
  isPremium: boolean
  sourceAvailable: boolean
  catalogAvailable: boolean
  enabled: boolean
  providerEnabled: boolean
  providerTierEnabled: boolean
  effectiveAvailable: boolean
  sourceImageUrl: string | null
  customImageUrl: string | null
  imageUrl: string | null
  description: string
  hasCustomDescription: boolean
  displayOrder: number
  categories: string[]
  displayCategoryIds: string[]
  updatedAt: string
  updatedBy: string | null
}

type DisplayCategory = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  visible: boolean
  displayOrder: number
  items: number
}

type SkinGameListResponse = {
  data: SkinGame[]
  page: { page: number; pageSize: number; total: number; nextPage: number | null }
  integration: { selectedTier: string; premiumAvailable: boolean; premiumReason: string | null }
  requestId: string
}

type ErrorEnvelope = { error?: { code?: unknown; message?: unknown } }

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function sourceState(game: SkinGame): { label: string; tone: 'success' | 'danger' | 'warning' | 'outline' } {
  if (!game.sourceAvailable || !game.catalogAvailable) return { label: 'Source unavailable', tone: 'danger' }
  if (!game.providerEnabled) return { label: 'Provider blocked', tone: 'warning' }
  if (!game.providerTierEnabled) return { label: 'Tier disabled', tone: 'warning' }
  if (!game.enabled) return { label: 'Game blocked', tone: 'danger' }
  if (game.sourceMode === 'premium') return { label: 'Premium locked', tone: 'warning' }
  return { label: 'Available', tone: 'success' }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not recorded'
}

export function CmsSkinGamesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const auth = useAdminAuth()
  const permitted = auth.permissions.includes(PERMISSION)
  const [games, setGames] = useState<SkinGame[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(PAGE_SIZE)
  const [query, setQuery] = useState('')
  const [providerCode, setProviderCode] = useState('')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [loading, setLoading] = useState(true)
  const [providerLoading, setProviderLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [resultPage, setResultPage] = useState<SkinGameListResponse['page']>({ page: 1, pageSize: PAGE_SIZE, total: 0, nextPage: null })
  const [integration, setIntegration] = useState<SkinGameListResponse['integration']>({
    selectedTier: 'standard', premiumAvailable: false,
    premiumReason: 'Premium import and launch support have not been approved.',
  })

  const [editorGame, setEditorGame] = useState<SkinGame | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [displayTitleDraft, setDisplayTitleDraft] = useState('')
  const [orderPositionDraft, setOrderPositionDraft] = useState('1')
  const [displayCategoryIdsDraft, setDisplayCategoryIdsDraft] = useState<string[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [clearCustomImage, setClearCustomImage] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [editorBusy, setEditorBusy] = useState(false)

  useEffect(() => {
    if (!permitted) return
    const controller = new AbortController()
    void requestAdminApi<{ data: DisplayCategory[] }>('/api/v1/admin/casino/display-categories', { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setDisplayCategories(result.data) })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setActionError(errorMessage(caught, 'Could not load Lobby display categories.'))
      })
    return () => controller.abort()
  }, [permitted, reloadKey])

  useEffect(() => {
    if (!permitted) return
    const controller = new AbortController()
    void requestAdminApi<{ data: Provider[] }>('/api/v1/admin/bigbang/providers', { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setProviders(result.data) })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setActionError(errorMessage(caught, 'Could not load provider filters.'))
      })
      .finally(() => { if (!controller.signal.aborted) setProviderLoading(false) })
    return () => controller.abort()
  }, [permitted])

  useEffect(() => {
    if (!permitted) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (query.trim()) params.set('query', query.trim())
      if (providerCode) params.set('providerCode', providerCode)
      if (modeFilter !== 'all') params.set('sourceMode', modeFilter)
      void requestAdminApi<SkinGameListResponse>('/api/v1/admin/casino/skin-games?' + params.toString(), {
        signal: controller.signal,
      }).then((result) => {
        if (controller.signal.aborted) return
        setGames(result.data)
        setResultPage(result.page)
        setIntegration(result.integration)
      }).catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(caught, 'Could not load catalogue games from the API.'))
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    }, 160)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [permitted, page, pageSize, query, providerCode, modeFilter, reloadKey])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }
    let active = true
    const reader = new FileReader()
    reader.onload = () => {
      if (active && typeof reader.result === 'string') setImagePreview(reader.result)
    }
    reader.onerror = () => { if (active) setEditorError('The selected image could not be previewed.') }
    reader.readAsDataURL(imageFile)
    return () => {
      active = false
      reader.abort()
    }
  }, [imageFile])

  const modeCounts = useMemo(() => ({
    standard: games.filter((game) => game.sourceMode === 'standard').length,
    premium: games.filter((game) => game.sourceMode === 'premium').length,
    blocked: games.filter((game) => !game.effectiveAvailable).length,
  }), [games])

  const loadAgain = () => setReloadKey((value) => value + 1)

  async function toggleGame(game: SkinGame): Promise<void> {
    const enabled = !game.enabled
    if (game.sourceMode === 'premium' && !integration.premiumAvailable) return
    if (enabled && (!game.sourceAvailable || !game.catalogAvailable || !game.providerEnabled || !game.providerTierEnabled)) {
      setActionError('Enable the provider/tier and confirm the source is available before enabling this game.')
      return
    }
    const action = enabled ? 'enable' : 'block'
    if (!window.confirm('Are you sure you want to ' + action + ' "' + game.title + '" (' + game.sourceMode.toUpperCase() + ') from ' + game.provider.name + '?')) return
    setSavingId(game.id)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/skin-games/' + encodeURIComponent(game.id), {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ enabled }),
      })
      onNotify('Game "' + game.title + '" ' + (enabled ? 'enabled' : 'blocked') + ' and saved.')
      loadAgain()
    } catch (caught) {
      setActionError(errorMessage(caught, 'Could not save game availability.'))
    } finally {
      setSavingId('')
    }
  }

  function openEditor(game: SkinGame): void {
    setEditorGame(game)
    setDescriptionDraft(game.description)
    setDisplayTitleDraft(game.title)
    setOrderPositionDraft(String(game.orderPosition))
    setDisplayCategoryIdsDraft(game.displayCategoryIds ?? [])
    setImageFile(null)
    setImagePreview('')
    setClearCustomImage(false)
    setEditorError('')
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!editorGame) return
    if (editorGame.sourceMode === 'premium' && !integration.premiumAvailable) {
      setEditorError('Premium editing is locked until the Premium integration gate is approved.')
      return
    }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setEditorError('Choose an image no larger than 5 MiB.')
      return
    }
    if (imageFile && !['image/png', 'image/jpeg', 'image/webp'].includes(imageFile.type)) {
      setEditorError('Only PNG, JPEG and WebP images are supported.')
      return
    }
    const desiredOrderPosition = Number(orderPositionDraft)
    if (!Number.isSafeInteger(desiredOrderPosition) || desiredOrderPosition < 1 || desiredOrderPosition > editorGame.tierTotal) {
      setEditorError('Order position must be a whole number between 1 and ' + editorGame.tierTotal.toLocaleString() + '.')
      return
    }
    if (displayTitleDraft.trim().length > 120) {
      setEditorError('Player-facing title must be 120 characters or fewer.')
      return
    }
    const descriptionChanged = descriptionDraft !== editorGame.description
    const displayTitleChanged = displayTitleDraft !== editorGame.title
    const orderChanged = desiredOrderPosition !== editorGame.orderPosition
    const imageChanged = Boolean(imageFile) || clearCustomImage
    const originalDisplayCategoryIds = [...(editorGame.displayCategoryIds ?? [])].sort()
    const draftDisplayCategoryIds = [...displayCategoryIdsDraft].sort()
    const displayCategoriesChanged = originalDisplayCategoryIds.length !== draftDisplayCategoryIds.length
      || originalDisplayCategoryIds.some((id, index) => id !== draftDisplayCategoryIds[index])
    if (!descriptionChanged && !displayTitleChanged && !orderChanged && !imageChanged && !displayCategoriesChanged) {
      setEditorError('There are no changes to save.')
      return
    }
    setEditorBusy(true)
    setEditorError('')
    try {
      const presentationPatch = {
        ...(descriptionChanged ? { description: descriptionDraft } : {}),
        ...(displayTitleChanged ? { displayTitle: displayTitleDraft } : {}),
        ...(!imageFile && clearCustomImage ? { clearCustomImage: true } : {}),
      }
      if (Object.keys(presentationPatch).length > 0) {
        await requestAdminApi('/api/v1/admin/casino/skin-games/' + encodeURIComponent(editorGame.id), {
          method: 'PATCH',
          headers: getAdminCsrfHeaders(),
          body: JSON.stringify(presentationPatch),
        })
      }
      if (orderChanged) {
        await requestAdminApi('/api/v1/admin/casino/skin-games/' + encodeURIComponent(editorGame.id) + '/order-position', {
          method: 'PATCH',
          headers: getAdminCsrfHeaders(),
          body: JSON.stringify({ orderPosition: desiredOrderPosition }),
        })
      }
      if (imageFile) {
        await requestAdminApi('/api/v1/admin/casino/skin-games/' + encodeURIComponent(editorGame.id) + '/image', {
          method: 'POST',
          headers: { ...getAdminCsrfHeaders(), 'Content-Type': imageFile.type },
          body: imageFile,
        })
      }
      if (displayCategoriesChanged) {
        await requestAdminApi('/api/v1/admin/casino/skin-games/' + encodeURIComponent(editorGame.id) + '/display-categories', {
          method: 'PATCH',
          headers: getAdminCsrfHeaders(),
          body: JSON.stringify({ categoryIds: displayCategoryIdsDraft }),
        })
      }
      setEditorGame(null)
      setImageFile(null)
      setImagePreview('')
      onNotify('Game presentation, Lobby category assignments and requested order saved to the database and audit log.')
      loadAgain()
    } catch (caught) {
      setEditorError(errorMessage(caught, 'Could not save all game changes. Earlier fields may already be saved; refresh the editor before retrying.'))
      loadAgain()
    } finally {
      setEditorBusy(false)
    }
  }

  async function reorderGame(game: SkinGame, target: SkinGame, position: 'before' | 'after'): Promise<void> {
    if (modeFilter === 'all' || game.sourceMode !== modeFilter || target.sourceMode !== modeFilter) {
      setActionError('Choose a single source tier before reordering, so Standard and Premium variants are never interleaved.')
      return
    }
    if (modeFilter === 'premium' && !integration.premiumAvailable) return
    setSavingId('order:' + game.id)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/skin-games/reorder', {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ gameId: game.id, targetGameId: target.id, position }),
      })
      loadAgain()
      onNotify('Display order saved to the database.')
    } catch (caught) {
      setActionError(errorMessage(caught, 'Could not persist the new game order.'))
    } finally {
      setSavingId('')
      setDraggedId(null)
    }
  }

  if (!permitted) {
    return <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6">
      <div className="flex items-start gap-3"><ShieldX className="h-6 w-6 shrink-0 text-rose-600" /><div><h2 className="text-base font-semibold text-slate-900">Skin Games permission required</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your administrator account needs the <code>{PERMISSION}</code> permission. No changes were made.</p></div></div>
    </div>
  }

  const resultStart = resultPage.total === 0 ? 0 : (page - 1) * pageSize + 1
  const resultEnd = Math.min(page * pageSize, resultPage.total)

  return <div className="page-enter min-w-0 space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-base font-semibold text-slate-900">Skin Games</h1><Badge variant="info">Live API</Badge></div>
        <p className="mt-1 text-xs leading-5 text-slate-500">Manage canonical games, tier-specific availability, display order, custom image and description. Changes are stored in PostgreSQL.</p>
        <p className="mt-1 text-[11px] text-slate-400">Signed in as {auth.admin.displayName || auth.admin.email || 'Administrator'}</p>
      </div>
      <Button type="button" variant="outline" onClick={loadAgain} disabled={loading || savingId !== ''}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh</Button>
    </div>

    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-800" /><div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-sky-950">Standard Sandbox is active</p><Badge variant="success">Standard</Badge><Badge variant="warning">Premium locked</Badge></div>
        <p className="mt-1 text-xs leading-5 text-sky-900">{integration.premiumReason || 'Premium remains locked until the authorized tier-specific sync and launch path is accepted.'} The API preserves each Standard/Premium source variant as a separate UUID; matching titles are not merged automatically.</p>
      </div></div>
    </div>

    {error ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
    {actionError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}</div> : null}

    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Matching games</p><p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '—' : resultPage.total.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Actual canonical UUID records</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Rows on this page</p><p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '—' : games.length}</p><p className="mt-1 text-[11px] text-slate-400">{modeCounts.standard} Standard · {modeCounts.premium} Premium</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Unavailable on this page</p><p className="mt-2 text-2xl font-semibold text-amber-700">{loading ? '—' : modeCounts.blocked}</p><p className="mt-1 text-[11px] text-slate-400">Source, provider, tier or game can block a row</p></CardContent></Card>
    </div>

    <Card>
      <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><div><CardTitle>Game filters</CardTitle><CardDescription className="mt-1">Filter source variants using real provider records and source mode.</CardDescription></div><Button type="button" size="sm" variant="outline" onClick={() => { setQuery(''); setProviderCode(''); setModeFilter('all'); setPage(1) }}>Reset filters</Button></div></CardHeader>
      <CardContent className="grid gap-3 pt-0 lg:grid-cols-[minmax(240px,1fr)_240px_180px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search title, provider or source ID…" className="pl-9" /></div>
        <select aria-label="Filter games by provider" value={providerCode} disabled={providerLoading} onChange={(event) => { setProviderCode(event.target.value); setPage(1) }} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"><option value="">All providers</option>{providers.map((provider) => <option key={provider.code} value={provider.code}>{provider.name}</option>)}</select>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['all','standard','premium'] as const).map((mode) => <button key={mode} type="button" onClick={() => { setModeFilter(mode); setPage(1) }} className={cn('flex-1 rounded-md px-2 py-2 text-xs font-semibold capitalize transition-colors', modeFilter === mode ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white')}>{mode === 'all' ? 'All' : mode === 'standard' ? 'Standard' : 'Premium'}</button>)}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><CardTitle>Catalogue games</CardTitle><CardDescription className="mt-1">UUID is the canonical Bclick identity. Source ID, mode and source state remain separate fields. Drag order is available after selecting one tier.</CardDescription></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left">
            <thead><tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-600">
              <th className="w-10 px-2 py-3" aria-label="Reorder"></th><th className="w-[25%] px-3 py-3">Game / UUID</th><th className="w-[15%] px-3 py-3">Provider</th><th className="w-[10%] px-3 py-3">Source tier</th><th className="w-[17%] px-3 py-3">Source state</th><th className="w-[13%] px-3 py-3">Effective state</th><th className="w-[9%] px-3 py-3">Order</th><th className="w-[14%] px-3 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {games.map((game) => {
                const state = sourceState(game)
                const modeWritable = game.sourceMode === 'standard' || integration.premiumAvailable
                const toggleAllowed = modeWritable && game.sourceAvailable && game.catalogAvailable && game.providerEnabled && game.providerTierEnabled
                return <tr key={game.id} draggable={modeFilter !== 'all' && modeFilter === game.sourceMode && modeWritable}
                  onDragStart={(event) => { if (modeFilter === 'all' || modeFilter !== game.sourceMode || !modeWritable) { event.preventDefault(); return } event.dataTransfer.setData('text/plain', game.id); event.dataTransfer.effectAllowed = 'move'; setDraggedId(game.id) }}
                  onDragOver={(event) => { if (draggedId && draggedId !== game.id && modeFilter === game.sourceMode) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
                  onDrop={(event) => { event.preventDefault(); const moving = games.find((item) => item.id === (event.dataTransfer.getData('text/plain') || draggedId)); if (moving && moving.id !== game.id) void reorderGame(moving,game,'before'); setDraggedId(null) }}
                  onDragEnd={() => setDraggedId(null)}
                  className={cn('border-b border-slate-100 text-xs transition-colors hover:bg-slate-50/80', draggedId === game.id && 'opacity-40')}>
                  <td className="px-2 py-3"><span title={modeFilter === 'all' ? 'Choose Standard or Premium before reordering' : 'Drag to reorder'} className={cn('inline-flex rounded p-1 text-slate-300', modeFilter !== 'all' && modeWritable ? 'cursor-grab hover:bg-slate-100 hover:text-slate-600' : 'cursor-not-allowed opacity-40')}><GripVertical className="h-4 w-4" /></span></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">{game.imageUrl ? <img src={game.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>}</div><div className="min-w-0"><p className="font-semibold text-slate-800">{game.title}</p><p className="mt-1 break-all font-mono text-[9px] text-slate-500" title={game.id}>{game.id}</p><p className="mt-1 truncate font-mono text-[9px] text-slate-400">{game.slug}</p></div></div></td>
                  <td className="px-3 py-3"><p className="font-medium text-slate-700">{game.provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{game.provider.code}</p></td>
                  <td className="px-3 py-3"><Badge variant={game.sourceMode === 'standard' ? 'info' : 'warning'}>{game.sourceMode.toUpperCase()}</Badge><p className="mt-1 text-[10px] text-slate-400">ID {game.externalGameId}</p></td>
                  <td className="px-3 py-3"><div className="flex flex-wrap gap-1"><Badge variant={game.sourceAvailable ? 'success' : 'danger'}>{game.sourceAvailable ? 'Source on' : 'Source off'}</Badge><Badge variant={game.catalogAvailable ? 'success' : 'danger'}>{game.catalogAvailable ? 'Listed' : 'Not listed'}</Badge><Badge variant={game.providerTierEnabled ? 'success' : 'warning'}>{game.providerTierEnabled ? 'Tier on' : 'Tier off'}</Badge></div></td>
                  <td className="px-3 py-3"><Badge variant={state.tone}>{state.label}</Badge>{!game.enabled ? <p className="mt-1 text-[10px] text-slate-400">Game toggle off</p> : null}{!game.providerEnabled ? <p className="mt-1 text-[10px] text-slate-400">Provider master off</p> : null}</td>
                  <td className="px-3 py-3"><p className="font-medium tabular-nums text-slate-700">{game.orderPosition.toLocaleString()}</p><p className="mt-1 text-[10px] text-slate-400">of {game.tierTotal.toLocaleString()} · {game.categories.slice(0,1).join(', ') || 'No categories'}</p></td>
                  <td className="px-3 py-3"><div className="flex flex-col items-end gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={savingId !== '' || !modeWritable} onClick={() => openEditor(game)}><Pencil className="h-3.5 w-3.5" /> Edit Game</Button>
                    <Button type="button" size="sm" variant={game.enabled ? 'destructive' : 'default'} disabled={savingId !== '' || !toggleAllowed} title={!modeWritable ? 'Premium requires an approved integration' : !game.providerEnabled ? 'Enable provider first' : !game.providerTierEnabled ? 'Enable this provider tier first' : !game.sourceAvailable ? 'Source is unavailable' : !game.catalogAvailable ? 'The source game is not listed' : ''} onClick={() => void toggleGame(game)}>{savingId === game.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}{game.enabled ? 'Disable game' : 'Enable game'}</Button>
                  </div></td>
                </tr>
              })}
              {!loading && games.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">No real catalogue games match these filters.</td></tr> : null}
              {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Loading games from PostgreSQL…</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-500">Showing {resultStart.toLocaleString()}–{resultEnd.toLocaleString()} of {resultPage.total.toLocaleString()} records · Page {page}</p><div className="flex items-center justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1,value-1))}><ChevronLeft className="h-3.5 w-3.5" /> Previous</Button><Button type="button" variant="outline" size="sm" disabled={loading || resultPage.nextPage === null} onClick={() => setPage((value) => value+1)}>Next <ChevronRight className="h-3.5 w-3.5" /></Button></div></div>
      </CardContent>
    </Card>

    <p className="text-[11px] leading-5 text-slate-400">The original BigBang image is always the default. Uploading replaces it with a validated local persistent asset and stores only the server-generated key; no blob URL is saved. Every availability, presentation, image and order mutation is audited with the authenticated administrator ID.</p>

    <Modal open={Boolean(editorGame)} onOpenChange={(open) => { if (!open && !editorBusy) { setEditorGame(null); setImageFile(null); setImagePreview('') } }} title="Edit Game" description="Edits are persisted for this exact canonical UUID. The provider-owned identity and source tier are read-only." size="wide" footer={<><Button type="button" variant="outline" disabled={editorBusy} onClick={() => setEditorGame(null)}>Cancel</Button><Button type="submit" form="skin-game-edit-form" disabled={editorBusy || !editorGame}>{editorBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save changes</Button></>}>
      {editorGame ? <form id="skin-game-edit-form" onSubmit={(event) => void saveEditor(event)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{(imagePreview || (!clearCustomImage && editorGame.customImageUrl) || editorGame.sourceImageUrl) ? <img src={imagePreview || (!clearCustomImage && editorGame.customImageUrl) || editorGame.sourceImageUrl || ''} alt={editorGame.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">No source image available</div>}</div>
            <div className="space-y-1.5"><label htmlFor="skin-game-image" className="text-xs font-medium text-slate-700">Custom image (PNG/JPEG/WebP, max 5 MiB)</label><Input id="skin-game-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={editorBusy} onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setClearCustomImage(false); setEditorError('') }} className="h-auto py-2 text-xs" /></div>
            {editorGame.customImageUrl ? <Button type="button" size="sm" variant="outline" disabled={editorBusy} onClick={() => { setImageFile(null); setImagePreview(''); setClearCustomImage(true) }}><RotateCcw className="h-3.5 w-3.5" /> Restore BigBang image</Button> : null}
            {imageFile ? <p className="text-[10px] leading-4 text-slate-500">Selected: {imageFile.name} · {(imageFile.size/1024).toFixed(0)} KiB. The server validates the actual file bytes and stores it outside the web bundle.</p> : null}
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><p className="text-[11px] text-slate-500">Original source title</p><p className="text-sm font-semibold text-slate-900">{editorGame.sourceTitle}</p></div>
              <div className="space-y-1"><p className="text-[11px] text-slate-500">Provider</p><p className="text-sm font-semibold text-slate-900">{editorGame.provider.name}</p></div>
              <div className="space-y-1"><p className="text-[11px] text-slate-500">Source mode</p><Badge variant={editorGame.sourceMode === 'standard' ? 'info' : 'warning'}>{editorGame.sourceMode.toUpperCase()}</Badge></div>
              <div className="space-y-1"><p className="text-[11px] text-slate-500">BigBang source game ID</p><p className="font-mono text-xs text-slate-700">{editorGame.externalGameId}</p></div>
              <div className="space-y-1 sm:col-span-2"><p className="text-[11px] text-slate-500">Canonical Bclick UUID</p><code className="block break-all rounded-md bg-slate-50 p-2 font-mono text-[11px] text-slate-700">{editorGame.id}</code></div>
            </div>
            <div className="space-y-1.5"><label htmlFor="skin-game-display-title" className="text-xs font-medium text-slate-700">Player-facing game title</label><Input id="skin-game-display-title" value={displayTitleDraft} maxLength={120} disabled={editorBusy} onChange={(event) => setDisplayTitleDraft(event.target.value)} placeholder={editorGame.sourceTitle} /><p className="text-[10px] leading-4 text-slate-400">This is the title players see. Provider identity, UUID and original source title stay unchanged. Clear the field to restore the source title.</p></div>
            <div className="space-y-1.5"><label htmlFor="skin-game-order-position" className="text-xs font-medium text-slate-700">Display order position</label><input id="skin-game-order-position" type="number" min={1} max={editorGame.tierTotal} step={1} inputMode="numeric" required value={orderPositionDraft} disabled={editorBusy || editorGame.sourceMode !== 'standard'} onChange={(event) => setOrderPositionDraft(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100" /><p className="text-[10px] leading-4 text-slate-400">Enter a position from 1 to {editorGame.tierTotal.toLocaleString()} within the Standard tier. Other games shift automatically; no need to drag many rows.</p></div>
            <div className="space-y-1.5"><label htmlFor="skin-game-description" className="text-xs font-medium text-slate-700">Description override</label><textarea id="skin-game-description" maxLength={2000} rows={7} value={descriptionDraft} disabled={editorBusy} onChange={(event) => setDescriptionDraft(event.target.value)} placeholder="Optional description shown instead of the default source description…" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /><p className="text-[10px] text-slate-400">{descriptionDraft.length}/2000 characters · Leave blank to use the source default.</p></div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Lobby display categories</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">Choose one or more operator-managed collections, such as Trending Games. These are separate from provider-supplied game categories.</p>
                </div>
                <a href="/cms/categories" target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-slate-600 underline hover:text-slate-900">Manage categories</a>
              </div>
              {displayCategories.length === 0 ? (
                <p className="rounded-md bg-slate-50 p-3 text-[11px] text-slate-500">No custom display categories exist yet. Create one in CMS → Categories, then return here.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {displayCategories.map((category) => (
                    <label key={category.id} className={cn('flex cursor-pointer items-start gap-2 rounded-md border p-2.5', displayCategoryIdsDraft.includes(category.id) ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white', editorBusy || editorGame.sourceMode !== 'standard' ? 'cursor-not-allowed opacity-60' : '')}>
                      <input
                        type="checkbox"
                        checked={displayCategoryIdsDraft.includes(category.id)}
                        disabled={editorBusy || editorGame.sourceMode !== 'standard'}
                        onChange={(event) => setDisplayCategoryIdsDraft((current) => event.target.checked
                          ? [...current, category.id]
                          : current.filter((id) => id !== category.id))}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-800">{category.name}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{category.items} games assigned · {category.visible ? 'Visible in Lobby' : 'Hidden in Lobby'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><p><strong>Original thumbnail:</strong> {editorGame.sourceImageUrl ? <a className="underline" href={editorGame.sourceImageUrl} target="_blank" rel="noreferrer">Open BigBang image</a> : 'Not supplied by the source'}</p><p className="mt-1"><strong>Current presentation editor:</strong> {editorGame.updatedBy || 'No edit recorded'} · {formatDate(editorGame.updatedAt)}</p></div>
          </div>
        </div>
        {editorError ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">{editorError}</p> : null}
      </form> : null}
    </Modal>
  </div>
}
