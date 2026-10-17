import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  User2, ChevronDown, ChevronUp, BadgeCheck, Gift, Wallet, HeartPulse, History,
} from 'lucide-react'
import { cn } from '../lib/shadcn/utils'

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
      { label: 'Available', path: '/account/bonuses-available' },
      { label: 'Active', path: '/account/bonuses-active' },
      { label: 'Closed', path: '/account/bonuses-closed' },
    ],
  },
  {
    key: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    links: [
      { label: 'Deposit', path: '/account/wallet/deposit' },
      { label: 'Withdraw', path: '/account/wallet/withdraw' },
      { label: 'Pending withdrawals', path: '/account/wallet/pending-withdrawals' },
    ],
  },
  {
    key: 'responsible',
    label: 'Responsible gaming',
    icon: HeartPulse,
    links: [
      { label: 'Self-exclusion', path: '/account/self-exclusion' },
      { label: 'Deposit limits', path: '/account/deposit-limits' },
      { label: 'Reality check', path: '/account/reality-check' },
    ],
  },
  {
    key: 'history',
    label: 'History',
    icon: History,
    links: [
      { label: 'Account statement', path: '/account/account-statement' },
      { label: 'Profit & Loss', path: '/account/profit-and-loss' },
    ],
  },
]

export function AccountPanel() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState<string[]>(['profile', 'wallet'])

  const toggle = (key: string) =>
    setOpen((o) => (o.includes(key) ? o.filter((k) => k !== key) : [...o, key]))

  return (
    <div className="w-full shrink-0 md:w-[260px] lg:w-[300px]">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-11 h-11 rounded-full bg-[var(--cb-yellow)] flex items-center justify-center">
          <User2 className="w-6 h-6 text-[var(--cb-light-text)]" />
        </span>
        <p className="text-[15px] font-bold text-[var(--cb-light-text)] truncate">
          Player account
        </p>
      </div>
      <div className="flex items-center gap-2 bg-[#fdf5dc] rounded-md px-3 py-2 mb-4">
        <BadgeCheck className="w-4 h-4 text-[var(--cb-yellow-dark)]" />
        <span className="text-xs font-semibold text-[var(--cb-yellow-dark)]">KYC unverified</span>
      </div>

      <div className="grid grid-cols-2 rounded-md border border-[var(--cb-light-border)] bg-white overflow-hidden mb-6">
        <div className="p-3 text-center">
          <p className="text-xs text-[var(--cb-light-muted)]">Real balance</p>
          <p className="text-base font-bold text-[var(--cb-light-text)]">€0.00</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-[var(--cb-light-muted)]">Bonus balance</p>
          <p className="text-base font-bold text-[var(--cb-light-text)]">€0.00</p>
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
                        pathname === l.path
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
    { label: 'Deposit', path: '/account/wallet/deposit' },
    { label: 'Withdraw', path: '/account/wallet/withdraw' },
    { label: 'Pending withdrawals', path: '/account/wallet/pending-withdrawals' },
  ]
  const bonusLinks = [
    { label: 'Available', path: '/account/bonuses-available' },
    { label: 'Active', path: '/account/bonuses-active' },
    { label: 'Closed', path: '/account/bonuses-closed' },
  ]
  const responsibleLinks = [
    { label: 'Self-exclusion', path: '/account/self-exclusion' },
    { label: 'Deposit limits', path: '/account/deposit-limits' },
    { label: 'Reality check', path: '/account/reality-check' },
  ]
  const historyLinks = [
    { label: 'Account statement', path: '/account/account-statement' },
    { label: 'Profit & Loss', path: '/account/profit-and-loss' },
  ]

  const mobileLinks = pathname.startsWith('/account/wallet/')
    ? walletLinks
    : pathname.startsWith('/account/bonuses-')
      ? bonusLinks
      : ['/account/self-exclusion', '/account/deposit-limits', '/account/reality-check'].includes(pathname)
        ? responsibleLinks
        : ['/account/account-statement', '/account/profit-and-loss'].includes(pathname)
          ? historyLinks
          : profileLinks
  const isAccountHome = pathname === '/account'

  return (
    <div className="cb-light min-h-full w-full flex-1">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 md:flex-row md:gap-6 md:px-8 lg:gap-10">
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
                      pathname === link.path
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
