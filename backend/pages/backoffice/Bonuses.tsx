import { Fragment, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleHelp, Eye, Filter, Gift, MoreHorizontal, Plus, Search, Settings, Wallet, Check, Pause, Play, RotateCcw, GripVertical } from 'lucide-react'
import { Badge, Button, Input, Modal } from '../../components/ui'
import { cn } from '../../lib/utils'
import type { BonusWizardForm, Offer } from '../../lib/types'

const BONUS_TYPE_OPTIONS = [
  'Deposit Bonus', 'Welcome Bonus', 'No Deposit Bonus', 'Reload Bonus',
  'Free Spins Bonus', 'Cashback Bonus', 'Free Bet Bonus',
]

export function BonusTypeChooserModal({ open, onOpenChange, onChoose }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (type: string) => void
}) {
  const [selectedType, setSelectedType] = useState('')
  const [search, setSearch] = useState('')
  const choices = BONUS_TYPE_OPTIONS.filter((type) => type.toLowerCase().includes(search.toLowerCase()))
  return <Modal size="wide" open={open} onOpenChange={onOpenChange} title="Choose bonus type" description="Select a bonus definition to start configuring it." footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!selectedType} onClick={() => { onChoose(selectedType); setSelectedType(''); setSearch('') }}>Add <ArrowRight className="h-4 w-4" /></Button></>}>
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bonus Type" className="h-11 pl-9" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {choices.map((type) => <button key={type} type="button" onClick={() => setSelectedType(type)} className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition', selectedType === type ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Gift className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{type}</span><span className="mt-1 block text-[10px] text-slate-400">{type.includes('Spins') ? 'Casino free spins' : type.includes('Bet') ? 'Sports reward' : type.includes('Cashback') ? 'Cashback reward' : 'Deposit and player reward'}</span></span>
          {selectedType === type ? <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-900" /> : null}
        </button>)}
      </div>
      {choices.length === 0 ? <p className="rounded-md border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">No matching bonus types.</p> : null}
      <p className="text-[10px] text-slate-400">Choose a type and select Add to continue to the bonus setup.</p>
    </div>
  </Modal>
}

