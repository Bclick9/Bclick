import { useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronRight, FileText, Plus, Settings, ShieldCheck, Wallet, CircleDollarSign, Check, Pause, Play, Pencil } from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import { cn } from '../../lib/utils'
import { StatusBadge, Avatar } from '../../components/DashboardUI'
import type { UserRow } from '../../lib/types'

export function PlayerProfilePage({ user, onBack, onToggle, onNotify, onSave }: {
  user: UserRow
  onBack: () => void
  onToggle: () => void
  onNotify: (message: string) => void
  onSave: (id: string, patch: Partial<UserRow>) => void
}) {
  const [mainTab, setMainTab] = useState('General')
  const [detailTab, setDetailTab] = useState('Player Info')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)
  const [noteDraft, setNoteDraft] = useState('')
  const [notes, setNotes] = useState<{ text: string; date: string }[]>([
    { text: 'Demo profile created for UI review. No live player data is connected.', date: '19 Oct 2026 · 10:30' },
  ])
  const [messageDraft, setMessageDraft] = useState('')
  const [messages, setMessages] = useState<{ text: string; date: string; direction: 'out' | 'in' }[]>([
    { text: 'Welcome to Bclick. This is a sample message thread.', date: '18 Oct 2026 · 11:52', direction: 'in' },
  ])
  const details = (fields: { label: string; key?: string; value?: string; flag?: boolean }[]) => (
    <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map((field) => {
        const raw = field.value ?? (field.key ? playerCellValue(user, field.key) : '—')
        const empty = !raw || raw === '—'
        return <div key={field.label} className="min-w-0 border-b border-slate-100 px-1 py-3.5 last:border-b-0">
          <p className="text-[11px] font-medium text-slate-400">{field.label}</p>
          <div className="mt-1.5 break-words text-[13px] font-medium text-slate-800">
            {field.flag !== undefined
              ? <Badge variant={field.flag ? 'success' : 'outline'}>{field.flag ? 'Enabled' : 'Disabled'}</Badge>
              : <span className={empty ? 'text-slate-300' : ''}>{empty ? '—' : raw}</span>}
          </div>
        </div>
      })}
    </div>
  )
  const section = (title: string, fields: { label: string; key?: string; value?: string; flag?: boolean }[], description?: string) => (
    <section key={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      </div>
      <div className="px-4 sm:px-5">{details(fields)}</div>
    </section>
  )
  const mainTabs = ['General', 'Financial', 'Reports', 'Settings', 'Log history']
  const generalTabs = ['Player Info', 'Additional Info', 'Player Verification', 'Notes', 'Messages']
  const accountOpen = user.status === 'Active'
  const maskedIp = '•••.•••.•••.•••'

  return <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-center gap-2 text-xs">
            <button type="button" onClick={onBack} className="font-semibold text-slate-500 transition hover:text-slate-900">Players</button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="truncate font-semibold text-slate-900">{user.email}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Avatar name={user.name} size="lg" tone="bg-slate-100 text-slate-700" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <p className="mt-1 text-xs text-slate-500">Player ID <span className="font-mono text-slate-700">{user.id}</span><span className="mx-2 text-slate-300">·</span>{user.country}</p>
            </div>
            <StatusBadge status={user.status} />
            <Badge variant={user.tier === 'VIP' ? 'warning' : user.tier === 'Gold' ? 'info' : 'outline'}>{user.tier}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages') }}><FileText className="h-4 w-4" /> Message</Button>
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages'); onNotify('SMS preview opened in the Messages tab.') }}><Bell className="h-4 w-4" /> SMS</Button>
          <Button variant="outline" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /> Settings</Button>
        </div>
      </div>
      <div className="border-b border-slate-200 px-3 sm:px-5">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Player sections">
          {mainTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={mainTab === tab} onClick={() => setMainTab(tab)} className={cn('relative shrink-0 px-3 py-3.5 text-xs font-semibold transition sm:px-4', mainTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
            {tab}
            {mainTab === tab ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-slate-900 sm:inset-x-4" /> : null}
          </button>)}
        </div>
      </div>

      <div className="p-3 sm:p-5 lg:p-6">
        {mainTab === 'General' ? <div>
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-100 pb-1" role="tablist" aria-label="General player information">
            {generalTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)} className={cn('shrink-0 rounded-md px-3 py-2 text-xs font-medium transition', detailTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>{tab}</button>)}
          </div>

          {detailTab === 'Player Info' ? <div className="space-y-4">
            <div className="mb-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-bold text-slate-900">Player Info</h2><p className="mt-1 text-xs text-slate-500">Personal, contact, financial, promotional and account details.</p></div>
              <div className="flex gap-2">
                <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((current) => !current)}><Pencil className="h-3.5 w-3.5" />{editMode ? 'Cancel edit' : 'Edit profile'}</Button>
                <Button size="icon" variant="outline" aria-label="Profile settings" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /></Button>
              </div>
            </div>
            {editMode ? <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault()
              const names = editName.trim()
              const email = editEmail.trim()
              if (!names || !email) {
                onNotify('Name and email are required in the profile preview.')
                return
              }
              onSave(user.id, { name: names, email })
              setEditMode(false)
            }}>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input value={editName} onChange={(event) => setEditName(event.target.value)} required /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email / login</span><Input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} required /></label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><Button type="submit"><Check className="h-4 w-4" /> Save demo changes</Button><p className="text-[11px] text-slate-500">Saved only in this browser preview state.</p></div>
            </form> : null}
            {section('Personal Info', [
              { label: 'First Name', key: 'firstName' }, { label: 'Middle Name', key: 'middleName' },
              { label: 'Last Name', key: 'lastName' }, { label: 'Birthday', key: 'birthday' },
              { label: 'Birth City', key: 'birthCity' }, { label: 'Birth Department', key: 'birthDepartment' },
              { label: 'Birth Name', value: '—' }, { label: 'Citizenship', value: user.country },
              { label: 'Gender', key: 'gender' }, { label: 'Personal ID', key: 'personalId' },
              { label: 'Document Number', key: 'documentNumber' }, { label: 'Document Expiration Date', value: '—' },
              { label: 'Document Issue Code', value: '—' }, { label: 'Document Issued By', key: 'documentIssuedBy' },
              { label: 'Document Issue Date', key: 'documentIssueDate' }, { label: 'Document Region', key: 'documentRegion' },
            ])}
            {section('Contact Info', [
              { label: 'Region', key: 'country' }, { label: 'Province', key: 'province' }, { label: 'Zip-Code', key: 'zipCode' },
              { label: 'City', key: 'city' }, { label: 'Address', key: 'address' }, { label: 'Additional Address', key: 'additionalAddress' },
              { label: 'Phone', key: 'phone' }, { label: 'Mobile', key: 'mobilePhone' },
              { label: 'Email', key: 'email' }, { label: 'Email is verified', value: playerCellValue(user, 'isVerified') },
              { label: 'Is Phone Verified', value: 'No' }, { label: 'Is Mobile Verified', value: 'No' },
            ])}
            {section('Financial Info', [
              { label: 'Bank Name', key: 'bankName' }, { label: 'IBAN', key: 'iban' },
              { label: 'SwiftCode', key: 'swiftCode' }, { label: 'Account Holder', key: 'accountHolder' },
            ])}
            {section('Promotional Info', [
              { label: 'Using Loyalty Program', value: user.tier !== 'Standard' ? 'Yes' : 'No' },
              { label: 'Loyalty Level', key: 'loyaltyLevel' }, { label: 'Loyalty Point', key: 'loyaltyPoints' },
              { label: 'Excluded From Bonuses', value: 'No' },
            ])}
            {section('Account Info', [
              { label: 'Player ID', key: 'id' }, { label: 'Username', key: 'login' },
              { label: 'External ID', key: 'externalId' }, { label: 'Account Status', value: accountOpen ? 'Open' : 'Locked' },
              { label: 'Verified', key: 'isVerified' }, { label: 'Verification Date', value: user.tier === 'Standard' ? '—' : '15 Oct 2026' },
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Date Registered', key: 'created' },
              { label: 'Balance', key: 'balance' }, { label: 'Is Casino Blocked', value: 'No' },
              { label: 'Is Sport Blocked', value: 'No' }, { label: 'Is RMT Blocked', value: 'No' },
              { label: 'State', value: accountOpen ? 'Open' : 'Locked' }, { label: 'Status', value: 'Offline' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Player Category', key: 'clientCategory' },
              { label: 'Exclusion Type', value: '—' }, { label: 'Excluded From', value: '—' },
              { label: 'Excluded Until', value: '—' }, { label: 'Language', key: 'language' },
              { label: 'Cashdesk', value: '—' }, { label: 'BTag', value: '—' },
              { label: 'Promo Code', key: 'promoCode' }, { label: 'Custom Player Category', key: 'customCategory' },
              { label: 'RFId', value: '—' }, { label: 'Title', key: 'title' },
              { label: 'QR code is applied', value: 'No' }, { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Two factor authentication', value: 'Disabled' },
              { label: 'Resident', key: 'isResident' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'AML Status', key: 'amlStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Parent Id', key: 'parentId' }, { label: 'Child Id', key: 'childId' },
              { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
            ])}
            {section('Social Preferences', [
              { label: 'Subscribed To Email', value: 'Yes' }, { label: 'Subscribed To Direct Email', value: 'Yes' },
              { label: 'Subscribed to push notifications', key: 'pushSubscription' }, { label: 'Subscribed To Sms', value: 'No' },
              { label: 'Subscribed to phone call', key: 'phoneCallSubscription' }, { label: 'Subscribed to Newsletter', key: 'newsletter' },
              { label: 'TC Version Acceptance Date', value: user.joined }, { label: 'Subscribed to internal message', key: 'internalMessages' },
              { label: 'Subscribe To Casino Email', value: 'Yes' }, { label: 'Subscribe To Casino Internal Message', value: 'Yes' },
              { label: 'Subscribe To Casino Newsletter', value: 'Yes' }, { label: 'Subscribe To Casino Phone Call', value: 'No' },
              { label: 'Subscribe To Casino Push Notification', value: 'Yes' }, { label: 'Subscribe To Casino SMS', value: 'No' },
              { label: 'Terms And Conditions Version', value: '1' },
            ])}
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-start">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div><p className="text-xs font-semibold text-amber-950">Prototype reminder</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Player details are generated from local demo records. Sensitive identifiers are masked and no live account system is connected.</p></div>
            </div>
          </div> : null}

          {detailTab === 'Additional Info' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Additional Info</h2><p className="mt-1 text-xs text-slate-500">Registration, device, affiliate, activity and compliance metadata.</p></div>
            {section('Registration & Activity', [
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'Registration IP', value: maskedIp },
              { label: 'Client Category', key: 'clientCategory' }, { label: 'Last Login Date', key: 'lastLogin' },
              { label: 'Last Login IP', value: maskedIp }, { label: 'Sport Last Bet', key: 'lastSportBet' },
              { label: 'Gaming Last Bet', key: 'lastCasinoBet' }, { label: 'First Deposit Date', key: 'firstDepositDate' },
              { label: 'Last Deposit Date', key: 'lastDepositDate' }, { label: 'Cashdesk ID', key: 'cashDeskId' },
            ])}
            {section('Risk & Compliance', [
              { label: 'AML Status', key: 'amlStatus' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Is Test', value: 'No' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
              { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' }, { label: 'Resident', key: 'isResident' },
            ])}
            {section('Affiliation & Security', [
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Promo Code', key: 'promoCode' },
              { label: 'Parent ID', key: 'parentId' }, { label: 'Child ID', key: 'childId' },
              { label: 'Two factor authentication', value: 'Disabled' }, { label: 'QR code is applied', value: 'No' },
            ])}
          </div> : null}

          {detailTab === 'Player Verification' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Player Verification</h2><p className="mt-1 text-xs text-slate-500">Identity and contact verification review.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Account verification</p><div className="mt-3 flex items-center gap-2"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Pending' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">Demo status derived from player tier.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Email verification</p><div className="mt-3"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Unverified' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No verification email is sent.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Phone verification</p><div className="mt-3"><Badge variant="outline">Not provided</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No phone number is stored in this demo record.</p></div>
            </div>
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Identity documents</h3></div>
              <div className="flex flex-col items-center px-5 py-10 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileText className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-slate-800">No documents in this preview</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Document upload, verification providers and approval workflows are not connected.</p><Button className="mt-4" variant="outline" onClick={() => onNotify('Document upload is not connected in this preview.')}><Plus className="h-4 w-4" /> Add document</Button></div>
            </section>
          </div> : null}

          {detailTab === 'Notes' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Notes</h2><p className="mt-1 text-xs text-slate-500">Internal player notes visible in this local preview only.</p></div>
            <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={(event) => {
              event.preventDefault()
              if (!noteDraft.trim()) return
              setNotes((current) => [{ text: noteDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }, ...current])
              setNoteDraft('')
              onNotify('Demo note added locally.')
            }}>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="player-note">Add a note</label>
              <textarea id="player-note" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Write an internal note about this player…" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              <div className="flex justify-end"><Button type="submit" disabled={!noteDraft.trim()}><Plus className="h-4 w-4" /> Add note</Button></div>
            </form>
            <div className="space-y-3">{notes.map((note, index) => <article key={note.date + index} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-800">Admin Demo</p><time className="text-[10px] text-slate-400">{note.date}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{note.text}</p></article>)}</div>
          </div> : null}

          {detailTab === 'Messages' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Messages</h2><p className="mt-1 text-xs text-slate-500">Sample messages only. Nothing is sent to a real player.</p></div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              {messages.map((message, index) => <div key={message.date + index} className={cn('flex', message.direction === 'out' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[88%] rounded-xl px-4 py-3 sm:max-w-[75%]', message.direction === 'out' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800')}><p className="whitespace-pre-wrap text-sm leading-5">{message.text}</p><p className={cn('mt-2 text-[10px]', message.direction === 'out' ? 'text-slate-300' : 'text-slate-400')}>{message.direction === 'out' ? 'Admin Demo' : 'Player'} · {message.date}</p></div></div>)}
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
              event.preventDefault()
              if (!messageDraft.trim()) return
              setMessages((current) => [...current, { text: messageDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), direction: 'out' }])
              setMessageDraft('')
              onNotify('Demo message added locally. No message was delivered.')
            }}>
              <Input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a sample message…" aria-label="Message text" />
              <Button type="submit" disabled={!messageDraft.trim()}><ArrowRight className="h-4 w-4" /> Add message</Button>
            </form>
          </div> : null}
        </div> : null}

        {mainTab === 'Financial' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Financial Overview</h2><p className="mt-1 text-xs text-slate-500">Illustrative player wallet and transaction activity.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[{ label: 'Available balance', value: user.balance, icon: Wallet }, { label: 'Total deposits', value: '€1,245.00', icon: ArrowDownRight }, { label: 'Total withdrawals', value: '€320.00', icon: ArrowUpRight }, { label: 'Net deposits', value: '€925.00', icon: CircleDollarSign }].map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><Icon className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{metric.value}</p></div> })}
          </div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-white px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Recent transactions</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date', 'Transaction ID', 'Type', 'Method', 'Amount', 'Status'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:48', 'TR-104821', 'Deposit', 'Bank card', '+€120.00', 'Completed'],
              ['16 Oct 2026, 17:22', 'TR-104506', 'Withdrawal', 'Bank transfer', '−€60.00', 'Completed'],
              ['15 Oct 2026, 09:14', 'TR-104102', 'Deposit', 'Bank card', '+€250.00', 'Completed'],
              ['12 Oct 2026, 20:01', 'TR-103882', 'Bonus credit', 'Promotion', '+€15.00', 'Completed'],
            ].map((row) => <tr key={row[1]}>{row.map((cell, index) => <td key={index} className={cn('whitespace-nowrap px-4 py-3.5', index === 4 ? 'font-semibold text-slate-900' : 'text-slate-600')}>{index === 5 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">All amounts and transaction records are fabricated demonstration values.</p>
        </div> : null}

        {mainTab === 'Reports' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Player Reports</h2><p className="mt-1 text-xs text-slate-500">A compact view of sample activity for this player.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: 'Total sessions', value: '38', detail: 'Last 30 days' },
            { label: 'Sports bets', value: '124', detail: 'Demo count' },
            { label: 'Casino rounds', value: '286', detail: 'Demo count' },
            { label: 'Average session', value: '12m 40s', detail: 'Illustrative' },
          ].map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p><p className="mt-1 text-[10px] text-slate-400">{metric.detail}</p></div>)}</div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="text-sm font-semibold text-slate-800">Activity summary</h3><div className="mt-5 space-y-4">{[{label:'Casino activity',value:72},{label:'Sportsbook activity',value:48},{label:'Login frequency',value:86},{label:'Promotion engagement',value:35}].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-600">{item.label}</span><span className="font-semibold tabular-nums text-slate-800">{item.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{width: item.value + '%'}} /></div></div>)}</div></section>
          <p className="text-[11px] text-slate-400">Analytics shown here are sample values and are not calculated from live events.</p>
        </div> : null}

        {mainTab === 'Settings' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Account Settings</h2><p className="mt-1 text-xs text-slate-500">Review access status and player-level restrictions.</p></div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="text-sm font-semibold text-slate-900">Player account</h3><p className="mt-1 text-xs text-slate-500">Changing this only updates the local mock record.</p><div className="mt-2"><StatusBadge status={user.status} /></div></div></div><Button variant={accountOpen ? 'destructive' : 'default'} onClick={onToggle}>{accountOpen ? <><Pause className="h-4 w-4" /> Lock account (demo)</> : <><Play className="h-4 w-4" /> Unlock account (demo)</>}</Button></div>
          </section>
          {section('Access & Preferences', [
            { label: 'Language', key: 'language' }, { label: 'Two factor authentication', value: 'Disabled' },
            { label: 'Email notifications', value: 'Enabled' }, { label: 'SMS notifications', value: 'Disabled' },
            { label: 'Casino access', value: 'Enabled' }, { label: 'Sportsbook access', value: 'Enabled' },
            { label: 'RMT access', value: 'Enabled' }, { label: 'Account verification', value: user.tier === 'Standard' ? 'Pending' : 'Verified' },
          ])}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-950">Demo-only control</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Security settings, access rules and notifications are not saved to a server and have no effect on real accounts.</p></div>
        </div> : null}

        {mainTab === 'Log history' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Log history</h2><p className="mt-1 text-xs text-slate-500">Recent account events used as sample history.</p></div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date & time', 'Event', 'Details', 'Performed by', 'Result'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:52', 'Player login', 'Web session opened', 'Player', 'Success'],
              [user.joined, 'Account created', 'Player record registered', 'System', 'Success'],
              ['18 Oct 2026, 11:49', 'Deposit', 'Sample deposit recorded', 'Payment demo', 'Success'],
              ['17 Oct 2026, 14:05', 'Profile updated', 'Player details reviewed', 'Admin Demo', 'Success'],
            ].map((row) => <tr key={row[0] + row[1]}>{row.map((cell, index) => <td key={index} className="whitespace-nowrap px-4 py-3.5 text-slate-600">{index === 4 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">This history is illustrative and is not connected to authentication or payment logs.</p>
        </div> : null}
      </div>
    </div>
  </div>
}
