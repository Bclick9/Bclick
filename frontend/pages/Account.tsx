import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BadgeCheck, CircleCheck, Eye, FileText, Gift, History, Inbox, ShieldAlert, UserRound, Wallet, X,
} from 'lucide-react'
import { AccountLayout } from '../components/AccountPanel'
import { cn } from '../lib/shadcn/utils'
import { useAuth } from '../contexts/AuthContext'

type Section = {
  title: string
  subtitle: string
}

const SECTIONS: Record<string, Section> = {
  'personal-info': { title: 'Personal info', subtitle: 'Review the personal details saved on your account.' },
  profile: { title: 'Personal info', subtitle: 'Review the personal details saved on your account.' },
  documents: { title: 'Documents', subtitle: 'Verify your account identity and document status.' },
  'change-password': { title: 'Change password', subtitle: 'Keep your account secure with a strong password.' },
  messages: { title: 'Messages', subtitle: 'Your account messages and notifications appear here.' },
  bonuses: { title: 'Bonuses', subtitle: 'Browse sports and casino bonuses, redeem a promo code, and review bonus activity.' },
  'self-exclusion': { title: 'Self-exclusion', subtitle: 'Manage access breaks and self-exclusion settings.' },
  'deposit-limits': { title: 'Deposit limits', subtitle: 'Set personal limits to help manage your play.' },
  'reality-check': { title: 'Reality check', subtitle: 'Review reminders about time spent playing.' },
  betslips: { title: 'Sports Betslips', subtitle: 'Review your sports bets and open each ticket for full details.' },
  'casino-history': { title: 'Casino History', subtitle: 'Review your wagers on casino games and their results.' },
}

function ReadOnlyField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'min-w-0 space-y-1 md:col-span-2' : 'min-w-0 space-y-1'}>
      <label className="block truncate text-xs text-[var(--cb-light-muted)]">{label}</label>
      <input
        value={value}
        disabled
        readOnly
        className="block w-full min-w-0 border border-[var(--cb-light-border)] bg-white px-4 py-2.5 text-sm text-[var(--cb-light-text)] outline-none disabled:opacity-70"
      />
    </div>
  )
}

function countryLabel(code?: string): string {
  if (!code) return '—'
  const countries: Record<string, string> = {
    TN: 'Tunisia', FR: 'France', GB: 'United Kingdom', US: 'United States',
    DE: 'Germany', IT: 'Italy', ES: 'Spain',
  }
  return countries[code] ?? code
}

