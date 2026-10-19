import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Wallet as WalletIcon, ChevronRight, X } from 'lucide-react'
import { AccountLayout } from '../components/AccountPanel'
import { PAYMENT_METHODS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

type DemoTransaction = {
  id: string
  type: 'Deposit' | 'Withdrawal'
  method: string
  amount: string
  requested: string
  status: 'Pending' | 'Completed' | 'Rejected'
}

const TRANSACTIONS_DEMO: DemoTransaction[] = [
  { id: 'DP-20432', type: 'Deposit', method: 'Visa', amount: '€75.00', requested: '19/10 09:45', status: 'Completed' },
  { id: 'WD-10421', type: 'Withdrawal', method: 'Skrill', amount: '€150.00', requested: '18/10 16:02', status: 'Pending' },
  { id: 'DP-20418', type: 'Deposit', method: 'Bitcoin', amount: '€420.00', requested: '17/10 19:47', status: 'Completed' },
  { id: 'WD-10418', type: 'Withdrawal', method: 'Bitcoin', amount: '€90.00', requested: '16/10 14:02', status: 'Rejected' },
  { id: 'DP-20402', type: 'Deposit', method: 'Skrill', amount: '€150.00', requested: '15/10 11:23', status: 'Pending' },
]

function MethodLogo({ name }: { name: string }) {
  /* Payment brand logos are images in the reference — grey wireframe placeholder */
  return (
    <div className="h-16 md:h-20 flex items-center justify-center">
      <span className="inline-flex h-10 md:h-12 px-6 items-center justify-center rounded bg-zinc-200 border border-zinc-300">
        <span className="text-[10px] md:text-xs font-bold text-zinc-600 uppercase tracking-wide text-center px-2">
          {name}
        </span>
      </span>
    </div>
  )
}

export function Deposit() {
  const [selected, setSelected] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const method = PAYMENT_METHODS.find((m) => m.id === selected)

  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cb-light-text)] mb-6">Deposit</h1>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mb-8">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={cn(
              'rounded-md border bg-white p-3 text-left transition-colors',
              selected === m.id
                ? 'border-[var(--cb-yellow)]'
                : 'border-[var(--cb-light-border)] hover:border-zinc-400',
            )}
          >
            <MethodLogo name={m.name} />
            <div className="mt-2 font-mono text-[11px] md:text-xs text-[#3a4652] space-y-0.5">
              <p className="flex justify-between"><span>Min:</span><span>{m.min}</span></p>
              <p className="flex justify-between"><span>Max:</span><span>{m.max}</span></p>
            </div>
          </button>
        ))}
      </div>

      {method ? (
        <div className="rounded-md bg-white border border-[var(--cb-light-border)] p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-[var(--cb-light-text)]">Deposit via {method.name}</h2>
            <button
              aria-label="Clear selection"
              onClick={() => setSelected(null)}
              className="w-8 h-8 rounded-md bg-[var(--cb-light-selected)] flex items-center justify-center text-[var(--cb-light-muted)] hover:text-[var(--cb-light-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[var(--cb-light-muted)] mb-1">Amount (min {method.min}, max {method.max})</p>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="€0.00"
            className="w-full h-11 px-4 rounded-md bg-white border border-[var(--cb-light-border)] text-[var(--cb-light-text)] text-sm focus:outline-none focus:border-[var(--cb-yellow)] mb-4"
          />
          <button
            className="h-11 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
            onClick={() => {
              /* demo only — no transaction performed */
            }}
          >
            Continue to {method.name}
          </button>
          <p className="text-[11px] text-[var(--cb-light-muted)] mt-3">
            Prototype only: no payment provider is contacted and no deposit is executed.
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--cb-light-muted)]">Select a payment method to continue.</p>
      )}
    </AccountLayout>
  )
}

