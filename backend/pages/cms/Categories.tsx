import { useState, type FormEvent } from 'react'
import { Clock3, Gamepad2, Gift, Plus, Search, Sparkles, TrendingUp, Users, Zap, CircleDollarSign, Trophy, ArrowDown, ArrowUp, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardTitle, Input } from '../../components/ui'
import { cn } from '../../lib/utils'
import { SectionHeading } from '../../components/DashboardUI'

export type CmsCategory = { id: string; name: string; items: number; visible: boolean; description: string; icon: string }

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

export const INITIAL_CMS_CATEGORIES: CmsCategory[] = [
  { id: 'cat-featured', name: 'Featured', items: 8, visible: true, description: 'Hand-picked games and highlights', icon: 'sparkles' },
  { id: 'cat-popular', name: 'Popular Games', items: 24, visible: true, description: 'Top games by engagement', icon: 'trending' },
  { id: 'cat-new', name: 'New Releases', items: 12, visible: true, description: 'Recently added casino titles', icon: 'clock' },
  { id: 'cat-slots', name: 'Slots', items: 186, visible: true, description: 'Video slots and classic reels', icon: 'gamepad' },
  { id: 'cat-live', name: 'Live Casino', items: 42, visible: true, description: 'Live dealer tables and shows', icon: 'users' },
  { id: 'cat-jackpot', name: 'Jackpot', items: 16, visible: false, description: 'Progressive jackpot games', icon: 'money' },
  { id: 'cat-crash', name: 'Crash Games', items: 9, visible: true, description: 'Fast-play and multiplier games', icon: 'zap' },
]


export function CmsCategoriesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [categories, setCategories] = useState<CmsCategory[]>(INITIAL_CMS_CATEGORIES)
  const [draftName, setDraftName] = useState('')
  const [draftIcon, setDraftIcon] = useState('sparkles')
  const [search, setSearch] = useState('')
  const move = (index: number, direction: -1 | 1) => setCategories((current) => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const toggle = (id: string) => setCategories((current) => current.map((category) => category.id === id ? { ...category, visible: !category.visible } : category))
  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = draftName.trim()
    if (!name) return
    setCategories((current) => [...current, { id: 'cat-custom-' + (current.length + 1), name, items: 0, visible: true, description: 'New custom casino collection', icon: draftIcon }])
    setDraftName('')
    setDraftIcon('sparkles')
    onNotify('Category added to the local CMS preview.')
  }
  const filtered = categories.filter((category) => (category.name + ' ' + category.description).toLowerCase().includes(search.toLowerCase()))
  return <div className="page-enter space-y-5">
    <SectionHeading title="Categories" description="Organize casino categories, control their visibility, and change display order." />
    <div className="grid gap-3 sm:grid-cols-3">
      {[{label:'Total categories',value:categories.length},{label:'Visible in lobby',value:categories.filter((item)=>item.visible).length},{label:'Games assigned',value:categories.reduce((total,item)=>total+item.items,0)}].map((metric) => <Card key={metric.label}><CardContent className="p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{metric.value}</p></CardContent></Card>)}
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Casino categories</CardTitle><CardDescription className="mt-1">The top row is displayed first. Ordering and visibility are preview-only.</CardDescription></div>
        <div className="relative w-full sm:max-w-[230px]"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search categories…" className="pl-9" /></div>
      </div>
      <div className="p-4">
        <form onSubmit={addCategory} className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><Input value={draftName} onChange={(event)=>setDraftName(event.target.value)} placeholder="New category name…" aria-label="New category name" /><label className="relative"><span className="sr-only">Choose icon for new category</span><select value={draftIcon} onChange={(event)=>setDraftIcon(event.target.value)} aria-label="Choose icon for new category" className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-ring">{CMS_CATEGORY_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><Button type="submit" disabled={!draftName.trim()}><Plus className="h-4 w-4" /> Add category</Button></form>
        <div className="space-y-2">
          {filtered.map((category) => {
            const index = categories.findIndex((item) => item.id === category.id)
            const selectedIcon = CMS_CATEGORY_ICON_OPTIONS.find((option) => option.value === category.icon) ?? CMS_CATEGORY_ICON_OPTIONS[0]
            const CategoryIcon = selectedIcon.icon
            return <div key={category.id} className={cn('flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center', category.visible ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/70')}>
              <div className="flex items-center gap-2 sm:flex-col"><button type="button" aria-label={'Move ' + category.name + ' up'} disabled={index === 0} onClick={()=>move(index,-1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={'Move ' + category.name + ' down'} disabled={index === categories.length - 1} onClick={()=>move(index,1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button></div>
              <div className="flex shrink-0 items-center gap-2"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-500 text-white"><CategoryIcon className="h-4 w-4" /></div><label className="min-w-0"><span className="sr-only">Icon for {category.name}</span><select value={category.icon} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, icon: event.target.value } : item))} aria-label={"Icon for " + category.name} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-600 outline-none focus:ring-2 focus:ring-slate-200 sm:w-32">{CMS_CATEGORY_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-slate-900">{category.name}</p><Badge variant={category.visible ? 'success' : 'outline'}>{category.visible ? 'Visible' : 'Hidden'}</Badge></div><p className="mt-1 text-[11px] text-slate-500">{category.description}</p></div>
              <div className="text-left sm:min-w-20 sm:text-right"><p className="text-sm font-bold text-slate-800">{category.items}</p><p className="text-[10px] text-slate-400">games</p></div>
              <Button size="sm" variant="outline" onClick={()=>toggle(category.id)}>{category.visible ? 'Hide category' : 'Show category'}</Button>
            </div>
          })}
          {filtered.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 py-9 text-center text-xs text-slate-400">No categories match that search.</div> : null}
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 text-[10px] text-slate-400">Category changes are local. No casino configuration has been published.</div>
    </Card>
  </div>
}
