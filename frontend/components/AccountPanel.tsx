import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  User2, ChevronDown, ChevronUp, BadgeCheck, Gift, Wallet, History, Copy,
} from 'lucide-react'
import { cn } from '../lib/shadcn/utils'
import { useAuth } from '../contexts/AuthContext'
import { fetchWalletBalance, type WalletBalance } from '../lib/walletApi'

/* Account side panel recreated from the reference deposit screenshot — light
   content surface, avatar chip, KYC notice, balances, expandable menu groups. */

const GROUPS = [
  {
    key: 'profile',
    label: 'My profile',
    icon: User2,
    links: [
      { label: 'Personal info', path: '/account/personal-info' },
      { label: 'Documents', path: '/account/documents' },
      { label: 'Change password', path: '/account/change-password' },
      { label: 'Messages', path: '/account/messages' },
    ],
  },
  {
    key: 'bonuses',
    label: 'Bonuses',
    icon: Gift,
    links: [
      { label: 'Sports', path: '/account/bonuses/sports' },
      { label: 'Casino', path: '/account/bonuses/casino' },
      { label: 'Promo Code', path: '/account/bonuses/promo-code' },
      { label: 'Activity History', path: '/account/bonuses/activity-history' },
    ],
  },
  {
    key: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    links: [
      { label: 'Balance', path: '/account/wallet/balance' },
      { label: 'Deposit', path: '/account/wallet/deposit' },
      { label: 'Withdraw', path: '/account/wallet/withdraw' },
      { label: 'Transaction History', path: '/account/wallet/transaction-history' },
    ],
  },
  {
    key: 'history',
    label: 'History',
    icon: History,
    links: [
      { label: 'Sports', path: '/account/betslips' },
      { label: 'Casino', path: '/account/casino-history' },
    ],
  },
]