function statusLabel(value?: string): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function AccountPage() {
  const { pathname } = useLocation()
  const { player, refreshPlayerProfile, updatePlayerProfile } = useAuth()
  const isAccountHome = pathname === '/account'
  const pathParts = pathname.split('/').filter(Boolean)
  const sectionKey = isAccountHome ? 'overview' : (pathParts[1] || 'personal-info')
  const selectedBetId = sectionKey === 'betslips' ? pathParts[2] : undefined
  const bonusTab = sectionKey === 'bonuses' ? (pathParts[2] || 'sports') : 'sports'
  const selectedBet = selectedBetId ? BETSLIPS_DEMO.find((bet) => bet.id === selectedBetId) : undefined
  const section = selectedBetId
    ? { title: 'Betslip details', subtitle: selectedBet ? `Review ticket ${selectedBet.id} and its event results.` : 'The requested betslip could not be found.' }
    : sectionKey === 'overview'
      ? { title: 'Account overview', subtitle: 'Manage your profile and account services from one place.' }
      : (SECTIONS[sectionKey] ?? SECTIONS['personal-info']!)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [displayName, setDisplayName] = useState(player?.displayName ?? '')
  const [language, setLanguage] = useState(player?.language ?? 'en')
  const [saved, setSaved] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let active = true
    setProfileError('')
    if (!player) {
      setProfileLoading(false)
      return () => { active = false }
    }

    setProfileLoading(true)
    void refreshPlayerProfile()
      .then((freshPlayer) => {
        if (!active) return
        setDisplayName(freshPlayer.displayName ?? '')
        setLanguage(freshPlayer.language || 'en')
      })
      .catch((error: unknown) => {
        if (!active) return
        setProfileError(error instanceof Error ? error.message : 'Could not load your profile.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    return () => { active = false }
  }, [player?.id, refreshPlayerProfile])

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError('')
    setProfileNotice('')
    setProfileSaving(true)
    try {
      const updatedPlayer = await updatePlayerProfile({ displayName, language })
      setDisplayName(updatedPlayer.displayName)
      setLanguage(updatedPlayer.language || 'en')
      setProfileNotice('Your profile changes have been saved.')
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <AccountLayout>
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-[var(--cb-light-text)] md:text-2xl">
              <span className="md:hidden">{pathname === '/account' ? 'My profile' : section.title}</span>
              <span className="hidden md:inline">{section.title}</span>
            </h1>
            <p className="mt-1 hidden text-sm text-[var(--cb-light-muted)] sm:block">{section.subtitle}</p>
          </div>
        </div>

        {sectionKey === 'overview' ? (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-3" aria-label="Account summary">
              <div className="flex min-w-0 items-center gap-3 border border-[var(--cb-light-border)] bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff5d6] text-[#846300]">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--cb-light-muted)]">Verification status</p>
                  <p className="mt-1 truncate text-sm font-bold text-[var(--cb-light-text)]">KYC unverified</p>
                </div>
              </div>
              <div className="border border-[var(--cb-light-border)] bg-white p-4">
                <p className="text-xs text-[var(--cb-light-muted)]">Balance (demo)</p>
                <p className="mt-1 text-sm font-bold text-[var(--cb-light-text)]">Not connected</p>
              </div>
              <div className="border border-[var(--cb-light-border)] bg-white p-4">
                <p className="text-xs text-[var(--cb-light-muted)]">Bonus balance (demo)</p>
                <p className="mt-1 text-sm font-bold text-[var(--cb-light-text)]">Not connected</p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-base font-bold text-[var(--cb-light-text)]">Quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/account/personal-info" className="group flex min-w-0 items-center gap-3 border border-[var(--cb-light-border)] bg-white p-4 transition-colors hover:border-[var(--cb-yellow)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f5f7f8] text-[var(--cb-light-text)]"><UserRound className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[var(--cb-light-text)]">Personal info</span><span className="mt-1 block text-xs text-[var(--cb-light-muted)]">Review your profile details</span></span>
                  <span aria-hidden="true" className="text-lg text-[var(--cb-light-muted)] transition-transform group-hover:translate-x-0.5">›</span>
                </Link>
                <Link to="/account/documents" className="group flex min-w-0 items-center gap-3 border border-[var(--cb-light-border)] bg-white p-4 transition-colors hover:border-[var(--cb-yellow)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f5f7f8] text-[var(--cb-light-text)]"><FileText className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[var(--cb-light-text)]">Documents</span><span className="mt-1 block text-xs text-[var(--cb-light-muted)]">Check verification status</span></span>
                  <span aria-hidden="true" className="text-lg text-[var(--cb-light-muted)] transition-transform group-hover:translate-x-0.5">›</span>
                </Link>
                <Link to="/account/wallet/deposit" className="group flex min-w-0 items-center gap-3 border border-[var(--cb-light-border)] bg-white p-4 transition-colors hover:border-[var(--cb-yellow)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f5f7f8] text-[var(--cb-light-text)]"><Wallet className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[var(--cb-light-text)]">Deposit</span><span className="mt-1 block text-xs text-[var(--cb-light-muted)]">Go to your wallet</span></span>
                  <span aria-hidden="true" className="text-lg text-[var(--cb-light-muted)] transition-transform group-hover:translate-x-0.5">›</span>
                </Link>
                <Link to="/account/messages" className="group flex min-w-0 items-center gap-3 border border-[var(--cb-light-border)] bg-white p-4 transition-colors hover:border-[var(--cb-yellow)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f5f7f8] text-[var(--cb-light-text)]"><Inbox className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[var(--cb-light-text)]">Messages</span><span className="mt-1 block text-xs text-[var(--cb-light-muted)]">View account notifications</span></span>
                  <span aria-hidden="true" className="text-lg text-[var(--cb-light-muted)] transition-transform group-hover:translate-x-0.5">›</span>
                </Link>
              </div>
            </section>
            <p className="text-xs text-[var(--cb-light-muted)]">Demonstration account — balances and verification status are not connected to a live account.</p>
          </div>
        ) : null}

        {sectionKey === 'documents' ? (
          <div className="max-w-2xl border border-[var(--cb-light-border)] bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff5d6] text-[#846300]">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-[var(--cb-light-text)]">Identity verification</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--cb-light-muted)]">
                  Your identity documents have not been verified yet. Follow the instructions from support to complete verification.
                </p>
                <span className="mt-3 inline-flex items-center gap-2 rounded bg-[#fff5d6] px-2.5 py-1.5 text-xs font-bold text-[#846300]">
                  <BadgeCheck className="h-4 w-4" /> KYC unverified
                </span>
              </div>
            </div>
            <p className="mt-5 border-t border-[var(--cb-light-border)] pt-4 text-xs text-[var(--cb-light-muted)]">
              Demonstration page only. Document uploads and verification are not connected.
            </p>
          </div>
        ) : null}

        {sectionKey === 'personal-info' || sectionKey === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="grid gap-x-6 gap-y-4 md:grid-cols-2" aria-busy={profileLoading || profileSaving}>
            <div className="min-w-0 space-y-1">
              <label htmlFor="account-display-name" className="block truncate text-xs text-[var(--cb-light-muted)]">Display name</label>
              <input
                id="account-display-name"
                name="displayName"
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => { setDisplayName(event.target.value); setProfileNotice('') }}
                minLength={1}
                maxLength={80}
                required
                disabled={profileLoading || profileSaving}
                className="block w-full border border-[var(--cb-light-border)] bg-white px-4 py-2.5 text-sm text-[var(--cb-light-text)] outline-none focus:border-[var(--cb-yellow)] disabled:opacity-60"
              />
            </div>
            <ReadOnlyField label="Email" value={player?.email ?? '—'} />
            <ReadOnlyField label="Country" value={countryLabel(player?.countryCode)} />
            <ReadOnlyField label="Account currency" value={player?.settlementCurrency ?? '—'} />
            <div className="min-w-0 space-y-1">
              <label htmlFor="account-language" className="block truncate text-xs text-[var(--cb-light-muted)]">Language</label>
              <select
                id="account-language"
                name="language"
                value={language}
                onChange={(event) => { setLanguage(event.target.value); setProfileNotice('') }}
                disabled={profileLoading || profileSaving}
                className="block w-full border border-[var(--cb-light-border)] bg-white px-4 py-2.5 text-sm text-[var(--cb-light-text)] outline-none focus:border-[var(--cb-yellow)] disabled:opacity-60"
              >
                {!['en', 'fr', 'ar'].includes(language) ? <option value={language}>{language}</option> : null}
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <ReadOnlyField label="Account status" value={statusLabel(player?.status)} />
            <ReadOnlyField label="Verification status" value={statusLabel(player?.verificationStatus)} />
            {profileLoading ? (
              <p className="text-xs text-[var(--cb-light-muted)] md:col-span-2" role="status">Loading your profile from Bclick API…</p>
            ) : null}
            {profileError ? (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 md:col-span-2" role="alert">{profileError}</p>
            ) : null}
            {profileNotice ? (
              <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800 md:col-span-2" role="status">{profileNotice}</p>
            ) : null}
            <div className="flex flex-col gap-3 py-2 md:col-span-2">
              <button
                type="submit"
                disabled={profileLoading || profileSaving || !displayName.trim()}
                className="relative w-fit border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold uppercase text-[#071722] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
              <p className="text-xs leading-relaxed text-[var(--cb-light-muted)]">
                Display name and language are saved to your player account. Fields not yet supported by the profile API, such as address, phone, date of birth display, and notification preferences, are not editable here.
              </p>
            </div>
          </form>
        ) : null}

        {sectionKey === 'change-password' ? (
          <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-[var(--cb-light-border)] bg-white p-5 md:p-6">
            <PasswordField label="Current password" value={oldPassword} onChange={setOldPassword} />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
            <button type="submit" className="bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold uppercase text-[#071722]">Submit</button>
            <p className="text-xs text-[var(--cb-light-muted)]">Prototype only. Your password is not changed or sent anywhere.</p>
          </form>
        ) : null}

        {sectionKey === 'messages' ? (
          <EmptyState icon={Inbox} title="No messages yet" detail="Account messages and notifications will appear here." />
        ) : null}

        {sectionKey === 'bonuses' ? <BonusesCenter tab={bonusTab} /> : null}

        {['self-exclusion', 'deposit-limits', 'reality-check'].includes(sectionKey) ? (
          <div className="max-w-2xl border border-[var(--cb-light-border)] bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cb-yellow-dark)]" />
              <div>
                <h2 className="font-bold text-[var(--cb-light-text)]">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cb-light-muted)]">Responsible gaming controls are displayed as a prototype. Changes are not saved and no limits are applied.</p>
              </div>
            </div>
          </div>
        ) : null}

        {sectionKey === 'betslips' ? (
          selectedBetId
            ? selectedBet
              ? <BetslipTicketPage bet={selectedBet} />
              : <EmptyState icon={History} title="Betslip not found" detail="This ticket may no longer be available. Return to Sports history to choose another ticket." />
            : <BetslipsSection />
        ) : null}

        {sectionKey === 'casino-history' ? <CasinoHistorySection /> : null}

        {!SECTIONS[sectionKey] && sectionKey !== 'profile' && sectionKey !== 'overview' ? (
          <EmptyState icon={UserRound} title="Account overview" detail="Choose a section from the account menu to view its details." />
        ) : null}
      </div>
    </AccountLayout>
  )
}