export function BonusWizardModal({ open, onOpenChange, bonusType, onCreate }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bonusType: string
  onCreate: (values: BonusWizardForm) => void
}) {
  const initialForm = (): BonusWizardForm => ({
    name: '', description: '', regions: [], decision: 'Reject',
    programStart: '', programEnd: '', expirationType: 'To Given Date', expirationDate: '',
    productType: 'Casino', visibleForAll: false, maxPlayers: '1000', depositNumber: 'Any',
    paymentSystems: [], fromCashDesk: false, wallet: 'None', verifiedOnly: false,
    availableOnRequest: false, currencies: ['TND'], periodType: 'None', period: '', count: '',
    calculationType: 'Percentage', bonusAmount: '', maxBonusAmount: '', minimumDeposit: '',
    maximumDeposit: '', wageringMultiplier: 'x30', maxBet: '', maxWithdrawal: '',
    slots: true, liveCasino: true, tableGames: false, crashGames: false,
    gameContribution: '100', excludedGames: '', providers: [],
  })
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<BonusWizardForm>(initialForm)
  const [validationMessage, setValidationMessage] = useState('')
  const steps = ['Setup', 'Financial Factors', 'Game']
  const stepDescriptions = ['Basic information, availability and schedule', 'Reward amount, deposit limits and wagering rules', 'Eligible game categories, providers and contribution']

  const setText = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggleArray = (key: 'regions' | 'paymentSystems' | 'currencies' | 'providers', value: string) => setForm((current) => {
    const values = current[key]
    return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] }
  })
  const setBool = (key: 'visibleForAll' | 'fromCashDesk' | 'verifiedOnly' | 'availableOnRequest' | 'slots' | 'liveCasino' | 'tableGames' | 'crashGames', value: boolean) => setForm((current) => ({ ...current, [key]: value }))
  const resetWizard = () => { setStep(0); setValidationMessage(''); setForm(initialForm()) }
  const closeWizard = (next: boolean) => { if (!next) resetWizard(); onOpenChange(next) }

  const field = (label: string, key: string, options?: string[]) => <label key={key} className="block min-w-0 space-y-1.5">
    <span className="block truncate text-[11px] font-medium text-slate-600">{label}</span>
    {options
      ? <select value={String(form[key as keyof BonusWizardForm])} onChange={(event) => setText(key, event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100">{options.map((option) => <option key={option}>{option}</option>)}</select>
      : <Input value={String(form[key as keyof BonusWizardForm])} onChange={(event) => setText(key, event.target.value)} className="h-10 min-w-0 text-xs" />}
  </label>

  const boolCheck = (label: string, key: 'visibleForAll' | 'fromCashDesk' | 'verifiedOnly' | 'availableOnRequest' | 'slots' | 'liveCasino' | 'tableGames' | 'crashGames') => <label key={key} className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 transition hover:bg-slate-50">
    <input type="checkbox" checked={form[key]} onChange={(event) => setBool(key, event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
    <span className="min-w-0">{label}</span>
  </label>
  const arrayCheck = (label: string, key: 'regions' | 'paymentSystems' | 'currencies' | 'providers', value: string) => <label key={key + value} className="flex min-w-0 cursor-pointer items-center gap-2 text-[10px] text-slate-600">
    <input type="checkbox" checked={form[key].includes(value)} onChange={() => toggleArray(key, value)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-slate-900" />
    <span>{label}</span>
  </label>

  const nextStep = () => {
    if (step === 0) {
      if (!form.name.trim() || !form.description.trim() || !form.programStart || !form.programEnd || !form.expirationDate || !form.maxPlayers.trim()) {
        setValidationMessage('Complete all required fields: Name, Bonus Program Period, Expiration Date, Max Players and Description.')
        return
      }
      if (new Date(form.programEnd) < new Date(form.programStart)) {
        setValidationMessage('The end of Bonus Program Period must be after its start.')
        return
      }
      if (new Date(form.expirationDate) < new Date(form.programStart)) {
        setValidationMessage('Expiration Date must be on or after the program start.')
        return
      }
    }
    if (step === 1 && (!form.bonusAmount || Number(form.bonusAmount) <= 0)) {
      setValidationMessage('Enter a bonus amount greater than zero to continue.')
      return
    }
    setValidationMessage('')
    setStep((current) => Math.min(2, current + 1))
  }
  const finish = () => {
    if (!form.name.trim() || !form.description.trim() || !form.bonusAmount || !form.expirationDate) {
      setStep(0)
      setValidationMessage('Complete the required setup and financial fields before adding the bonus.')
      return
    }
    onCreate(form)
    resetWizard()
  }

  return <Modal size="full" open={open} onOpenChange={closeWizard} title={'New ' + bonusType} description={stepDescriptions[step]} footer={<><Button variant="outline" onClick={() => step === 0 ? closeWizard(false) : setStep((current) => current - 1)}>{step === 0 ? 'Cancel' : 'Back'}</Button>{step < 2 ? <Button onClick={nextStep}>Next <ArrowRight className="h-4 w-4" /></Button> : <Button onClick={finish}><Plus className="h-4 w-4" /> Add</Button>}</>}>
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {steps.map((title, index) => <Fragment key={title}>
            <button type="button" onClick={() => { if (index <= step) { setStep(index); setValidationMessage('') } }} className={cn('flex min-w-0 items-center gap-2 text-left', index <= step ? 'text-slate-900' : 'text-slate-400')}>
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', index < step ? 'border-emerald-500 bg-emerald-500 text-white' : index === step ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white')}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
              <span className="truncate text-[11px] font-semibold sm:text-xs">{title}</span>
            </button>
            {index < 2 ? <div className={cn('h-px w-5 sm:w-12', index < step ? 'bg-emerald-500' : 'bg-slate-200')} /> : null}
          </Fragment>)}
        </div>
      </div>
      {validationMessage ? <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{validationMessage}</div> : null}

      {step === 0 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-4"><h3 className="text-sm font-semibold text-slate-900">Setup</h3><p className="mt-1 text-[11px] text-slate-500">Define the bonus name, product scope, eligibility and dates.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Name</span><Input value={form.name} onChange={(event) => setText('name', event.target.value)} placeholder="Bonus name" className="h-10 text-xs" required /></label>
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Regions</span><div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-slate-200 px-2.5 py-2">{['Tunisia','Europe','MENA'].map((region) => arrayCheck(region, 'regions', region))}</div></div>
            {field('Reject / Allow', 'decision', ['Reject', 'Allow'])}
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Bonus Program Period</span><div className="grid grid-cols-2 gap-1.5"><Input aria-label="Bonus program start" type="datetime-local" value={form.programStart} onChange={(event) => setText('programStart', event.target.value)} className="h-10 min-w-0 px-1.5 text-[10px]" required /><Input aria-label="Bonus program end" type="datetime-local" value={form.programEnd} onChange={(event) => setText('programEnd', event.target.value)} className="h-10 min-w-0 px-1.5 text-[10px]" required /></div></div>
            {field('Expiration Type', 'expirationType', ['To Given Date', 'N Days After Activation', 'End of Program'])}
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Expiration Date</span><Input aria-label="Expiration date" type="datetime-local" value={form.expirationDate} onChange={(event) => setText('expirationDate', event.target.value)} className="h-10 min-w-0 px-2 text-[10px]" required /></label>
            {field('Product', 'productType', ['Casino', 'Sportsbook', 'Casino + Sports'])}
            <div>{boolCheck('Visible For All', 'visibleForAll')}</div>
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Max Players</span><Input type="number" min="1" value={form.maxPlayers} onChange={(event) => setText('maxPlayers', event.target.value)} className="h-10 text-xs" required /></label>
            {field('Deposit Number', 'depositNumber', ['Any', '1st Deposit', '2nd Deposit', '3rd Deposit', 'Every Deposit'])}
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Payment Systems</span><div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-slate-200 px-2 py-2">{['Visa','Mastercard','Bank transfer','Wallet'].map((item) => arrayCheck(item, 'paymentSystems', item))}</div></div>
            <div>{boolCheck('From Cash Desk', 'fromCashDesk')}</div>
            {field('Wallet', 'wallet', ['None', 'Real Wallet', 'Bonus Wallet'])}
            <div>{boolCheck('Available for verified players only', 'verifiedOnly')}</div>
            <div>{boolCheck('Available for bonus request', 'availableOnRequest')}</div>
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Available Currencies</span><div className="flex min-h-10 flex-wrap items-center gap-3 rounded-md border border-slate-200 px-2.5 py-2">{['TND','EUR','USD'].map((currency) => arrayCheck(currency, 'currencies', currency))}</div></div>
            <label className="block min-w-0 space-y-1.5 sm:col-span-2 2xl:col-span-4"><span className="block text-[11px] font-medium text-slate-600">* Description</span><textarea required rows={2} value={form.description} onChange={(event) => setText('description', event.target.value)} placeholder="Describe bonus terms and eligibility…" className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-2"><CircleHelp className="mt-0.5 h-4 w-4 text-slate-400" /><div><h3 className="text-sm font-semibold text-slate-900">Schedule</h3><p className="mt-1 text-[11px] text-slate-500">Optional recurring schedule rules.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {field('Period Type', 'periodType', ['None', 'Daily', 'Weekly', 'Monthly'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Period</span><Input type="number" min="1" disabled={form.periodType === 'None'} value={form.period} onChange={(event) => setText('period', event.target.value)} placeholder="Period" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Count</span><Input type="number" min="1" disabled={form.periodType === 'None'} value={form.count} onChange={(event) => setText('count', event.target.value)} placeholder="Count" className="h-10 text-xs" /></label>
            <div className="flex items-end"><p className="w-full rounded-md bg-slate-50 px-3 py-3 text-[10px] text-slate-500">{form.periodType === 'None' ? 'No recurring schedule' : form.periodType + ' · ' + (form.period || 'period') + ' · ' + (form.count || 'count')}</p></div>
          </div>
        </section>
      </div> : null}

      {step === 1 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Financial Factors</h3><p className="mt-1 text-[11px] text-slate-500">Set bonus value and the limits attached to it.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {field('Calculation Type', 'calculationType', ['Percentage', 'Fixed Amount'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">* Bonus Amount ({form.calculationType === 'Percentage' ? '%' : 'currency'})</span><Input type="number" min="0.01" step="0.01" value={form.bonusAmount} onChange={(event) => setText('bonusAmount', event.target.value)} placeholder={form.calculationType === 'Percentage' ? '100' : '50'} className="h-10 text-xs" required /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Bonus Amount</span><Input type="number" min="0" value={form.maxBonusAmount} onChange={(event) => setText('maxBonusAmount', event.target.value)} placeholder="500" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Minimum Deposit</span><Input type="number" min="0" value={form.minimumDeposit} onChange={(event) => setText('minimumDeposit', event.target.value)} placeholder="20" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Maximum Deposit</span><Input type="number" min="0" value={form.maximumDeposit} onChange={(event) => setText('maximumDeposit', event.target.value)} placeholder="5,000" className="h-10 text-xs" /></label>
            {field('Wagering Multiplier', 'wageringMultiplier', ['x1', 'x10', 'x20', 'x30', 'x35', 'x40', 'x50'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Bet During Wagering</span><Input type="number" min="0" value={form.maxBet} onChange={(event) => setText('maxBet', event.target.value)} placeholder="5" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Withdrawal</span><Input type="number" min="0" value={form.maxWithdrawal} onChange={(event) => setText('maxWithdrawal', event.target.value)} placeholder="1,000" className="h-10 text-xs" /></label>
          </div>
        </section>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-800">Financial rule summary</p><p className="mt-1 text-xs leading-5 text-slate-500">Configured as {form.calculationType.toLowerCase()} at {form.bonusAmount || '—'}{form.calculationType === 'Percentage' ? '%' : ''}, with wagering set to {form.wageringMultiplier}. Changes stay in this preview.</p></div>
      </div> : null}

      {step === 2 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Game</h3><p className="mt-1 text-[11px] text-slate-500">Choose game categories and providers that qualify for this bonus.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{boolCheck('Slots', 'slots')}{boolCheck('Live Casino', 'liveCasino')}{boolCheck('Table Games', 'tableGames')}{boolCheck('Crash Games', 'crashGames')}</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><p className="text-[11px] font-medium text-slate-600">Game Providers</p><div className="grid grid-cols-2 gap-2">{['Evolution','Pragmatic Play','Play’n GO','Demo Studio'].map((provider) => arrayCheck(provider, 'providers', provider))}</div></div>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Game Contribution (%)</span><Input type="number" min="0" max="100" value={form.gameContribution} onChange={(event) => setText('gameContribution', event.target.value)} className="h-10 text-xs" /><p className="text-[10px] text-slate-400">Contribution percentage for qualifying gameplay.</p></label>
          </div>
          <label className="mt-4 block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Excluded Games</span><textarea rows={3} value={form.excludedGames} onChange={(event) => setText('excludedGames', event.target.value)} placeholder="Optional game IDs or names, one per line…" className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>
        </section>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-900">Ready to add</p><p className="mt-1 text-xs leading-5 text-emerald-800/80">{form.name || 'New bonus'} · {form.productType} · {form.calculationType} {form.bonusAmount || '—'}{form.calculationType === 'Percentage' ? '%' : ''} · {form.wageringMultiplier} wagering</p></div>
      </div> : null}
      <p className="text-[10px] text-slate-400">Demo mode — no live bonuses, player wallets, or game restrictions will be changed.</p>
    </div>
  </Modal>
}

type BonusColumnKey = 'id' | 'name' | 'bonusType' | 'productType' | 'expirationDate' | 'expirationDays' | 'startDate' | 'endDate' | 'platformDefinitionBonusId'
type BonusColumn = { key: BonusColumnKey; label: string; width: number }
const BONUS_COLUMNS: BonusColumn[] = [
  { key: 'id', label: 'ID', width: 150 },
  { key: 'name', label: 'Name', width: 210 },
  { key: 'bonusType', label: 'Type', width: 160 },
  { key: 'productType', label: 'Product Type', width: 155 },
  { key: 'expirationDate', label: 'Expiration Date', width: 160 },
  { key: 'expirationDays', label: 'Expiration Days', width: 145 },
  { key: 'startDate', label: 'Start Date', width: 155 },
  { key: 'endDate', label: 'End Date', width: 155 },
  { key: 'platformDefinitionBonusId', label: 'Platform Definition Bonus Id', width: 230 },
]

export function BonusesPage({ offers, onCreate, onToggle, onNotify }: { offers: Offer[]; onCreate: () => void; onToggle: (id: string) => void; onNotify: (message: string) => void }) {
  const [columnOrder, setColumnOrder] = useState<BonusColumnKey[]>(BONUS_COLUMNS.map((column) => column.key))
  const [visibleColumns, setVisibleColumns] = useState<BonusColumnKey[]>(BONUS_COLUMNS.map((column) => column.key))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionBonusId, setActionBonusId] = useState<string | null>(null)
  const [selectedBonus, setSelectedBonus] = useState<Offer | null>(null)
  const [sortKey, setSortKey] = useState<BonusColumnKey>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [draggedColumn, setDraggedColumn] = useState<BonusColumnKey | null>(null)

  const orderedColumns = columnOrder.map((key) => BONUS_COLUMNS.find((column) => column.key === key)).filter((column): column is BonusColumn => Boolean(column))
  const shownColumns = orderedColumns.filter((column) => visibleColumns.includes(column.key))
  const rowFor = (offer: Offer): Record<BonusColumnKey, string> => ({
    id: offer.id,
    name: offer.name,
    bonusType: offer.bonusType || (offer.name.toLowerCase().includes('welcome') ? 'Welcome Bonus' : offer.name.toLowerCase().includes('spin') ? 'Free Spins' : 'Deposit Bonus'),
    productType: offer.productType || (offer.channel === 'Both' ? 'Casino + Sports' : offer.channel === 'Sports' ? 'Sportsbook' : 'Casino'),
    expirationDate: offer.expirationDate || offer.ends || '—',
    expirationDays: offer.expirationDays || '30',
    startDate: offer.startDate || '—',
    endDate: offer.endDate || offer.ends || '—',
    platformDefinitionBonusId: offer.platformDefinitionBonusId || '—',
  })
  const sortedOffers = [...offers].sort((left, right) => {
    const a = rowFor(left)[sortKey]
    const b = rowFor(right)[sortKey]
    const compare = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection === 'asc' ? compare : -compare
  })
  const tableWidth = shownColumns.reduce((total, column) => total + column.width, 0)
  const resetTable = () => {
    setColumnOrder(BONUS_COLUMNS.map((column) => column.key))
    setVisibleColumns(BONUS_COLUMNS.map((column) => column.key))
    setSortKey('id')
    setSortDirection('desc')
    setSettingsOpen(false)
    setActionBonusId(null)
    onNotify('Bonus table layout reset.')
  }
  const sortBy = (key: BonusColumnKey) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
  }
  const moveColumn = (target: BonusColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return
    setColumnOrder((current) => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(target)
      if (from < 0 || to < 0) return current
      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }

  return <div className="page-enter min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
    <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center"><h1 className="truncate text-sm font-semibold text-slate-900">Bonuses</h1></div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Bonus table settings" title="Table settings" onClick={() => setSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /></Button>
          {settingsOpen ? <div className="absolute right-0 top-9 z-30 w-[min(300px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-xs font-semibold text-slate-900">Table settings</p><p className="mt-1 text-[10px] text-slate-500">Choose the visible bonus fields.</p></div><button type="button" onClick={() => setVisibleColumns(BONUS_COLUMNS.map((column) => column.key))} className="text-[10px] font-semibold text-slate-600 hover:text-slate-950">Show all</button></div>
            <div className="admin-scrollbar grid max-h-[320px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto py-1">
              {BONUS_COLUMNS.map((column) => <label key={column.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900" /><span className="truncate" title={column.label}>{column.label}</span></label>)}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag a column heading to change its order.</div>
          </div> : null}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Reset bonus table" title="Reset table" onClick={resetTable}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="flex min-h-[50px] items-center justify-end border-b border-slate-200 px-3 py-2.5">
      <Button size="sm" className="h-8 rounded-md px-3 text-xs" onClick={onCreate}><Plus className="h-3.5 w-3.5" /> New</Button>
    </div>

    <div className="table-holder">
      <div className="admin-scrollbar w-full overflow-auto bg-white" style={{ height: offers.length ? 'min(72vh, 660px)' : '270px', minHeight: '270px', maxHeight: 'min(72vh, 660px)' }}>
        <table className="border-separate border-spacing-0 text-left" style={{ width: tableWidth + 48, minWidth: tableWidth + 48, tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {shownColumns.map((column) => <th key={column.key} draggable onDragStart={() => setDraggedColumn(column.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(column.key)} onDragEnd={() => setDraggedColumn(null)} style={{ width: column.width, minWidth: column.width }} className={cn('group/bonus-th box-border h-10 overflow-hidden border-b border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600', draggedColumn === column.key && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover/bonus-th:opacity-100" />
                  <button type="button" onClick={() => sortBy(column.key)} className="inline-flex min-w-0 items-center gap-1.5 text-left hover:text-slate-950"><span className="truncate">{column.label}</span><Filter className="h-3 w-3 shrink-0 text-slate-300" />{sortKey === column.key ? <span className="text-[9px] text-slate-500">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</button>
                </div>
              </th>)}
              <th className="w-12 min-w-12 border-b border-slate-200 bg-white px-2" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {sortedOffers.map((offer, index) => {
              const row = rowFor(offer)
              return <tr key={offer.id} className={cn('group/bonus-row transition-colors hover:bg-slate-50', index % 2 === 1 && 'bg-slate-50/40')}>
                {shownColumns.map((column) => <td key={column.key} style={{ width: column.width, minWidth: column.width }} className="box-border h-[43px] overflow-hidden border-b border-slate-100 px-3 text-xs text-slate-600">
                  {column.key === 'name' ? <button type="button" onClick={() => setSelectedBonus(offer)} className="max-w-[245px] truncate text-left font-medium text-slate-800 hover:underline">{row[column.key]}</button>
                  : column.key === 'bonusType' ? <Badge variant="outline">{row[column.key]}</Badge>
                  : column.key === 'productType' ? <Badge variant="secondary">{row[column.key]}</Badge>
                  : <span title={row[column.key]} className="block max-w-[250px] truncate">{row[column.key]}</span>}
                </td>)}
                <td className="relative h-[43px] border-b border-slate-100 px-2 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" aria-label={'Actions for ' + offer.name} onClick={() => setActionBonusId((current) => current === offer.id ? null : offer.id)}><MoreHorizontal className="h-4 w-4" /></Button>
                  {actionBonusId === offer.id ? <div className="absolute right-2 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                    <button type="button" onClick={() => { onToggle(offer.id); setActionBonusId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">{offer.status === 'Active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{offer.status === 'Active' ? 'Pause bonus' : 'Activate bonus'}</button>
                    <button type="button" onClick={() => { setSelectedBonus(offer); setActionBonusId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /> View details</button>
                  </div> : null}
                </td>
              </tr>
            })}
            {sortedOffers.length === 0 ? <tr><td colSpan={shownColumns.length + 1} className="p-0"><div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400"><Gift className="h-5 w-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">No Result</p></div></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
    {offers.length > 0 ? <div className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-400">Showing {offers.length} bonus definitions · Demo data only</div> : null}
    <Modal open={!!selectedBonus} onOpenChange={(open) => { if (!open) setSelectedBonus(null) }} title={selectedBonus ? selectedBonus.name : 'Bonus details'} description={selectedBonus ? rowFor(selectedBonus).id + ' · ' + rowFor(selectedBonus).bonusType : undefined}>
      {selectedBonus ? <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">{BONUS_COLUMNS.map((column) => <div key={column.key} className="rounded-md border border-slate-200 px-3 py-2.5"><p className="text-[10px] text-slate-400">{column.label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{rowFor(selectedBonus)[column.key]}</p></div>)}</div>
        <div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedBonus(null)}>Close</Button></div>
      </div> : null}
    </Modal>
  </div>
}
