import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BadgeCheck, FileText, Gift, History, Inbox, ShieldAlert, UserRound,
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
  'account-statement': { title: 'Account statement', subtitle: 'Review an overview of account activity.' },
  'profit-and-loss': { title: 'Profit & Loss', subtitle: 'Review a summary of account results.' },
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
  const sectionKey = pathname.split('/').filter(Boolean)[1] || 'personal-info'
  const section = SECTIONS[sectionKey] ?? SECTIONS['personal-info']!
  const isProfile = ['personal-info', 'profile', 'documents', 'change-password', 'messages'].includes(sectionKey)
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
              <span className="md:hidden">{isProfile ? 'My profile' : section.title}</span>
              <span className="hidden md:inline">{section.title}</span>
            </h1>
            <p className="mt-1 hidden text-sm text-[var(--cb-light-muted)] sm:block">{section.subtitle}</p>
          </div>
        </div>

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

        {['account-statement', 'profit-and-loss'].includes(sectionKey) ? (
          <EmptyState icon={History} title="No account activity" detail="Account history is not connected to a live account." />
        ) : null}

        {!SECTIONS[sectionKey] && sectionKey !== 'profile' ? (
          <EmptyState icon={UserRound} title="Account overview" detail="Choose a section from the account menu to view its details." />
        ) : null}
      </div>
    </AccountLayout>
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
