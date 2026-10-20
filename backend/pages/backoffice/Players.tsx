import { useMemo, useState } from 'react'
import { Activity, CheckCircle2, ChevronRight, Eye, Filter, MoreHorizontal, Search, Settings, Users, X, UserPlus, Shield, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'
import type { UserRow } from '../../lib/types'

type PlayerColumn = { key: string; label: string; defaultVisible?: boolean }

const PLAYER_COLUMNS: PlayerColumn[] = [
  { key: 'login', label: 'Login', defaultVisible: true },
  { key: 'id', label: 'ID', defaultVisible: true },
  { key: 'firstName', label: 'First Name', defaultVisible: true },
  { key: 'lastName', label: 'Last Name', defaultVisible: true },
  { key: 'personalId', label: 'Personal ID', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'externalId', label: 'External ID', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'accountHolder', label: 'Account Holder' },
  { key: 'address', label: 'Address' },
  { key: 'additionalAddress', label: 'Additional Address' },
  { key: 'balance', label: 'Balance', defaultVisible: true },
  { key: 'birthCity', label: 'Birth City' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'birthDepartment', label: 'Birth Department' },
  { key: 'birthRegionCode', label: 'Birth Region Code' },
  { key: 'cashDeskId', label: 'CashDesk ID' },
  { key: 'created', label: 'Created', defaultVisible: true },
  { key: 'currency', label: 'Currency' },
  { key: 'customCategory', label: 'Custom Player Category', defaultVisible: true },
  { key: 'documentIssueDate', label: 'Document Issue Date' },
  { key: 'documentIssuedBy', label: 'Document Issued By' },
  { key: 'documentNumber', label: 'Document Number' },
  { key: 'gender', label: 'Gender' },
  { key: 'iban', label: 'IBAN' },
  { key: 'isResident', label: 'Is Resident' },
  { key: 'newsletter', label: 'Subscribed to Newsletter' },
  { key: 'isTest', label: 'Is Test' },
  { key: 'isVerified', label: 'Is Verified', defaultVisible: true },
  { key: 'language', label: 'Language' },
  { key: 'lastLogin', label: 'Last Login Date', defaultVisible: true },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'mobilePhone', label: 'Mobile Phone' },
  { key: 'phone', label: 'Phone' },
  { key: 'profileId', label: 'Profile ID' },
  { key: 'promoCode', label: 'Promo Code' },
  { key: 'province', label: 'Province' },
  { key: 'country', label: 'Country Name', defaultVisible: true },
  { key: 'registrationSource', label: 'Registration Source', defaultVisible: true },
  { key: 'registrationIp', label: 'Registration IP' },
  { key: 'clientCategory', label: 'Client Category', defaultVisible: true },
  { key: 'swiftCode', label: 'Swift Code' },
  { key: 'title', label: 'Title' },
  { key: 'zipCode', label: 'Zip Code' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'state', label: 'State' },
  { key: 'lastLoginIp', label: 'Last Login IP' },
  { key: 'lastSportBet', label: 'Sport Last Bet' },
  { key: 'lastCasinoBet', label: 'Gaming Last Bet' },
  { key: 'phoneCallSubscription', label: 'Subscribed to Phone Calls' },
  { key: 'pushSubscription', label: 'Subscribed to Push Notifications' },
  { key: 'firstDepositDate', label: 'First Deposit Date' },
  { key: 'internalMessages', label: 'Subscribed Internal Message' },
  { key: 'wrongLoginBlock', label: 'Wrong Login Block Time' },
  { key: 'wrongLoginAttempts', label: 'Wrong Login Attempts' },
  { key: 'pepStatus', label: 'PEP Status' },
  { key: 'incomeSource', label: 'Income Source' },
  { key: 'loyaltyPoints', label: 'Loyalty Points' },
  { key: 'city', label: 'City' },
  { key: 'loyaltyLevel', label: 'Loyalty Level' },
  { key: 'amlStatus', label: 'AML Status', defaultVisible: true },
  { key: 'lastDepositDate', label: 'Last Deposit Date' },
  { key: 'childId', label: 'Child ID' },
  { key: 'parentId', label: 'Parent ID' },
  { key: 'partnerFlag', label: 'Partner Flag' },
  { key: 'lastWrongLogin', label: 'Last Wrong Login Date' },
  { key: 'documentRegion', label: 'Document Region' },
]