type BetEvent = {
  event: string
  start: string
  market: string
  selection: string
  odds: string
  score: string
  result: 'won' | 'lost' | 'pending'
}

type DemoBetslip = {
  id: string
  date: string
  stake: string
  type: 'Multiple' | 'Single'
  bonus: string
  gain: string
  status: 'Won' | 'Lost' | 'Pending' | 'Cash out'
  paymentDate: string
  events: BetEvent[]
}

const BETSLIPS_DEMO: DemoBetslip[] = [
  {
    id: 'BS-782194',
    date: '21/02/2016 22:21',
    stake: '€10.00',
    type: 'Multiple',
    bonus: '€33.00',
    gain: '€115.50',
    status: 'Won',
    paymentDate: '21/02/2016 22:21:00',
    events: [
      { event: 'Italy - Serie A - Inter - Sampdoria', start: '20/02/2016 20:45:00', market: 'Double chance', selection: '1X', odds: '1.13', score: '3 - 1', result: 'won' },
      { event: 'Spain - Liga BBVA - Las Palmas - Barcelona', start: '20/02/2016 16:00:00', market: '1X2', selection: '2', odds: '1.19', score: '1 - 2', result: 'won' },
      { event: 'Spain - Liga BBVA - Atl. Madrid - Villarreal', start: '21/02/2016 20:30:00', market: 'Double chance', selection: '1X', odds: '1.09', score: '0 - 0', result: 'won' },
      { event: 'Austria - Bundesliga - Salzburg - Altach', start: '20/02/2016 18:30:00', market: '1X2', selection: '1', odds: '1.28', score: '2 - 0', result: 'won' },
      { event: 'Portugal - Primeira Liga - Porto - Moreirense', start: '21/02/2016 19:15:00', market: '1X2', selection: '1', odds: '1.18', score: '3 - 2', result: 'won' },
      { event: 'Germany - Bundesliga - Bayern Munich - Darmstadt', start: '20/02/2016 15:30:00', market: 'Combo', selection: '1 & 2+', odds: '1.16', score: '3 - 1', result: 'won' },
      { event: 'Germany - Bundesliga - Borussia Mönchengladbach - FC Köln', start: '20/02/2016 15:30:00', market: 'Multi Goal Home', selection: '1-3 Goals Home', odds: '1.33', score: '1 - 0', result: 'won' },
      { event: 'France - Ligue 1 - PSG - Reims', start: '20/02/2016 17:00:00', market: 'Combo', selection: '1 & 2+', odds: '1.38', score: '4 - 1', result: 'won' },
      { event: 'England - Championship - Burnley - Rotherham', start: '21/02/2016 16:00:00', market: 'Home O/U 0.5', selection: 'Home Over 0.5', odds: '1.12', score: '2 - 0', result: 'won' },
      { event: 'Holland - Eredivisie - PSV - Heracles', start: '20/02/2016 19:45:00', market: '1X2', selection: '1', odds: '1.27', score: '2 - 0', result: 'won' },
      { event: 'Holland - Eredivisie - Twente - Cambuur', start: '20/02/2016 20:45:00', market: 'Home O/U 0.5', selection: 'Home Over 0.5', odds: '1.07', score: '3 - 0', result: 'won' },
      { event: 'Holland - Eredivisie - Ajax - Excelsior', start: '21/02/2016 14:30:00', market: '1X2', selection: '1', odds: '1.15', score: '3 - 0', result: 'won' },
    ],
  },
  {
    id: 'BS-782166',
    date: '21/02/2016 20:14',
    stake: '€5.00',
    type: 'Single',
    bonus: '€0.00',
    gain: '€9.50',
    status: 'Won',
    paymentDate: '21/02/2016 20:14:12',
    events: [
      { event: 'Spain - La Liga - Barcelona - Sevilla', start: '21/02/2016 20:00:00', market: '1X2', selection: '1', odds: '1.90', score: '2 - 1', result: 'won' },
    ],
  },
  {
    id: 'BS-782103',
    date: '21/02/2016 18:03',
    stake: '€20.00',
    type: 'Multiple',
    bonus: '€0.00',
    gain: '€0.00',
    status: 'Lost',
    paymentDate: '—',
    events: [
      { event: 'England - Premier League - Arsenal - Manchester United', start: '21/02/2016 17:00:00', market: '1X2', selection: '1', odds: '2.10', score: '2 - 3', result: 'lost' },
      { event: 'Italy - Serie A - Fiorentina - Napoli', start: '21/02/2016 18:00:00', market: 'Both teams to score', selection: 'Yes', odds: '1.75', score: '1 - 1', result: 'won' },
    ],
  },
  {
    id: 'BS-781992',
    date: '21/02/2016 21:48',
    stake: '€8.00',
    type: 'Single',
    bonus: '€0.00',
    gain: '—',
    status: 'Pending',
    paymentDate: '—',
    events: [
      { event: 'France - Ligue 1 - Lyon - PSG', start: '21/02/2016 22:00:00', market: 'Total goals O/U 2.5', selection: 'Over 2.5', odds: '1.82', score: '—', result: 'pending' },
    ],
  },
]

