import { useState } from 'react'
import { ChevronRight, CreditCard, Filter, Search, Settings, RotateCcw, GripVertical } from 'lucide-react'
import { Badge, Button, Card, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'
import type { UserRow } from '../../lib/types'

type TransactionState = 'Confirmed' | 'Pending' | 'Rejected'
type TransactionRecord = {
  id: string
  playerId: string
  transactionDate: string
  createdDate: string
  type: string
  currency: string
  amount: number
  fromBuddy: string
  toBuddy: string
  modifiedDate: string
  paymentSystem: string
  note: string
  externalId: string
  state: TransactionState
  cashdesk: string
  cashDeskId: string
  paidCashDeskId: string
  clientLogin: string
  modifiedBy: string
  amountUsd: string
  playerName: string
}

type TransactionColumnKey = Exclude<keyof TransactionRecord, 'playerName'>
type TransactionColumn = { key: TransactionColumnKey; label: string; width: number }

const TRANSACTION_COLUMNS: TransactionColumn[] = [
  { key: 'id', label: 'ID', width: 150 },
  { key: 'playerId', label: 'Player ID', width: 150 },
  { key: 'transactionDate', label: 'Transaction Date', width: 165 },
  { key: 'createdDate', label: 'Created Date', width: 165 },
  { key: 'type', label: 'Type', width: 155 },
  { key: 'currency', label: 'Currency', width: 105 },
  { key: 'amount', label: 'Amount', width: 120 },
  { key: 'fromBuddy', label: 'From Buddy', width: 150 },
  { key: 'toBuddy', label: 'To Buddy', width: 150 },
  { key: 'modifiedDate', label: 'Modified Date', width: 165 },
  { key: 'paymentSystem', label: 'Payment System Name', width: 185 },
  { key: 'note', label: 'Notes', width: 205 },
  { key: 'externalId', label: 'External ID', width: 155 },
  { key: 'state', label: 'State', width: 125 },
  { key: 'cashdesk', label: 'Cashdesk', width: 150 },
  { key: 'cashDeskId', label: 'CashDesk Id', width: 140 },
  { key: 'paidCashDeskId', label: 'Paid Cash Desk', width: 150 },
  { key: 'clientLogin', label: 'Client Login', width: 225 },
  { key: 'modifiedBy', label: 'Modified By', width: 145 },
  { key: 'amountUsd', label: 'Amount In (USD)', width: 145 },
]

const TRANSACTIONS: TransactionRecord[] = [
  { id: '193807391437', playerId: '492719526', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 12:00:40', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 12:00:40', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Amine Ben Salem' },
  { id: '193808861299', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:00:45', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:00:45', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Maya Trabelsi' },
  { id: '193808881243', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:01:34', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:01:34', paymentSystem: '—', note: '—', externalId: '3268850888975', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Maya Trabelsi' },
  { id: '193808892781', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:02:04', type: 'Bet Cashout', currency: 'TND', amount: 1.29, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:02:04', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$0.43', playerName: 'Maya Trabelsi' },
  { id: '193808907428', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:02:41', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:02:41', paymentSystem: '—', note: '—', externalId: '3268850888975', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Karim Haddad' },
  { id: '193808941696', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:04:03', type: 'Bet', currency: 'TND', amount: 0.4, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:04:03', paymentSystem: '—', note: '—', externalId: '3268851514045', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.13', playerName: 'Karim Haddad' },
  { id: '193808948983', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:04:21', type: 'Increasing the winning', currency: 'TND', amount: 0.3, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:04:21', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '3268851514045', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.10', playerName: 'Karim Haddad' },
  { id: '193809429757', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:23:43', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:23:43', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Sarah Gharbi' },
  { id: '193809589536', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:29:53', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:29:53', paymentSystem: '—', note: '—', externalId: '3363950830053', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Sarah Gharbi' },
  { id: '193809678260', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:33:29', type: 'Bet', currency: 'TND', amount: 2.16, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:33:29', paymentSystem: '—', note: '—', externalId: '3363950830053', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.73', playerName: 'Sarah Gharbi' },
  { id: '193809678381', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:33:29', type: 'Increasing the winning', currency: 'TND', amount: 5.35, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:33:29', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '3363950839833', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$1.80', playerName: 'Sarah Gharbi' },
  { id: '193809716871', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:35:01', type: 'Bet', currency: 'TND', amount: 0.18, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:35:01', paymentSystem: '—', note: '—', externalId: '3363950839833', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.06', playerName: 'Sarah Gharbi' },
  { id: '193811780364', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 15:00:34', type: 'Increasing the winning', currency: 'TND', amount: 16.6, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 15:00:34', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$5.58', playerName: 'Maya Trabelsi' },
  { id: '194268439077', playerId: '492735538', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:51:01', type: 'Bet', currency: 'TND', amount: 10, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:51:01', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$3.36', playerName: 'Sarah Gharbi' },
  { id: '194268439078', playerId: '492730933', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:53:17', type: 'Withdrawal', currency: 'TND', amount: 26, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:57:23', paymentSystem: 'Bank transfer', note: '—', externalId: '3274775554825', state: 'Pending', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'admin.demo', amountUsd: '$8.74', playerName: 'Maya Trabelsi' },
  { id: '194268439079', playerId: '492719526', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:56:36', type: 'Deposit', currency: 'TND', amount: 40, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:56:36', paymentSystem: 'Visa •••• 4821', note: 'Card deposit · demo', externalId: '3274775068875', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'system', amountUsd: '$13.44', playerName: 'Amine Ben Salem' },
  { id: '194268439080', playerId: '492730933', transactionDate: '10-10-2026 00:00:00', createdDate: '10-10-2026 16:48:13', type: 'Bet', currency: 'TND', amount: 4.23, fromBuddy: '—', toBuddy: '—', modifiedDate: '10-10-2026 16:48:13', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$1.42', playerName: 'Maya Trabelsi' },
  { id: '194268439081', playerId: '492719526', transactionDate: '10-10-2026 00:00:00', createdDate: '10-10-2026 16:55:03', type: 'Refund', currency: 'TND', amount: 12, fromBuddy: '—', toBuddy: '—', modifiedDate: '10-10-2026 16:55:03', paymentSystem: 'Visa •••• 4821', note: 'Refund · demo', externalId: '—', state: 'Rejected', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'admin.demo', amountUsd: '$4.03', playerName: 'Amine Ben Salem' },
]


export function TransactionsPage({ query, onQueryChange, users, onNotify, onSelectPlayer }: {
  query: string
  onQueryChange: (value: string) => void
  users: UserRow[]
  onNotify: (message: string) => void
  onSelectPlayer: (player: UserRow) => void
}) {
  const [columnOrder, setColumnOrder] = useState<TransactionColumnKey[]>(TRANSACTION_COLUMNS.map((column) => column.key))
  const [visibleColumns, setVisibleColumns] = useState<TransactionColumnKey[]>(TRANSACTION_COLUMNS.map((column) => column.key))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All types')
  const [stateFilter, setStateFilter] = useState('All states')
  const [methodFilter, setMethodFilter] = useState('All methods')
  const [pageSize, setPageSize] = useState(20)
  const [pageNumber, setPageNumber] = useState(1)
  const [sortKey, setSortKey] = useState<TransactionColumnKey>('createdDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [draggedColumn, setDraggedColumn] = useState<TransactionColumnKey | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)

  const orderedColumns = columnOrder.map((key) => TRANSACTION_COLUMNS.find((column) => column.key === key)).filter((column): column is TransactionColumn => Boolean(column))
  const shownColumns = orderedColumns.filter((column) => visibleColumns.includes(column.key))
  const typeOptions = ['All types', ...Array.from(new Set(TRANSACTIONS.map((transaction) => transaction.type)))]
  const methodOptions = ['All methods', ...Array.from(new Set(TRANSACTIONS.map((transaction) => transaction.paymentSystem).filter((method) => method !== '—')))]
  const filtered = TRANSACTIONS.filter((transaction) => {
    const text = Object.values(transaction).join(' ').toLowerCase()
    return text.includes(query.toLowerCase())
      && (typeFilter === 'All types' || transaction.type === typeFilter)
      && (stateFilter === 'All states' || transaction.state === stateFilter)
      && (methodFilter === 'All methods' || transaction.paymentSystem === methodFilter)
  }).sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const compare = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection === 'asc' ? compare : -compare
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const tableWidth = shownColumns.reduce((total, column) => total + column.width, 0)

  const resetView = () => {
    setColumnOrder(TRANSACTION_COLUMNS.map((column) => column.key))
    setVisibleColumns(TRANSACTION_COLUMNS.map((column) => column.key))
    setSettingsOpen(false)
    onQueryChange('')
    setTypeFilter('All types')
    setStateFilter('All states')
    setMethodFilter('All methods')
    setPageSize(20)
    setPageNumber(1)
    setSortKey('createdDate')
    setSortDirection('desc')
    onNotify('Transaction table layout and filters reset.')
  }
  const sortBy = (key: TransactionColumnKey) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
    setPageNumber(1)
  }
  const moveColumn = (targetKey: TransactionColumnKey) => {
    if (!draggedColumn || draggedColumn === targetKey) return
    setColumnOrder((current) => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(targetKey)
      if (from < 0 || to < 0) return current
      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }
  const valueFor = (transaction: TransactionRecord, key: TransactionColumnKey) => {
    const value = transaction[key]
    if (key === 'amount') return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return String(value || '—')
  }

  return <div className="page-enter min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex min-h-[58px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"><CreditCard className="h-4 w-4" /></span>
        <h2 className="truncate text-sm font-semibold text-slate-900">Transactions</h2>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">{filtered.length}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Table settings" title="Show or hide columns" onClick={() => setSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /></Button>
          {settingsOpen ? <div className="absolute right-0 top-10 z-30 w-[min(310px,calc(100vw-2.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-xs font-semibold text-slate-900">Table settings</p><p className="mt-1 text-[10px] text-slate-500">Choose the columns to show.</p></div><button type="button" onClick={() => setVisibleColumns(TRANSACTION_COLUMNS.map((column) => column.key))} className="text-[10px] font-semibold text-slate-600 hover:text-slate-950">Show all</button></div>
            <div className="admin-scrollbar grid max-h-[320px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto py-1">
              {TRANSACTION_COLUMNS.map((column) => <label key={column.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900" /><span className="truncate" title={column.label}>{column.label}</span></label>)}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag column headings to reorder them.</div>
          </div> : null}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Reset table" title="Reset table layout and filters" onClick={resetView}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>

    <div className="table-holder">
      <div className="flex flex-col gap-2.5 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="relative w-full sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search transactions" value={query} onChange={(event) => { onQueryChange(event.target.value); setPageNumber(1) }} placeholder="Search transactions…" className="h-9 rounded-md border-slate-200 bg-white pl-9 text-xs placeholder:text-slate-400 focus:bg-white" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><Filter className="h-3.5 w-3.5" /><select aria-label="Filter by transaction type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPageNumber(1) }} className="max-w-[145px] bg-transparent text-xs text-slate-800 outline-none">{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><select aria-label="Filter by state" value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPageNumber(1) }} className="max-w-[125px] bg-transparent text-xs text-slate-800 outline-none">{['All states', 'Confirmed', 'Pending', 'Rejected'].map((state) => <option key={state}>{state}</option>)}</select></label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><CreditCard className="h-3.5 w-3.5" /><select aria-label="Filter by payment system" value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setPageNumber(1) }} className="max-w-[150px] bg-transparent text-xs text-slate-800 outline-none">{methodOptions.map((method) => <option key={method}>{method}</option>)}</select></label>
        </div>
      </div>

      <div className="admin-scrollbar overflow-auto bg-white" style={{ height: 'min(72vh, 900px)', minHeight: '400px' }} onClick={() => { if (settingsOpen) setSettingsOpen(false) }}>
        <table className="border-separate border-spacing-0 text-left" style={{ minWidth: tableWidth }}>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {shownColumns.map((column) => <th key={column.key} draggable onDragStart={() => setDraggedColumn(column.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(column.key)} onDragEnd={() => setDraggedColumn(null)} style={{ width: column.width, minWidth: column.width }} className={cn('group/th h-10 border-b border-r border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-600 last:border-r-0', draggedColumn === column.key && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover/th:opacity-100" />
                  <button type="button" onClick={() => sortBy(column.key)} className="inline-flex min-w-0 items-center gap-1.5 text-left hover:text-slate-950"><span className="truncate">{column.label}</span><span className="text-[9px] text-slate-300">{sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></button>
                </div>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((transaction, rowIndex) => <tr key={transaction.id} className={cn('group/row transition-colors hover:bg-slate-50', rowIndex % 2 === 1 && 'bg-slate-50/40')}>
              {shownColumns.map((column) => {
                const value = valueFor(transaction, column.key)
                const isAmount = column.key === 'amount'
                const isState = column.key === 'state'
                const isPlayerLogin = column.key === 'clientLogin'
                const isPlayerId = column.key === 'playerId'
                return <td key={column.key} style={{ width: column.width, minWidth: column.width }} className={cn('h-[43px] max-w-[240px] border-b border-slate-100 px-3 text-xs text-slate-600', isAmount && 'font-medium tabular-nums text-slate-950', isPlayerId && 'font-mono text-[11px]')}>
                  {isState ? <Badge variant={transaction.state === 'Confirmed' ? 'success' : transaction.state === 'Pending' ? 'warning' : 'danger'}><span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full bg-current', transaction.state === 'Pending' && 'animate-pulse')} />{transaction.state}</Badge>
                    : isPlayerId || isPlayerLogin ? <button type="button" onClick={() => { const player = users.find((user) => user.email === transaction.clientLogin || user.name === transaction.playerName); if (player) onSelectPlayer(player); else onNotify('No matching demo player was found.') }} className="max-w-[215px] truncate text-left text-slate-700 decoration-slate-300 underline-offset-2 hover:text-slate-950 hover:underline">{value}</button>
                      : <span title={value} className="block max-w-[240px] truncate" >{value}</span>}
                </td>
              })}
            </tr>)}
            {pageRows.length === 0 ? <tr><td colSpan={shownColumns.length} className="px-5 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Search className="h-4 w-4" /></div><p className="mt-3 text-sm font-medium text-slate-800">No transactions found</p><p className="mt-1 text-xs text-slate-500">Change your search or reset the table filters.</p><Button variant="outline" size="sm" className="mt-3" onClick={resetView}>Reset filters</Button></td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-slate-500">Showing <span className="font-medium text-slate-900">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-medium text-slate-900">{filtered.length}</span> transactions <span className="text-slate-400">· Demo data</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-slate-500">Rows per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1) }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-slate-400"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
          <span className="text-[11px] text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronRight className="h-3.5 w-3.5 rotate-180" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button></div>
        </div>
      </div>
    </div>
    <p className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">Transaction records are fictional preview data. No payment, wallet, or account operations are connected.</p>

    <Modal open={!!selectedTransaction} onOpenChange={(open) => { if (!open) setSelectedTransaction(null) }} title={selectedTransaction ? 'Transaction ' + selectedTransaction.id : 'Transaction details'} description={selectedTransaction ? selectedTransaction.type + ' · ' + selectedTransaction.playerName : undefined}>
      {selectedTransaction ? <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">{[
          ['Transaction ID', selectedTransaction.id], ['Player ID', selectedTransaction.playerId], ['Amount', selectedTransaction.amount + ' ' + selectedTransaction.currency], ['State', selectedTransaction.state], ['Created date', selectedTransaction.createdDate], ['Payment system', selectedTransaction.paymentSystem], ['External ID', selectedTransaction.externalId], ['Modified by', selectedTransaction.modifiedBy],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{value}</p></div>)}</div>
        <div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button></div>
      </div> : null}
    </Modal>
  </div>
}
