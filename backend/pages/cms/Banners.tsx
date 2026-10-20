import { useState, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, Search, Check, Pencil, RotateCcw, Image, Layers, SlidersHorizontal } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'

type BannerStatus = 'Published' | 'Unpublished' | 'Trash'
type CmsBannerGroup = { id: string; slug: string; status: BannerStatus }
type CmsBannerDraft = {
  title: string
  platform: string
  status: BannerStatus
  showForUsers: string
  excludedCountries: string
  includedCountries: string
  newWindow: string
  startDate: string
  endDate: string
  additionalFeatures: string
  language: string
  altText: string
  hrefType: string
  href: string
  profileType: string
  depositStatus: string
  profileStatus: string
  excludedCurrencies: string
  ageAction: string
  minAge: string
  maxAge: string
  content: string
  mediaType: string
  imageName: string
  visibility: string
  countryRestriction: string
  countdownDate: string
  casinoJackpot: string
  matchId: string
  profileTypes: string
  customProfileTypes: string
  verifiedProfile: string
}
type CmsBanner = CmsBannerDraft & { id: string; groupId: string; modifiedDate: string }

const createEmptyCmsBannerDraft = (): CmsBannerDraft => ({
  title: '', platform: 'Web', status: 'Published', showForUsers: 'Guest and Logged In',
  excludedCountries: '', includedCountries: '', newWindow: 'No', startDate: '', endDate: '',
  additionalFeatures: 'None', language: 'Français', altText: '', hrefType: 'URL', href: '',
  profileType: 'Global', depositStatus: 'Not selected', profileStatus: 'Not selected',
  excludedCurrencies: '', ageAction: 'Not selected', minAge: '', maxAge: '', content: '',
  mediaType: 'Image', imageName: '', visibility: 'All', countryRestriction: 'All',
  countdownDate: 'All', casinoJackpot: 'All', matchId: 'All', profileTypes: 'All',
  customProfileTypes: 'All', verifiedProfile: 'All',
})


const INITIAL_CMS_BANNER_GROUPS: CmsBannerGroup[] = []
const INITIAL_CMS_BANNERS: CmsBanner[] = []


