import { useMemo, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Clock3, Eye, Search, ShieldCheck, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Modal } from './ui'
import { Avatar, SectionHeading } from './DashboardUI'
import { cn } from '../lib/utils'
import type { PaymentRequest, PaymentRequestKind, PaymentRequestStatus } from '../lib/paymentRequests'

type PaymentRequestQueueProps = {
  kind: PaymentRequestKind
  initialRequests: PaymentRequest[]
  onNotify: (message: string) => void
}

const STATUS_FILTERS: ('All' | PaymentRequestStatus)[] = ['All', 'Pending', 'Under review', 'Approved', 'Completed', 'Rejected']

function amountLabel(amount: number, currency: PaymentRequest['currency']) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: currency === 'TND' ? 3 : 2, maximumFractionDigits: currency === 'TND' ? 3 : 2 }).format(amount)
}

function statusVariant(status: PaymentRequestStatus): 'warning' | 'info' | 'success' | 'danger' | 'secondary' {
  if (status === 'Pending') return 'warning'
  if (status === 'Under review') return 'info'
  if (status === 'Approved') return 'secondary'
  if (status === 'Completed') return 'success'
  return 'danger'
}

export function PaymentRequestQueue({ kind, initialRequests, onNotify }: PaymentRequestQueueProps) {
  const isDeposit = kind === 'Deposit'
  const [requests, setRequests] = useState(initialRequests)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentRequestStatus>('Pending')
  const [selected, setSelected] = useState<PaymentRequest | null>(null)
  const [decisionNote, setDecisionNote] = useState('')

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter
      const matchesQuery = !normalized || [request.id, request.playerId, request.playerName, request.email, request.method, request.reference].some((value) => value.toLowerCase().includes(normalized))
      return matchesStatus && matchesQuery
    })
  }, [requests, query, statusFilter])

  const pending = requests.filter((request) => request.status === 'Pending' || request.status === 'Under review')
  const pendingValue = pending.reduce((sum, request) => sum + request.amount, 0)
  const pendingCurrencies = [...new Set(pending.map((request) => request.currency))]
  const formatPendingValue = pendingCurrencies.length === 1
    ? amountLabel(pendingValue, pendingCurrencies[0]!)
    : `${pending.length} requests across ${pendingCurrencies.length} currencies`

  function openRequest(request: PaymentRequest) {
    setSelected(request)
    setDecisionNote(request.decisionNote ?? '')
  }

  function updateStatus(request: PaymentRequest, status: PaymentRequestStatus, note?: string) {
    const updated: PaymentRequest = {
      ...request,
      status,
      decisionNote: note?.trim() || request.decisionNote,
      reviewedBy: 'Admin Demo',
    }
    setRequests((current) => current.map((item) => item.id === request.id ? updated : item))
    setSelected(updated)
    onNotify(`${request.id}: ${status.toLowerCase()} in the local demo preview. No funds were moved.`)
    if (status === 'Completed' || status === 'Rejected') setSelected(null)
  }

  const canReview = selected && (selected.status === 'Pending' || selected.status === 'Under review')
  const statusLabel = (status: PaymentRequestStatus) => !isDeposit && status === 'Completed' ? 'Paid' : status
  const requestTitle = isDeposit ? 'Deposit processing' : 'Withdrawal processing'

  return (
    <div className="page-enter space-y-5">
      <SectionHeading
        eyebrow="OPERATIONS"
        title={requestTitle}
        description={isDeposit
          ? 'Review incoming payment requests and confirm deposits only after the payment is verified.'
          : 'Review withdrawal requests, approve eligible payouts, and record their completion.'}
      />

      <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-xs leading-5">
          <p className="font-semibold">Demo processing queue</p>
          <p className="text-amber-900/80">Requests are sample data. Actions below update this page only; no payment provider is contacted and no funds move.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Total requests</p><p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{requests.length}</p><p className="mt-1 text-[11px] text-slate-400">Across all statuses</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Awaiting review</p><p className="mt-2 font-display text-2xl font-extrabold text-amber-600">{pending.length}</p><p className="mt-1 text-[11px] text-slate-400">Pending or under review</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Queue breakdown</p><p className="mt-2 text-lg font-extrabold text-slate-900">{formatPendingValue}</p><p className="mt-1 text-[11px] text-slate-400">Amounts stay in original currencies</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, request ID, reference…" aria-label="Search payment requests" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Filter requests by status">
            {STATUS_FILTERS.map((status) => {
              const count = status === 'All' ? requests.length : requests.filter((request) => request.status === status).length
              return <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition', statusFilter === status ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900')}>
                {status === 'All' ? 'All' : statusLabel(status)}<span className={cn('rounded px-1 py-0.5 text-[9px]', statusFilter === status ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
              </button>
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Request / Player</th>
                <th className="px-3 py-3.5">Payment method</th>
                <th className="px-3 py-3.5">Amount</th>
                <th className="px-3 py-3.5">Requested at</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={request.playerName} size="sm" tone={isDeposit ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{request.playerName}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{request.id} · {request.playerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="font-medium text-slate-700">{request.method}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{request.reference}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-display text-sm font-bold tabular-nums text-slate-900">{amountLabel(request.amount, request.currency)}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-500">{request.requestedAt}</td>
                  <td className="px-3 py-3.5"><Badge variant={statusVariant(request.status)}>{statusLabel(request.status)}</Badge></td>
                  <td className="px-4 py-3.5 text-right">
                    <Button variant="outline" size="sm" onClick={() => openRequest(request)}><Eye className="h-3.5 w-3.5" /> Review</Button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 ? <tr><td colSpan={6} className="px-4 py-14 text-center"><div className="flex flex-col items-center gap-2 text-slate-400"><Search className="h-5 w-5" /><p className="text-sm font-semibold text-slate-600">No matching requests</p><p className="text-xs">Try another search term or status filter.</p></div></td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
          <span>Showing {filteredRequests.length} of {requests.length} requests</span>
          <span>Amounts are displayed in each request's original currency.</span>
        </div>
      </Card>

      <Modal open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }} size="wide" title={selected ? `Review ${isDeposit ? 'deposit' : 'withdrawal'} · ${selected.id}` : 'Review payment request'} description="Verify the request details before recording a decision. This preview does not call a payment provider.">
        {selected ? <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Player</p><p className="mt-1 text-sm font-bold text-slate-800">{selected.playerName}</p><p className="mt-1 text-xs text-slate-500">{selected.email}</p><p className="mt-1 text-[10px] text-slate-400">{selected.playerId}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Amount / status</p><p className="mt-1 text-lg font-extrabold text-slate-900">{amountLabel(selected.amount, selected.currency)}</p><div className="mt-2"><Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge></div></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payment method</p><p className="mt-1 text-sm font-semibold text-slate-800">{selected.method}</p><p className="mt-1 text-xs text-slate-500">Reference: {selected.reference}</p>{selected.network ? <p className="mt-1 text-xs text-slate-500">Network: {selected.network}</p> : null}{selected.destination ? <p className="mt-1 break-all text-xs text-slate-500">Destination: {selected.destination}</p> : null}</div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Request details</p><p className="mt-1 text-xs text-slate-700">{selected.requestedAt}</p>{selected.riskFlag ? <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{selected.riskFlag}</p> : <p className="mt-2 text-xs text-slate-500">No demo risk note is attached.</p>}</div>
          </div>
          {selected.decisionNote ? <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600"><span className="font-semibold">Previous note:</span> {selected.decisionNote}</div> : null}
          {selected.reviewedBy ? <p className="text-[10px] text-slate-400">Last handled by {selected.reviewedBy}</p> : null}
          {selected.status !== 'Completed' && selected.status !== 'Rejected' ? <div className="space-y-2 border-t border-slate-100 pt-4">
            <label htmlFor="payment-decision-note" className="block text-xs font-semibold text-slate-700">Decision note</label>
            <Input id="payment-decision-note" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder={selected.status === 'Approved' ? 'Add a payout reference or internal note…' : 'Add a verification note or rejection reason…'} />
            <p className="text-[10px] text-slate-400">In production, the decision must be authorized and written to an immutable audit trail.</p>
          </div> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected.status === 'Pending' ? <Button variant="outline" onClick={() => updateStatus(selected, 'Under review', decisionNote)}><Clock3 className="h-4 w-4" /> Start review</Button> : null}
            {canReview && isDeposit ? <Button onClick={() => updateStatus(selected, 'Completed', decisionNote)}><CheckCircle2 className="h-4 w-4" /> Confirm funds received</Button> : null}
            {canReview && !isDeposit ? <Button onClick={() => updateStatus(selected, 'Approved', decisionNote)}><ShieldCheck className="h-4 w-4" /> Approve withdrawal</Button> : null}
            {!isDeposit && selected.status === 'Approved' ? <Button onClick={() => updateStatus(selected, 'Completed', decisionNote)}><Check className="h-4 w-4" /> Mark as paid</Button> : null}
            {(canReview || (!isDeposit && selected.status === 'Approved')) ? <Button variant="destructive" disabled={decisionNote.trim().length < 3} onClick={() => updateStatus(selected, 'Rejected', decisionNote)}><XCircle className="h-4 w-4" /> Reject</Button> : null}
          </div>
        </div> : null}
      </Modal>
    </div>
  )
}