function betStatusClass(status: DemoBetslip['status']) {
  if (status === 'Won') return 'bg-[#e7f7eb] text-[#21743a]'
  if (status === 'Lost') return 'bg-[#fdeaea] text-[#a22a2a]'
  if (status === 'Pending') return 'bg-[#fff5d6] text-[#856300]'
  return 'bg-[#eaf0ff] text-[#3b4b9b]'
}

function BetslipsSection() {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--cb-light-text)]">Sports Betslips</h2>
          <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Your sports betting history and ticket details.</p>
        </div>
        <span className="text-xs text-[var(--cb-light-muted)]">{BETSLIPS_DEMO.length} betslips</span>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead className="bg-[#f6f7f8]">
              <tr className="border-b border-[var(--cb-light-border)] text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)]">
                <th className="px-4 py-3">ID</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Stake</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Bonus</th>
                <th className="px-3 py-3">Gain</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {BETSLIPS_DEMO.map((bet) => (
                <tr key={bet.id} className="border-b border-[var(--cb-light-border)] last:border-0 hover:bg-[#fafafa]">
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-[var(--cb-light-text)]">{bet.id}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-[var(--cb-light-muted)]">{bet.date}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-[var(--cb-light-text)]">{bet.stake}</td>
                  <td className="px-3 py-4">
                    <span className="rounded bg-[#eef1f3] px-2 py-1 text-[11px] font-semibold text-[#34414a]">{bet.type}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-[var(--cb-light-text)]">{bet.bonus}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-[var(--cb-light-text)]">{bet.gain}</td>
                  <td className="px-3 py-4">
                    <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-bold ' + betStatusClass(bet.status)}>{bet.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/account/betslips/${bet.id}`}
                      aria-label={'View betslip ' + bet.id}
                      title="View ticket"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--cb-light-border)] text-[var(--cb-light-text)] transition hover:border-[var(--cb-yellow)] hover:bg-[#fff8df]"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--cb-light-muted)]">Sample data for interface preview only. Bet results and payouts are not connected to a live sportsbook.</p>

    </div>
  )
}


