import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Wallet as WalletIcon, ChevronRight } from 'lucide-react'
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

const DEPOSIT_NETWORKS = [
  {
    id: 'usdt-trc20',
    providerId: 'FulgurPayUSDT_T',
    name: 'USDT TRC20',
    currency: 'USDT',
    network: 'TRC20',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_fb502a456f24468b05f7f0a137d398df.png',
    note: 'Make sure to select the TRC20 network in your wallet before sending USDT. Transfers sent through the wrong network may be unrecoverable. A network fee may apply.',
  },
  {
    id: 'usdt-erc20',
    providerId: 'FulgurPayUSDT',
    name: 'USDT ERC20',
    currency: 'USDT',
    network: 'ERC20',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_6a67fddba81bc44523e53809cf27fae4.png',
    note: 'Make sure to select the ERC20 network in your wallet before sending USDT. Transfers sent through the wrong network may be unrecoverable. A network fee may apply.',
  },
  {
    id: 'usdt-bep20',
    providerId: 'FulgurPayUSDB',
    name: 'USDT BEP20',
    currency: 'USDT',
    network: 'BEP20',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_6506fbd7f9fc5edc41f25370f88d305d.png',
    note: 'Make sure to select the BEP20 network in your wallet before sending USDT. Transfers sent through the wrong network may be unrecoverable. A network fee may apply.',
  },
  {
    id: 'bnb-bep20',
    providerId: 'FulgurPayBNBB',
    name: 'BNB BEP20',
    currency: 'BNB',
    network: 'BEP20',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_9f93df8c02367b1c90ae61bfc0257bef.png',
    note: 'Make sure to use the BNB BEP20 network for this deposit. Sending assets through an incompatible network may result in permanent loss. A network fee may apply.',
  },
  {
    id: 'eth',
    providerId: 'FulgurPayETH',
    name: 'ETH',
    currency: 'ETH',
    network: 'Ethereum',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_0f7c2da286f5f55552eb50c93ec017b3.png',
    note: 'Send ETH using the Ethereum network shown by your deposit instructions. Network fees apply, and assets sent through an incompatible network may be unrecoverable.',
  },
  {
    id: 'ltc',
    providerId: 'FulgurPayLTC',
    name: 'LTC',
    currency: 'LTC',
    network: 'Litecoin',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_1bd0386374d84f042ea7475b53154851.png',
    note: 'Send LTC only through the Litecoin network shown by your deposit instructions. Network fees may apply.',
  },
  {
    id: 'trx',
    providerId: 'FulgurPayTRX',
    name: 'TRX',
    currency: 'TRX',
    network: 'TRON',
    image: 'https://icons.gigawin.io/storage/medias/gigabet-18761031/payment_18761031_4a3860f1fb4ee23c2344765ccb725b9e.png',
    note: 'Send TRX only through the TRON network shown by your deposit instructions. Network fees may apply.',
  },
] as const

