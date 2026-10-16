import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Wallet as WalletIcon, ChevronRight, X } from 'lucide-react'
import { AccountLayout } from '../components/AccountPanel'
import { PAYMENT_METHODS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

const PENDING_DEMO = [
  { id: 'WD-10421', method: 'Skrill', amount: '€150.00', requested: '16/10 14:02', status: 'Pending' },
  { id: 'WD-10418', method: 'Bitcoin', amount: '€420.00', requested: '15/10 19:47', status: 'Pending' },
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
      <Link to="/wallet/pending-withdrawals" className="inline-flex items-center text-sm text-[var(--cb-yellow-dark)] font-semibold">
        View pending withdrawals <ChevronRight className="w-4 h-4" />
      </Link>
    </AccountLayout>
  )
}

export function PendingWithdrawals() {
  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cb-light-text)] mb-6">Pending withdrawals</h1>
      <div className="rounded-md bg-white border border-[var(--cb-light-border)] overflow-hidden mb-6">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-bold text-[var(--cb-light-muted)] uppercase tracking-wide border-b border-[var(--cb-light-border)]">
          <span>ID</span><span>Method</span><span>Amount</span><span>Requested</span><span>Status</span>
        </div>
        {PENDING_DEMO.map((w) => (
          <div key={w.id} className="grid md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-5 py-4 border-b border-[var(--cb-light-border)] last:border-0 items-center">
            <span className="text-sm font-mono text-[var(--cb-light-text)]">{w.id}</span>
            <span className="text-sm text-[var(--cb-light-muted)]">{w.method}</span>
            <span className="text-sm font-bold text-[var(--cb-light-text)]">{w.amount}</span>
            <span className="text-sm text-[var(--cb-light-muted)]">{w.requested}</span>
            <span className="justify-self-start md:justify-self-end flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#fdf5dc] text-[var(--cb-yellow-dark)] uppercase tracking-wide">{w.status}</span>
              <button className="text-xs font-bold text-[var(--cb-red)] hover:underline">Cancel</button>
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--cb-light-muted)] flex items-center gap-2">
        <WalletIcon className="w-4 h-4" />
        Demonstration data — no real transactions exist behind this prototype.
      </p>
    </AccountLayout>
  )
}

export function WalletRouter() {
  const { tab = 'deposit' } = useParams()
  switch (tab) {
    case 'deposit': return <Deposit />
    case 'withdraw': return <Withdraw />
    case 'pending-withdrawals': return <PendingWithdrawals />
    default: return <Navigate to="/wallet/deposit" replace />
  }
}
