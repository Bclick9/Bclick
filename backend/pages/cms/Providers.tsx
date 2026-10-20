import { useState } from 'react'
import { BadgePercent, Search, Play, RotateCcw, GripVertical } from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import { cn } from '../../lib/utils'

type CmsProvider = { id: string; name: string; providerCode: string; badge: boolean }
const INITIAL_CMS_PROVIDERS: CmsProvider[] = [
  { id: 'PRV-001', name: 'Evolution', providerCode: 'EVO', badge: false },
  { id: 'PRV-002', name: 'Pragmatic Play', providerCode: 'TPG', badge: false },
  { id: 'PRV-003', name: 'Play’n GO', providerCode: 'PNG', badge: false },
  { id: 'PRV-004', name: 'Demo Studio', providerCode: 'DEM', badge: false },
  { id: 'PRV-005', name: 'NetEnt', providerCode: 'NET', badge: false },
]

type ProviderSortKey = 'name' | 'id' | 'providerCode'
export function CmsProvidersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [providers, setProviders] = useState<CmsProvider[]>(INITIAL_CMS_PROVIDERS)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ProviderSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null)

  const filteredProviders = providers.filter((item) => (item.name + ' ' + item.id + ' ' + item.providerCode).toLowerCase().includes(search.toLowerCase()))
  const shown = sortKey
    ? [...filteredProviders].sort((left, right) => {
        const compare = left[sortKey].localeCompare(right[sortKey], undefined, { numeric: true, sensitivity: 'base' })
        return sortDirection === 'asc' ? compare : -compare
      })
    : filteredProviders

  const sortBy = (key: ProviderSortKey) => {
    if (sortKey === key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }
  const reorderProvider = (targetId: string, movingId: string) => {
    if (targetId === movingId) return
    setProviders((current) => {
      const next = [...current]
      const from = next.findIndex((item) => item.id === movingId)
      const to = next.findIndex((item) => item.id === targetId)
      if (from < 0 || to < 0) return current
      const [moving] = next.splice(from, 1)
      if (!moving) return current
      next.splice(to, 0, moving)
      return next
    })
    setSortKey(null)
    setSortDirection('asc')
    onNotify('Provider order updated in this local preview.')
  }
  const toggleBadge = (id: string) => {
    setProviders((current) => current.map((item) => item.id === id ? { ...item, badge: !item.badge } : item))
    onNotify('Provider badge updated in this local preview.')
  }
  const resetTable = () => {
    setProviders(INITIAL_CMS_PROVIDERS)
    setSearch('')
    setSortKey(null)
    setSortDirection('asc')
    onNotify('Provider table reset.')
  }

  const sortButton = (key: ProviderSortKey, label: string) => (
    <button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1.5 text-left hover:text-slate-900">
      <span>{label}</span>
      <span className="text-[10px] text-slate-300">{sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return <div className="page-enter min-w-0 w-full space-y-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none lg:w-1/2">
    <div className="flex min-h-[54px] items-center border-b border-slate-200 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">Providers</h2>
    </div>

    <div className="border-b border-slate-200 p-3 sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search providers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" autoComplete="off" className="h-9 rounded-md border-slate-200 bg-white pl-9 text-xs placeholder:text-slate-400 focus:bg-white" />
        </div>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-md" aria-label="Reset provider table" title="Reset table" onClick={resetTable}><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>
    </div>

    <div className="admin-scrollbar w-full overflow-auto">
      <table className="w-full min-w-[540px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="w-[38%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('name', 'Provider Title')}</th>
            <th className="w-[24%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('id', 'id')}</th>
            <th className="w-[20%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('providerCode', 'Provider')}</th>
            <th className="w-[18%] border-b border-slate-200 bg-white px-3 py-3 text-right text-[11px] font-medium text-slate-600">Tools</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((item, index) => <tr
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', item.id)
              event.dataTransfer.effectAllowed = 'move'
              setDraggedProviderId(item.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const movingId = event.dataTransfer.getData('text/plain') || draggedProviderId
              if (movingId) reorderProvider(item.id, movingId)
              setDraggedProviderId(null)
            }}
            onDragEnd={() => setDraggedProviderId(null)}
            className={cn('group/provider-row cursor-grab transition-colors hover:bg-slate-50 active:cursor-grabbing', index % 2 === 1 && 'bg-slate-50/40', draggedProviderId === item.id && 'opacity-40')}
          >
            <td className="border-b border-slate-100 px-3 py-3 text-xs">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/provider-row:opacity-100" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.badge ? <Badge variant="success">Featured</Badge> : null}
                  </div>
                </div>
              </div>
            </td>
            <td className="border-b border-slate-100 px-3 py-3 font-mono text-[10px] text-slate-500">{item.id}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-xs text-slate-600">{item.providerCode}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-right">
              <Button type="button" variant="ghost" size="icon" className={cn('h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900', item.badge && 'text-emerald-700')} aria-label={'Change badge for ' + item.name} title="Change Badge" onClick={() => toggleBadge(item.id)}><BadgePercent className="h-4 w-4" /></Button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {shown.length === 0 ? <div className="border-b border-slate-100 px-4 py-10 text-center text-xs text-slate-400">No providers match your search.</div> : null}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
      <span>{shown.length} providers</span>
      <span>Drag rows to reorder</span>
    </div>
  </div>
}