export function Withdraw() {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!.id)

  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cb-light-text)] mb-6">Withdraw</h1>
      <div className="rounded-md bg-white border border-[var(--cb-light-border)] p-5 md:p-6 mb-6 max-w-xl">
        <p className="text-xs text-[var(--cb-light-muted)] mb-1">Real balance available</p>
        <p className="text-2xl font-extrabold text-[var(--cb-light-text)] font-mono mb-5">€0.00</p>

        <p className="text-xs text-[var(--cb-light-muted)] mb-1.5">Withdrawal method</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {PAYMENT_METHODS.slice(0, 6).map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                'rounded-md border px-3 py-2.5 text-xs font-semibold transition-colors',
                method === m.id
                  ? 'border-[var(--cb-yellow)] text-[var(--cb-light-text)]'
                  : 'border-[var(--cb-light-border)] text-[var(--cb-light-muted)] hover:text-[var(--cb-light-text)]',
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--cb-light-muted)] mb-1">Amount</p>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="€0.00"
          className="w-full h-11 px-4 rounded-md bg-white border border-[var(--cb-light-border)] text-[var(--cb-light-text)] text-sm focus:outline-none focus:border-[var(--cb-yellow)] mb-4"
        />
        <button className="h-11 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm hover:brightness-110 transition-all">
          Request withdrawal
        </button>
        <p className="text-[11px] text-[var(--cb-light-muted)] mt-3">
          Prototype only: the request is not submitted and no funds move.
        </p>
      </div>
      <Link to="/account/wallet/transaction-history" className="inline-flex items-center text-sm text-[var(--cb-yellow-dark)] font-semibold">
        View transaction history <ChevronRight className="w-4 h-4" />
      </Link>
    </AccountLayout>
  )
}

export function TransactionHistory() {
  return (
    <AccountLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--cb-light-text)] md:text-3xl">Transaction History</h1>
          <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Review your deposit and withdrawal requests.</p>
        </div>
        <span className="text-xs text-[var(--cb-light-muted)]">{TRANSACTIONS_DEMO.length} transactions</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-[#edf3f5] px-3 py-1.5 text-[var(--cb-light-text)]">All transactions</span>
        <span className="rounded-full bg-[#e8f5ec] px-3 py-1.5 text-[#236a3a]">Deposits</span>
        <span className="rounded-full bg-[#eef0ff] px-3 py-1.5 text-[#3f4b9a]">Withdrawals</span>
      </div>

      <div className="mb-6 overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
        <div className="hidden grid-cols-[1.05fr_0.8fr_1fr_0.9fr_1fr_auto] gap-3 border-b border-[var(--cb-light-border)] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)] lg:grid lg:px-5">
          <span>Transaction ID</span><span>Type</span><span>Method</span><span>Amount</span><span>Date</span><span>Status</span>
        </div>
        {TRANSACTIONS_DEMO.map((transaction) => (
          <div
            key={transaction.id}
            className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b border-[var(--cb-light-border)] px-4 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[1.05fr_0.8fr_1fr_0.9fr_1fr_auto] lg:gap-3 lg:px-5"
          >
            <div className="min-w-0">
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Transaction ID</span>
              <span className="truncate font-mono text-xs text-[var(--cb-light-text)]">{transaction.id}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Type</span>
              <span className={cn(
                'inline-flex rounded-full px-2 py-1 text-[10px] font-bold',
                transaction.type === 'Deposit' ? 'bg-[#e8f5ec] text-[#236a3a]' : 'bg-[#eef0ff] text-[#3f4b9a]',
              )}>{transaction.type}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Method</span>
              <span className="truncate text-xs text-[var(--cb-light-text)]">{transaction.method}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Amount</span>
              <span className="text-sm font-bold text-[var(--cb-light-text)]">{transaction.amount}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Date</span>
              <span className="text-xs text-[var(--cb-light-muted)]">{transaction.requested}</span>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <span className="block text-[10px] text-[var(--cb-light-muted)] lg:hidden">Status</span>
              <span className={cn(
                'inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                transaction.status === 'Completed'
                  ? 'bg-[#e8f5ec] text-[#236a3a]'
                  : transaction.status === 'Pending'
                    ? 'bg-[#fdf5dc] text-[var(--cb-yellow-dark)]'
                    : 'bg-[#fdecec] text-[#a82e2e]',
              )}>{transaction.status}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-xs text-[var(--cb-light-muted)]">
        <WalletIcon className="h-4 w-4 shrink-0" />
        Demonstration data only — deposits and withdrawals are not connected to a live payment system.
      </p>
    </AccountLayout>
  )
}

export const PendingWithdrawals = TransactionHistory

export function WalletRouter() {
  const { tab = 'deposit' } = useParams()
  switch (tab) {
    case 'deposit': return <Deposit />
    case 'withdraw': return <Withdraw />
    case 'transaction-history': return <TransactionHistory />
    case 'pending-withdrawals': return <Navigate to="/account/wallet/transaction-history" replace />
    default: return <Navigate to="/account/wallet/deposit" replace />
  }
}
