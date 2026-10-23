import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Clock3, Gamepad2, Gift, Plus, Search, Sparkles, TrendingUp, Users, Zap, CircleDollarSign, Trophy, ArrowDown, ArrowUp, Image as ImageIcon, Layers, ListChecks, Trash2, LoaderCircle, Save, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardTitle, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'
import { SectionHeading } from '../../components/DashboardUI'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../../lib/adminApi'

export type CmsCategory = {
  id: string
  slug: string
  name: string
  items: number
  visible: boolean
  description: string
  icon: string
  type: CasinoDisplayType
  iconUrl?: string | null
  displayOrder: number
  createdAt?: string
  updatedAt?: string
}

type CasinoDisplayType = 'casino' | 'live-casino' | 'crash-games'
type CategoryDraft = { name: string; description: string; icon: string; type: CasinoDisplayType }

export const CMS_CATEGORY_TYPE_OPTIONS: { value: CasinoDisplayType; label: string }[] = [
  { value: 'casino', label: 'Casino' },
  { value: 'live-casino', label: 'Live Casino' },
  { value: 'crash-games', label: 'Crash Games' },
]

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const CMS_CATEGORY_ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'layers', label: 'Layers', icon: Layers },
  { value: 'gamepad', label: 'Gamepad', icon: Gamepad2 },
  { value: 'sparkles', label: 'Featured', icon: Sparkles },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'clock', label: 'New releases', icon: Clock3 },
  { value: 'users', label: 'Live tables', icon: Users },
  { value: 'money', label: 'Jackpot', icon: CircleDollarSign },
  { value: 'gift', label: 'Bonus', icon: Gift },
  { value: 'trophy', label: 'Trophy', icon: Trophy },
  { value: 'zap', label: 'Crash', icon: Zap },
]

type CategoryListResponse = { data: CmsCategory[]; requestId?: string }

type CategoryPickerGame = {
  id: string
  slug: string
  title: string
  provider: string
  imageUrl: string | null
  available: boolean
}

type CategoryPickerResponse = {
  data: CategoryPickerGame[]
  selectedGameIds: string[]
  page: { page: number; pageSize: number; total: number; nextPage: number | null }
  requestId?: string
}


