import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgePercent, Bell, CalendarDays,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, CreditCard, Download,
  Eye, FileText, Filter, Gamepad2, Gift, Globe, LayoutDashboard, LifeBuoy, LogOut,
  Menu, MoreHorizontal, Plus, Search, Settings, ShieldCheck,
  Sparkles, TrendingUp, Users, Wallet, X, Zap, UserPlus, CircleDollarSign,
  Shield, Check, Pause, Play, Pencil, Trophy, RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from './components/ui'
import { cn } from './lib/utils'

type PageKey = 'overview' | 'users' | 'promotions' | 'bonuses' | 'games' | 'transactions' | 'reports' | 'settings'
type Status = 'Active' | 'Paused' | 'Scheduled' | 'Suspended' | 'Completed' | 'Pending' | 'Failed'
type UserRow = { id: string; name: string; email: string; country: string; joined: string; balance: string; status: 'Active' | 'Suspended'; tier: 'VIP' | 'Gold' | 'Standard' }
type Offer = { id: string; name: string; description: string; channel: 'Casino' | 'Sports' | 'Both'; reward: string; claims: string; ends: string; status: 'Active' | 'Paused' | 'Scheduled' }
type GameRow = { id: string; title: string; provider: string; category: string; rtp: string; players: string; status: 'Active' | 'Paused' }

const NAV_GROUPS: { title: string; items: { page: PageKey; label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'WORKSPACE', items: [
    { page: 'overview', label: 'Overview', icon: LayoutDashboard },
    { page: 'users', label: 'Players', icon: Users, count: '2.4k' },
    { page: 'promotions', label: 'Promotions', icon: BadgePercent },
    { page: 'bonuses', label: 'Bonuses', icon: Gift },
  ] },
  { title: 'OPERATIONS', items: [
    { page: 'games', label: 'Casino games', icon: Gamepad2 },
    { page: 'transactions', label: 'Transactions', icon: CreditCard },
    { page: 'reports', label: 'Reports & analytics', icon: TrendingUp },
  ] },
  { title: 'SYSTEM', items: [
    { page: 'settings', label: 'Settings', icon: Settings },
  ] },
]

const PAGE_INFO: Record<PageKey, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Here’s what’s happening across your platform today.' },
  users: { title: 'Players', description: 'Manage player records, account status, verification, and profile activity.' },
  promotions: { title: 'Promotions', description: 'Create campaigns and track engagement across channels.' },
  bonuses: { title: 'Bonuses', description: 'Manage bonus offers, wagering requirements, and eligibility.' },
  games: { title: 'Casino games', description: 'Review your game catalogue and availability.' },
  transactions: { title: 'Transactions', description: 'Browse demo deposits, withdrawals, and wallet activity.' },
  reports: { title: 'Reports & analytics', description: 'Explore platform performance and engagement trends.' },
  settings: { title: 'Settings', description: 'Preview workspace preferences and admin controls.' },
}

const INITIAL_USERS: UserRow[] = [
  { id: 'BC-020481', name: 'Amine Ben Salem', email: 'amine.bensalem@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€245.80', status: 'Active', tier: 'VIP' },
  { id: 'BC-020480', name: 'Maya Trabelsi', email: 'maya.trabelsi@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€82.10', status: 'Active', tier: 'Gold' },
  { id: 'BC-020479', name: 'Youssef Mansour', email: 'y.mansour@example.com', country: 'France', joined: 'Oct 16, 2026', balance: '€0.00', status: 'Active', tier: 'Standard' },
  { id: 'BC-020478', name: 'Sarah Gharbi', email: 'sarah.gharbi@example.com', country: 'Tunisia', joined: 'Oct 16, 2026', balance: '€1,250.00', status: 'Active', tier: 'VIP' },
  { id: 'BC-020477', name: 'Karim Haddad', email: 'karim.haddad@example.com', country: 'Italy', joined: 'Oct 15, 2026', balance: '€31.45', status: 'Suspended', tier: 'Standard' },
  { id: 'BC-020476', name: 'Ines Jaziri', email: 'ines.jaziri@example.com', country: 'Tunisia', joined: 'Oct 15, 2026', balance: '€416.25', status: 'Active', tier: 'Gold' },
  { id: 'BC-020475', name: 'Adam Kallel', email: 'adam.kallel@example.com', country: 'Germany', joined: 'Oct 14, 2026', balance: '€96.30', status: 'Active', tier: 'Standard' },
]

const INITIAL_PROMOTIONS: Offer[] = [
  { id: 'PR-0108', name: 'Weekend Reload', description: 'A little extra for the weekend.', channel: 'Casino', reward: '50% up to €100', claims: '1,284', ends: 'Oct 25, 2026', status: 'Active' },
  { id: 'PR-0107', name: 'Matchday Boost', description: 'Boost selected sports accumulators.', channel: 'Sports', reward: 'Odds boost +20%', claims: '842', ends: 'Oct 22, 2026', status: 'Active' },
  { id: 'PR-0106', name: 'Welcome to Bclick', description: 'The first-deposit welcome campaign.', channel: 'Both', reward: '100% up to €200', claims: '3,206', ends: 'Nov 30, 2026', status: 'Active' },
  { id: 'PR-0105', name: 'Midweek Spins', description: 'Free spins for eligible slot play.', channel: 'Casino', reward: '25 free spins', claims: '536', ends: 'Oct 20, 2026', status: 'Scheduled' },
  { id: 'PR-0104', name: 'Super Sunday', description: 'A special sports reward for Sunday.', channel: 'Sports', reward: '€10 free bet', claims: '1,096', ends: 'Oct 12, 2026', status: 'Paused' },
]

const INITIAL_BONUSES: Offer[] = [
  { id: 'BN-0234', name: 'Casino Welcome Bonus', description: 'New player deposit match.', channel: 'Casino', reward: '100% up to €200', claims: '1,742', ends: 'Nov 30, 2026', status: 'Active' },
  { id: 'BN-0233', name: 'Sports Free Bet', description: 'A free bet after qualifying activity.', channel: 'Sports', reward: '€10 free bet', claims: '984', ends: 'Nov 15, 2026', status: 'Active' },
  { id: 'BN-0232', name: 'High Roller Reload', description: 'A reload reward for VIP segments.', channel: 'Both', reward: '25% up to €500', claims: '128', ends: 'Oct 31, 2026', status: 'Paused' },
  { id: 'BN-0231', name: 'Friday Free Spins', description: 'Free spins on selected slot titles.', channel: 'Casino', reward: '40 free spins', claims: '712', ends: 'Oct 23, 2026', status: 'Scheduled' },
]

const INITIAL_GAMES: GameRow[] = [
  { id: 'GM-001', title: 'Zeus vs Hades', provider: 'Demo Studio', category: 'Slots', rtp: '96.40%', players: '1,248', status: 'Active' },
  { id: 'GM-002', title: 'Wild Clusters', provider: 'Play’n GO', category: 'Slots', rtp: '96.10%', players: '982', status: 'Active' },
  { id: 'GM-003', title: 'Roulette Royale', provider: 'Evolution', category: 'Live casino', rtp: '97.30%', players: '764', status: 'Active' },
  { id: 'GM-004', title: 'Lightning Blackjack', provider: 'Evolution', category: 'Live casino', rtp: '99.10%', players: '538', status: 'Active' },
  { id: 'GM-005', title: 'Rocket Rush', provider: 'Demo Studio', category: 'Crash', rtp: '97.00%', players: '1,105', status: 'Paused' },
  { id: 'GM-006', title: 'Golden Pharaoh', provider: 'Pragmatic Play', category: 'Slots', rtp: '96.50%', players: '416', status: 'Active' },
]

const TRANSACTIONS = [
  { id: 'TX-1048251', user: 'Amine Ben Salem', type: 'Deposit', method: 'Visa •••• 4821', date: '19 Oct, 10:42', amount: '+€100.00', status: 'Completed' as Status },
  { id: 'TX-1048250', user: 'Sarah Gharbi', type: 'Withdrawal', method: 'Bank transfer', date: '19 Oct, 10:31', amount: '−€250.00', status: 'Pending' as Status },
  { id: 'TX-1048249', user: 'Maya Trabelsi', type: 'Deposit', method: 'PayPal', date: '19 Oct, 10:12', amount: '+€50.00', status: 'Completed' as Status },
  { id: 'TX-1048248', user: 'Karim Haddad', type: 'Withdrawal', method: 'Bank transfer', date: '19 Oct, 09:58', amount: '−€75.00', status: 'Failed' as Status },
  { id: 'TX-1048247', user: 'Ines Jaziri', type: 'Deposit', method: 'Apple Pay', date: '19 Oct, 09:44', amount: '+€30.00', status: 'Completed' as Status },
  { id: 'TX-1048246', user: 'Youssef Mansour', type: 'Deposit', method: 'Visa •••• 1290', date: '19 Oct, 09:23', amount: '+€20.00', status: 'Completed' as Status },
]

