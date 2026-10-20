import { useState, type FormEvent } from 'react'
import { ChevronDown, CircleHelp, Settings, Check } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { SectionHeading } from '../../components/DashboardUI'

export function SettingsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [projectName, setProjectName] = useState('Zedbet')
  const [mainLanguage, setMainLanguage] = useState('French')
  const [supportedLanguages, setSupportedLanguages] = useState(['English', 'Arabic'])
  const [supportedLanguagesOpen, setSupportedLanguagesOpen] = useState(false)

  const savePreview = () => onNotify('UI preview only — project settings have not been saved to a server.')
  const sectionTitle = (title: string) => (
    <div className="mb-5 flex items-center gap-4">
      <h2 className="shrink-0 text-sm font-semibold text-slate-800">{title}</h2>
      <div className="h-px min-w-0 flex-1 bg-slate-200" />
    </div>
  )
  const fieldLabel = (title: string, required = false) => (
    <span className="mb-1.5 block text-xs font-medium text-slate-600">
      {required ? <span className="mr-1 text-rose-500">*</span> : null}{title}
    </span>
  )
  const lockedFieldClass = "flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"

  return <div className="page-enter space-y-5">
    <SectionHeading title="Project Settings" description="Manage the general configuration, currencies, languages, and timezone for your project." actions={<Button type="button" onClick={savePreview}><Check className="h-4 w-4" /> Save changes</Button>} />

    <div role="status" className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3.5 text-sky-900">
      <CircleHelp className="h-4 w-4 shrink-0 text-sky-700" />
      <div className="h-5 w-px shrink-0 bg-sky-200" />
      <p className="text-xs font-medium">You have <span className="font-bold">14 projects remaining</span> in your quota</p>
    </div>

    <form id="project-settings-form" noValidate onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); savePreview() }} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {sectionTitle('General Information')}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block min-w-0">
            {fieldLabel('Project Name', true)}
            <Input required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project Name" className="border-slate-300 focus-visible:ring-slate-300" />
          </label>
          <div className="min-w-0">
            {fieldLabel('Project Alias')}
            <div className={lockedFieldClass} aria-label="Project Alias: zedbet-18778069">zedbet-18778069</div>
          </div>
          <div className="min-w-0">
            {fieldLabel('Primary Country Of Operation', true)}
            <div className={lockedFieldClass + " justify-between"} aria-label="Primary Country Of Operation: Tunisia">
              <span>Tunisia</span><ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {sectionTitle('Solution Type')}
        <div className="max-w-xl">
          {fieldLabel('Solution', true)}
          <div className={lockedFieldClass + " justify-between"} aria-label="Solution: Turnkey">
            <span>Turnkey</span><ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {sectionTitle('Currency Settings')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            {fieldLabel('Reporting Currency', true)}
            <div className={lockedFieldClass + " justify-between"} aria-label="Reporting Currency: Tunisian dinar TND">
              <span>Tunisian dinar TND</span><ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>The Reporting Currency signifies the currency in which you will receive your financial reports.</span>
            </div>
          </div>
          <div className="min-w-0">
            {fieldLabel('Supported Currencies', true)}
            <div className={lockedFieldClass + " justify-between"} aria-label="Supported Currencies: Tunisian dinar TND">
              <span>Tunisian dinar TND</span><ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {sectionTitle('Languages And Timezone')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <label className="block min-w-0">
            {fieldLabel('Main Language', true)}
            <span className="relative block">
              <select value={mainLanguage} onChange={(event) => setMainLanguage(event.target.value)} className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                <option>French</option><option>English</option><option>Arabic</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </span>
          </label>

          <div className="relative min-w-0">
            {fieldLabel('Supported Languages')}
            <button type="button" aria-expanded={supportedLanguagesOpen} onClick={() => setSupportedLanguagesOpen((open) => !open)} className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-800 outline-none transition hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200">
              <span className="truncate">{supportedLanguages.join(', ') || 'Select languages'}</span>
              <ChevronDown className={"h-4 w-4 shrink-0 text-slate-400 transition-transform " + (supportedLanguagesOpen ? "rotate-180" : "")} />
            </button>
            {supportedLanguagesOpen ? <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              {['English', 'Arabic', 'French'].map((language) => {
                const checked = supportedLanguages.includes(language)
                return <label key={language} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={checked} onChange={() => setSupportedLanguages((current) => checked ? current.filter((item) => item !== language) : [...current, language])} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
                  {language}
                </label>
              })}
              <div className="mt-1 flex justify-end border-t border-slate-100 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSupportedLanguagesOpen(false)}>Done</Button>
              </div>
            </div> : null}
          </div>

          <div className="min-w-0">
            {fieldLabel('Timezone', true)}
            <div className={lockedFieldClass + " justify-between"} aria-label="Timezone: UTC+01:00">
              <span>UTC+01:00</span><ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
        <p className="text-[11px] leading-5 text-slate-400">Some project values are managed by the platform and cannot be edited here.</p>
        <Button type="submit" className="sm:min-w-32"><Check className="h-4 w-4" /> Save changes</Button>
      </div>
    </form>
  </div>
}