export function Deposit() {
  const [selectedId, setSelectedId] = useState<string>(DEPOSIT_NETWORKS[0].id)
  const [amount, setAmount] = useState('1')
  const [notice, setNotice] = useState('')
  const selected = DEPOSIT_NETWORKS.find((item) => item.id === selectedId) ?? DEPOSIT_NETWORKS[0]
  const parsedAmount = Number(amount)
  const validAmount = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 10000

  return (
    <AccountLayout>
      <h1 className="mb-6 text-2xl font-extrabold text-[var(--cb-light-text)] md:text-3xl">Deposit</h1>

      <div className="w-full overflow-hidden rounded-xl border border-[var(--cb-light-border)] bg-white">
        <div className="border-b border-[var(--cb-light-border)] p-3 sm:p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--cb-light-muted)]">Choose deposit network</p>
          <div role="tablist" aria-label="Deposit networks" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {DEPOSIT_NETWORKS.map((network) => {
              const active = selectedId === network.id
              return (
                <button
                  key={network.id}
                  id={network.id + '-tab'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="deposit-network-panel"
                  onClick={() => { setSelectedId(network.id); setNotice('') }}
                  className={cn(
                    'flex min-w-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border px-3 py-3 text-center transition-colors sm:min-w-[124px]',
                    active
                      ? 'border-[var(--cb-yellow)] bg-[#fff9e5] shadow-[inset_0_0_0_1px_var(--cb-yellow)]'
                      : 'border-[var(--cb-light-border)] bg-white hover:border-zinc-400 hover:bg-zinc-50',
                  )}
                >
                  <span className="flex h-9 w-full items-center justify-center">
                    <img
                      src={network.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="max-h-9 max-w-[88px] object-contain"
                    />
                  </span>
                  <span className={cn('text-[11px] font-bold leading-4 sm:text-xs', active ? 'text-[var(--cb-light-text)]' : 'text-[var(--cb-light-muted)]')}>
                    {network.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <section id="deposit-network-panel" role="tabpanel" aria-labelledby={selected.id + '-tab'} className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.72fr)]">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--cb-light-border)] bg-white">
                <img src={selected.image} alt="" aria-hidden="true" className="max-h-8 max-w-[36px] object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-[var(--cb-light-text)]">{selected.name}</h2>
                <p className="mt-0.5 text-xs text-[var(--cb-light-muted)]">Deposit using {selected.network}</p>
              </div>
            </div>

            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (!validAmount) {
                  setNotice('Enter an amount between 1 and 10,000.')
                  return
                }
                setNotice('Preview only: no payment provider was contacted and no deposit was created.')
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="deposit-amount" className="mb-1.5 block text-xs font-semibold text-[var(--cb-light-text)]">Amount ({selected.currency})</label>
                <div className="relative">
                  <input
                    id="deposit-amount"
                    data-testid="amount-input"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max="10000"
                    step="0.01"
                    autoComplete="off"
                    value={amount}
                    onChange={(event) => { setAmount(event.target.value); setNotice('') }}
                    aria-invalid={amount !== '' && !validAmount}
                    className="h-11 w-full rounded-md border border-[var(--cb-light-border)] bg-white px-3 pr-16 text-sm text-[var(--cb-light-text)] outline-none transition focus:border-[var(--cb-yellow)] focus:ring-2 focus:ring-[var(--cb-yellow)]/20"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--cb-light-muted)]">{selected.currency}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-[#f7f9fa] px-3 py-2.5 text-xs">
                  <span className="text-[var(--cb-light-muted)]">Min / Max</span>
                  <span data-testid="minMaxAmount" className="font-semibold text-[var(--cb-light-text)]">1 {selected.currency} – 10,000 {selected.currency}</span>
                </div>
              </div>

              <button
                type="submit"
                data-testid="verify_button"
                disabled={!validAmount}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg bg-[var(--cb-yellow)] px-4 py-3 text-left font-bold text-[#071722] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                <span className="text-sm">Do Deposit</span>
                <span className="text-right text-[10px] sm:text-xs">
                  <span className="block font-medium opacity-80">Net Amount:</span>
                  <span className="block text-sm font-extrabold">{validAmount ? parsedAmount.toFixed(2) : '—'} {selected.currency}</span>
                </span>
              </button>
              {notice ? <p role="status" className="rounded-md border border-[var(--cb-light-border)] bg-[#f7f9fa] px-3 py-2.5 text-xs leading-5 text-[var(--cb-light-muted)]">{notice}</p> : null}
            </form>
          </div>

          <aside className="h-fit rounded-lg border border-[var(--cb-light-border)] bg-[#f8fafb] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-[var(--cb-light-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fff0be] text-[var(--cb-yellow-dark)]">!</span>
              Important payment information
            </div>
            <p className="text-xs leading-5 text-[var(--cb-light-muted)]">{selected.note}</p>
            <div className="mt-4 border-t border-[var(--cb-light-border)] pt-3 text-[10px] leading-5 text-[var(--cb-light-muted)]">
              Prototype only. Deposit requests are not sent to a live payment service and no funds move.
            </div>
          </aside>
        </section>
      </div>
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
