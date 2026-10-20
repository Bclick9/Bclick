import { useState, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Eye, Gift, MoreHorizontal, Plus, Search, X, Check, Pencil, RotateCcw, Image } from 'lucide-react'
import { Button, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'

type CmsPromotionStatus = 'Published' | 'Unpublished' | 'Trash'
type CmsPromotion = {
  id: string
  title: string
  altText: string
  platform: string
  status: CmsPromotionStatus
  category: string
  startDate: string
  endDate: string
  modifiedDate: string
  language: string
  showForUsers: string
  excludedCountries: string
  includedCountries: string
  newWindow: string
  visibility: string
  optInId: string
  countdownDate: string
  profileType: string
  customProfileTypes: string
  depositStatus: string
  profileStatus: string
  excludedCurrencies: string
  ageAction: string
  minAge: string
  maxAge: string
  content: string
  imageName: string
}
type CmsPromotionDraft = Omit<CmsPromotion, 'id' | 'modifiedDate'>

type CmsPromotionCategory = { id: string; name: string; slug: string; status: 'Published' | 'Unpublished' }

const EMPTY_CMS_PROMOTION: CmsPromotionDraft = {
  title: '', altText: '', platform: 'Web', status: 'Published', category: '',
  startDate: '', endDate: '', language: 'Français',
  showForUsers: 'Guest and Logged In', excludedCountries: '', includedCountries: '',
  newWindow: 'Yes', visibility: 'All', optInId: '', countdownDate: '',
  profileType: 'Global', customProfileTypes: 'All', depositStatus: 'Not selected',
  profileStatus: 'Not selected', excludedCurrencies: '', ageAction: 'Not selected',
  minAge: '', maxAge: '', content: '', imageName: '',
}
const INITIAL_CMS_PROMOTION_CATEGORIES: CmsPromotionCategory[] = [
  { id: 'CAT-001', name: 'Casino', slug: 'casino', status: 'Published' },
  { id: 'CAT-002', name: 'Poker', slug: 'poker', status: 'Published' },
  { id: 'CAT-003', name: 'Sports', slug: 'sports', status: 'Published' },
]

export function CmsPromotionsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [promotions, setPromotions] = useState<CmsPromotion[]>([])
  const [categories, setCategories] = useState<CmsPromotionCategory[]>(INITIAL_CMS_PROMOTION_CATEGORIES)
  const [activeTab, setActiveTab] = useState<CmsPromotionStatus>('Published')
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('Français')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)
  const [filters, setFilters] = useState({
    visibility: 'All', showForUsers: 'All', excludedCountries: 'Not selected',
    includedCountries: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', optInId: 'All', countdownDate: 'All',
    profileTypes: 'All', customProfileTypes: 'All', depositStatus: 'All', verifiedProfile: 'All',
  })
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CmsPromotionDraft>({ ...EMPTY_CMS_PROMOTION })
  const [showCategories, setShowCategories] = useState(false)
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'Published' | 'Unpublished'>('Published')
  const [categoryLanguage, setCategoryLanguage] = useState('Français')
  const [showCategoryDraft, setShowCategoryDraft] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryDraft, setCategoryDraft] = useState({ name: '', slug: '' })
  const [categorySearch, setCategorySearch] = useState('')

  const setDraftValue = (key: keyof CmsPromotionDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const setFilterValue = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const openNewPromotion = () => {
    setEditingId(null)
    setDraft({ ...EMPTY_CMS_PROMOTION })
    setView('editor')
  }
  const openEditPromotion = (promotion: CmsPromotion) => {
    const { id, modifiedDate, ...values } = promotion
    setEditingId(id)
    setDraft(values)
    setView('editor')
  }
  const cancelEditor = () => {
    setView('list')
    setEditingId(null)
    setDraft({ ...EMPTY_CMS_PROMOTION })
  }
  const savePromotion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      onNotify('Enter a title before saving the promotion.')
      return
    }
    const now = '19 Oct 2026'
    const values: CmsPromotion = {
      ...draft,
      id: editingId || 'PROM-' + String(promotions.length + 1).padStart(3, '0'),
      title: draft.title.trim(),
      modifiedDate: now,
      status: draft.status as CmsPromotionStatus,
    }
    if (editingId) {
      setPromotions((current) => current.map((item) => item.id === editingId ? values : item))
    } else {
      setPromotions((current) => [...current, values])
    }
    setActiveTab(values.status)
    setView('list')
    setEditingId(null)
    onNotify(editingId ? 'Promotion updated in this local preview.' : 'Promotion saved in this local preview.')
  }
  const setPromotionStatus = (id: string, status: CmsPromotionStatus) => {
    setPromotions((current) => current.map((item) => item.id === id ? { ...item, status, modifiedDate: '19 Oct 2026' } : item))
  }
  const resetFilters = () => {
    setSearch('')
    setLanguageFilter('Français')
    setCategoryFilter('All')
    setStateFilter('All')
    setPlatformFilter('All')
    setFilters({
      visibility: 'All', showForUsers: 'All', excludedCountries: 'Not selected',
      includedCountries: 'Not selected', countryRestriction: 'All', newWindow: 'All',
      startDate: '', endDate: '', optInId: 'All', countdownDate: 'All',
      profileTypes: 'All', customProfileTypes: 'All', depositStatus: 'All', verifiedProfile: 'All',
    })
  }

  const visiblePromotions = promotions.filter((item) => {
    if (item.status !== activeTab) return false
    if (search && !(item.title + ' ' + item.altText + ' ' + item.id + ' ' + item.category).toLowerCase().includes(search.toLowerCase())) return false
    if (languageFilter !== 'All' && item.language !== languageFilter) return false
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false
    if (stateFilter !== 'All' && item.status !== stateFilter) return false
    if (platformFilter !== 'All' && item.platform !== platformFilter && item.platform !== 'Both') return false
    if (filters.visibility !== 'All' && item.visibility !== filters.visibility) return false
    if (filters.showForUsers !== 'All' && item.showForUsers !== filters.showForUsers) return false
    if (filters.excludedCountries !== 'Not selected' && item.excludedCountries !== filters.excludedCountries) return false
    if (filters.includedCountries !== 'Not selected' && item.includedCountries !== filters.includedCountries) return false
    if (filters.newWindow !== 'All' && item.newWindow !== filters.newWindow) return false
    if (filters.startDate && (!item.startDate || item.startDate < filters.startDate)) return false
    if (filters.endDate && (!item.endDate || item.endDate > filters.endDate)) return false
    if (filters.optInId !== 'All' && item.optInId !== filters.optInId) return false
    if (filters.countdownDate !== 'All' && item.countdownDate !== filters.countdownDate) return false
    if (filters.profileTypes !== 'All' && item.profileType !== filters.profileTypes) return false
    if (filters.customProfileTypes !== 'All' && item.customProfileTypes !== filters.customProfileTypes) return false
    if (filters.depositStatus !== 'All' && item.depositStatus !== filters.depositStatus) return false
    if (filters.verifiedProfile !== 'All' && item.profileStatus !== filters.verifiedProfile) return false
    return true
  })
  const categoryRows = categories.filter((item) =>
    item.status === categoryStatusFilter &&
    (item.name + ' ' + item.slug).toLowerCase().includes(categorySearch.toLowerCase()),
  )

  const fieldClass = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-600'
  const textField = (label: string, key: keyof CmsPromotionDraft, placeholder?: string, type = 'text', disabled = false) => (
    <label key={key} className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <Input type={type} disabled={disabled} className={fieldClass} value={draft[key]} onChange={(event) => setDraftValue(key, event.target.value)} placeholder={placeholder || label} />
    </label>
  )
  const selectField = (label: string, key: keyof CmsPromotionDraft, options: string[]) => (
    <label key={key} className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <select className={fieldClass} value={draft[key]} onChange={(event) => setDraftValue(key, event.target.value)}>
        {options.map((option) => <option key={option} value={option === '—' ? '' : option}>{option}</option>)}
      </select>
    </label>
  )
  const filterSelect = (label: string, value: string, onChange: (value: string) => void, options: string[]) => (
    <label key={label} className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
  const section = (title: string, description: string, children: ReactNode, extraClass = '') => (
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white', extraClass)}>
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{children}</div>
    </section>
  )
  const insertEditorToken = (token: string) => setDraft((current) => ({ ...current, content: current.content + token }))

  if (view === 'editor') {
    return <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={cancelEditor}>Promotions</button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="font-semibold text-slate-900">{editingId ? 'Edit Promotion' : 'New Promotion'}</span>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-semibold text-slate-900">{editingId ? 'Edit Promotion' : 'New Promotion'}</h2><p className="mt-1 text-xs text-slate-500">Configure promotion details, visibility rules, content, and artwork.</p></div>
        <div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-promotion-editor-form') as HTMLFormElement | null; form?.requestSubmit() }}><Check className="h-4 w-4" /> Save</Button></div>
      </div>
      <form id="cms-promotion-editor-form" onSubmit={savePromotion} className="space-y-4">
        {section('General Details', 'Select platform, publication status, audience, countries, categories, and schedule.', <>
          {selectField('Platform', 'platform', ['Web', 'Mobile', 'Both'])}
          {selectField('Status', 'status', ['Published', 'Unpublished'])}
          {selectField('Show for users', 'showForUsers', ['Guest and Logged In', 'Guest only', 'Logged In only', 'All'])}
          {selectField('Excluded countries', 'excludedCountries', ['—', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('Included Countries', 'includedCountries', ['—', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('New Window', 'newWindow', ['Yes', 'No'])}
          <label className="block min-w-0"><span className={labelClass}>Categories</span><select className={fieldClass} value={draft.category} onChange={(event) => setDraftValue('category', event.target.value)}><option value="">Select category</option>{categories.filter((item) => item.status === 'Published').map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          {textField('Start Date', 'startDate', '', 'date')}
          {textField('End Date', 'endDate', '', 'date')}
          {textField('Opt-in ID', 'optInId', 'Enter opt-in ID')}
          {textField('Countdown Date', 'countdownDate', '', 'date')}
        </>)}
        {section('Promotion Properties', 'The title and alternative text identify this promotion in the CMS.', <>
          <div className="sm:col-span-2 xl:col-span-1">{textField('Title', 'title', 'Promotion title')}</div>
          <label className="block min-w-0"><span className={labelClass}>Language</span><select disabled value={draft.language} className={cn(fieldClass, 'bg-slate-50 text-slate-500')} onChange={() => undefined}><option>Français</option><option>English</option><option>العربية</option></select></label>
          {textField('Alt Text', 'altText', 'Describe the promotion image')}
        </>)}
        {section('Visibility Setup', 'Limit promotions by account profile and eligibility conditions.', <>
          {selectField('Select Profile Type', 'profileType', ['Global', 'Guest', 'Registered', 'VIP', 'Custom'])}
          {selectField('Custom Profile Types', 'customProfileTypes', ['All', 'New players', 'VIP players', 'Casino players', 'Sports players'])}
          {selectField('Deposit Status', 'depositStatus', ['Not selected', 'Deposited', 'Never deposited', 'First deposit'])}
          {selectField('Profile Status', 'profileStatus', ['Not selected', 'All', 'Verified', 'Unverified'])}
          {selectField('Excluded Currencies', 'excludedCurrencies', ['—', 'EUR', 'USD', 'GBP', 'TND'])}
          {selectField('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
        </>)}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Age Restriction</h3><p className="mt-1 text-[11px] text-slate-500">Optional age-based display restrictions.</p></div>
          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            {selectField('Action', 'ageAction', ['Not selected', 'Allow', 'Hide', 'Reject'])}
            {textField('Min Age', 'minAge', 'Minimum age', 'number', draft.ageAction === 'Not selected')}
            {textField('Max Age', 'maxAge', 'Maximum age', 'number', draft.ageAction === 'Not selected')}
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Editor</h3><p className="mt-1 text-[11px] text-slate-500">Write promotion copy. Formatting controls insert simple markup into this local demo field.</p></div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-1 rounded-t-md border border-slate-200 bg-slate-50 p-2">
              {[['Bold', '<strong></strong>'], ['Italic', '<em></em>'], ['Link', '<a href=""></a>'], ['List', '<ul><li></li></ul>']].map(([label, token]) => <button key={label} type="button" onClick={() => insertEditorToken(token)} className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100">{label}</button>)}
            </div>
            <textarea value={draft.content} onChange={(event) => setDraftValue('content', event.target.value)} rows={8} placeholder="Add promotion content…" className="block w-full resize-y rounded-b-md border border-t-0 border-slate-200 p-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-100" />
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Image</h3><p className="mt-1 text-[11px] text-slate-500">Choose artwork for this promotion. Files remain local to this preview.</p></div>
          <div className="p-4 sm:p-5">
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center hover:bg-slate-100/70">
              <Image className="h-7 w-7 text-slate-400" />
              <span className="mt-3 text-xs font-medium text-slate-700">{draft.imageName || 'Drag and drop a file or browse'}</span>
              <span className="mt-1 text-[10px] text-slate-400">Maximum upload file size: 2 MB · JPG, PNG, PDF, SVG, GIF</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.svg,.gif,image/*" className="sr-only" onChange={(event) => setDraftValue('imageName', event.target.files?.[0]?.name || '')} />
            </label>
          </div>
        </section>
        <div className="flex justify-end gap-2 pb-2"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="submit"><Check className="h-4 w-4" /> Save promotion</Button></div>
      </form>
    </div>
  }

  return <div className="page-enter space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div><p className="text-xs text-slate-500">CMS</p><h2 className="mt-1 text-base font-semibold text-slate-900">Promotions</h2></div>
      <div className="flex items-center gap-2"><Button variant="outline" onClick={() => setShowCategories(true)}><Pencil className="h-3.5 w-3.5" /> Manage Categories</Button><Button onClick={openNewPromotion}><Plus className="h-4 w-4" /> Add</Button></div>
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-1">
          {(['Published', 'Unpublished', 'Trash'] as CmsPromotionStatus[]).map((tab) => {
            const count = promotions.filter((item) => item.status === tab).length
            return <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={cn('relative -mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition', activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              {tab}<span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
            </button>
          })}
        </div>
        <div className="pb-3 text-[10px] text-slate-400">{promotions.length} total promotions · local preview</div>
      </div>
      <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className={cn(fieldClass, 'pl-9')} /></div>
          {filterSelect('Language', languageFilter, setLanguageFilter, ['All', 'Français', 'English', 'العربية'])}
          {filterSelect('Category', categoryFilter, setCategoryFilter, ['All', ...categories.filter((item) => item.status === 'Published').map((item) => item.name)])}
          {filterSelect('State', stateFilter, setStateFilter, ['All', 'Published', 'Unpublished'])}
          {filterSelect('Platform', platformFilter, setPlatformFilter, ['All', 'Web', 'Mobile', 'Both'])}
        </div>
        <div>
          <button type="button" onClick={() => setShowAdditionalFilters((current) => !current)} className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"><ChevronDown className={cn('h-4 w-4 transition', showAdditionalFilters ? 'rotate-180' : '')} />{showAdditionalFilters ? 'Hide additional filters' : 'Additional filters'}<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">14</span></button>
          {showAdditionalFilters ? <div className="mt-3 space-y-3 rounded-lg bg-slate-50/70 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {filterSelect('Visibility', filters.visibility, (value) => setFilterValue('visibility', value), ['All', 'Visible', 'Hidden'])}
              {filterSelect('Show for users', filters.showForUsers, (value) => setFilterValue('showForUsers', value), ['All', 'Guest and Logged In', 'Guest only', 'Logged In only'])}
              {filterSelect('Excluded country', filters.excludedCountries, (value) => setFilterValue('excludedCountries', value), ['Not selected', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
              {filterSelect('Included country', filters.includedCountries, (value) => setFilterValue('includedCountries', value), ['Not selected', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
              {filterSelect('Country Restriction', filters.countryRestriction, (value) => setFilterValue('countryRestriction', value), ['All', 'Included', 'Excluded', 'No restriction'])}
              {filterSelect('New Window', filters.newWindow, (value) => setFilterValue('newWindow', value), ['All', 'Yes', 'No'])}
              <label className="block min-w-0"><span className="sr-only">Start Date</span><Input aria-label="Start Date" type="date" className={fieldClass} value={filters.startDate} onChange={(event) => setFilterValue('startDate', event.target.value)} /></label>
              <label className="block min-w-0"><span className="sr-only">End Date</span><Input aria-label="End Date" type="date" className={fieldClass} value={filters.endDate} onChange={(event) => setFilterValue('endDate', event.target.value)} /></label>
              {filterSelect('Opt-in ID', filters.optInId, (value) => setFilterValue('optInId', value), ['All'])}
              {filterSelect('Countdown Date', filters.countdownDate, (value) => setFilterValue('countdownDate', value), ['All'])}
              {filterSelect('Profile Types', filters.profileTypes, (value) => setFilterValue('profileTypes', value), ['All', 'Global', 'Guest', 'Registered', 'VIP', 'Custom'])}
              {filterSelect('Custom Profile Types', filters.customProfileTypes, (value) => setFilterValue('customProfileTypes', value), ['All', 'New players', 'VIP players', 'Casino players', 'Sports players'])}
              {filterSelect('Deposit Status', filters.depositStatus, (value) => setFilterValue('depositStatus', value), ['All', 'Not selected', 'Deposited', 'Never deposited', 'First deposit'])}
              {filterSelect('Verified Profile', filters.verifiedProfile, (value) => setFilterValue('verifiedProfile', value), ['All', 'Not selected', 'Verified', 'Unverified'])}
            </div>
            <div className="flex justify-end"><Button variant="ghost" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset Filters</Button></div>
          </div> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500">
            <tr><th className="w-10 px-3 py-3"></th><th className="px-3 py-3">Image</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Start Date</th><th className="px-3 py-3">End Date</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Modified Date</th><th className="w-24 px-3 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiblePromotions.map((item) => <tr key={item.id} className="text-xs hover:bg-slate-50/70">
              <td className="px-3 py-3 text-slate-300"><span className="cursor-grab">⠿</span></td>
              <td className="px-3 py-3"><div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400">{item.imageName ? <Image className="h-4 w-4" /> : <span className="text-[9px]">No image</span>}</div>{item.imageName ? <p className="mt-1 max-w-20 truncate text-[9px] text-slate-400">{item.imageName}</p> : null}</td>
              <td className="px-3 py-3"><p className="font-medium text-slate-800">{item.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{item.id}</p></td>
              <td className="px-3 py-3 text-slate-600">{item.startDate || '—'}</td><td className="px-3 py-3 text-slate-600">{item.endDate || '—'}</td><td className="px-3 py-3 text-slate-600">{item.category || '—'}</td><td className="px-3 py-3 text-slate-500">{item.modifiedDate}</td>
              <td className="px-3 py-3"><div className="flex justify-end gap-1">
                {item.status === 'Trash' ? <Button variant="ghost" size="icon" aria-label="Restore promotion" onClick={() => setPromotionStatus(item.id, 'Unpublished')}><RotateCcw className="h-4 w-4 text-slate-500" /></Button> : <Button variant="ghost" size="icon" aria-label="Edit promotion" onClick={() => openEditPromotion(item)}><Pencil className="h-4 w-4 text-slate-500" /></Button>}
                {item.status !== 'Trash' ? <Button variant="ghost" size="icon" aria-label="Move promotion to trash" onClick={() => setPromotionStatus(item.id, 'Trash')}><X className="h-4 w-4 text-slate-500" /></Button> : <Button variant="ghost" size="icon" aria-label="Delete permanently" onClick={() => setPromotions((current) => current.filter((promo) => promo.id !== item.id))}><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button>}
              </div></td>
            </tr>)}
            {visiblePromotions.length === 0 ? <tr><td colSpan={8} className="px-4 py-14"><div className="flex flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400"><Gift className="h-5 w-5" /></span><p className="mt-3 text-xs font-medium text-slate-700">No data to display</p><p className="mt-1 text-[10px] text-slate-400">{search ? 'Try changing the search or filters.' : 'Add a promotion to see it listed here.'}</p></div></td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
        <div className="flex items-center gap-3"><select aria-label="Rows per page" className="h-8 rounded-md border border-slate-200 bg-white px-2" defaultValue="25"><option>25</option><option>50</option><option>100</option></select><span>{visiblePromotions.length ? '1-' + visiblePromotions.length + ' of ' + visiblePromotions.length : '0-0 of 0'}</span></div>
        <div className="flex items-center gap-2"><Button size="icon" variant="ghost" disabled><ChevronRight className="h-4 w-4 rotate-180" /></Button><span className="rounded border border-slate-200 px-2 py-1">1</span><Button size="icon" variant="ghost" disabled><ChevronRight className="h-4 w-4" /></Button></div>
      </div>
    </div>

    <Modal open={showCategories} onOpenChange={(open) => { setShowCategories(open); if (!open) { setShowCategoryDraft(false); setEditingCategoryId(null); } }} title="Categories" description="Manage the categories available to CMS promotions." size="wide" footer={<Button variant="outline" onClick={() => setShowCategories(false)}>Close</Button>}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select aria-label="Category status" className={fieldClass} value={categoryStatusFilter} onChange={(event) => setCategoryStatusFilter(event.target.value as 'Published' | 'Unpublished')}><option>Published</option><option>Unpublished</option></select>
          <select aria-label="Category language" className={fieldClass} value={categoryLanguage} onChange={(event) => setCategoryLanguage(event.target.value)}><option>Français</option><option>English</option><option>العربية</option></select>
          <Button onClick={() => { setShowCategoryDraft(true); setEditingCategoryId(null); setCategoryDraft({ name: '', slug: '' }) }}><Plus className="h-3.5 w-3.5" /> Add Category</Button>
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search categories" className={cn(fieldClass, 'pl-9')} placeholder="Search categories" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /></div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] text-slate-500"><tr><th className="w-10 px-3 py-3"></th><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Slug</th><th className="w-32 px-3 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {showCategoryDraft ? <tr>
                <td className="px-3 py-3 text-slate-300">⠿</td>
                <td className="px-3 py-3"><Input autoFocus value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Category name" className="h-9 text-xs" /></td>
                <td className="px-3 py-3"><Input value={categoryDraft.slug} onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="category-slug" className="h-9 text-xs" /></td>
                <td className="px-3 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Save category" disabled={!categoryDraft.name.trim()} onClick={() => {
                  const newCategory: CmsPromotionCategory = { id: 'CAT-' + String(categories.length + 1).padStart(3, '0'), name: categoryDraft.name.trim(), slug: categoryDraft.slug.trim() || categoryDraft.name.trim().toLowerCase().replace(/\s+/g, '-'), status: categoryStatusFilter }
                  setCategories((current) => [...current, newCategory]); setShowCategoryDraft(false); setCategoryDraft({ name: '', slug: '' }); onNotify('Category added in this local preview.')
                }}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Cancel category" onClick={() => setShowCategoryDraft(false)}><X className="h-4 w-4" /></Button></div></td>
              </tr> : null}
              {categoryRows.map((item) => <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 text-slate-300"><span className="cursor-grab">⠿</span></td>
                <td className="px-3 py-3">{editingCategoryId === item.id ? <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} className="h-9 text-xs" /> : <span className="font-medium text-slate-700">{item.name}</span>}</td>
                <td className="px-3 py-3">{editingCategoryId === item.id ? <Input value={categoryDraft.slug} onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value }))} className="h-9 text-xs" /> : <span className="text-slate-500">{item.slug}</span>}</td>
                <td className="px-3 py-3"><div className="flex justify-end gap-1">
                  {editingCategoryId === item.id ? <><Button size="icon" variant="ghost" aria-label="Save category changes" onClick={() => { setCategories((current) => current.map((category) => category.id === item.id ? { ...category, name: categoryDraft.name.trim() || category.name, slug: categoryDraft.slug.trim() || category.slug } : category)); setEditingCategoryId(null); onNotify('Category updated in this local preview.') }}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Cancel category edits" onClick={() => setEditingCategoryId(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" aria-label="Edit category" onClick={() => { setEditingCategoryId(item.id); setShowCategoryDraft(false); setCategoryDraft({ name: item.name, slug: item.slug }) }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={item.status === 'Published' ? 'Unpublish category' : 'Publish category'} onClick={() => setCategories((current) => current.map((category) => category.id === item.id ? { ...category, status: category.status === 'Published' ? 'Unpublished' : 'Published' } : category))}>{item.status === 'Published' ? <Eye className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button></>}
                </div></td>
              </tr>)}
              {!showCategoryDraft && categoryRows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400">No categories to display.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500"><span>{categoryRows.length + (showCategoryDraft ? 1 : 0)} categories</span><span>Language: {categoryLanguage}</span></div>
      </div>
    </Modal>
  </div>
}
