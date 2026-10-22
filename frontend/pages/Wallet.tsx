import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Wallet as WalletIcon, ChevronRight, ChevronLeft, RefreshCw, ArrowDownRight, ArrowUpRight, Clock3 } from 'lucide-react'
import { AccountLayout } from '../components/AccountPanel'
import { PAYMENT_METHODS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'
import { useAuth } from '../contexts/AuthContext'
import { fetchWalletBalance, fetchWalletStatementPage, type WalletBalance as WalletBalanceData, type WalletCurrency, type WalletStatementRow } from '../lib/walletApi'

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

function useWalletBalance() {
  const { player } = useAuth()
  const currency = player?.settlementCurrency ?? null
  const [balance, setBalance] = useState<WalletBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    if (!currency) {
      setBalance(null)
      setError('Your settlement currency is unavailable.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetchWalletBalance(currency, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setBalance(result) })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setBalance(null)
        setError(cause instanceof Error ? cause.message : 'Could not load your wallet balance.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [player?.id, currency, refreshVersion])

  return {
    balance,
    loading,
    error,
    refresh: () => setRefreshVersion((value) => value + 1),
  }
}

function formatStatementDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function readableMovementType(value: string): string {
  return value.replace(/_/g, ' ').replace(/\\b\\w/g, (letter) => letter.toUpperCase())
}

export function WalletBalancePage() {
  const { balance, loading, error, refresh } = useWalletBalance()

  const amount = (value: string | undefined) => {
    if (loading) return 'Loading…'
    if (error || !balance || value === undefined) return 'Unavailable'
    return value + ' ' + balance.currency
  }

  return (
    <AccountLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--cb-light-text)] md:text-3xl">Wallet balance</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--cb-light-muted)]">
            Your balance is read directly from the Bclick ledger for your account settlement currency.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--cb-light-border)] bg-white px-3 text-sm font-semibold text-[var(--cb-light-text)] transition hover:bg-black/5 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
          Refresh
        </button>
      </div>

      {error ? (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={refresh} className="font-bold underline underline-offset-2">Try again</button>
        </div>
      ) : null}

      <section aria-label="Wallet balances" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#0a1b26] p-5 text-white sm:col-span-3">
          <p className="text-sm font-medium text-white/70">Total wallet balance</p>
          <p className="mt-3 break-words text-3xl font-extrabold tracking-tight md:text-4xl" aria-live="polite">
            {amount(balance?.balance)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/65">
            <span className="rounded-full bg-white/10 px-2.5 py-1">Ledger-backed</span>
            {balance && !loading && !error ? <span>Updated {formatStatementDate(balance.asOf)}</span> : null}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--cb-light-border)] bg-white p-4">
          <p className="text-xs font-semibold text-[var(--cb-light-muted)]">Available balance</p>
          <p className="mt-2 break-words text-xl font-extrabold text-[var(--cb-light-text)]">{amount(balance?.available)}</p>
          <p className="mt-1 text-xs text-[var(--cb-light-muted)]">Cash currently available in the ledger.</p>
        </div>
        <div className="rounded-lg border border-[var(--cb-light-border)] bg-white p-4">
          <p className="text-xs font-semibold text-[var(--cb-light-muted)]">Held balance</p>
          <p className="mt-2 break-words text-xl font-extrabold text-[var(--cb-light-text)]">{amount(balance?.held)}</p>
          <p className="mt-1 text-xs text-[var(--cb-light-muted)]">Funds recorded in the held account.</p>
        </div>
        <div className="rounded-lg border border-[var(--cb-light-border)] bg-white p-4">
          <p className="text-xs font-semibold text-[var(--cb-light-muted)]">Bonus-restricted funds</p>
          <p className="mt-2 break-words text-xl font-extrabold text-[var(--cb-light-text)]">
            {loading ? 'Loading…' : error || !balance ? 'Unavailable' : balance.bonusRestrictedBalance === null ? 'Not enabled' : amount(balance.bonusRestrictedBalance)}
          </p>
          <p className="mt-1 text-xs text-[var(--cb-light-muted)]">Shown separately when that account type is enabled.</p>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--cb-light-border)] bg-white p-4 sm:p-5">
        <h2 className="text-base font-extrabold text-[var(--cb-light-text)]">Wallet actions</h2>
        <p className="mt-1 text-sm text-[var(--cb-light-muted)]">
          Payment requests are not connected yet. These links open the current preview screens only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/account/wallet/transaction-history" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--cb-yellow)] px-4 text-sm font-bold text-[#071722]">
            <Clock3 className="h-4 w-4" /> View statement
          </Link>
          <Link to="/account/wallet/deposit" className="inline-flex min-h-10 items-center rounded-md border border-[var(--cb-light-border)] px-4 text-sm font-semibold text-[var(--cb-light-text)] hover:bg-black/5">
            Deposit preview
          </Link>
          <Link to="/account/wallet/withdraw" className="inline-flex min-h-10 items-center rounded-md border border-[var(--cb-light-border)] px-4 text-sm font-semibold text-[var(--cb-light-text)] hover:bg-black/5">
            Withdrawal preview
          </Link>
        </div>
      </section>
    </AccountLayout>
  )
}

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
  const { balance, loading: balanceLoading, error: balanceError, refresh: refreshBalance } = useWalletBalance()

  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cb-light-text)] mb-6">Withdraw</h1>
      <div className="rounded-md bg-white border border-[var(--cb-light-border)] p-5 md:p-6 mb-6 max-w-xl">
        <div className="mb-5">
          <p className="text-xs text-[var(--cb-light-muted)] mb-1">Available balance</p>
          <p className="break-words text-2xl font-extrabold text-[var(--cb-light-text)] font-mono">
            {balanceLoading ? 'Loading…' : balanceError || !balance ? 'Unavailable' : balance.available + ' ' + balance.currency}
          </p>
          {balanceError ? <p role="alert" className="mt-2 text-xs text-red-700">{balanceError} <button type="button" onClick={refreshBalance} className="font-bold underline">Retry</button></p> : null}
        </div>

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
        <button type="button" disabled title="Withdrawals are not enabled yet" className="h-11 cursor-not-allowed rounded-lg cb-yellow px-6 text-sm font-bold text-primary-foreground opacity-50">
          Withdrawals not enabled
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
  const { player } = useAuth()
  const currency = player?.settlementCurrency ?? null
  const [entries, setEntries] = useState<WalletStatementRow[]>([])
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const cursor = pageCursors[pageIndex] ?? null

  useEffect(() => {
    if (!currency) {
      setEntries([])
      setError('Your settlement currency is unavailable.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetchWalletStatementPage(currency, cursor, 25, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setEntries(result.data)
        setNextCursor(result.page.nextCursor)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setEntries([])
        setNextCursor(null)
        setError(cause instanceof Error ? cause.message : 'Could not load your wallet statement.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [player?.id, currency, cursor, refreshVersion])

  const goNext = () => {
    if (!nextCursor || loading) return
    setPageCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor])
    setPageIndex(pageIndex + 1)
  }
  const goPrevious = () => {
    if (loading || pageIndex === 0) return
    setPageIndex((current) => Math.max(0, current - 1))
  }

  return (
    <AccountLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--cb-light-text)] md:text-3xl">Wallet statement</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--cb-light-muted)]">
            Posted ledger movements for your {currency ?? 'account'} settlement wallet. This is not a payment-request history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshVersion((value) => value + 1)}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--cb-light-border)] bg-white px-3 text-sm font-semibold text-[var(--cb-light-text)] hover:bg-black/5 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} /> Refresh
        </button>
      </div>

      {error ? (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="font-bold underline underline-offset-2">Try again</button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[var(--cb-light-border)] bg-white">
        <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[var(--cb-light-border)] bg-[#f8f9fa] px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)] md:grid">
          <span>Movement</span><span>Reference</span><span>Date</span><span className="text-right">Amount</span>
        </div>
        {loading ? (
          <div role="status" className="px-5 py-10 text-center text-sm text-[var(--cb-light-muted)]">Loading posted ledger movements…</div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--cb-light-muted)]">Statement unavailable. No transaction data is being shown.</div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-[var(--cb-light-muted)]" />
            <p className="mt-3 text-sm font-bold text-[var(--cb-light-text)]">No posted ledger movements yet</p>
            <p className="mt-1 text-xs text-[var(--cb-light-muted)]">When a ledger movement is posted, it will appear here. No demo transactions are displayed.</p>
          </div>
        ) : (
          entries.map((entry) => {
            const debit = entry.amount.startsWith('-')
            return (
              <article key={entry.id} className="grid gap-2 border-b border-[var(--cb-light-border)] px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', debit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
                    {debit ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--cb-light-text)]">{readableMovementType(entry.type)}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--cb-light-muted)]">Posted</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-[var(--cb-light-muted)] md:hidden">Reference</span>
                  <span className="break-all font-mono text-xs text-[var(--cb-light-text)]">{entry.reference}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--cb-light-muted)] md:hidden">Date</span>
                  <span className="text-xs text-[var(--cb-light-muted)]">{formatStatementDate(entry.createdAt)}</span>
                </div>
                <div className="text-left md:text-right">
                  <span className="block text-[10px] text-[var(--cb-light-muted)] md:hidden">Amount</span>
                  <span className={cn('text-sm font-extrabold tabular-nums', debit ? 'text-red-700' : 'text-green-700')}>
                    {entry.amount} {entry.currency}
                  </span>
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrevious}
          disabled={loading || pageIndex === 0}
          className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[var(--cb-light-border)] bg-white px-3 text-sm font-semibold text-[var(--cb-light-text)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="text-xs text-[var(--cb-light-muted)]">Page {pageIndex + 1}</span>
        <button
          type="button"
          onClick={goNext}
          disabled={loading || !nextCursor}
          className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[var(--cb-light-border)] bg-white px-3 text-sm font-semibold text-[var(--cb-light-text)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </AccountLayout>
  )
}

export const PendingWithdrawals = TransactionHistory

export function WalletRouter() {
  const { tab = 'deposit' } = useParams()
  switch (tab) {
    case 'balance': return <WalletBalancePage />
    case 'deposit': return <Deposit />
    case 'withdraw': return <Withdraw />
    case 'transaction-history': return <TransactionHistory />
    case 'pending-withdrawals': return <Navigate to="/account/wallet/transaction-history" replace />
    default: return <Navigate to="/account/wallet/balance" replace />
  }
}