export function CmsCategoriesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [categories, setCategories] = useState<CmsCategory[]>([])
  const [drafts, setDrafts] = useState<Record<string, CategoryDraft>>({})
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftIcon, setDraftIcon] = useState('trending')
  const [draftType, setDraftType] = useState<CasinoDisplayType>('casino')
  const [draftIconFile, setDraftIconFile] = useState<File | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pickerCategory, setPickerCategory] = useState<CmsCategory | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerGames, setPickerGames] = useState<CategoryPickerGame[]>([])
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([])
  const [pickerNextPage, setPickerNextPage] = useState<number | null>(null)
  const [pickerTotal, setPickerTotal] = useState(0)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerLoadingMore, setPickerLoadingMore] = useState(false)
  const [pickerSaving, setPickerSaving] = useState(false)
  const [pickerError, setPickerError] = useState('')
  const [pickerReloadKey, setPickerReloadKey] = useState(0)
  const pickerLoadedCategoryRef = useRef('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void requestAdminApi<CategoryListResponse>('/api/v1/admin/casino/display-categories', { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return
        setCategories(response.data)
        setDrafts(Object.fromEntries(response.data.map((category) => [
          category.id,
          { name: category.name, description: category.description, icon: category.icon, type: category.type },
        ])))
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setCategories([])
          setError(errorMessage(caught, 'Could not load curated casino categories from the API.'))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reloadKey])


  useEffect(() => {
    if (!pickerCategory) return
    const controller = new AbortController()
    setPickerLoading(true)
    setPickerError('')
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ page: '1', pageSize: '50' })
      if (pickerSearch.trim()) params.set('query', pickerSearch.trim())
      void requestAdminApi<CategoryPickerResponse>(
        '/api/v1/admin/casino/display-categories/' + encodeURIComponent(pickerCategory.id) + '/games?' + params.toString(),
        { signal: controller.signal },
      ).then((response) => {
        if (controller.signal.aborted) return
        setPickerGames(response.data)
        setPickerNextPage(response.page.nextPage)
        setPickerTotal(response.page.total)
        if (pickerLoadedCategoryRef.current !== pickerCategory.id) {
          setPickerSelectedIds(response.selectedGameIds)
          pickerLoadedCategoryRef.current = pickerCategory.id
        }
      }).catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setPickerError(errorMessage(caught, 'Could not load games for this category.'))
          setPickerGames([])
          setPickerNextPage(null)
        }
      }).finally(() => {
        if (!controller.signal.aborted) setPickerLoading(false)
      })
    }, pickerSearch.trim() ? 200 : 0)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [pickerCategory?.id, pickerSearch, pickerReloadKey])

  const visibleCategories = categories.filter((category) => category.visible)
  const assignedGames = categories.reduce((total, category) => total + category.items, 0)
  const filtered = categories.filter((category) => (
    category.name + ' ' + category.slug + ' ' + category.description
  ).toLowerCase().includes(search.toLowerCase()))

  async function reload() {
    setReloadKey((value) => value + 1)
  }


  function openGamePicker(category: CmsCategory) {
    pickerLoadedCategoryRef.current = ''
    setPickerCategory(category)
    setPickerSearch('')
    setPickerGames([])
    setPickerSelectedIds([])
    setPickerNextPage(null)
    setPickerTotal(0)
    setPickerError('')
    setPickerReloadKey((value) => value + 1)
  }

  function togglePickerGame(gameId: string, checked: boolean) {
    setPickerSelectedIds((current) => checked
      ? current.includes(gameId) ? current : [...current, gameId]
      : current.filter((id) => id !== gameId))
  }

  async function loadMorePickerGames() {
    if (!pickerCategory || !pickerNextPage || pickerLoadingMore) return
    setPickerLoadingMore(true)
    setPickerError('')
    try {
      const params = new URLSearchParams({ page: String(pickerNextPage), pageSize: '50' })
      if (pickerSearch.trim()) params.set('query', pickerSearch.trim())
      const response = await requestAdminApi<CategoryPickerResponse>(
        '/api/v1/admin/casino/display-categories/' + encodeURIComponent(pickerCategory.id) + '/games?' + params.toString(),
      )
      setPickerGames((current) => {
        const ids = new Set(current.map((game) => game.id))
        return [...current, ...response.data.filter((game) => !ids.has(game.id))]
      })
      setPickerNextPage(response.page.nextPage)
      setPickerTotal(response.page.total)
    } catch (caught) {
      setPickerError(errorMessage(caught, 'Could not load more games.'))
    } finally {
      setPickerLoadingMore(false)
    }
  }

  async function savePickerGames() {
    if (!pickerCategory || pickerSaving) return
    setPickerSaving(true)
    setPickerError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(pickerCategory.id) + '/games', {
        method: 'PUT',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ gameIds: pickerSelectedIds }),
      })
      onNotify(pickerSelectedIds.length + ' games assigned to "' + pickerCategory.name + '".')
      setPickerCategory(null)
      await reload()
    } catch (caught) {
      setPickerError(errorMessage(caught, 'Could not save the selected games.'))
    } finally {
      setPickerSaving(false)
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = draftName.trim()
    if (!name) return
    setSavingId('new')
    setError('')
    let created: CmsCategory | null = null
    try {
      const response = await requestAdminApi<{ data: CmsCategory }>('/api/v1/admin/casino/display-categories', {
        method: 'POST',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ name, description: draftDescription.trim(), icon: draftIcon, type: draftType, visible: true }),
      })
      created = response.data
      if (draftIconFile) {
        await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(created.id) + '/icon', {
          method: 'POST',
          headers: { ...getAdminCsrfHeaders(), 'Content-Type': draftIconFile.type },
          body: draftIconFile,
        })
      }
      setDraftName('')
      setDraftDescription('')
      setDraftIcon('trending')
      setDraftType('casino')
      setDraftIconFile(null)
      setCreateModalOpen(false)
      onNotify('Display category "' + response.data.name + '" saved to the database.')
      await reload()
    } catch (caught) {
      if (created) {
        setCreateModalOpen(false)
        setDraftName('')
        setDraftDescription('')
        setDraftType('casino')
        setDraftIconFile(null)
        setError('Category "' + created.name + '" was created, but its icon upload failed: ' + errorMessage(caught, 'Please upload the icon again.'))
        await reload()
      } else {
        setError(errorMessage(caught, 'Could not create the display category.'))
      }
    } finally {
      setSavingId('')
    }
  }

  async function uploadCategoryIcon(category: CmsCategory, file: File | undefined) {
    if (!file || savingId) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use a PNG, JPEG or WebP image for the category icon.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The category icon must be no larger than 5 MiB.')
      return
    }
    setSavingId(category.id)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(category.id) + '/icon', {
        method: 'POST',
        headers: { ...getAdminCsrfHeaders(), 'Content-Type': file.type },
        body: file,
      })
      onNotify('Custom icon saved for "' + category.name + '".')
      await reload()
    } catch (caught) {
      setError(errorMessage(caught, 'Could not upload the category icon.'))
    } finally {
      setSavingId('')
    }
  }

  async function saveCategory(category: CmsCategory) {
    const draft = drafts[category.id]
    if (!draft) return
    const patch = {
      ...(draft.name.trim() !== category.name ? { name: draft.name.trim() } : {}),
      ...(draft.description !== category.description ? { description: draft.description } : {}),
      ...(draft.icon !== category.icon ? { icon: draft.icon } : {}),
      ...(draft.type !== category.type ? { type: draft.type } : {}),
    }
    if (Object.keys(patch).length === 0) return
    if (!draft.name.trim()) {
      setError('Category name cannot be blank.')
      return
    }
    setSavingId(category.id)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(category.id), {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify(patch),
      })
      onNotify('Display category "' + draft.name.trim() + '" saved.')
      await reload()
    } catch (caught) {
      setError(errorMessage(caught, 'Could not save category changes.'))
    } finally {
      setSavingId('')
    }
  }

  async function toggleVisibility(category: CmsCategory) {
    setSavingId(category.id)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(category.id), {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ visible: !category.visible }),
      })
      onNotify('Category "' + category.name + '" ' + (!category.visible ? 'shown in' : 'hidden from') + ' the Lobby.')
      await reload()
    } catch (caught) {
      setError(errorMessage(caught, 'Could not change category visibility.'))
    } finally {
      setSavingId('')
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length || savingId) return
    const ordered = [...categories]
    ;[ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]]
    setCategories(ordered)
    setSavingId('order')
    setError('')
    try {
      await Promise.all([index, targetIndex].map((position) => requestAdminApi(
        '/api/v1/admin/casino/display-categories/' + encodeURIComponent(ordered[position]!.id),
        {
          method: 'PATCH',
          headers: getAdminCsrfHeaders(),
          body: JSON.stringify({ displayOrder: (position + 1) * 100 }),
        },
      )))
      onNotify('Lobby category order saved.')
      await reload()
    } catch (caught) {
      setError(errorMessage(caught, 'Could not save category order.'))
      await reload()
    } finally {
      setSavingId('')
    }
  }

  async function deleteCategory(category: CmsCategory) {
    if (!window.confirm('Delete "' + category.name + '"? This removes its Lobby placement and game assignments, but does not delete any catalogue games.')) return
    setSavingId(category.id)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/casino/display-categories/' + encodeURIComponent(category.id), {
        method: 'DELETE',
        headers: getAdminCsrfHeaders(),
      })
      onNotify('Display category "' + category.name + '" deleted.')
      await reload()
    } catch (caught) {
      setError(errorMessage(caught, 'Could not delete the display category.'))
    } finally {
      setSavingId('')
    }
  }

  return <div className="page-enter space-y-5">
    <SectionHeading title="Categories" description="Create curated storefront categories for Casino, Live Casino or Crash Games. Select Type controls the page where a category appears; Select games controls its exact Standard game membership." />
    <div className="grid gap-3 sm:grid-cols-3">
      {[{label:'Total categories',value:categories.length},{label:'Visible categories',value:visibleCategories.length},{label:'Game assignments',value:assignedGames}].map((metric) => <Card key={metric.label}><CardContent className="p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{loading ? '—' : metric.value}</p></CardContent></Card>)}
    </div>
    <Modal
      open={createModalOpen}
      onOpenChange={(open)=>{ if(savingId!=='new') setCreateModalOpen(open) }}
      title="Add storefront category"
      description="Create a custom storefront category for Casino, Live Casino or Crash Games, then use Select games to choose its Standard catalogue games."
      footer={
        <>
          <Button type="button" variant="outline" disabled={savingId==='new'} onClick={()=>setCreateModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-display-category-form" disabled={!draftName.trim()||savingId!==''}>{savingId==='new'?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>}{savingId==='new'?'Creating…':'Create category'}</Button>
        </>
      }
    >
      <form id="create-display-category-form" onSubmit={(event)=>void addCategory(event)} className="space-y-4">
        {error && createModalOpen && savingId !== 'new' ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">{error}</p> : null}
        <div className="space-y-1.5">
          <label htmlFor="new-display-category-name" className="text-xs font-semibold text-slate-700">Category name</label>
          <Input id="new-display-category-name" autoComplete="off" value={draftName} onChange={(event)=>setDraftName(event.target.value)} maxLength={80} required placeholder="e.g. Trending Games" disabled={savingId!==''}/>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-display-category-type" className="text-xs font-semibold text-slate-700">Select Type</label>
          <select id="new-display-category-type" value={draftType} onChange={(event)=>setDraftType(event.target.value as CasinoDisplayType)} disabled={savingId!==''} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CMS_CATEGORY_TYPE_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">This category appears only on the selected game-type page. Saving a changed Type removes any assigned games that do not match it.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-display-category-description" className="text-xs font-semibold text-slate-700">Description</label>
          <textarea id="new-display-category-description" value={draftDescription} onChange={(event)=>setDraftDescription(event.target.value)} maxLength={500} rows={3} placeholder="Tell players what makes these games special…" disabled={savingId!==''} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
          <p className="text-[10px] text-slate-400">{draftDescription.length}/500 characters</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-display-category-icon" className="text-xs font-semibold text-slate-700">Fallback icon</label>
          <select id="new-display-category-icon" value={draftIcon} onChange={(event)=>setDraftIcon(event.target.value)} disabled={savingId!==''} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CMS_CATEGORY_ICON_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <label htmlFor="new-display-category-icon-file" className="block text-xs font-semibold text-slate-700">Upload custom icon (optional)</label>
          <input id="new-display-category-icon-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={savingId!==''} onChange={(event)=>setDraftIconFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"/>
          <p className="text-[10px] leading-4 text-slate-500">PNG, JPEG or WebP · Maximum 5 MiB. The image is validated and stored with the project’s persistent uploads.</p>
          {draftIconFile ? <div className="flex items-center gap-2 rounded-md bg-white p-2 text-xs text-slate-600"><ImageIcon className="h-4 w-4"/><span className="min-w-0 flex-1 truncate">{draftIconFile.name}</span><button type="button" onClick={()=>setDraftIconFile(null)} className="font-semibold underline">Remove</button></div> : null}
        </div>
      </form>
    </Modal>
    <Modal
      open={Boolean(pickerCategory)}
      onOpenChange={(open)=>{ if(!open && !pickerSaving) setPickerCategory(null) }}
      title={pickerCategory ? 'Select games — '+pickerCategory.name : 'Select games'}
      description="Search the Standard catalogue for games matching this category's selected Type. Membership is saved separately from provider categories."
      size="wide"
      footer={
        <>
          <Button type="button" variant="outline" disabled={pickerSaving} onClick={()=>setPickerCategory(null)}>Cancel</Button>
          <Button type="button" disabled={pickerSaving || pickerLoading || Boolean(pickerError) || !pickerCategory || pickerLoadedCategoryRef.current !== pickerCategory.id} onClick={()=>void savePickerGames()}>{pickerSaving?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save {pickerSelectedIds.length} selected</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <Input value={pickerSearch} onChange={(event)=>setPickerSearch(event.target.value)} placeholder="Search by game title, slug or provider…" className="pl-9" aria-label="Search games for category"/>
          </div>
          <div className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{pickerSelectedIds.length}</span> selected · {pickerTotal} games found</div>
        </div>
        {pickerError ? <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><span className="flex-1">{pickerError}</span><Button type="button" size="sm" variant="outline" disabled={pickerLoading || pickerSaving} onClick={()=>setPickerReloadKey((value)=>value+1)}>Retry</Button></div> : null}
        <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-slate-200">
          {pickerLoading ? <p role="status" className="p-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading games…</p> : null}
          {!pickerLoading && pickerGames.length===0 ? <p className="p-8 text-center text-xs text-slate-500">No games match this search.</p> : null}
          {pickerGames.map((game) => (
            <label key={game.id} className={cn('flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50',pickerSelectedIds.includes(game.id)?'bg-sky-50/70':'bg-white')}>
              <input type="checkbox" checked={pickerSelectedIds.includes(game.id)} onChange={(event)=>togglePickerGame(game.id,event.target.checked)} disabled={pickerSaving} className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"/>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {game.imageUrl ? <img src={game.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/> : <Gamepad2 className="m-3 h-6 w-6 text-slate-400"/>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{game.title}</p>
                <p className="truncate text-[11px] text-slate-500">{game.provider} · {game.slug}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-medium',game.available?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}>{game.available?'Available':'Unavailable'}</span>
            </label>
          ))}
        </div>
        {pickerNextPage ? <div className="flex justify-center"><Button type="button" variant="outline" disabled={pickerLoadingMore || pickerLoading} onClick={()=>void loadMorePickerGames()}>{pickerLoadingMore?<LoaderCircle className="h-4 w-4 animate-spin"/>:null}Load more games</Button></div> : null}
      </div>
    </Modal>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Curated storefront categories</CardTitle><CardDescription className="mt-1">Each category belongs to one selected Type and is separate from the game provider’s source categories.</CardDescription></div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-[230px]"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search collections…" className="pl-9" /></div>
          <Button type="button" onClick={() => { setDraftName(''); setDraftDescription(''); setDraftIcon('trending'); setDraftType('casino'); setDraftIconFile(null); setError(''); setCreateModalOpen(true) }} disabled={savingId!==''}><Plus className="h-4 w-4" />Add category</Button>
          <Button type="button" variant="outline" size="sm" disabled={loading || savingId !== ''} onClick={() => void reload()} aria-label="Refresh collections"><RefreshCw className={cn('h-3.5 w-3.5',loading && 'animate-spin')} /></Button>
        </div>
      </div>
      <div className="p-4">
        {error ? <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><span className="flex-1">{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void reload()}>Retry</Button></div> : null}
        {loading ? <p role="status" className="py-10 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Loading categories from PostgreSQL…</p> : null}
        {!loading && !error && categories.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">No custom storefront categories yet. Create one above, choose its Type, then select its games.</p> : null}
        {!loading && filtered.length > 0 ? <div className="space-y-3">
          {filtered.map((category) => {
            const index = categories.findIndex((item) => item.id === category.id)
            const draft = drafts[category.id] ?? {name:category.name,description:category.description,icon:category.icon,type:category.type}
            const selectedIcon = CMS_CATEGORY_ICON_OPTIONS.find((option) => option.value === draft.icon) ?? CMS_CATEGORY_ICON_OPTIONS[0]!
            const CategoryIcon = selectedIcon.icon
            const changed = draft.name.trim() !== category.name || draft.description !== category.description || draft.type !== category.type
            return <div key={category.id} className={cn('rounded-xl border p-3',category.visible?'border-slate-200 bg-white':'border-dashed border-slate-200 bg-slate-50/70')}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex shrink-0 items-center gap-1 sm:flex-col">
                  <button type="button" aria-label={'Move '+category.name+' up'} disabled={index===0||savingId!==''} onClick={()=>void moveCategory(index,-1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={'Move '+category.name+' down'} disabled={index===categories.length-1||savingId!==''} onClick={()=>void moveCategory(index,1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-500 text-white">
                  {category.iconUrl ? <img src={category.iconUrl} alt="" className="h-full w-full object-cover" /> : <CategoryIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="grid gap-2 md:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1.4fr)]">
                    <Input value={draft.name} maxLength={80} aria-label={'Name for '+category.name} onChange={(event)=>setDrafts((current)=>({...current,[category.id]:{...draft,name:event.target.value}}))} disabled={savingId!==''} />
                    <Input value={draft.description} maxLength={500} aria-label={'Description for '+category.name} placeholder="Optional description" onChange={(event)=>setDrafts((current)=>({...current,[category.id]:{...draft,description:event.target.value}}))} disabled={savingId!==''} />

                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{CMS_CATEGORY_TYPE_OPTIONS.find((option)=>option.value===category.type)?.label ?? category.type}</Badge>
                    {draft.type !== category.type ? <p className="w-full text-[10px] leading-4 text-amber-700">Saving this Type removes assigned games that do not match it.</p> : null}
                    <Badge variant={category.visible?'success':'outline'}>{category.visible?'Visible':'Hidden'}</Badge>
                    <Badge variant="info">{category.items} assigned games</Badge>
                    <span className="font-mono text-[10px] text-slate-400">{category.slug}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <select value={draft.type} aria-label={'Select Type for '+category.name} onChange={(event)=>setDrafts((current)=>({...current,[category.id]:{...draft,type:event.target.value as CasinoDisplayType}}))} disabled={savingId!==''} className="h-8 w-[132px] rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {CMS_CATEGORY_TYPE_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={savingId!=='' || draft.type !== category.type} title={draft.type !== category.type ? 'Save the changed Type before selecting games' : 'Select games matching this category Type'} onClick={()=>openGamePicker(category)}><ListChecks className="h-3.5 w-3.5" />Select games</Button>
                  <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                    <ImageIcon className="h-3.5 w-3.5" /> Upload icon
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={savingId!==''} aria-label={'Upload icon for '+category.name} onChange={(event)=>{const file=event.target.files?.[0]; event.target.value=''; void uploadCategoryIcon(category,file)}} />
                  </label>
                  <Button type="button" size="sm" variant="outline" disabled={!changed||savingId!==''} onClick={()=>void saveCategory(category)}>{savingId===category.id?<LoaderCircle className="h-3.5 w-3.5 animate-spin"/>:<Save className="h-3.5 w-3.5"/>} Save</Button>
                  <Button type="button" size="sm" variant="outline" disabled={savingId!==''} onClick={()=>void toggleVisibility(category)}>{category.visible?'Hide':'Show'}</Button>
                  <Button type="button" size="sm" variant="destructive" disabled={savingId!==''} onClick={()=>void deleteCategory(category)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                </div>
              </div>
            </div>
          })}
        </div> : null}
        {!loading && !error && filtered.length === 0 && categories.length > 0 ? <div className="rounded-lg border border-dashed border-slate-200 py-9 text-center text-xs text-slate-400">No categories match that search.</div> : null}
      </div>
      <div className="border-t border-border px-4 py-3 text-[10px] text-slate-400">Category metadata, visibility, ordering and memberships are stored in PostgreSQL and audited. Provider-owned game categories are not modified.</div>
    </Card>
  </div>
}
