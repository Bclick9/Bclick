import { useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, CreditCard, Download, Gamepad2, Gift, TrendingUp, Users, Wallet, UserPlus, CircleDollarSign, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../components/ui'
import { cn } from '../../lib/utils'
import { ReportTable, type ReportRow } from '../../components/DashboardUI'

const ACTIVITY = [
  { name: 'Amine Ben Salem', action: 'made a deposit', detail: '€100.00 · Visa', time: '2 min ago', icon: Wallet, tone: 'bg-emerald-50 text-emerald-700' },
  { name: 'Weekend Reload', action: 'promotion was claimed', detail: 'Casino · 50% bonus', time: '8 min ago', icon: Gift, tone: 'bg-amber-50 text-amber-700' },
  { name: 'Sarah Gharbi', action: 'requested a withdrawal', detail: '€250.00 · Bank transfer', time: '14 min ago', icon: CreditCard, tone: 'bg-sky-50 text-sky-700' },
  { name: 'Youssef Mansour', action: 'created an account', detail: 'Email verified', time: '21 min ago', icon: UserPlus, tone: 'bg-violet-50 text-violet-700' },
]


export function OverviewPage() {
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
