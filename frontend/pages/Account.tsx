import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BadgeCheck, CircleCheck, Eye, FileText, Gift, History, Inbox, ShieldAlert, UserRound, Wallet, X,
} from 'lucide-react'
import { AccountLayout } from '../components/AccountPanel'

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
  'bonuses-available': { title: 'Available bonuses', subtitle: 'Explore bonuses that may be available to your account.' },
  'bonuses-active': { title: 'Active bonuses', subtitle: 'Review your currently active bonus offers.' },
  'bonuses-closed': { title: 'Closed bonuses', subtitle: 'Review previously closed bonus offers.' },
  'self-exclusion': { title: 'Self-exclusion', subtitle: 'Manage access breaks and self-exclusion settings.' },
  'deposit-limits': { title: 'Deposit limits', subtitle: 'Set personal limits to help manage your play.' },
  'reality-check': { title: 'Reality check', subtitle: 'Review reminders about time spent playing.' },
  betslips: { title: 'Betslips', subtitle: 'Review your sports bets and open each ticket for full details.' },
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

export default function AccountPage() {
  const { pathname } = useLocation()
  const isAccountHome = pathname === '/account'
  const sectionKey = isAccountHome ? 'overview' : (pathname.split('/').filter(Boolean)[1] || 'personal-info')
  const section = sectionKey === 'overview'
    ? { title: 'Account overview', subtitle: 'Manage your profile and account services from one place.' }
    : (SECTIONS[sectionKey] ?? SECTIONS['personal-info']!)
  const [gender, setGender] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [saved, setSaved] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
                <p className="text-xs text-[var(--cb-light-muted)]">Real balance</p>
                <p className="mt-1 text-xl font-bold text-[var(--cb-light-text)]">€0.00</p>
              </div>
              <div className="border border-[var(--cb-light-border)] bg-white p-4">
                <p className="text-xs text-[var(--cb-light-muted)]">Bonus balance</p>
                <p className="mt-1 text-xl font-bold text-[var(--cb-light-text)]">€0.00</p>
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
          <form onSubmit={handleSubmit} className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <ReadOnlyField label="First name" value="—" />
            <ReadOnlyField label="Last name" value="—" />
            <ReadOnlyField label="Email" value="Not connected" />
            <ReadOnlyField label="Date of birth" value="—" />
            <ReadOnlyField label="Currency" value="EUR" />
            <ReadOnlyField label="Country" value="—" />
            <div className="min-w-0 space-y-1">
              <label htmlFor="account-gender" className="block truncate text-xs text-[var(--cb-light-muted)]">Gender *</label>
              <select
                id="account-gender"
                name="gender"
                value={gender}
                onChange={(event) => { setGender(event.target.value); setSaved(false) }}
                className="block w-full border border-[var(--cb-light-border)] bg-white px-4 py-2.5 text-sm text-[var(--cb-light-text)] outline-none focus:border-[var(--cb-yellow)]"
              >
                <option value="">Choose gender</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Prefer not to say</option>
              </select>
            </div>
            <ReadOnlyField label="City" value="—" />
            <div className="min-w-0 space-y-1 md:col-span-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><ReadOnlyField label="Address" value="—" /></div>
                <ReadOnlyField label="Post code" value="—" />
              </div>
            </div>
            <ReadOnlyField label="Mobile number" value="Not connected" />
            <div className="flex flex-col gap-4 py-2 md:col-span-2">
              <label className="inline-flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[var(--cb-light-text)]">
                <input
                  type="checkbox"
                  name="newsletter"
                  checked={newsletter}
                  onChange={(event) => { setNewsletter(event.target.checked); setSaved(false) }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cb-yellow)]"
                />
                <span>I would like to receive news, promotional material and other information from the casino and its affiliates.</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="relative border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] px-5 py-2.5 text-sm font-bold uppercase text-[#071722] transition hover:brightness-105">
                  Submit
                </button>
                {saved ? <span className="text-xs text-[var(--cb-light-muted)]">Preview only — these changes have not been saved.</span> : null}
              </div>
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

        {sectionKey.startsWith('bonuses-') ? (
          <EmptyState icon={Gift} title={sectionKey === 'bonuses-available' ? 'No available bonuses' : sectionKey === 'bonuses-active' ? 'No active bonuses' : 'No closed bonuses'} detail="Bonus information is not connected in this preview." />
        ) : null}

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

        {sectionKey === 'betslips' ? <BetslipsSection /> : null}

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
  const [selectedBet, setSelectedBet] = useState<DemoBetslip | null>(null)

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
                    <button
                      type="button"
                      onClick={() => setSelectedBet(bet)}
                      aria-label={'View betslip ' + bet.id}
                      title="View ticket"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--cb-light-border)] text-[var(--cb-light-text)] transition hover:border-[var(--cb-yellow)] hover:bg-[#fff8df]"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--cb-light-muted)]">Sample data for interface preview only. Bet results and payouts are not connected to a live sportsbook.</p>

      {selectedBet ? <BetslipTicket bet={selectedBet} onClose={() => setSelectedBet(null)} /> : null}
    </div>
  )
}