const DEFAULT_PLAYER_COLUMNS = PLAYER_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.key)

function playerCellValue(user: UserRow, key: string): string {
  const names = user.name.split(/\s+/).filter(Boolean)
  const firstName = names[0] || '—'
  const lastName = names.slice(1).join(' ') || '—'
  const accountStatus = user.status === 'Active' ? 'Open' : 'Locked'
  const verified = user.tier === 'VIP' || user.tier === 'Gold'
  const city = user.country === 'Tunisia' ? 'Tunis' : '—'
  const masked = '••••••'
  const values: Record<string, string> = {
    login: user.email,
    id: user.id,
    firstName,
    lastName,
    personalId: '••••' + user.id.slice(-3),
    email: user.email.replace(/^(.).+(@.+)$/, '$1••••$2'),
    externalId: '—',
    status: accountStatus,
    accountHolder: '—',
    address: '—',
    additionalAddress: '—',
    balance: user.balance,
    birthCity: city,
    birthday: '—',
    birthDepartment: '—',
    birthRegionCode: '—',
    cashDeskId: '—',
    created: user.joined,
    currency: 'EUR',
    customCategory: user.tier,
    documentIssueDate: '—',
    documentIssuedBy: '—',
    documentNumber: '•••• ' + user.id.slice(-4),
    gender: '—',
    iban: '••••••••',
    isResident: user.country === 'Tunisia' ? 'Yes' : 'No',
    newsletter: 'Yes',
    isTest: 'No',
    isVerified: verified ? 'Yes' : 'No',
    language: 'en',
    lastLogin: '18 Oct 2026, 11:52',
    middleName: '—',
    mobilePhone: masked,
    phone: masked,
    profileId: '—',
    promoCode: '—',
    province: '—',
    country: user.country,
    registrationSource: 'Web',
    registrationIp: '•••.•••.•••.•••',
    clientCategory: user.tier === 'VIP' ? 'VIP Player' : user.tier === 'Gold' ? 'Gold Player' : 'Standard',
    swiftCode: '—',
    title: '—',
    zipCode: '—',
    bankName: '—',
    state: accountStatus,
    lastLoginIp: '•••.•••.•••.•••',
    lastSportBet: '—',
    lastCasinoBet: '—',
    phoneCallSubscription: 'No',
    pushSubscription: 'Yes',
    firstDepositDate: user.tier === 'Standard' ? '—' : '15 Oct 2026',
    internalMessages: 'Yes',
    wrongLoginBlock: '—',
    wrongLoginAttempts: '0',
    pepStatus: 'No',
    incomeSource: '—',
    loyaltyPoints: user.tier === 'VIP' ? '2,450' : user.tier === 'Gold' ? '860' : '120',
    city,
    loyaltyLevel: user.tier,
    amlStatus: 'Low',
    lastDepositDate: user.tier === 'Standard' ? '—' : '18 Oct 2026',
    childId: '—',
    parentId: '—',
    partnerFlag: 'No',
    lastWrongLogin: '—',
    documentRegion: '—',
  }
  return values[key] ?? '—'
}