export function AccountPanel() {
  const { pathname } = useLocation()
  const { player } = useAuth()
  const [open, setOpen] = useState<string[]>(['profile', 'wallet'])
  const [copiedUserId, setCopiedUserId] = useState(false)
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null)
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(true)

  useEffect(() => {
    if (!player) {
      setWalletBalance(null)
      setWalletBalanceLoading(false)
      return
    }
    const controller = new AbortController()
    setWalletBalanceLoading(true)
    void fetchWalletBalance(player.settlementCurrency, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setWalletBalance(result) })
      .catch(() => { if (!controller.signal.aborted) setWalletBalance(null) })
      .finally(() => { if (!controller.signal.aborted) setWalletBalanceLoading(false) })
    return () => controller.abort()
  }, [player?.id, player?.settlementCurrency])

  const copyUserId = async () => {
    if (!player?.id) return
    try {
      await navigator.clipboard.writeText(player.playerNumber)
      setCopiedUserId(true)
    } catch {
      setCopiedUserId(false)
    }
  }

  const verificationLabel = player?.verificationStatus === 'verified'
    ? 'Verified'
    : player?.verificationStatus === 'rejected'
      ? 'Verification rejected'
      : player?.verificationStatus === 'expired'
        ? 'Verification expired'
        : player?.verificationStatus === 'not_required'
          ? 'Verification not required'
          : 'KYC unverified'

  const toggle = (key: string) =>
    setOpen((o) => (o.includes(key) ? o.filter((k) => k !== key) : [...o, key]))

  return (
    <div className="w-full shrink-0 md:w-[260px] lg:w-[300px]">
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--cb-yellow)]">
          <User2 className="h-6 w-6 text-[var(--cb-light-text)]" />
        </span>
        <div className="Account-nameAndIdStyles flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="firstAndLastName">
            <span className="large block truncate text-base leading-5 font-bold text-[var(--cb-light-text)]">{player?.displayName || player?.email || "Player"}</span>
          </div>
          <div className="userId mt-0 flex min-w-0 items-center gap-1 text-xs text-[var(--cb-light-muted)]">
            <span className="shrink-0">ID:</span>
            <span className="Copy-Text-copyTextStyles inline-flex min-w-0 items-center gap-1">
              <span className="truncate font-semibold text-[var(--cb-light-text)]" title={player?.playerNumber}>{player?.playerNumber ?? "—"}</span>
              <button
                type="button"
                onClick={copyUserId}
                aria-label={copiedUserId ? 'User ID copied' : 'Copy user ID'}
                title={copiedUserId ? 'Copied' : 'Copy ID'}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--cb-light-muted)] transition-colors hover:text-[var(--cb-light-text)]"
              >
                {copiedUserId ? <BadgeCheck className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-[#fdf5dc] rounded-md px-3 py-2 mb-4">
        <BadgeCheck className="w-4 h-4 text-[var(--cb-yellow-dark)]" />
        <span className="text-xs font-semibold text-[var(--cb-yellow-dark)]">{verificationLabel}</span>
      </div>

      <div className="grid grid-cols-2 rounded-md border border-[var(--cb-light-border)] bg-white overflow-hidden mb-6">
        <Link to="/account/wallet/balance" className="min-w-0 p-3 text-center transition-colors hover:bg-black/5">
          <p className="text-xs text-[var(--cb-light-muted)]">Wallet balance</p>
          <p className="mt-1 break-words text-sm font-bold text-[var(--cb-light-text)]">
            {walletBalanceLoading ? 'Loading…' : walletBalance ? walletBalance.balance + ' ' + walletBalance.currency : 'Unavailable'}
          </p>
        </Link>
        <div className="min-w-0 p-3 text-center">
          <p className="text-xs text-[var(--cb-light-muted)]">Bonus-restricted</p>
          <p className="mt-1 break-words text-sm font-bold text-[var(--cb-light-text)]">
            {walletBalanceLoading ? 'Loading…' : walletBalance?.bonusRestrictedBalance ?? 'Not enabled'}
            {walletBalance?.bonusRestrictedBalance ? ' ' + walletBalance.currency : ''}
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {GROUPS.map((g) => {
          const expanded = open.includes(g.key)
          return (
            <div key={g.key}>
              <button
                onClick={() => toggle(g.key)}
                aria-expanded={expanded}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-md text-base font-bold text-[var(--cb-light-text)] hover:bg-black/5 transition-colors',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <g.icon className="w-4 h-4 text-[var(--cb-light-text)]" />
                  {g.label}
                </span>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--cb-light-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--cb-light-muted)]" />
                )}
              </button>
              {expanded ? (
                <div className="pb-2">
                  {g.links.map((l) => (
                    <Link
                      key={l.path}
                      to={l.path}
                      className={cn(
                        'block px-3 py-3 rounded-md text-sm transition-colors',
                        (pathname === l.path || (l.path === '/account/betslips' && pathname.startsWith('/account/betslips/')) || (l.path === '/account/casino-history' && pathname.startsWith('/account/casino-history')))
                          ? 'bg-[var(--cb-light-selected)] text-[var(--cb-light-text)]'
                          : 'text-[var(--cb-light-text)] hover:bg-black/5',
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

export function AccountLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const profileLinks = [
    { label: 'Personal info', path: '/account/personal-info' },
    { label: 'Documents', path: '/account/documents' },
    { label: 'Change password', path: '/account/change-password' },
    { label: 'Messages', path: '/account/messages' },
  ]
  const walletLinks = [
    { label: 'Balance', path: '/account/wallet/balance' },
    { label: 'Deposit', path: '/account/wallet/deposit' },
    { label: 'Withdraw', path: '/account/wallet/withdraw' },
    { label: 'Transaction History', path: '/account/wallet/transaction-history' },
  ]
  const bonusLinks = [
    { label: 'Sports', path: '/account/bonuses/sports' },
    { label: 'Casino', path: '/account/bonuses/casino' },
    { label: 'Promo Code', path: '/account/bonuses/promo-code' },
    { label: 'Activity History', path: '/account/bonuses/activity-history' },
  ]
  const historyLinks = [
    { label: 'Sports', path: '/account/betslips' },
    { label: 'Casino', path: '/account/casino-history' },
  ]

  const mobileLinks = pathname.startsWith('/account/wallet/')
    ? walletLinks
    : pathname.startsWith('/account/bonuses')
      ? bonusLinks
      : (pathname.startsWith('/account/betslips') || pathname.startsWith('/account/casino-history'))
        ? historyLinks
        : profileLinks
  const isAccountHome = pathname === '/account'

  return (
    <div className="cb-light min-h-full w-full flex-1">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-6 lg:gap-10">
        <aside className="hidden shrink-0 md:block">
          <AccountPanel />
        </aside>
        <div className="min-w-0 flex-1">
          {isAccountHome ? (
            <div className="md:hidden"><AccountPanel /></div>
          ) : (
            <>
              <div className="mb-4 md:hidden">
                <Link
                  to="/account"
                  className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-[var(--cb-light-muted)] transition-colors hover:text-[var(--cb-light-text)]"
                >
                  <span aria-hidden="true" className="text-lg leading-none">‹</span>
                  Back to account
                </Link>
              </div>
              <nav aria-label="Account sections" className="mb-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
                {mobileLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-current={pathname === link.path ? 'page' : undefined}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded border px-3 py-2 text-sm transition-colors',
                      (pathname === link.path || (link.path === '/account/betslips' && pathname.startsWith('/account/betslips/')) || (link.path === '/account/casino-history' && pathname.startsWith('/account/casino-history')))
                        ? 'border-[var(--cb-light-border)] bg-[var(--cb-light-selected)] font-semibold text-[var(--cb-light-text)]'
                        : 'border-transparent text-[var(--cb-light-muted)] hover:bg-black/5',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </>
          )}
          <div className={cn('min-w-0 flex-1', isAccountHome ? 'hidden md:block' : '')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