const ACTIVITY = [
  { name: 'Amine Ben Salem', action: 'made a deposit', detail: '€100.00 · Visa', time: '2 min ago', icon: Wallet, tone: 'bg-emerald-50 text-emerald-700' },
  { name: 'Weekend Reload', action: 'promotion was claimed', detail: 'Casino · 50% bonus', time: '8 min ago', icon: Gift, tone: 'bg-amber-50 text-amber-700' },
  { name: 'Sarah Gharbi', action: 'requested a withdrawal', detail: '€250.00 · Bank transfer', time: '14 min ago', icon: CreditCard, tone: 'bg-sky-50 text-sky-700' },
  { name: 'Youssef Mansour', action: 'created an account', detail: 'Email verified', time: '21 min ago', icon: UserPlus, tone: 'bg-violet-50 text-violet-700' },
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Active' || status === 'Completed' ? 'success'
    : status === 'Scheduled' || status === 'Pending' ? 'warning'
      : status === 'Failed' || status === 'Suspended' ? 'danger'
        : status === 'Paused' ? 'secondary' : 'outline'
  return <Badge variant={variant}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80" />{status}</Badge>
}

function Avatar({ name, tone = 'bg-amber-100 text-amber-800', size = 'md' }: { name: string; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'
  return <div className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white', dimensions, tone)}>{initials(name)}</div>
}

function SectionHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function MetricCard({ title, value, change, note, icon: Icon, accent = 'amber' }: { title: string; value: string; change: string; note: string; icon: LucideIcon; accent?: 'amber' | 'blue' | 'green' | 'violet' }) {
  const color = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }[accent]
  return (
    <Card className="min-w-0 transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{title}</p>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{value}</p>
          </div>
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}><Icon className="h-[18px] w-[18px]" /></span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center text-[11px] font-bold', change.startsWith('−') ? 'text-rose-600' : 'text-emerald-600')}>{change.startsWith('−') ? <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" /> : <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />}{change}</span>
          <span className="text-[11px] text-slate-400">{note}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceChart({ compact = false }: { compact?: boolean }) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" /> Revenue</span>
        <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500" /> Deposits</span>
        <span className="ml-auto text-[11px] text-slate-400">Last 7 days</span>
      </div>
      <div className={cn('w-full', compact ? 'h-44' : 'h-[230px]')}>
        <svg className="h-full w-full" viewBox="0 0 740 230" role="img" aria-label="Revenue and deposits line chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f5c542" stopOpacity=".22" /><stop offset="100%" stopColor="#f5c542" stopOpacity="0" /></linearGradient>
            <linearGradient id="deposit-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f7fe8" stopOpacity=".12" /><stop offset="100%" stopColor="#4f7fe8" stopOpacity="0" /></linearGradient>
          </defs>
          <g className="chart-grid">
            {[28, 68, 108, 148, 188].map((y) => <line key={y} x1="24" x2="724" y1={y} y2={y} />)}
          </g>
          <path d="M24 155 C60 150 75 126 124 132 S190 153 224 112 S300 88 324 106 S390 127 424 88 S495 72 524 92 S590 57 624 66 S688 28 724 42 L724 202 L24 202 Z" fill="url(#revenue-area)" />
          <path d="M24 155 C60 150 75 126 124 132 S190 153 224 112 S300 88 324 106 S390 127 424 88 S495 72 524 92 S590 57 624 66 S688 28 724 42" fill="none" stroke="#e9af17" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 172 C56 165 83 176 124 158 S188 141 224 151 S287 126 324 139 S391 110 424 122 S493 104 524 119 S585 94 624 111 S687 72 724 90 L724 202 L24 202 Z" fill="url(#deposit-area)" />
          <path d="M24 172 C56 165 83 176 124 158 S188 141 224 151 S287 126 324 139 S391 110 424 122 S493 104 524 119 S585 94 624 111 S687 72 724 90" fill="none" stroke="#4f7fe8" strokeWidth="2.5" strokeLinecap="round" />
          {[24, 124, 224, 324, 424, 524, 624, 724].map((x) => <circle key={x} cx={x} cy={x === 24 ? 155 : x === 124 ? 132 : x === 224 ? 112 : x === 324 ? 106 : x === 424 ? 88 : x === 524 ? 92 : x === 624 ? 66 : 42} r="3.5" fill="#fff" stroke="#e9af17" strokeWidth="2" />)}
        </svg>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </div>
  )
}

type ReportRow = { label: string; values: string[] }