function BetslipTicket({ bet, onClose }: { bet: DemoBetslip; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={'Betslip ticket ' + bet.id}
      onClick={onClose}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-[#292929] bg-[#080808] text-[#eeeeee] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#2b2b2b] bg-[#111111] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b9b9b]">Sports ticket</p>
            <h2 className="mt-0.5 truncate text-sm font-bold sm:text-base">{bet.id}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={'rounded px-2.5 py-1 text-xs font-bold ' + (bet.status === 'Won' ? 'bg-[#0f4a19] text-[#62de72]' : bet.status === 'Lost' ? 'bg-[#501616] text-[#ff7373]' : 'bg-[#57450a] text-[#ffd35b]')}>{bet.status}</span>
            <button type="button" aria-label="Close ticket" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded text-[#b4b4b4] hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="border-b border-[#2b2b2b] px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid max-w-2xl grid-cols-[minmax(110px,1fr)_minmax(120px,1fr)] gap-x-5 gap-y-2 text-xs sm:gap-x-10">
              <span className="font-semibold text-[#eeeeee]">Status</span>
              <span className={bet.status === 'Won' ? 'font-bold text-[#45db54]' : bet.status === 'Lost' ? 'font-bold text-[#ff6262]' : 'font-bold text-[#ffcf50]'}>{bet.status}</span>
              <span className="font-semibold italic text-[#f3c74b]">Stake</span>
              <span className="font-semibold text-[#f3c74b]">{bet.stake}</span>
              <span className="font-semibold italic text-[#f3c74b]">Bonus</span>
              <span className="font-semibold text-[#f3c74b]">{bet.bonus}</span>
              <span className="font-semibold italic text-[#f3c74b]">Gain</span>
              <span className="font-semibold text-[#f3c74b]">{bet.gain}</span>
              <span className="font-semibold text-[#eeeeee]">Payment date</span>
              <span className="text-[#eeeeee]">{bet.paymentDate}</span>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="mb-3 text-sm font-bold text-[#e8e8e8]">Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#292929] text-[10px] font-bold text-[#d8d8d8]">
                    <th className="px-2 py-2">Event</th>
                    <th className="px-2 py-2">Start date</th>
                    <th className="px-2 py-2">Bet type</th>
                    <th className="px-2 py-2">Selection</th>
                    <th className="px-2 py-2 text-right">Odds</th>
                    <th className="px-2 py-2 text-right">Score</th>
                    <th className="px-2 py-2 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {bet.events.map((event, index) => (
                    <tr key={event.event + index} className="border-b border-[#252525] last:border-0">
                      <td className="max-w-[300px] px-2 py-2 text-[11px] text-[#eeeeee]">{event.event}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-[10px] text-[#c8c8c8]">{event.start}</td>
                      <td className="px-2 py-2 text-[10px] text-[#e2e2e2]">{event.market}</td>
                      <td className="px-2 py-2 text-[10px] text-[#e2e2e2]">{event.selection}</td>
                      <td className="px-2 py-2 text-right text-[11px] text-[#eeeeee]">{event.odds}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-[11px] text-[#eeeeee]">{event.score}</td>
                      <td className="px-2 py-2 text-center">
                        {event.result === 'won' ? <CircleCheck className="inline h-3.5 w-3.5 text-[#27ca4b]" aria-label="Won" /> : event.result === 'lost' ? <X className="inline h-3.5 w-3.5 text-[#f05252]" aria-label="Lost" /> : <span className="text-xs text-[#f3c74b]">•</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
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