export function PlayersPage({ users, query, onQueryChange, onAdd, onSelect, onToggleStatus }: {
  users: UserRow[]
  query: string
  onQueryChange: (value: string) => void
  onAdd: () => void
  onSelect: (user: UserRow) => void
  onToggleStatus: (id: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Locked'>('All')
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Verified' | 'Unverified'>('All')
  const [countryFilter, setCountryFilter] = useState('All countries')
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_PLAYER_COLUMNS)
  const [sortKey, setSortKey] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null)
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      const valuesMatch = !needle || PLAYER_COLUMNS.some((column) => playerCellValue(user, column.key).toLowerCase().includes(needle))
      const statusMatch = statusFilter === 'All' || playerCellValue(user, 'status') === statusFilter
      const verificationMatch = verificationFilter === 'All' || (verificationFilter === 'Verified' ? playerCellValue(user, 'isVerified') === 'Yes' : playerCellValue(user, 'isVerified') === 'No')
      const countryMatch = countryFilter === 'All countries' || user.country === countryFilter
      return valuesMatch && statusMatch && verificationMatch && countryMatch
    }).sort((a, b) => {
      const aValue = playerCellValue(a, sortKey)
      const bValue = playerCellValue(b, sortKey)
      const result = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
      return sortDirection === 'asc' ? result : -result
    })
  }, [users, query, statusFilter, verificationFilter, countryFilter, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const shownColumns = PLAYER_COLUMNS.filter((column) => visibleColumns.includes(column.key))

  function resetPlayerView() {
    onQueryChange('')
    setStatusFilter('All')
    setVerificationFilter('All')
    setCountryFilter('All countries')
    setVisibleColumns(DEFAULT_PLAYER_COLUMNS)
    setSortKey('id')
    setSortDirection('desc')
    setPageNumber(1)
    setPageSize(10)
    setColumnSettingsOpen(false)
  }

  function sortBy(columnKey: string) {
    if (sortKey === columnKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(columnKey)
      setSortDirection(columnKey === 'id' ? 'desc' : 'asc')
    }
    setPageNumber(1)
  }

  function toggleColumn(columnKey: string) {
    setVisibleColumns((current) => {
      if (current.includes(columnKey)) {
        if (current.length === 1) return current
        return current.filter((key) => key !== columnKey)
      }
      return PLAYER_COLUMNS.filter((column) => current.includes(column.key) || column.key === columnKey).map((column) => column.key)
    })
  }

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Player directory</p>
          <p className="mt-1 text-xs text-muted-foreground">Search player records, review account details, and manage status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setColumnSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /> Columns <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{visibleColumns.length}</span></Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetPlayerView}><RotateCcw className="h-4 w-4" /> Reset</Button>
        </div>
      </div>

      {columnSettingsOpen ? <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div><CardTitle>Visible columns</CardTitle><CardDescription>Choose which player fields appear in the table.</CardDescription></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setVisibleColumns(DEFAULT_PLAYER_COLUMNS)}>Default</Button><Button size="icon" variant="ghost" aria-label="Close column settings" onClick={() => setColumnSettingsOpen(false)}><X className="h-4 w-4" /></Button></div>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {PLAYER_COLUMNS.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-600 transition hover:bg-muted/60">
            <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
            <span>{column.label}</span>
          </label>)}
        </CardContent>
      </Card> : null}

      <Card className="overflow-visible shadow-none">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { onQueryChange(event.target.value); setPageNumber(1) }} placeholder="Search login, ID, email..." className="pl-9" /></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:items-center">
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPageNumber(1) }} className="h-9 min-w-[125px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="All">All statuses</option><option value="Open">Open</option><option value="Locked">Locked</option></select>
            <select aria-label="Filter by verification" value={verificationFilter} onChange={(event) => { setVerificationFilter(event.target.value as typeof verificationFilter); setPageNumber(1) }} className="h-9 min-w-[145px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="All">All verification</option><option value="Verified">Verified</option><option value="Unverified">Unverified</option></select>
            <select aria-label="Filter by country" value={countryFilter} onChange={(event) => { setCountryFilter(event.target.value); setPageNumber(1) }} className="h-9 min-w-[145px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option>All countries</option>{Array.from(new Set(users.map((user) => user.country))).sort().map((country) => <option key={country}>{country}</option>)}</select>
          </div>
        </div>

        <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1550px] border-collapse text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>{shownColumns.map((column, index) => <th key={column.key} className={cn('whitespace-nowrap border-b border-border px-4 py-3 font-medium', index === 0 && 'sticky left-0 z-[1] min-w-[230px] bg-muted/95', column.key === 'id' && 'min-w-[130px]', ['balance', 'isVerified', 'status'].includes(column.key) && 'min-w-[110px]')}>
                <button type="button" onClick={() => sortBy(column.key)} className="inline-flex items-center gap-1.5 transition hover:text-foreground">{column.label}{sortKey === column.key ? <span className="text-[9px]">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</button>
              </th>)}<th className="sticky right-0 z-[1] w-[104px] border-b border-border bg-muted/95 px-4 py-3 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((user) => <tr key={user.id} className="group transition-colors hover:bg-muted/30">
                {shownColumns.map((column, index) => {
                  const value = playerCellValue(user, column.key)
                  return <td key={column.key} className={cn('max-w-[230px] whitespace-nowrap border-b border-border/70 px-4 py-3 text-xs text-slate-600', index === 0 && 'sticky left-0 z-[1] min-w-[230px] bg-white group-hover:bg-slate-50', column.key === 'id' && 'font-mono text-[11px] text-slate-500', column.key === 'balance' && 'font-semibold tabular-nums text-slate-800')}>
                    {column.key === 'login' ? <button type="button" onClick={() => onSelect(user)} className="max-w-[205px] truncate text-left font-medium text-slate-800 hover:underline">{value}</button>
                    : column.key === 'status' ? <Badge variant={user.status === 'Active' ? 'success' : 'danger'}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{value}</Badge>
                    : column.key === 'isVerified' ? <Badge variant={value === 'Yes' ? 'success' : 'warning'}>{value}</Badge>
                    : column.key === 'customCategory' || column.key === 'clientCategory' || column.key === 'loyaltyLevel' ? <Badge variant={user.tier === 'VIP' ? 'warning' : user.tier === 'Gold' ? 'info' : 'outline'}>{value}</Badge>
                    : <span title={value} className="block max-w-[205px] truncate">{value}</span>}
                  </td>
                })}
                <td className="sticky right-0 z-[1] border-b border-border/70 bg-white px-3 py-2.5 group-hover:bg-slate-50">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={'View player ' + user.id} title="View player profile" onClick={() => onSelect(user)}><Eye className="h-4 w-4 text-slate-500" /></Button>
                    <div className="relative">
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More player actions" title="More actions" onClick={() => setActionUserId((current) => current === user.id ? null : user.id)}><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button>
                      {actionUserId === user.id ? <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-border bg-white p-1.5 shadow-lg">
                        <button type="button" onClick={() => { setHistoryUser(user); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted"><Activity className="h-3.5 w-3.5" /> Log history</button>
                        <button type="button" onClick={() => { onSelect(user); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted"><Eye className="h-3.5 w-3.5" /> View profile</button>
                        <button type="button" onClick={() => { onToggleStatus(user.id); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted">{user.status === 'Active' ? <Shield className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{user.status === 'Active' ? 'Lock account (demo)' : 'Unlock account (demo)'}</button>
                      </div> : null}
                    </div>
                  </div>
                </td>
              </tr>)}
              {pageRows.length === 0 ? <tr><td colSpan={shownColumns.length + 1} className="px-5 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-foreground">No players found</p><p className="mt-1 text-xs text-muted-foreground">Try a different search term or reset the filters.</p><Button variant="outline" size="sm" className="mt-3" onClick={resetPlayerView}>Reset filters</Button></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span> players <span className="text-slate-400">· Demo data</span></div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1) }} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
            <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronRight className="h-4 w-4 rotate-180" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-4 w-4" /></Button></div>
          </div>
        </div>
      </Card>
      <p className="text-center text-[10px] text-muted-foreground">Player records shown are fictional demonstration data. Personal identifiers and network addresses are masked in this interface preview.</p>

      <Modal open={!!historyUser} onOpenChange={(open) => { if (!open) setHistoryUser(null) }} title="Player log history" description={historyUser ? 'Sample activity for ' + historyUser.name + ' · ' + historyUser.id : undefined}>
        {historyUser ? <div className="space-y-3">
          {[{ title: 'Player record created', detail: 'Registration source: Web', time: historyUser.joined, icon: UserPlus }, { title: 'Email verification status checked', detail: playerCellValue(historyUser, 'isVerified') === 'Yes' ? 'Verified in sample record' : 'Verification pending in sample record', time: '18 Oct 2026, 11:52', icon: CheckCircle2 }, { title: 'Last login', detail: 'Device and IP details are masked in this preview', time: playerCellValue(historyUser, 'lastLogin'), icon: Eye }].map((event) => { const Icon = event.icon; return <div key={event.title} className="flex gap-3 rounded-lg border border-border p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.detail}</p><p className="mt-2 text-[10px] text-muted-foreground">{event.time}</p></div></div> }) }
          <div className="flex justify-end"><Button variant="outline" onClick={() => setHistoryUser(null)}>Close history</Button></div>
        </div> : null}
      </Modal>
    </div>
  )
}