function ReportTable({ title, description, columns, rows }: { title: string; description?: string; columns: string[]; rows: ReportRow[] }) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className="admin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[470px] text-left text-sm">
          <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-[38%] px-4 py-3 font-medium sm:px-5">Metric</th>
              {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 text-right font-medium last:pr-5">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => <tr key={row.label} className="transition-colors hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-foreground sm:px-5">{row.label}</td>
              {row.values.map((value, index) => <td key={row.label + index} className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground last:pr-5">{value}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function OverviewPage() {
  const [period, setPeriod] = useState('Yesterday')
  const [customOpen, setCustomOpen] = useState(false)
  const [startDate, setStartDate] = useState('2026-10-18')
  const [endDate, setEndDate] = useState('2026-10-18')
  const [pokerTab, setPokerTab] = useState<'Poker Overview' | 'Skill Games Overview'>('Poker Overview')
  const periods = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'LMTD']
  const formatDate = (value: string) => value ? value.split('-').reverse().join('/') : 'Select date'
  const dateRange = period === 'Custom'
    ? formatDate(startDate) + ' — ' + formatDate(endDate)
    : period === 'Today'
      ? '19/10/2026 — 19/10/2026'
      : period === 'Yesterday'
        ? '18/10/2026 — 18/10/2026'
        : period === 'This Week'
          ? '19/10/2026 — 25/10/2026'
          : period === 'Last Week'
            ? '12/10/2026 — 18/10/2026'
            : period === 'This Month'
              ? '01/10/2026 — 19/10/2026'
              : period === 'Last Month'
                ? '01/09/2026 — 30/09/2026'
                : '01/10/2026 — 18/10/2026'

  const metrics: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: 'Total of Deposits', value: '$0.00', icon: Wallet, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Total of Withdrawals', value: '$0.00', icon: ArrowUpRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Logged In', value: '0', icon: Users, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Total login count', value: '0', icon: Activity, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Registered', value: '0', icon: UserPlus, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Balance', value: '$(1.00)', icon: CircleDollarSign, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Profit', value: '$0.00', icon: TrendingUp, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Making Deposit', value: '0', icon: Wallet, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Making Withdrawals', value: '0', icon: ArrowDownRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Bonus Balance', value: '$(1.00)', icon: Gift, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Correction Up', value: '$0.00', icon: ArrowUpRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Correction Down', value: '$0.00', icon: ArrowDownRight, tone: 'text-slate-700 bg-slate-100' },
  ]

  const sportsbookRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Open Bets', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'GGR', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Profitability', values: ['0%', '0%', '0%'] },
    { label: 'Number of Bets', values: ['0', '0', '0'] },
    { label: 'Average Bet', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Bet Per Player', values: ['0', '0', '0'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]
  const casinoRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'GGR', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Profitability', values: ['0%', '0%', '0%'] },
    { label: 'Average Bet', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]
  const pokerRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Win/Lost', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Rake', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]

  return (
    <div className="page-enter space-y-5">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <span>Reporting period</span>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="text-xs font-normal tabular-nums text-slate-500">{dateRange}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {periods.map((item) => <Button key={item} type="button" size="sm" variant={period === item ? 'default' : 'outline'} className="h-8 px-3 text-xs" onClick={() => { setPeriod(item); setCustomOpen(false) }}>{item}</Button>)}
            <Button type="button" size="sm" variant={period === 'Custom' ? 'default' : 'outline'} className="h-8 px-3 text-xs" onClick={() => { setPeriod('Custom'); setCustomOpen((open) => !open) }}><CalendarDays className="h-3.5 w-3.5" /> Custom</Button>
          </div>
        </CardContent>
        {customOpen ? <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-end">
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">Start date<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">End date<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <Button size="default" onClick={() => { setPeriod('Custom'); setCustomOpen(false) }}>Apply range</Button>
        </div> : null}
      </Card>

      <section aria-label="Financial and player metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return <Card key={metric.label} className="min-w-0 shadow-none transition-colors hover:bg-muted/20">
            <CardContent className="flex items-start gap-3.5 p-4">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', metric.tone)}><Icon className="h-[17px] w-[17px]" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="mt-2 font-display text-[25px] font-bold leading-none tracking-tight tabular-nums text-foreground">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        })}
      </section>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
          <div><CardTitle>Profit</CardTitle><CardDescription>Breakdown across products for the selected period.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-3.5 w-3.5" /> Export</Button>
        </CardHeader>
        <CardContent className="grid gap-px bg-border p-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Bet Sport', value: '$0.00' },
            { label: 'Win Sport', value: '$0.00' },
            { label: 'Bet Casino', value: '$0.00' },
            { label: 'Win Casino', value: '$0.00' },
            { label: 'Rake', value: '$0.00' },
            { label: 'Bonus', value: '$0.00' },
            { label: 'Tournament Cost', value: '$0.00' },
          ].map((item) => <div key={item.label} className="min-w-0 bg-white px-4 py-4"><p className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</p><p className="mt-2 font-display text-lg font-semibold tabular-nums text-foreground">{item.value}</p></div>)}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
        <ReportTable title="Sportsbook Overview" description="Pre-match and live sportsbook performance." columns={['Pre-Match', 'Live', 'Total']} rows={sportsbookRows} />
        <ReportTable title="Casino Overview" description="Live casino and RNG performance." columns={['Live', 'RNG', 'Total']} rows={casinoRows} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div><CardTitle>{pokerTab}</CardTitle><CardDescription>Poker and skill games activity for the selected period.</CardDescription></div>
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            {(['Poker Overview', 'Skill Games Overview'] as const).map((tab) => <button key={tab} type="button" onClick={() => setPokerTab(tab)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', pokerTab === tab ? 'bg-white text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}>{tab}</button>)}
          </div>
        </CardHeader>
        {pokerTab === 'Poker Overview' ? <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[470px] text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-medium sm:px-5">Metric</th><th className="px-3 py-3 text-right font-medium">Cash</th><th className="px-3 py-3 text-right font-medium">Tournament</th><th className="px-5 py-3 text-right font-medium">Total</th></tr></thead>
            <tbody className="divide-y divide-border">{pokerRows.map((row) => <tr key={row.label} className="hover:bg-muted/30"><td className="px-4 py-3 text-xs font-medium sm:px-5">{row.label}</td>{row.values.map((value, i) => <td key={row.label + i} className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground last:pr-5">{value}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-6 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Gamepad2 className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No data to display</p><p className="text-xs text-muted-foreground">No Skill Games Overview values were present in the supplied dashboard capture.</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5"><span className="text-xs font-medium text-muted-foreground">Hourly Rake</span><span className="text-xs text-muted-foreground">No data to display</span></div>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5"><CardTitle>Bonus Overview</CardTitle><CardDescription>Bonus awarded and cost metrics for the selected period.</CardDescription></CardHeader>
        <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><tr>{['Type', 'Product', 'Awarded', 'Number of Players', 'Deposit', 'Cost', 'Converted Bonus'].map((col) => <th key={col} className="whitespace-nowrap px-4 py-3 font-medium first:pl-5 last:pr-5">{col}</th>)}</tr></thead>
            <tbody><tr><td colSpan={7} className="px-5 py-12"><div className="flex flex-col items-center justify-center gap-2 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Gift className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No Result</p><p className="text-xs text-muted-foreground">There are no bonus records for this reporting period.</p></div></td></tr></tbody>
          </table>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
        {[
          { title: 'Top 5 Sports', description: 'Sports performance ranked by profit.', icon: Trophy, columns: ['Sport', 'Bet', 'Win', 'Profit'] },
          { title: 'Top 5 Games', description: 'Casino game performance ranked by profit.', icon: Gamepad2, columns: ['Game', 'Bet', 'Win', 'Profit'] },
        ].map((report) => {
          const Icon = report.icon
          return <Card key={report.title} className="shadow-none">
            <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5"><CardTitle>{report.title}</CardTitle><CardDescription>{report.description}</CardDescription></CardHeader>
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No Result</p><p className="text-xs text-muted-foreground">No ranking data is available for the selected period.</p></div>
            <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3 sm:px-5">{report.columns.map((column) => <Badge key={column} variant="outline" className="font-normal">{column}</Badge>)}</div>
          </Card>
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">Dashboard structure and values follow the supplied reference capture. Values are a UI preview and are not connected to live data.</p>
    </div>
  )
}

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

function PlayersPage({ users, query, onQueryChange, onAdd, onSelect, onToggleStatus }: {
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

function OffersPage({ title, description, offers, kind, onCreate, onToggle }: { title: string; description: string; offers: Offer[]; kind: 'promotions' | 'bonuses'; onCreate: () => void; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState<'All' | 'Casino' | 'Sports' | 'Both'>('All')
  const [query, setQuery] = useState('')
  const filtered = offers.filter((offer) => (filter === 'All' || offer.channel === filter) && (offer.name + ' ' + offer.description + ' ' + offer.id).toLowerCase().includes(query.toLowerCase()))
  const isPromotions = kind === 'promotions'
  return <div className="page-enter">
    <SectionHeading title={title} description={description} actions={<><Button variant="outline"><Download className="h-4 w-4" /> Export</Button><Button onClick={onCreate}><Plus className="h-4 w-4" /> {isPromotions ? 'Create promotion' : 'Create bonus'}</Button></>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BadgePercent className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Total {isPromotions ? 'campaigns' : 'bonus offers'}</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Currently active</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.filter((offer) => offer.status === 'Active').length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Total claims</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.reduce((sum, offer) => sum + Number(offer.claims.replace(',', '')), 0).toLocaleString()}</p></div></CardContent></Card>
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">{(['All', 'Casino', 'Sports', 'Both'] as const).map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition', filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{item === 'Both' ? 'Cross-channel' : item}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'Search ' + (isPromotions ? 'promotions' : 'bonuses') + '...'} className="pl-9 sm:w-64" /></div><Button variant="outline" onClick={() => { setFilter('All'); setQuery('') }}><Filter className="h-4 w-4" /> Clear filters</Button></div>
      </div>
      <div className="admin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">{isPromotions ? 'Promotion' : 'Bonus offer'}</th><th className="px-4 py-3.5">Channel</th><th className="px-4 py-3.5">Reward</th><th className="px-4 py-3.5">Claims</th><th className="px-4 py-3.5">End date</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((offer) => <tr key={offer.id} className="transition hover:bg-slate-50/70">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isPromotions ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700')}>{isPromotions ? <BadgePercent className="h-5 w-5" /> : <Gift className="h-5 w-5" />}</span><div className="min-w-0"><p className="max-w-[220px] truncate text-xs font-bold text-slate-800">{offer.name}</p><p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-400">{offer.description}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{offer.id}</p></div></div></td>
              <td className="px-4 py-4"><Badge variant={offer.channel === 'Casino' ? 'info' : offer.channel === 'Sports' ? 'success' : 'secondary'}>{offer.channel}</Badge></td>
              <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">{offer.reward}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{offer.claims}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{offer.ends}</td><td className="px-4 py-4"><StatusBadge status={offer.status} /></td>
              <td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => onToggle(offer.id)} aria-label={offer.status === 'Active' ? 'Pause offer' : 'Activate offer'}>{offer.status === 'Active' ? <Pause className="h-4 w-4 text-slate-500" /> : <Play className="h-4 w-4 text-slate-500" />}</Button><Button variant="ghost" size="icon" aria-label="Edit offer" onClick={onCreate}><Pencil className="h-4 w-4 text-slate-500" /></Button><Button variant="ghost" size="icon" aria-label="More offer actions"><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button></div></td>
            </tr>)}
            {filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No offers match the selected filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-5 py-3 text-[11px] text-slate-400">Showing {filtered.length} of {offers.length} demo {isPromotions ? 'promotions' : 'bonuses'} · No campaigns are sent or activated.</div>
    </Card>
  </div>
}

function GamesPage({ games, onToggle }: { games: GameRow[]; onToggle: (id: string) => void }) {
  const [category, setCategory] = useState('All games')
  const [query, setQuery] = useState('')
  const filtered = games.filter((game) => (category === 'All games' || game.category === category) && (game.title + ' ' + game.provider).toLowerCase().includes(query.toLowerCase()))
  const gradient = (categoryName: string) => categoryName === 'Live casino' ? 'from-blue-950 via-blue-800 to-sky-700' : categoryName === 'Crash' ? 'from-violet-950 via-violet-800 to-fuchsia-600' : 'from-slate-950 via-slate-800 to-amber-700'
  return <div className="page-enter">
    <SectionHeading title="Casino games" description="Curate your catalogue and preview availability by category." actions={<><Button variant="outline"><Download className="h-4 w-4" /> Export catalogue</Button><Button><Plus className="h-4 w-4" /> Add game</Button></>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total titles</p><p className="mt-1 font-display text-2xl font-extrabold">{games.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Available in lobby</p><p className="mt-1 font-display text-2xl font-extrabold">{games.filter((game) => game.status === 'Active').length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Providers represented</p><p className="mt-1 font-display text-2xl font-extrabold">{new Set(games.map((game) => game.provider)).size}</p></CardContent></Card>
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{['All games', 'Slots', 'Live casino', 'Crash'].map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', category === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{item}</button>)}</div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games or providers..." className="pl-9 sm:w-72" /></div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((game) => <div key={game.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
          <div className={cn('relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br', gradient(game.category))}>
            <span className="absolute -right-3 -top-8 h-32 w-32 rounded-full border border-white/10" /><span className="absolute -bottom-16 -left-5 h-40 w-40 rounded-full border border-white/10" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur"><Gamepad2 className="h-7 w-7" /></span>
            <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90">{game.category}</span>
            <span className="absolute right-3 top-3"><StatusBadge status={game.status} /></span>
          </div>
          <div className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{game.title}</p><p className="mt-1 text-[11px] text-slate-400">{game.provider}</p></div><Button size="icon" variant="ghost" aria-label="More game options"><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button></div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3"><div><p className="text-[10px] text-slate-400">RTP</p><p className="mt-1 text-xs font-bold text-slate-700">{game.rtp}</p></div><div><p className="text-[10px] text-slate-400">Active players</p><p className="mt-1 text-xs font-bold text-slate-700">{game.players}</p></div></div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => onToggle(game.id)}>{game.status === 'Active' ? <><Pause className="h-3.5 w-3.5" /> Pause game (demo)</> : <><Play className="h-3.5 w-3.5" /> Enable game (demo)</>}</Button>
          </div>
        </div>)}
        {filtered.length === 0 ? <div className="col-span-full py-12 text-center text-sm text-slate-400">No games match your search.</div> : null}
      </div>
    </Card>
    <p className="mt-4 text-center text-[10px] text-slate-400">Catalogue information is illustrative. Provider connections and game availability are not implemented.</p>
  </div>
}

function TransactionsPage() {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const filtered = TRANSACTIONS.filter((tx) => (filter === 'All' || tx.type === filter) && (tx.id + ' ' + tx.user + ' ' + tx.method).toLowerCase().includes(query.toLowerCase()))
  return <div className="page-enter">
    <SectionHeading title="Transactions" description="Review the movement of funds in the demonstration account." actions={<Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Export report</Button>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <MetricCard title="Deposits today" value="€42,580" change="+8.2%" note="vs yesterday" icon={ArrowDownRight} accent="green" />
      <MetricCard title="Withdrawals today" value="€18,420" change="+3.1%" note="vs yesterday" icon={ArrowUpRight} accent="blue" />
      <MetricCard title="Pending review" value="12" change="−2" note="since yesterday" icon={Clock3} accent="amber" />
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-lg bg-slate-100 p-1">{['All', 'Deposit', 'Withdrawal'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{item}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions..." className="pl-9 sm:w-72" /></div></div>
      <div className="admin-scrollbar overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">Transaction</th><th className="px-4 py-3.5">Player</th><th className="px-4 py-3.5">Method</th><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Amount</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Details</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map((tx) => <tr key={tx.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4"><p className="font-mono text-[11px] font-semibold text-slate-700">{tx.id}</p><p className="mt-1 text-[10px] text-slate-400">{tx.type}</p></td><td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">{tx.user}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{tx.method}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{tx.date}</td><td className={cn('whitespace-nowrap px-4 py-4 text-xs font-bold', tx.amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-800')}>{tx.amount}</td><td className="px-4 py-4"><StatusBadge status={tx.status} /></td><td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" aria-label="View transaction"><Eye className="h-4 w-4 text-slate-500" /></Button></td></tr>)}</tbody>
      </table></div>
      <div className="border-t border-border px-5 py-3 text-[11px] text-slate-400">Showing {filtered.length} sample transactions. Financial actions are not connected.</div>
    </Card>
  </div>
}

function ReportsPage() {
  return <div className="page-enter space-y-5">
    <SectionHeading title="Reports & analytics" description="Performance snapshots for key platform metrics." actions={<><Button variant="outline"><CalendarDays className="h-4 w-4" /> 1–19 Oct 2026 <ChevronDown className="h-3.5 w-3.5" /></Button><Button onClick={() => window.print()}><Download className="h-4 w-4" /> Export report</Button></>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard title="Gross gaming revenue" value="€112,480" change="+6.4%" note="vs previous period" icon={CircleDollarSign} accent="amber" /><MetricCard title="Net gaming revenue" value="€86,240" change="+4.2%" note="vs previous period" icon={TrendingUp} accent="green" /><MetricCard title="Active players" value="8,642" change="+9.8%" note="vs previous period" icon={Users} accent="blue" /><MetricCard title="Avg. deposit" value="€46.20" change="−1.2%" note="vs previous period" icon={Wallet} accent="violet" /></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.8fr)]"><Card><CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Estimated GGR and deposits for the current reporting window.</CardDescription></CardHeader><CardContent><PerformanceChart /></CardContent></Card>
      <Card><CardHeader><CardTitle>Revenue by channel</CardTitle><CardDescription>Sample contribution by product category.</CardDescription></CardHeader><CardContent className="space-y-5">{[{ label: 'Slots & instant games', value: '€48,260', percent: 58, color: 'bg-amber-400' }, { label: 'Live casino', value: '€23,140', percent: 27, color: 'bg-blue-500' }, { label: 'Sportsbook', value: '€14,840', percent: 17, color: 'bg-violet-500' }].map((item) => <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{item.label}</span><span className="text-xs font-bold text-slate-800">{item.value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={cn('h-2 rounded-full', item.color)} style={{ width: item.percent + '%' }} /></div></div>)}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Report notes</CardTitle><CardDescription>Suggested areas to keep visible in the admin product.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{[{ title: 'Player activity', detail: 'Daily active users, new registrations, retention cohorts.', icon: Users }, { title: 'Campaign conversion', detail: 'Claims, qualified players, reward cost, campaign ROI.', icon: BadgePercent }, { title: 'Payments overview', detail: 'Deposit success rate, withdrawal time, payment methods.', icon: CreditCard }].map((item) => { const Icon = item.icon; return <div key={item.title} className="rounded-xl border border-slate-200 p-4"><Icon className="h-5 w-5 text-amber-600" /><p className="mt-3 text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{item.detail}</p></div> })}</CardContent></Card>
    <p className="text-center text-[10px] text-slate-400">All report values are sample metrics and are not sourced from production.</p>
  </div>
}

function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [twoFactor, setTwoFactor] = useState(true)
  const [compactTables, setCompactTables] = useState(false)
  return <div className="page-enter">
    <SectionHeading title="Workspace settings" description="The controls below are interaction previews and do not save to a server." actions={<Button onClick={() => notify('UI preview only — settings have not been saved.')}><Check className="h-4 w-4" /> Save preferences</Button>} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>General</CardTitle><CardDescription>Basic details about your workspace.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Workspace name</span><Input defaultValue="Bclick Admin" /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Default currency</span><select defaultValue="EUR" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>EUR</option><option>USD</option><option>TND</option><option>GBP</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Timezone</span><select defaultValue="Europe/Tunis" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="Europe/Tunis">Africa / Tunis (UTC+1)</option><option>UTC</option><option>Europe/London</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Language</span><select defaultValue="English" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>English</option><option>Français</option><option>العربية</option></select></label></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose which events the admin experience should highlight.</CardDescription></CardHeader><CardContent className="divide-y divide-slate-100">
          {[{ label: 'Email alerts', detail: 'Receive account and platform alerts by email.', value: emailAlerts, change: setEmailAlerts }, { label: 'Daily activity digest', detail: 'A summary of deposits, registrations, and campaigns.', value: true, change: () => {} }].map((item) => <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold text-slate-800">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div><button type="button" aria-pressed={item.value} onClick={() => item.change(!item.value)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', item.value ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', item.value ? 'left-[22px]' : 'left-0.5')} /></button></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Display</CardTitle><CardDescription>Personalize how information appears in tables.</CardDescription></CardHeader><CardContent><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-800">Compact tables</p><p className="mt-1 text-xs text-slate-500">Reduce row spacing for dense data views.</p></div><button type="button" aria-pressed={compactTables} onClick={() => setCompactTables(!compactTables)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', compactTables ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', compactTables ? 'left-[22px]' : 'left-0.5')} /></button></div></CardContent></Card>
      </div>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Security checklist</CardTitle><CardDescription>Recommended controls for a production admin.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">Two-factor authentication</p><p className="mt-1 text-[10px] text-slate-400">UI toggle only</p></div><button type="button" aria-pressed={twoFactor} onClick={() => setTwoFactor(!twoFactor)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', twoFactor ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', twoFactor ? 'left-[22px]' : 'left-0.5')} /></button></div>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-800">Role-based access</p><p className="mt-1 text-[10px] text-slate-400">Not configured in this prototype</p></div><Badge variant="warning">Planned</Badge></div>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-800">Audit log</p><p className="mt-1 text-[10px] text-slate-400">Sample activity only</p></div><Badge variant="secondary">Preview</Badge></div>
        </CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/60 shadow-none"><CardContent className="p-5"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-950">Prototype reminder</p><p className="mt-1.5 text-xs leading-5 text-amber-900/80">Authentication, permissions, persistence, and notification delivery have intentionally not been implemented.</p></div></div></CardContent></Card>
      </div>
    </div>
  </div>
}

function PlayerProfilePage({ user, onBack, onToggle, onNotify, onSave }: {
  user: UserRow
  onBack: () => void
  onToggle: () => void
  onNotify: (message: string) => void
  onSave: (id: string, patch: Partial<UserRow>) => void
}) {
  const [mainTab, setMainTab] = useState('General')
  const [detailTab, setDetailTab] = useState('Player Info')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)
  const [noteDraft, setNoteDraft] = useState('')
  const [notes, setNotes] = useState<{ text: string; date: string }[]>([
    { text: 'Demo profile created for UI review. No live player data is connected.', date: '19 Oct 2026 · 10:30' },
  ])
  const [messageDraft, setMessageDraft] = useState('')
  const [messages, setMessages] = useState<{ text: string; date: string; direction: 'out' | 'in' }[]>([
    { text: 'Welcome to Bclick. This is a sample message thread.', date: '18 Oct 2026 · 11:52', direction: 'in' },
  ])
  const details = (fields: { label: string; key?: string; value?: string; flag?: boolean }[]) => (
    <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map((field) => {
        const raw = field.value ?? (field.key ? playerCellValue(user, field.key) : '—')
        const empty = !raw || raw === '—'
        return <div key={field.label} className="min-w-0 border-b border-slate-100 px-1 py-3.5 last:border-b-0">
          <p className="text-[11px] font-medium text-slate-400">{field.label}</p>
          <div className="mt-1.5 break-words text-[13px] font-medium text-slate-800">
            {field.flag !== undefined
              ? <Badge variant={field.flag ? 'success' : 'outline'}>{field.flag ? 'Enabled' : 'Disabled'}</Badge>
              : <span className={empty ? 'text-slate-300' : ''}>{empty ? '—' : raw}</span>}
          </div>
        </div>
      })
    </div>
  )
  const section = (title: string, fields: { label: string; key?: string; value?: string; flag?: boolean }[], description?: string) => (
    <section key={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      </div>
      <div className="px-4 sm:px-5">{details(fields)}</div>
    </section>
  )
  const mainTabs = ['General', 'Financial', 'Reports', 'Settings', 'Log history']
  const generalTabs = ['Player Info', 'Additional Info', 'Player Verification', 'Notes', 'Messages']
  const accountOpen = user.status === 'Active'
  const maskedIp = '•••.•••.•••.•••'

  return <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-center gap-2 text-xs">
            <button type="button" onClick={onBack} className="font-semibold text-slate-500 transition hover:text-slate-900">Players</button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="truncate font-semibold text-slate-900">{user.email}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Avatar name={user.name} size="lg" tone="bg-slate-100 text-slate-700" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <p className="mt-1 text-xs text-slate-500">Player ID <span className="font-mono text-slate-700">{user.id}</span><span className="mx-2 text-slate-300">·</span>{user.country}</p>
            </div>
            <StatusBadge status={user.status} />
            <Badge variant={user.tier === 'VIP' ? 'warning' : user.tier === 'Gold' ? 'info' : 'outline'}>{user.tier}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages') }}><FileText className="h-4 w-4" /> Message</Button>
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages'); onNotify('SMS preview opened in the Messages tab.') }}><Bell className="h-4 w-4" /> SMS</Button>
          <Button variant="outline" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /> Settings</Button>
        </div>
      </div>
      <div className="border-b border-slate-200 px-3 sm:px-5">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Player sections">
          {mainTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={mainTab === tab} onClick={() => setMainTab(tab)} className={cn('relative shrink-0 px-3 py-3.5 text-xs font-semibold transition sm:px-4', mainTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
            {tab}
            {mainTab === tab ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-slate-900 sm:inset-x-4" /> : null}
          </button>)}
        </div>
      </div>

      <div className="p-3 sm:p-5 lg:p-6">
        {mainTab === 'General' ? <div>
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-100 pb-1" role="tablist" aria-label="General player information">
            {generalTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)} className={cn('shrink-0 rounded-md px-3 py-2 text-xs font-medium transition', detailTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>{tab}</button>)}
          </div>

          {detailTab === 'Player Info' ? <div className="space-y-4">
            <div className="mb-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-bold text-slate-900">Player Info</h2><p className="mt-1 text-xs text-slate-500">Personal, contact, financial, promotional and account details.</p></div>
              <div className="flex gap-2">
                <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((current) => !current)}><Pencil className="h-3.5 w-3.5" />{editMode ? 'Cancel edit' : 'Edit profile'}</Button>
                <Button size="icon" variant="outline" aria-label="Profile settings" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /></Button>
              </div>
            </div>
            {editMode ? <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault()
              const names = editName.trim()
              const email = editEmail.trim()
              if (!names || !email) {
                onNotify('Name and email are required in the profile preview.')
                return
              }
              onSave(user.id, { name: names, email })
              setEditMode(false)
            }}>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input value={editName} onChange={(event) => setEditName(event.target.value)} required /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email / login</span><Input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} required /></label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><Button type="submit"><Check className="h-4 w-4" /> Save demo changes</Button><p className="text-[11px] text-slate-500">Saved only in this browser preview state.</p></div>
            </form> : null}
            {section('Personal Info', [
              { label: 'First Name', key: 'firstName' }, { label: 'Middle Name', key: 'middleName' },
              { label: 'Last Name', key: 'lastName' }, { label: 'Birthday', key: 'birthday' },
              { label: 'Birth City', key: 'birthCity' }, { label: 'Birth Department', key: 'birthDepartment' },
              { label: 'Birth Name', value: '—' }, { label: 'Citizenship', value: user.country },
              { label: 'Gender', key: 'gender' }, { label: 'Personal ID', key: 'personalId' },
              { label: 'Document Number', key: 'documentNumber' }, { label: 'Document Expiration Date', value: '—' },
              { label: 'Document Issue Code', value: '—' }, { label: 'Document Issued By', key: 'documentIssuedBy' },
              { label: 'Document Issue Date', key: 'documentIssueDate' }, { label: 'Document Region', key: 'documentRegion' },
            ])}
            {section('Contact Info', [
              { label: 'Region', key: 'country' }, { label: 'Province', key: 'province' }, { label: 'Zip-Code', key: 'zipCode' },
              { label: 'City', key: 'city' }, { label: 'Address', key: 'address' }, { label: 'Additional Address', key: 'additionalAddress' },
              { label: 'Phone', key: 'phone' }, { label: 'Mobile', key: 'mobilePhone' },
              { label: 'Email', key: 'email' }, { label: 'Email is verified', value: playerCellValue(user, 'isVerified') },
              { label: 'Is Phone Verified', value: 'No' }, { label: 'Is Mobile Verified', value: 'No' },
            ])}
            {section('Financial Info', [
              { label: 'Bank Name', key: 'bankName' }, { label: 'IBAN', key: 'iban' },
              { label: 'SwiftCode', key: 'swiftCode' }, { label: 'Account Holder', key: 'accountHolder' },
            ])}
            {section('Promotional Info', [
              { label: 'Using Loyalty Program', value: user.tier !== 'Standard' ? 'Yes' : 'No' },
              { label: 'Loyalty Level', key: 'loyaltyLevel' }, { label: 'Loyalty Point', key: 'loyaltyPoints' },
              { label: 'Excluded From Bonuses', value: 'No' },
            ])}
            {section('Account Info', [
              { label: 'Player ID', key: 'id' }, { label: 'Username', key: 'login' },
              { label: 'External ID', key: 'externalId' }, { label: 'Account Status', value: accountOpen ? 'Open' : 'Locked' },
              { label: 'Verified', key: 'isVerified' }, { label: 'Verification Date', value: user.tier === 'Standard' ? '—' : '15 Oct 2026' },
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Date Registered', key: 'created' },
              { label: 'Balance', key: 'balance' }, { label: 'Is Casino Blocked', value: 'No' },
              { label: 'Is Sport Blocked', value: 'No' }, { label: 'Is RMT Blocked', value: 'No' },
              { label: 'State', value: accountOpen ? 'Open' : 'Locked' }, { label: 'Status', value: 'Offline' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Player Category', key: 'clientCategory' },
              { label: 'Exclusion Type', value: '—' }, { label: 'Excluded From', value: '—' },
              { label: 'Excluded Until', value: '—' }, { label: 'Language', key: 'language' },
              { label: 'Cashdesk', value: '—' }, { label: 'BTag', value: '—' },
              { label: 'Promo Code', key: 'promoCode' }, { label: 'Custom Player Category', key: 'customCategory' },
              { label: 'RFId', value: '—' }, { label: 'Title', key: 'title' },
              { label: 'QR code is applied', value: 'No' }, { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Two factor authentication', value: 'Disabled' },
              { label: 'Resident', key: 'isResident' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'AML Status', key: 'amlStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Parent Id', key: 'parentId' }, { label: 'Child Id', key: 'childId' },
              { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
            ])}
            {section('Social Preferences', [
              { label: 'Subscribed To Email', value: 'Yes' }, { label: 'Subscribed To Direct Email', value: 'Yes' },
              { label: 'Subscribed to push notifications', key: 'pushSubscription' }, { label: 'Subscribed To Sms', value: 'No' },
              { label: 'Subscribed to phone call', key: 'phoneCallSubscription' }, { label: 'Subscribed to Newsletter', key: 'newsletter' },
              { label: 'TC Version Acceptance Date', value: user.joined }, { label: 'Subscribed to internal message', key: 'internalMessages' },
              { label: 'Subscribe To Casino Email', value: 'Yes' }, { label: 'Subscribe To Casino Internal Message', value: 'Yes' },
              { label: 'Subscribe To Casino Newsletter', value: 'Yes' }, { label: 'Subscribe To Casino Phone Call', value: 'No' },
              { label: 'Subscribe To Casino Push Notification', value: 'Yes' }, { label: 'Subscribe To Casino SMS', value: 'No' },
              { label: 'Terms And Conditions Version', value: '1' },
            ])}
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-start">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div><p className="text-xs font-semibold text-amber-950">Prototype reminder</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Player details are generated from local demo records. Sensitive identifiers are masked and no live account system is connected.</p></div>
            </div>
          </div> : null}

          {detailTab === 'Additional Info' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Additional Info</h2><p className="mt-1 text-xs text-slate-500">Registration, device, affiliate, activity and compliance metadata.</p></div>
            {section('Registration & Activity', [
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'Registration IP', value: maskedIp },
              { label: 'Client Category', key: 'clientCategory' }, { label: 'Last Login Date', key: 'lastLogin' },
              { label: 'Last Login IP', value: maskedIp }, { label: 'Sport Last Bet', key: 'lastSportBet' },
              { label: 'Gaming Last Bet', key: 'lastCasinoBet' }, { label: 'First Deposit Date', key: 'firstDepositDate' },
              { label: 'Last Deposit Date', key: 'lastDepositDate' }, { label: 'Cashdesk ID', key: 'cashDeskId' },
            ])}
            {section('Risk & Compliance', [
              { label: 'AML Status', key: 'amlStatus' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Is Test', value: 'No' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
              { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' }, { label: 'Resident', key: 'isResident' },
            ])}
            {section('Affiliation & Security', [
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Promo Code', key: 'promoCode' },
              { label: 'Parent ID', key: 'parentId' }, { label: 'Child ID', key: 'childId' },
              { label: 'Two factor authentication', value: 'Disabled' }, { label: 'QR code is applied', value: 'No' },
            ])}
          </div> : null}

          {detailTab === 'Player Verification' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Player Verification</h2><p className="mt-1 text-xs text-slate-500">Identity and contact verification review.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Account verification</p><div className="mt-3 flex items-center gap-2"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Pending' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">Demo status derived from player tier.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Email verification</p><div className="mt-3"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Unverified' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No verification email is sent.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Phone verification</p><div className="mt-3"><Badge variant="outline">Not provided</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No phone number is stored in this demo record.</p></div>
            </div>
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Identity documents</h3></div>
              <div className="flex flex-col items-center px-5 py-10 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileText className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-slate-800">No documents in this preview</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Document upload, verification providers and approval workflows are not connected.</p><Button className="mt-4" variant="outline" onClick={() => onNotify('Document upload is not connected in this preview.')}><Plus className="h-4 w-4" /> Add document</Button></div>
            </section>
          </div> : null}

          {detailTab === 'Notes' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Notes</h2><p className="mt-1 text-xs text-slate-500">Internal player notes visible in this local preview only.</p></div>
            <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={(event) => {
              event.preventDefault()
              if (!noteDraft.trim()) return
              setNotes((current) => [{ text: noteDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }, ...current])
              setNoteDraft('')
              onNotify('Demo note added locally.')
            }}>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="player-note">Add a note</label>
              <textarea id="player-note" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Write an internal note about this player…" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              <div className="flex justify-end"><Button type="submit" disabled={!noteDraft.trim()}><Plus className="h-4 w-4" /> Add note</Button></div>
            </form>
            <div className="space-y-3">{notes.map((note, index) => <article key={note.date + index} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-800">Admin Demo</p><time className="text-[10px] text-slate-400">{note.date}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{note.text}</p></article>)}</div>
          </div> : null}

          {detailTab === 'Messages' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Messages</h2><p className="mt-1 text-xs text-slate-500">Sample messages only. Nothing is sent to a real player.</p></div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              {messages.map((message, index) => <div key={message.date + index} className={cn('flex', message.direction === 'out' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[88%] rounded-xl px-4 py-3 sm:max-w-[75%]', message.direction === 'out' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800')}><p className="whitespace-pre-wrap text-sm leading-5">{message.text}</p><p className={cn('mt-2 text-[10px]', message.direction === 'out' ? 'text-slate-300' : 'text-slate-400')}>{message.direction === 'out' ? 'Admin Demo' : 'Player'} · {message.date}</p></div></div>)}
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
              event.preventDefault()
              if (!messageDraft.trim()) return
              setMessages((current) => [...current, { text: messageDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), direction: 'out' }])
              setMessageDraft('')
              onNotify('Demo message added locally. No message was delivered.')
            }}>
              <Input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a sample message…" aria-label="Message text" />
              <Button type="submit" disabled={!messageDraft.trim()}><ArrowRight className="h-4 w-4" /> Add message</Button>
            </form>
          </div> : null}
        </div> : null}

        {mainTab === 'Financial' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Financial Overview</h2><p className="mt-1 text-xs text-slate-500">Illustrative player wallet and transaction activity.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[{ label: 'Available balance', value: user.balance, icon: Wallet }, { label: 'Total deposits', value: '€1,245.00', icon: ArrowDownRight }, { label: 'Total withdrawals', value: '€320.00', icon: ArrowUpRight }, { label: 'Net deposits', value: '€925.00', icon: CircleDollarSign }].map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><Icon className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{metric.value}</p></div> })}
          </div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-white px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Recent transactions</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date', 'Transaction ID', 'Type', 'Method', 'Amount', 'Status'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:48', 'TR-104821', 'Deposit', 'Bank card', '+€120.00', 'Completed'],
              ['16 Oct 2026, 17:22', 'TR-104506', 'Withdrawal', 'Bank transfer', '−€60.00', 'Completed'],
              ['15 Oct 2026, 09:14', 'TR-104102', 'Deposit', 'Bank card', '+€250.00', 'Completed'],
              ['12 Oct 2026, 20:01', 'TR-103882', 'Bonus credit', 'Promotion', '+€15.00', 'Completed'],
            ].map((row) => <tr key={row[1]}>{row.map((cell, index) => <td key={index} className={cn('whitespace-nowrap px-4 py-3.5', index === 4 ? 'font-semibold text-slate-900' : 'text-slate-600')}>{index === 5 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">All amounts and transaction records are fabricated demonstration values.</p>
        </div> : null}

        {mainTab === 'Reports' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Player Reports</h2><p className="mt-1 text-xs text-slate-500">A compact view of sample activity for this player.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: 'Total sessions', value: '38', detail: 'Last 30 days' },
            { label: 'Sports bets', value: '124', detail: 'Demo count' },
            { label: 'Casino rounds', value: '286', detail: 'Demo count' },
            { label: 'Average session', value: '12m 40s', detail: 'Illustrative' },
          ].map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p><p className="mt-1 text-[10px] text-slate-400">{metric.detail}</p></div>)}</div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="text-sm font-semibold text-slate-800">Activity summary</h3><div className="mt-5 space-y-4">{[{label:'Casino activity',value:72},{label:'Sportsbook activity',value:48},{label:'Login frequency',value:86},{label:'Promotion engagement',value:35}].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-600">{item.label}</span><span className="font-semibold tabular-nums text-slate-800">{item.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{width: item.value + '%'}} /></div></div>)}</div></section>
          <p className="text-[11px] text-slate-400">Analytics shown here are sample values and are not calculated from live events.</p>
        </div> : null}

        {mainTab === 'Settings' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Account Settings</h2><p className="mt-1 text-xs text-slate-500">Review access status and player-level restrictions.</p></div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="text-sm font-semibold text-slate-900">Player account</h3><p className="mt-1 text-xs text-slate-500">Changing this only updates the local mock record.</p><div className="mt-2"><StatusBadge status={user.status} /></div></div></div><Button variant={accountOpen ? 'destructive' : 'default'} onClick={onToggle}>{accountOpen ? <><Pause className="h-4 w-4" /> Lock account (demo)</> : <><Play className="h-4 w-4" /> Unlock account (demo)</>}</Button></div>
          </section>
          {section('Access & Preferences', [
            { label: 'Language', key: 'language' }, { label: 'Two factor authentication', value: 'Disabled' },
            { label: 'Email notifications', value: 'Enabled' }, { label: 'SMS notifications', value: 'Disabled' },
            { label: 'Casino access', value: 'Enabled' }, { label: 'Sportsbook access', value: 'Enabled' },
            { label: 'RMT access', value: 'Enabled' }, { label: 'Account verification', value: user.tier === 'Standard' ? 'Pending' : 'Verified' },
          ])}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-950">Demo-only control</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Security settings, access rules and notifications are not saved to a server and have no effect on real accounts.</p></div>
        </div> : null}

        {mainTab === 'Log history' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Log history</h2><p className="mt-1 text-xs text-slate-500">Recent account events used as sample history.</p></div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date & time', 'Event', 'Details', 'Performed by', 'Result'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:52', 'Player login', 'Web session opened', 'Player', 'Success'],
              [user.joined, 'Account created', 'Player record registered', 'System', 'Success'],
              ['18 Oct 2026, 11:49', 'Deposit', 'Sample deposit recorded', 'Payment demo', 'Success'],
              ['17 Oct 2026, 14:05', 'Profile updated', 'Player details reviewed', 'Admin Demo', 'Success'],
            ].map((row) => <tr key={row[0] + row[1]}>{row.map((cell, index) => <td key={index} className="whitespace-nowrap px-4 py-3.5 text-slate-600">{index === 4 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">This history is illustrative and is not connected to authentication or payment logs.</p>
        </div> : null}
      </div>
    </div>
  </div>
}

function OfferFormModal({ open, onOpenChange, kind, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; kind: 'promotion' | 'bonus'; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const isPromotion = kind === 'promotion'
  return <Modal open={open} onOpenChange={onOpenChange} title={isPromotion ? 'Create promotion' : 'Create bonus'} description={isPromotion ? 'Design a new campaign. This is a UI-only preview.' : 'Configure a bonus offer for the prototype.'} footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form={isPromotion ? 'promotion-form' : 'bonus-form'}><Plus className="h-4 w-4" /> Create {isPromotion ? 'promotion' : 'bonus'}</Button></>}>
    <form id={isPromotion ? 'promotion-form' : 'bonus-form'} className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Offer name</span><Input name="name" required placeholder={isPromotion ? 'e.g. Weekend Reload' : 'e.g. Casino Welcome Bonus'} /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Short description</span><Input name="description" placeholder="Add a short internal description" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Channel</span><select name="channel" defaultValue="Casino" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Casino</option><option>Sports</option><option>Both</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Reward display</span><Input name="reward" required placeholder="e.g. 50% up to €100" /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">End date</span><Input name="ends" type="date" /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Initial status</span><select name="status" defaultValue="Scheduled" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Scheduled</option><option>Active</option><option>Paused</option></select></label></div>
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900"><Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> Preview only. Creating this item will update the local table and will not publish an offer.</div>
    </form>
  </Modal>
}

function UserFormModal({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal open={open} onOpenChange={onOpenChange} title="Add player" description="Add a sample row to preview the user-management flow." footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="user-form"><UserPlus className="h-4 w-4" /> Add player</Button></>}>
    <form id="user-form" className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input name="name" required placeholder="Player name" /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email address</span><Input name="email" required type="email" placeholder="player@example.com" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Country</span><select name="country" defaultValue="Tunisia" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Tunisia</option><option>France</option><option>Italy</option><option>Germany</option><option>United Kingdom</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Segment</span><select name="tier" defaultValue="Standard" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Standard</option><option>Gold</option><option>VIP</option></select></label></div>
      <p className="text-[11px] text-slate-400">No invitation email is sent and no user account is created in a server.</p>
    </form>
  </Modal>
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('overview')
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS)
  const [promotions, setPromotions] = useState<Offer[]>(INITIAL_PROMOTIONS)
  const [bonuses, setBonuses] = useState<Offer[]>(INITIAL_BONUSES)
  const [games, setGames] = useState<GameRow[]>(INITIAL_GAMES)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [promotionOpen, setPromotionOpen] = useState(false)
  const [bonusOpen, setBonusOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [toast, setToast] = useState('')
  const page = PAGE_INFO[activePage]

  function navigate(next: PageKey) {
    setActivePage(next)
    setMobileNavOpen(false)
    setSearchQuery('')
  }

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  function toggleUserStatus(id: string) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, status: current.status === 'Active' ? 'Suspended' : 'Active' } : current)
    notify('Sample account status updated in this preview.')
  }

  function savePlayerProfile(id: string, patch: Partial<UserRow>) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, ...patch } : current)
    notify('Demo player profile updated locally.')
  }

  function toggleOffer(kind: 'promotions' | 'bonuses', id: string) {
    const setter = kind === 'promotions' ? setPromotions : setBonuses
    setter((current) => current.map((offer) => offer.id === id ? { ...offer, status: offer.status === 'Active' ? 'Paused' : 'Active' } : offer))
    notify('Sample offer status updated in this preview.')
  }

  function toggleGame(id: string) {
    setGames((current) => current.map((game) => game.id === id ? { ...game, status: game.status === 'Active' ? 'Paused' : 'Active' } : game))
    notify('Sample game availability updated in this preview.')
  }

  function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const country = String(data.get('country') || 'Tunisia')
    const tier = String(data.get('tier') || 'Standard') as UserRow['tier']
    if (!name || !email) return
    const newUser: UserRow = { id: 'BC-' + String(20482 + users.length).padStart(6, '0'), name, email, country, joined: 'Oct 19, 2026', balance: '€0.00', status: 'Active', tier }
    setUsers((current) => [newUser, ...current])
    setUserOpen(false)
    setSearchQuery('')
    notify('Sample player added to this browser preview.')
  }

  function handleOfferSubmit(kind: 'promotion' | 'bonus', event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const description = String(data.get('description') || '').trim() || 'New offer preview.'
    const channel = String(data.get('channel') || 'Casino') as Offer['channel']
    const reward = String(data.get('reward') || '').trim()
    const rawDate = String(data.get('ends') || '')
    const ends = rawDate ? new Date(rawDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'
    const status = String(data.get('status') || 'Scheduled') as Offer['status']
    if (!name || !reward) return
    const list = kind === 'promotion' ? promotions : bonuses
    const offer: Offer = { id: (kind === 'promotion' ? 'PR-' : 'BN-') + String(109 + list.length).padStart(4, '0'), name, description, channel, reward, claims: '0', ends, status }
    if (kind === 'promotion') {
      setPromotions((current) => [offer, ...current])
      setPromotionOpen(false)
      navigate('promotions')
    } else {
      setBonuses((current) => [offer, ...current])
      setBonusOpen(false)
      navigate('bonuses')
    }
    notify('Sample ' + kind + ' added locally. Nothing was published.')
  }

  const createHeaderAction = () => {
    if (activePage === 'promotions') return <Button onClick={() => setPromotionOpen(true)}><Plus className="h-4 w-4" /> Create promotion</Button>
    if (activePage === 'bonuses') return <Button onClick={() => setBonusOpen(true)}><Plus className="h-4 w-4" /> Create bonus</Button>
    if (activePage === 'users') return <Button onClick={() => setUserOpen(true)}><Plus className="h-4 w-4" /> New player</Button>
    if (activePage === 'reports' || activePage === 'transactions') return <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Export</Button>
    if (activePage === 'games') return <Button onClick={() => notify('Game provider connection is not included in this UI prototype.')}><Plus className="h-4 w-4" /> Add game</Button>
    return <Button onClick={() => navigate('promotions')}><Plus className="h-4 w-4" /> New campaign</Button>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileNavOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" /> : null}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white text-slate-900 transition-transform duration-200 lg:translate-x-0', mobileNavOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-5">
          <button type="button" onClick={() => navigate('overview')} className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white"><Zap className="h-5 w-5 fill-current" /></span>
            <span><span className="block font-display text-[17px] font-extrabold tracking-tight">bclick<span className="text-slate-400">.</span></span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[.19em] text-slate-400">Admin workspace</span></span>
          </button>
          <button type="button" className="text-slate-500 hover:text-white lg:hidden" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <div className="px-3 pt-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" /><span className="text-[11px] font-semibold text-slate-700">Workspace</span><ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-500" /></div><p className="mt-1 pl-4 text-[10px] text-slate-500">Bclick Tunisia · Demo</p></div>
        </div>
        <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => <div key={group.title} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-wide text-slate-400">{group.title}</p>
            <div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const active = activePage === item.page; return <button type="button" key={item.page} onClick={() => navigate(item.page)} className={cn('group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition', active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950')}><Icon className={cn('h-[17px] w-[17px]', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700')} /><span className="flex-1">{item.label}</span>{item.count ? <span className={cn('rounded px-1.5 py-0.5 text-[9px]', active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{item.count}</span> : null}{active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}</button> })}</div>
          </div>)}
        </nav>
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700"><LifeBuoy className="h-4 w-4" /></span><div><p className="text-[11px] font-semibold text-slate-800">Need a hand?</p><p className="mt-0.5 text-[9px] text-slate-500">Admin docs & help</p></div></div>
            <button type="button" onClick={() => notify('Help centre is not connected in this prototype.')} className="mt-3 flex w-full items-center justify-between rounded-md bg-white/[.06] px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-200">Open help centre <ArrowRight className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4e9f0] text-xs font-extrabold text-slate-800">AD</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">Admin Demo</p><p className="mt-0.5 truncate text-[10px] text-slate-500">Super administrator</p></div><button type="button" aria-label="Sign out (demo)" onClick={() => notify('Authentication is outside the scope of this UI prototype.')} className="text-slate-500 hover:text-white"><LogOut className="h-4 w-4" /></button></div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="hidden min-w-0 sm:block"><p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">Bclick / {page.title}</p><p className="mt-1 text-sm font-bold text-slate-900">{page.title}</p></div>
          <div className="relative ml-auto w-full max-w-[350px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search in this section..." className="h-9 border-slate-200 bg-slate-50/80 pl-9 pr-12 text-xs focus:bg-white" /><kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</kbd></div>
          <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">EN</span><Globe className="h-4 w-4 text-slate-400" /></div>
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative shrink-0" aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell className="h-[18px] w-[18px] text-slate-600" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" /></Button>
            {notificationOpen ? <div className="absolute right-0 top-12 z-40 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="flex items-center justify-between px-2 py-1"><p className="text-sm font-bold text-slate-800">Notifications</p><Badge variant="warning">3 new</Badge></div>{[{ title: 'Withdrawal needs review', text: 'TX-1048250 · 250.00 EUR', icon: CreditCard }, { title: 'Promotion is nearly over', text: 'Super Sunday · ended Oct 12', icon: BadgePercent }, { title: 'New player registered', text: 'Youssef Mansour · 21 min ago', icon: UserPlus }].map((item) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => { setNotificationOpen(false); notify('Notification preview opened.') }} className="mt-1 flex w-full items-start gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-[10px] text-slate-400">{item.text}</span></span></button> })}<button type="button" onClick={() => { setNotificationOpen(false); notify('All sample notifications marked as read.') }} className="mt-2 w-full border-t border-slate-100 pt-3 text-center text-xs font-semibold text-slate-500 hover:text-slate-900">Mark all as read</button></div> : null}
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <button type="button" onClick={() => navigate('settings')} className="flex shrink-0 items-center gap-2 text-left"><div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200">AD</div><div className="hidden lg:block"><p className="text-xs font-bold text-slate-800">Admin Demo</p><p className="mt-0.5 text-[10px] text-slate-400">Super admin</p></div><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" /></button>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
          {selectedUser ? <PlayerProfilePage user={selectedUser} onBack={() => setSelectedUser(null)} onToggle={() => toggleUserStatus(selectedUser.id)} onNotify={notify} onSave={savePlayerProfile} /> : <>
                      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Bclick Admin</p><h1 className="mt-1 font-display text-xl font-extrabold text-slate-900">{page.title}</h1></div>{createHeaderAction()}</div>
                      <div className="mb-6 hidden items-end justify-between gap-4 lg:flex"><div><h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{page.title}</h1><p className="mt-1.5 text-sm text-slate-500">{page.description}</p></div><div className="flex items-center gap-2"><span className="mr-1 hidden text-[11px] text-slate-400 xl:block"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Preview environment</span>{createHeaderAction()}</div></div>
                      {activePage === 'overview' ? <OverviewPage onNavigate={navigate} onCreatePromotion={() => setPromotionOpen(true)} /> : null}
                      {activePage === 'users' ? <PlayersPage users={users} query={searchQuery} onQueryChange={setSearchQuery} onAdd={() => setUserOpen(true)} onSelect={setSelectedUser} onToggleStatus={toggleUserStatus} /> : null}
                      {activePage === 'promotions' ? <OffersPage title="Promotions" description="Create campaigns and track engagement across channels." offers={promotions} kind="promotions" onCreate={() => setPromotionOpen(true)} onToggle={(id) => toggleOffer('promotions', id)} /> : null}
                      {activePage === 'bonuses' ? <OffersPage title="Bonuses" description="Manage bonus offers, wagering requirements, and eligibility." offers={bonuses} kind="bonuses" onCreate={() => setBonusOpen(true)} onToggle={(id) => toggleOffer('bonuses', id)} /> : null}
                      {activePage === 'games' ? <GamesPage games={games} onToggle={toggleGame} /> : null}
                      {activePage === 'transactions' ? <TransactionsPage /> : null}
                      {activePage === 'reports' ? <ReportsPage /> : null}
                      {activePage === 'settings' ? <SettingsPage /> : null}

          </>}
          <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-[10px] text-slate-400 sm:flex-row"><span>© 2026 Bclick Admin · UI prototype</span><span className="flex items-center gap-3"><button type="button" className="hover:text-slate-600" onClick={() => notify('Admin documentation has not been added yet.')}>Documentation</button><button type="button" className="hover:text-slate-600" onClick={() => notify('Support is not connected in this prototype.')}>Contact support</button><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Demo data</span></span></footer>
        </main>
      </div>

      <OfferFormModal open={promotionOpen} onOpenChange={setPromotionOpen} kind="promotion" onSubmit={(event) => handleOfferSubmit('promotion', event)} />
      <OfferFormModal open={bonusOpen} onOpenChange={setBonusOpen} kind="bonus" onSubmit={(event) => handleOfferSubmit('bonus', event)} />
      <UserFormModal open={userOpen} onOpenChange={setUserOpen} onSubmit={handleUserSubmit} />

      {toast ? <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{toast}</div> : null}
    </div>
  )
}