export function CmsBannersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [groups, setGroups] = useState<CmsBannerGroup[]>(INITIAL_CMS_BANNER_GROUPS)
  const [banners, setBanners] = useState<CmsBanner[]>(INITIAL_CMS_BANNERS)
  const [view, setView] = useState<'groups' | 'banners' | 'editor'>('groups')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupSlug, setGroupSlug] = useState('Casino')
  const [groupStatus, setGroupStatus] = useState<BannerStatus>('Published')
  const [groupTab, setGroupTab] = useState<BannerStatus>('Published')
  const [bannerTab, setBannerTab] = useState<BannerStatus>('Published')
  const [groupSearch, setGroupSearch] = useState('')
  const [bannerSearch, setBannerSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('Français')
  const [stateFilter, setStateFilter] = useState('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    visibility: 'All', showForUsers: 'All', excludedCountry: 'Not selected',
    includedCountry: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', countdownDate: 'All', casinoJackpot: 'All',
    matchId: 'All', profileTypes: 'All', customProfileTypes: 'All',
    depositStatus: 'All', verifiedProfile: 'All',
  })
  const [pageSize, setPageSize] = useState('25')
  const [groupPage, setGroupPage] = useState(1)
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CmsBannerDraft>(createEmptyCmsBannerDraft())
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null
  const groupCounts = (status: BannerStatus) => groups.filter((group) => group.status === status).length
  const bannerCounts = (status: BannerStatus) => banners.filter((banner) => banner.groupId === activeGroupId && banner.status === status).length
  const visibleGroups = groups.filter((group) => group.status === groupTab && group.slug.toLowerCase().includes(groupSearch.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(visibleGroups.length / Number(pageSize)))
  const currentGroups = visibleGroups.slice((groupPage - 1) * Number(pageSize), groupPage * Number(pageSize))
  const visibleBanners = banners.filter((banner) => {
    if (banner.groupId !== activeGroupId || banner.status !== bannerTab) return false
    if (languageFilter !== 'All' && banner.language !== languageFilter) return false
    if (stateFilter !== 'All' && banner.status !== stateFilter) return false
    if (platformFilter !== 'All' && banner.platform !== platformFilter) return false
    if (!(banner.title + ' ' + banner.altText + ' ' + banner.href + ' ' + banner.platform).toLowerCase().includes(bannerSearch.toLowerCase())) return false
    if (advancedFilters.visibility !== 'All' && banner.visibility !== advancedFilters.visibility) return false
    if (advancedFilters.showForUsers !== 'All' && banner.showForUsers !== advancedFilters.showForUsers) return false
    if (advancedFilters.newWindow !== 'All' && banner.newWindow !== advancedFilters.newWindow) return false
    if (advancedFilters.startDate && banner.startDate && banner.startDate.slice(0, 10) < advancedFilters.startDate) return false
    if (advancedFilters.endDate && banner.endDate && banner.endDate.slice(0, 10) > advancedFilters.endDate) return false
    return true
  })
  const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const inputClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const tabButton = (label: string, count: number, active: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition', active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
      <span>{label}</span><span className={cn('rounded px-1.5 py-0.5 text-[10px]', active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
    </button>
  )
  const resetAdvancedFilters = () => setAdvancedFilters({
    visibility: 'All', showForUsers: 'All', excludedCountry: 'Not selected',
    includedCountry: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', countdownDate: 'All', casinoJackpot: 'All',
    matchId: 'All', profileTypes: 'All', customProfileTypes: 'All',
    depositStatus: 'All', verifiedProfile: 'All',
  })
  const createGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupSlug.trim()) return
    const group: CmsBannerGroup = { id: 'BG-' + String(groups.length + 1).padStart(3, '0'), slug: groupSlug.trim(), status: groupStatus }
    setGroups((current) => [group, ...current])
    setGroupTab(groupStatus)
    setGroupSearch('')
    setGroupPage(1)
    setGroupDialogOpen(false)
    setGroupSlug('Casino')
    setGroupStatus('Published')
    onNotify('Banner group added to the local CMS preview.')
  }
  const openGroup = (group: CmsBannerGroup) => {
    setActiveGroupId(group.id)
    setBannerTab('Published')
    setBannerSearch('')
    setLanguageFilter('Français')
    setStateFilter('All')
    setPlatformFilter('All')
    resetAdvancedFilters()
    setView('banners')
  }
  const openNewBanner = () => {
    setDraft({ ...createEmptyCmsBannerDraft(), language: languageFilter === 'All' ? 'Français' : languageFilter })
    setEditingBannerId(null)
    setView('editor')
  }
  const openEditBanner = (banner: CmsBanner) => {
    const { id, groupId, modifiedDate, ...bannerDraft } = banner
    setDraft(bannerDraft)
    setEditingBannerId(id)
    setView('editor')
  }
  const saveBanner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim() || !activeGroup) return
    if (editingBannerId) {
      setBanners((current) => current.map((banner) => banner.id === editingBannerId ? { ...banner, ...draft, title: draft.title.trim(), modifiedDate: '19 Oct 2026' } : banner))
      onNotify('Banner updated in the local CMS preview.')
    } else {
      const created: CmsBanner = { ...draft, title: draft.title.trim(), id: 'BNR-' + String(banners.length + 1).padStart(3, '0'), groupId: activeGroup.id, modifiedDate: '19 Oct 2026' }
      setBanners((current) => [created, ...current])
      onNotify('Banner saved in the local CMS preview.')
    }
    setBannerTab(draft.status)
    setView('banners')
  }
  const cancelEditor = () => setView(activeGroup ? 'banners' : 'groups')
  const updateDraft = (key: keyof CmsBannerDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }) as CmsBannerDraft)
  const textField = (label: string, key: keyof CmsBannerDraft, options?: { placeholder?: string; type?: string; required?: boolean }) => (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-[11px] font-medium text-slate-600">{label}{options?.required ? <span className="text-rose-500"> *</span> : null}</span>
      <input className={inputClass} required={options?.required} placeholder={options?.placeholder ?? label} type={options?.type ?? 'text'} value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} />
    </label>
  )
  const selectField = (label: string, key: keyof CmsBannerDraft, options: string[]) => (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-[11px] font-medium text-slate-600">{label}</span>
      <select className={selectClass} value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option || 'Not selected'}</option>)}</select>
    </label>
  )
  const advancedSelect = (label: string, key: keyof typeof advancedFilters, options: string[]) => (
    <label key={key} className="block min-w-0 space-y-1.5">
      <span className="block text-[10px] font-medium text-slate-500">{label}</span>
      <select className={selectClass} value={advancedFilters[key]} onChange={(event) => setAdvancedFilters((current) => ({ ...current, [key]: event.target.value }))}>{options.map((option) => <option key={option}>{option}</option>)}</select>
    </label>
  )
  const sectionCard = (title: string, description: string, children: ReactNode) => (
    <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>
  )

  if (view === 'editor') {
    return <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={() => setView('groups')}>Banners</button><ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <button type="button" className="hover:text-slate-900" onClick={() => setView('banners')}>{activeGroup?.slug ?? 'Group'}</button><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="font-semibold text-slate-900">{editingBannerId ? 'Edit Banner' : 'New Banner'}</span>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-semibold text-slate-900">{editingBannerId ? 'Edit Banner' : 'New Banner'}</h2><p className="mt-1 text-xs text-slate-500">Configure the banner content, visibility, schedule, and media.</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-banner-editor-form') as HTMLFormElement | null; form?.requestSubmit() }}><Check className="h-4 w-4" /> Save</Button></div>
      </div>
      <form id="cms-banner-editor-form" onSubmit={saveBanner} className="space-y-4">
        {sectionCard('General Details', 'Choose where and when the banner can be shown.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Platform', 'platform', ['Web', 'Mobile', 'Both'])}
          {selectField('Status', 'status', ['Published', 'Unpublished'])}
          {selectField('Show for users', 'showForUsers', ['Guest and Logged In', 'Guest only', 'Logged In only', 'All'])}
          {selectField('Excluded countries', 'excludedCountries', ['', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('Included Countries', 'includedCountries', ['', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('New Window', 'newWindow', ['No', 'Yes'])}
          {textField('Start Date', 'startDate', { type: 'datetime-local' })}
          {textField('End Date', 'endDate', { type: 'datetime-local' })}
          {selectField('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
          <div className="flex flex-col justify-end gap-2 rounded-lg border border-dashed border-slate-200 p-3 sm:col-span-2 xl:col-span-1"><div><p className="text-[11px] font-semibold text-slate-700">Additional features</p><p className="mt-1 text-[10px] text-slate-400">Optional banner behaviour flags.</p></div><Button type="button" variant="outline" onClick={() => updateDraft('additionalFeatures', draft.additionalFeatures === 'None' ? 'Countdown, Jackpot' : 'None')}><Plus className="h-3.5 w-3.5" /> {draft.additionalFeatures === 'None' ? 'Add features' : 'Remove features'}</Button><span className="text-[10px] text-slate-500">{draft.additionalFeatures}</span></div>
        </div>)}
        {sectionCard('Banner Properties', 'Set the banner title, language, alternative text, and destination.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {textField('Title', 'title', { required: true, placeholder: 'Banner title' })}
          {selectField('Language', 'language', ['Français', 'English', 'العربية'])}
          {textField('Alt Text', 'altText', { placeholder: 'Accessible image description' })}
          {selectField('Destination type', 'hrefType', ['URL', 'Internal page', 'Promotion'])}
          <div className="sm:col-span-2"><label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Destination URL</span><input className={inputClass} type="url" placeholder="https://example.com or /promotions" value={draft.href} onChange={(event) => updateDraft('href', event.target.value)} /></label></div>
        </div>)}
        {sectionCard('Visibility Setup', 'Control profile and account conditions for displaying this banner.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Select Profile Type', 'profileType', ['Global', 'Player profile', 'Custom profile'])}
          {selectField('Deposit Status', 'depositStatus', ['Not selected', 'All', 'Has deposited', 'Never deposited'])}
          {selectField('Profile Status', 'profileStatus', ['Not selected', 'All', 'Active', 'Inactive', 'Verified'])}
          {selectField('Excluded Currencies', 'excludedCurrencies', ['', 'EUR', 'USD', 'TND', 'GBP'])}
        </div>)}
        {sectionCard('Age Restriction', 'Optional age-based display rules.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Action', 'ageAction', ['Not selected', 'Show banner', 'Hide banner'])}
          {textField('Min Age', 'minAge', { type: 'number', placeholder: 'Minimum age' })}
          {textField('Max Age', 'maxAge', { type: 'number', placeholder: 'Maximum age' })}
        </div>)}
        {sectionCard('Editor', 'Add optional formatted copy to the banner.', <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Banner content</span><textarea rows={6} value={draft.content} onChange={(event) => updateDraft('content', event.target.value)} placeholder="Enter optional banner copy…" className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-xs leading-5 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>)}
        {sectionCard('Media', 'Select the type of media used by this banner.', <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {selectField('Type', 'mediaType', ['Image', 'Video'])}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"><div className="flex flex-col items-center justify-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Image className="h-5 w-5" /></span>
            <p className="mt-3 text-xs font-semibold text-slate-800">{draft.imageName || 'Drag and drop a file'}</p><p className="mt-1 text-[10px] text-slate-500">Choose media for the local preview. No file is uploaded to a server.</p>
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Browse<input className="sr-only" type="file" accept="image/*,video/*" onChange={(event) => updateDraft('imageName', event.target.files?.[0]?.name ?? '')} /></label>
            <p className="mt-2 text-[10px] text-slate-400">Reference upload limit: 2 MB · JPG, PNG, PDF, SVG, GIF</p>
          </div></div>
        </div>)}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="submit"><Check className="h-4 w-4" /> Save Banner</Button></div>
      </form>
      <p className="text-[10px] text-slate-400">All edits, publication states, and media selections remain local to this UI prototype.</p>
    </div>
  }

  return <div className="page-enter space-y-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
      <button type="button" className={cn('hover:text-slate-900', view === 'groups' && 'font-semibold text-slate-900')} onClick={() => setView('groups')}>Banners</button>
      {view === 'banners' && activeGroup ? <><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="font-semibold text-slate-900">{activeGroup.slug}</span></> : null}
    </div>
    {view === 'groups' ? <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-wrap items-center gap-1">
        {tabButton('Published', groupCounts('Published'), groupTab === 'Published', () => { setGroupTab('Published'); setGroupPage(1) })}
        {tabButton('Unpublished', groupCounts('Unpublished'), groupTab === 'Unpublished', () => { setGroupTab('Unpublished'); setGroupPage(1) })}
        {tabButton('Trash', groupCounts('Trash'), groupTab === 'Trash', () => { setGroupTab('Trash'); setGroupPage(1) })}
      </div><Button onClick={() => setGroupDialogOpen(true)}><Plus className="h-4 w-4" /> Add Banner Group</Button></div>
      <div className="px-5 py-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={groupSearch} onChange={(event) => { setGroupSearch(event.target.value); setGroupPage(1) }} placeholder="Search" className="pl-9" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] table-fixed text-left"><thead><tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-12 px-5 py-3"></th><th className="px-3 py-3 font-medium">Title</th><th className="w-40 px-3 py-3 font-medium">Status</th><th className="w-40 px-5 py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody>{currentGroups.map((group) => <tr key={group.id} className="border-b border-slate-100 text-xs transition hover:bg-slate-50"><td className="px-5 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Layers className="h-4 w-4" /></span></td><td className="px-3 py-3"><button type="button" onClick={() => openGroup(group)} className="font-semibold text-slate-800 hover:underline">{group.slug}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{group.id}</p></td><td className="px-3 py-3"><Badge variant={group.status === 'Published' ? 'success' : group.status === 'Trash' ? 'warning' : 'outline'}>{group.status}</Badge></td><td className="px-5 py-3 text-right"><div className="inline-flex gap-1.5"><Button size="sm" variant="outline" onClick={() => openGroup(group)}>Open</Button>{group.status === 'Trash' ? <Button size="sm" variant="outline" onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, status: 'Unpublished' } : item))}>Restore</Button> : <Button size="sm" variant="outline" onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, status: 'Trash' } : item))}>Trash</Button>}</div></td></tr>)}</tbody>
      </table>
      {currentGroups.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center border-b border-slate-100 px-4 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Image className="h-6 w-6" /></span><p className="mt-3 text-xs font-semibold text-slate-500">No data to display</p><p className="mt-1 text-[10px] text-slate-400">Add a banner group to start organizing banner content.</p></div> : null}
      </div>
      <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><select aria-label="Rows per page" className={selectClass + ' w-[76px]'} value={pageSize} onChange={(event) => { setPageSize(event.target.value); setGroupPage(1) }}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select><span>{visibleGroups.length ? (groupPage - 1) * Number(pageSize) + 1 : 0}-{Math.min(groupPage * Number(pageSize), visibleGroups.length)} of {visibleGroups.length}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={groupPage <= 1} onClick={() => setGroupPage((page) => Math.max(1, page - 1))}>Previous</Button><span className="min-w-5 text-center">{groupPage}</span><Button variant="outline" size="sm" disabled={groupPage >= pageCount} onClick={() => setGroupPage((page) => Math.min(pageCount, page + 1))}>Next</Button></div></div>
    </> : null}

    {view === 'banners' && activeGroup ? <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-wrap items-center gap-1">
        {tabButton('Published', bannerCounts('Published'), bannerTab === 'Published', () => setBannerTab('Published'))}
        {tabButton('Unpublished', bannerCounts('Unpublished'), bannerTab === 'Unpublished', () => setBannerTab('Unpublished'))}
        {tabButton('Trash', bannerCounts('Trash'), bannerTab === 'Trash', () => setBannerTab('Trash'))}
      </div><Button onClick={openNewBanner}><Plus className="h-4 w-4" /> Add Banner</Button></div>
      <div className="space-y-4 border-b border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={bannerSearch} onChange={(event) => setBannerSearch(event.target.value)} placeholder="Search" className="pl-9" /></div>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">Language</span><select className={selectClass} value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}><option>All</option><option>Français</option><option>English</option><option>العربية</option></select></label>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">State</span><select className={selectClass} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option>All</option><option>Published</option><option>Unpublished</option></select></label>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">Platform</span><select className={selectClass} value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option>All</option><option>Web</option><option>Mobile</option><option>Both</option></select></label>
        </div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setShowAdvancedFilters((open) => !open)} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900"><SlidersHorizontal className="h-3.5 w-3.5" /> Additional filters<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvancedFilters && 'rotate-180')} /></button><span className="text-[10px] text-slate-400">{visibleBanners.length} banners</span></div>
        {showAdvancedFilters ? <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {advancedSelect('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
          {advancedSelect('Show for users', 'showForUsers', ['All', 'Guest and Logged In', 'Guest only', 'Logged In only'])}
          {advancedSelect('Excluded Country', 'excludedCountry', ['Not selected', 'Tunisia', 'France', 'Italy', 'Germany'])}
          {advancedSelect('Included Country', 'includedCountry', ['Not selected', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany'])}
          {advancedSelect('Country Restriction', 'countryRestriction', ['All', 'Include only', 'Exclude selected'])}
          {advancedSelect('New Window', 'newWindow', ['All', 'No', 'Yes'])}
          <label className="block space-y-1.5"><span className="block text-[10px] font-medium text-slate-500">Start Date</span><input type="date" className={inputClass} value={advancedFilters.startDate} onChange={(event) => setAdvancedFilters((current) => ({ ...current, startDate: event.target.value }))} /></label>
          <label className="block space-y-1.5"><span className="block text-[10px] font-medium text-slate-500">End Date</span><input type="date" className={inputClass} value={advancedFilters.endDate} onChange={(event) => setAdvancedFilters((current) => ({ ...current, endDate: event.target.value }))} /></label>
          {advancedSelect('Countdown Date', 'countdownDate', ['All', 'Enabled', 'Disabled'])}
          {advancedSelect('Casino Jackpot', 'casinoJackpot', ['All', 'Enabled', 'Disabled'])}
          {advancedSelect('Match ID', 'matchId', ['All', 'Set', 'Not set'])}
          {advancedSelect('Profile Types', 'profileTypes', ['All', 'Global', 'Specific'])}
          {advancedSelect('Custom Profile Types', 'customProfileTypes', ['All', 'Selected', 'Not selected'])}
          {advancedSelect('Deposit Status', 'depositStatus', ['All', 'Has deposited', 'Never deposited'])}
          {advancedSelect('Verified Profile', 'verifiedProfile', ['All', 'Verified', 'Unverified'])}
          <div className="flex items-end justify-end"><Button type="button" size="sm" variant="outline" onClick={resetAdvancedFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset Filters</Button></div>
        </div> : null}
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[960px] table-fixed text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-16 px-4 py-3 font-medium">Image</th><th className="w-[24%] px-3 py-3 font-medium">Title</th><th className="w-[10%] px-3 py-3 font-medium">Platform</th><th className="w-[15%] px-3 py-3 font-medium">Start Date</th><th className="w-[15%] px-3 py-3 font-medium">End Date</th><th className="w-[15%] px-3 py-3 font-medium">Modified Date</th><th className="w-[16%] px-4 py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody>{visibleBanners.map((banner) => <tr key={banner.id} className="border-b border-slate-100 text-xs hover:bg-slate-50">
          <td className="px-4 py-3"><div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-slate-900 via-violet-800 to-amber-500 text-white">{banner.imageName ? <span className="max-w-full truncate px-1 text-[7px]">{banner.imageName}</span> : <Image className="h-4 w-4" />}</div></td>
          <td className="px-3 py-3"><button type="button" onClick={() => openEditBanner(banner)} className="font-semibold text-slate-800 hover:underline">{banner.title}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{banner.id}</p></td>
          <td className="px-3 py-3 text-slate-600">{banner.platform}</td><td className="px-3 py-3 text-slate-500">{banner.startDate || '—'}</td><td className="px-3 py-3 text-slate-500">{banner.endDate || '—'}</td><td className="px-3 py-3 text-slate-500">{banner.modifiedDate}</td>
          <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => openEditBanner(banner)}><Pencil className="h-3 w-3" /> Edit</Button>{banner.status === 'Trash' ? <Button size="sm" variant="outline" onClick={() => setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, status: 'Unpublished' } : item))}>Restore</Button> : <Button size="sm" variant="outline" onClick={() => setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, status: 'Trash' } : item))}>Trash</Button>}</div></td>
        </tr>)}</tbody></table>
        {visibleBanners.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Image className="h-6 w-6" /></span><p className="mt-3 text-xs font-semibold text-slate-500">No data to display</p><p className="mt-1 text-[10px] text-slate-400">Use Add Banner to create the first banner in this group.</p></div> : null}
      </div>
      <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><select aria-label="Rows per page" className={selectClass + ' w-[76px]'} defaultValue="25"><option>25</option><option>50</option><option>100</option></select><span>1-{visibleBanners.length} of {visibleBanners.length}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled>Previous</Button><span className="rounded-md bg-slate-100 px-2.5 py-1.5">1</span><Button variant="outline" size="sm" disabled>Next</Button></div></div>
    </> : null}

    <Modal open={groupDialogOpen} onOpenChange={setGroupDialogOpen} title="Add Banner Group" description="Create a group to organize banners." footer={<><Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-banner-group-form') as HTMLFormElement | null; form?.requestSubmit() }}>Save</Button></>}>
      <form id="cms-banner-group-form" onSubmit={createGroup} className="space-y-4">
        <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Slug</span><select className={selectClass} value={groupSlug} onChange={(event) => setGroupSlug(event.target.value)}><option>Casino</option><option>Sports</option><option>Poker</option><option>Homepage</option><option>Live Casino</option><option>Promotions</option></select></label>
        <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Status</span><select className={selectClass} value={groupStatus} onChange={(event) => setGroupStatus(event.target.value as BannerStatus)}><option>Published</option><option>Unpublished</option></select></label>
      </form>
    </Modal>
  </div>
}
