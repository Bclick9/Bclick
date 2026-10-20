import { type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui'
import { cn } from '../lib/utils'

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Active' || status === 'Completed' ? 'success'
    : status === 'Scheduled' || status === 'Pending' ? 'warning'
      : status === 'Failed' || status === 'Suspended' ? 'danger'
        : status === 'Paused' ? 'secondary' : 'outline'
  return <Badge variant={variant}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80" />{status}</Badge>
}

export function Avatar({ name, tone = 'bg-amber-100 text-amber-800', size = 'md' }: { name: string; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'
  return <div className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white', dimensions, tone)}>{initials(name)}</div>
}

export function SectionHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
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

export function MetricCard({ title, value, change, note, icon: Icon, accent = 'amber' }: { title: string; value: string; change: string; note: string; icon: LucideIcon; accent?: 'amber' | 'blue' | 'green' | 'violet' }) {
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

export function PerformanceChart({ compact = false }: { compact?: boolean }) {
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

export type ReportRow = { label: string; values: string[] }

export function ReportTable({ title, description, columns, rows }: { title: string; description?: string; columns: string[]; rows: ReportRow[] }) {
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