function BetslipTicketPage({ bet }: { bet: DemoBetslip }) {
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/account/betslips"
          className="inline-flex min-h-9 items-center gap-2 rounded border border-[var(--cb-light-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--cb-light-text)] transition hover:border-[var(--cb-yellow)]"
        >
          <span aria-hidden="true" className="text-base leading-none">←</span>
          Back to betslips
        </Link>
        <span className={'inline-flex rounded-full px-3 py-1.5 text-xs font-bold ' + betStatusClass(bet.status)}>{bet.status}</span>
      </div>

      <section className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cb-light-border)] bg-[#f7f8f9] px-4 py-4 md:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cb-light-muted)]">Sports betslip</p>
            <h2 className="mt-1 text-lg font-extrabold text-[var(--cb-light-text)]">{bet.id}</h2>
          </div>
          <span className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-[var(--cb-light-text)] ring-1 ring-inset ring-[var(--cb-light-border)]">{bet.type}</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--cb-light-border)] sm:grid-cols-3 xl:grid-cols-5">
          <div className="bg-white p-4">
            <p className="text-xs text-[var(--cb-light-muted)]">Stake</p>
            <p className="mt-1 text-base font-bold text-[var(--cb-light-text)]">{bet.stake}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-[var(--cb-light-muted)]">Bonus</p>
            <p className="mt-1 text-base font-bold text-[var(--cb-light-text)]">{bet.bonus}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-[var(--cb-light-muted)]">Gain</p>
            <p className="mt-1 text-base font-bold text-[var(--cb-light-text)]">{bet.gain}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-[var(--cb-light-muted)]">Bet date</p>
            <p className="mt-1 text-sm font-semibold text-[var(--cb-light-text)]">{bet.date}</p>
          </div>
          <div className="bg-white p-4 sm:col-span-2 xl:col-span-1">
            <p className="text-xs text-[var(--cb-light-muted)]">Payment date</p>
            <p className="mt-1 text-sm font-semibold text-[var(--cb-light-text)]">{bet.paymentDate}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cb-light-border)] px-4 py-4 md:px-5">
          <div>
            <h2 className="text-base font-extrabold text-[var(--cb-light-text)]">Events</h2>
            <p className="mt-1 text-xs text-[var(--cb-light-muted)]">{bet.events.length} {bet.events.length === 1 ? 'selection' : 'selections'} on this ticket</p>
          </div>
          <span className="text-xs text-[var(--cb-light-muted)]">Overall status: <strong className="text-[var(--cb-light-text)]">{bet.status}</strong></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-[#f7f8f9]">
              <tr className="border-b border-[var(--cb-light-border)] text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)]">
                <th className="px-4 py-3">Event</th>
                <th className="px-3 py-3">Start date</th>
                <th className="px-3 py-3">Bet type</th>
                <th className="px-3 py-3">Selection</th>
                <th className="px-3 py-3 text-right">Odds</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {bet.events.map((event, index) => (
                <tr key={event.event + index} className="border-b border-[var(--cb-light-border)] last:border-0 hover:bg-[#fafafa]">
                  <td className="max-w-[320px] px-4 py-3 text-xs font-medium text-[var(--cb-light-text)]">{event.event}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[11px] text-[var(--cb-light-muted)]">{event.start}</td>
                  <td className="px-3 py-3 text-xs text-[var(--cb-light-text)]">{event.market}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-[var(--cb-light-text)]">{event.selection}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-[var(--cb-light-text)]">{event.odds}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-[var(--cb-light-text)]">{event.score}</td>
                  <td className="px-4 py-3 text-center">
                    {event.result === 'won'
                      ? <CircleCheck className="inline h-4 w-4 text-[#229447]" aria-label="Won" />
                      : event.result === 'lost'
                        ? <X className="inline h-4 w-4 text-[#c52c2c]" aria-label="Lost" />
                        : <span className="text-xs font-semibold text-[#856300]">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--cb-light-border)] bg-[#fbfbfb] px-4 py-3 text-xs text-[var(--cb-light-muted)] md:px-5">
          Sample ticket for interface preview only — results and payouts are not connected to a live sportsbook.
        </div>
      </section>
    </div>
  )
}



type DemoCasinoWager = {
  id: string
  date: string
  game: string
  provider: string
  betType: string
  stake: string
  win: string
  balance: string
  status: 'Won' | 'Lost' | 'No win'
  roundId: string
  multiplier: string
}

const CASINO_WAGERS_DEMO: DemoCasinoWager[] = [
  { id: 'CW-914582', date: '19/10/2026 10:42:18', game: 'Zeus vs Hades: Gods of War', provider: 'Demo Studio', betType: 'Spin', stake: '€2.00', win: '€12.40', balance: '€10.40', status: 'Won', roundId: 'RND-78451209', multiplier: '6.20x' },
  { id: 'CW-914579', date: '19/10/2026 10:39:06', game: 'Lucky Lady’s Charm Deluxe', provider: 'Novomatic', betType: 'Spin', stake: '€1.00', win: '€0.00', balance: '€9.00', status: 'Lost', roundId: 'RND-78451172', multiplier: '0.00x' },
  { id: 'CW-914570', date: '19/10/2026 10:31:54', game: 'Wild Clusters', provider: 'Demo Studio', betType: 'Spin', stake: '€0.50', win: '€1.80', balance: '€9.80', status: 'Won', roundId: 'RND-78451041', multiplier: '3.60x' },
  { id: 'CW-914554', date: '19/10/2026 10:14:22', game: 'Raptor 2 Doublemax', provider: 'Play’n GO', betType: 'Spin', stake: '€2.50', win: '€0.00', balance: '€7.30', status: 'Lost', roundId: 'RND-78450793', multiplier: '0.00x' },
  { id: 'CW-914539', date: '19/10/2026 09:58:04', game: 'Wealth Bells 40', provider: 'BF Games', betType: 'Spin', stake: '€1.00', win: '€4.00', balance: '€11.30', status: 'Won', roundId: 'RND-78450433', multiplier: '4.00x' },
  { id: 'CW-914522', date: '19/10/2026 09:42:37', game: 'Silver Coins', provider: 'BF Games', betType: 'Spin', stake: '€3.00', win: '€0.00', balance: '€8.30', status: 'No win', roundId: 'RND-78450184', multiplier: '0.00x' },
]

function casinoWagerStatusClass(status: DemoCasinoWager['status']) {
  if (status === 'Won') return 'bg-[#e7f7eb] text-[#21743a]'
  if (status === 'Lost') return 'bg-[#fdeaea] text-[#a22a2a]'
  return 'bg-[#eef0f3] text-[#5a6570]'
}

function CasinoHistorySection() {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--cb-light-text)]">Casino Betting History</h2>
          <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Review your wagers and results from casino games.</p>
        </div>
        <span className="text-xs text-[var(--cb-light-muted)]">{CASINO_WAGERS_DEMO.length} wagers</span>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#f6f7f8]">
              <tr className="border-b border-[var(--cb-light-border)] text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)]">
                <th className="px-4 py-3">Bet ID</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Game</th>
                <th className="px-3 py-3">Bet</th>
                <th className="px-3 py-3">Stake</th>
                <th className="px-3 py-3">Win</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {CASINO_WAGERS_DEMO.map((wager) => (
                <tr key={wager.id} className="border-b border-[var(--cb-light-border)] last:border-0 hover:bg-[#fafafa]">
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-[var(--cb-light-text)]">{wager.id}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-[var(--cb-light-muted)]">{wager.date}</td>
                  <td className="max-w-[220px] px-3 py-4">
                    <span className="block truncate text-xs font-semibold text-[var(--cb-light-text)]">{wager.game}</span>
                    <span className="mt-1 block truncate text-[10px] text-[var(--cb-light-muted)]">{wager.provider}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-[var(--cb-light-text)]">{wager.betType}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-[var(--cb-light-text)]">{wager.stake}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-[var(--cb-light-text)]">{wager.win}</td>
                  <td className="px-3 py-4">
                    <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-bold ' + casinoWagerStatusClass(wager.status)}>{wager.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--cb-light-muted)]">Sample data for interface preview only. Casino wagers and balances are not connected to a live game provider.</p>
    </div>
  )
}

type BonusScope = 'sports' | 'casino'
type BonusTab = BonusScope | 'promo-code' | 'activity-history'

type DemoBonus = {
  id: string
  title: string
  scope: BonusScope
  timeToWager: string
  wageringReq: string
  depositWageringReq: string
  description: string
  terms: string[]
}

const DEMO_BONUSES: DemoBonus[] = [
  {
    id: 'slots-welcome',
    title: 'Slots welcome bonus',
    scope: 'casino',
    timeToWager: '15 Days',
    wageringReq: '35X',
    depositWageringReq: '1X',
    description: 'A welcome reward for eligible slot games.',
    terms: ['Bonus wagering requirement: 35X.', 'Deposit wagering requirement: 1X.', 'Complete wagering within 15 days.', 'Demo offer only; no bonus will be credited.'],
  },
  {
    id: 'crash-welcome',
    title: 'Crash games welcome bonus',
    scope: 'casino',
    timeToWager: '15 Days',
    wageringReq: '33X',
    depositWageringReq: '1X',
    description: 'A sample welcome offer for crash games.',
    terms: ['Bonus wagering requirement: 33X.', 'Deposit wagering requirement: 1X.', 'Complete wagering within 15 days.', 'Demo offer only; no bonus will be credited.'],
  },
  {
    id: 'slots-daily',
    title: 'Slots daily deposit bonus',
    scope: 'casino',
    timeToWager: '1 Day',
    wageringReq: '3X',
    depositWageringReq: '1X',
    description: 'A sample daily reward for eligible slot deposits.',
    terms: ['Bonus wagering requirement: 3X.', 'Deposit wagering requirement: 1X.', 'Complete wagering within 1 day.', 'Demo offer only; no bonus will be credited.'],
  },
  {
    id: 'crash-daily',
    title: 'Crash games daily deposit bonus',
    scope: 'casino',
    timeToWager: '1 Day',
    wageringReq: '5X',
    depositWageringReq: '1X',
    description: 'A sample daily reward for crash games.',
    terms: ['Bonus wagering requirement: 5X.', 'Deposit wagering requirement: 1X.', 'Complete wagering within 1 day.', 'Demo offer only; no bonus will be credited.'],
  },
  {
    id: 'sports-welcome',
    title: 'Sports welcome bonus',
    scope: 'sports',
    timeToWager: '30 Days',
    wageringReq: '6X',
    depositWageringReq: '1X',
    description: 'A sample welcome bonus for qualifying sports bets.',
    terms: ['Minimum odds and qualifying bets would apply to a live offer.', 'Wagering requirement shown for preview: 6X.', 'Demo offer only; no bonus will be credited.'],
  },
  {
    id: 'sports-freebet',
    title: 'Welcome sports freebet',
    scope: 'sports',
    timeToWager: '7 Days',
    wageringReq: '1X',
    depositWageringReq: '—',
    description: 'A sample freebet promotion for sports betting.',
    terms: ['Freebet stake and eligible markets would follow the offer rules.', 'Use within 7 days in this sample offer.', 'Demo offer only; no freebet will be credited.'],
  },
  {
    id: 'sports-odds-boost',
    title: 'Sports odds boost',
    scope: 'sports',
    timeToWager: '3 Days',
    wageringReq: '1X',
    depositWageringReq: '—',
    description: 'A sample odds boost for selected sports markets.',
    terms: ['Applies to selected markets only in a live system.', 'Check offer terms and eligible odds.', 'Demo offer only; no bonus will be credited.'],
  },
]

const BONUS_TABS: { value: BonusTab; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'casino', label: 'Casino' },
  { value: 'promo-code', label: 'Promo Code' },
  { value: 'activity-history', label: 'Activity History' },
]

function BonusCard({ bonus }: { bonus: DemoBonus }) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [claimed, setClaimed] = useState(false)

  return (
    <article className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#fff5d6] text-[#876400]">
            <Gift className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-base font-extrabold text-[var(--cb-light-text)]">{bonus.title}</h3>
              <button
                type="button"
                onClick={() => setClaimed(true)}
                disabled={claimed}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center justify-center rounded px-5 text-sm font-bold transition-colors',
                  claimed
                    ? 'cursor-default border border-[var(--cb-light-border)] bg-[#f3f5f6] text-[var(--cb-light-muted)]'
                    : 'bg-[var(--cb-yellow)] text-[#071722] hover:brightness-105',
                )}
              >
                {claimed ? 'Claimed (demo)' : 'Claim'}
              </button>
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--cb-light-muted)]">{bonus.description}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-[var(--cb-light-border)] pt-4 sm:grid-cols-2">
          <p className="text-sm text-[var(--cb-light-muted)]">Status: <span className="font-semibold text-[#277443]">{claimed ? 'Claimed (demo)' : 'Available'}</span></p>
          <p className="text-sm text-[var(--cb-light-muted)]">Time to wager: <span className="font-semibold text-[var(--cb-light-text)]">{bonus.timeToWager}</span></p>
          <p className="text-sm text-[var(--cb-light-muted)]">Wagering Req: <span className="font-semibold text-[var(--cb-light-text)]">{bonus.wageringReq}</span></p>
          <p className="text-sm text-[var(--cb-light-muted)]">Deposit Wagering Req: <span className="font-semibold text-[var(--cb-light-text)]">{bonus.depositWageringReq}</span></p>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={aboutOpen}
        onClick={() => setAboutOpen((open) => !open)}
        className="flex w-full items-center justify-between border-t border-[var(--cb-light-border)] bg-[#f8f9fa] px-4 py-3 text-left text-sm font-bold text-[var(--cb-light-text)] transition-colors hover:bg-[#f0f2f4]"
      >
        <span>About Bonus</span>
        <span className="text-[var(--cb-light-muted)]">{aboutOpen ? '−' : '+'}</span>
      </button>
      {aboutOpen ? (
        <ul className="space-y-2 border-t border-[var(--cb-light-border)] px-4 py-4">
          {bonus.terms.map((term) => (
            <li key={term} className="flex gap-2 text-sm leading-5 text-[var(--cb-light-muted)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cb-yellow)]" />
              {term}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function BonusesCenter({ tab }: { tab: string }) {
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const validTab: BonusTab = BONUS_TABS.some((item) => item.value === tab) ? tab as BonusTab : 'sports'
  const currentTitle = BONUS_TABS.find((item) => item.value === validTab)?.label ?? 'Sports'
  const bonusList = DEMO_BONUSES.filter((bonus) => bonus.scope === validTab)

  return (
    <div className="min-w-0 space-y-4">
      <nav aria-label="Bonus categories" className="flex gap-2 overflow-x-auto pb-1">
        {BONUS_TABS.map(({ value, label }) => (
          <Link
            key={value}
            to={`/account/bonuses/${value}`}
            aria-current={validTab === value ? 'page' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded border px-3 py-2.5 text-sm transition-colors',
              validTab === value
                ? 'border-[var(--cb-yellow)] bg-[#fff8df] font-bold text-[var(--cb-light-text)]'
                : 'border-[var(--cb-light-border)] bg-white text-[var(--cb-light-muted)] hover:bg-[#f6f7f8]',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {validTab === 'sports' || validTab === 'casino' ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--cb-light-text)]">{currentTitle} Bonuses</h2>
              <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Review available bonus offers and their wagering requirements.</p>
            </div>
            <span className="shrink-0 text-xs text-[var(--cb-light-muted)]">{bonusList.length} available</span>
          </div>
          {bonusList.map((bonus) => <BonusCard key={bonus.id} bonus={bonus} />)}
        </div>
      ) : null}

      {validTab === 'promo-code' ? (
        <section className="max-w-2xl rounded-md border border-[var(--cb-light-border)] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff5d6] text-[#876400]">
              <Gift className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--cb-light-text)]">Redeem a promo code</h2>
              <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Enter a promotional code to preview the redemption flow.</p>
            </div>
          </div>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              setPromoMessage(promoCode.trim()
                ? 'Preview only: this code has not been validated or redeemed.'
                : 'Enter a promo code first.')
            }}
          >
            <input
              value={promoCode}
              onChange={(event) => { setPromoCode(event.target.value); setPromoMessage('') }}
              placeholder="Enter promo code"
              aria-label="Promo code"
              className="h-11 min-w-0 flex-1 rounded border border-[var(--cb-light-border)] bg-white px-3 text-sm text-[var(--cb-light-text)] outline-none focus:border-[var(--cb-yellow)]"
            />
            <button type="submit" className="h-11 shrink-0 rounded bg-[var(--cb-yellow)] px-5 text-sm font-bold text-[#071722] transition hover:brightness-105">Apply code</button>
          </form>
          {promoMessage ? <p role="status" className="mt-3 text-sm text-[var(--cb-light-muted)]">{promoMessage}</p> : null}
          <p className="mt-4 text-xs text-[var(--cb-light-muted)]">Demo only — promotional codes are not checked by a live bonus system.</p>
        </section>
      ) : null}

      {validTab === 'activity-history' ? (
        <section className="overflow-hidden rounded-md border border-[var(--cb-light-border)] bg-white">
          <div className="border-b border-[var(--cb-light-border)] px-4 py-4">
            <h2 className="text-lg font-extrabold text-[var(--cb-light-text)]">Bonus Activity History</h2>
            <p className="mt-1 text-sm text-[var(--cb-light-muted)]">Example activity entries for layout preview.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-[#f6f7f8] text-[10px] font-bold uppercase tracking-wide text-[var(--cb-light-muted)]">
                <tr>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: 'Slots welcome bonus', activity: 'Offer available', date: '19/10/2026', status: 'Available' },
                  { title: 'Crash games welcome bonus', activity: 'Offer available', date: '19/10/2026', status: 'Available' },
                  { title: 'Sports welcome bonus', activity: 'Offer available', date: '19/10/2026', status: 'Available' },
                ].map((item) => (
                  <tr key={item.title} className="border-t border-[var(--cb-light-border)] text-sm">
                    <td className="px-4 py-4 font-semibold text-[var(--cb-light-text)]">{item.title}</td>
                    <td className="px-4 py-4 text-[var(--cb-light-muted)]">{item.activity}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--cb-light-muted)]">{item.date}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-[#e7f7eb] px-2 py-1 text-xs font-bold text-[#277443]">{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[var(--cb-light-border)] bg-[#fbfbfb] px-4 py-3 text-xs text-[var(--cb-light-muted)]">Sample data only — actual bonus activity is not connected.</p>
        </section>
      ) : null}
    </div>
  )
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs text-[var(--cb-light-muted)]">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="block w-full border border-[var(--cb-light-border)] bg-white px-4 py-2.5 text-sm text-[var(--cb-light-text)] outline-none focus:border-[var(--cb-yellow)]"
      />
    </label>
  )
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Inbox; title: string; detail: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border border-[var(--cb-light-border)] bg-white px-5 py-10 text-center">
      <Icon className="mb-3 h-8 w-8 text-[var(--cb-light-muted)]" />
      <h2 className="font-bold text-[var(--cb-light-text)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--cb-light-muted)]">{detail}</p>
    </div>
  )
}
