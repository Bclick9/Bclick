import { useEffect, useState, type FormEvent } from 'react'
import { BadgePercent, Bell, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Download, LogOut, Menu, Plus, X, Zap, UserPlus, Shield, Paintbrush } from 'lucide-react'
import { Badge, Button } from './components/ui'
import { cn } from './lib/utils'
import { AdminAuthGate, useAdminAuth } from './components/AdminAuthGate'
import { NAV_GROUPS, CMS_NAV_GROUPS, PAGE_INFO, PAGE_PATHS, pageFromPath, workspaceForPage } from './lib/navigation'
import type { WorkspaceMode, PageKey, UserRow, BonusWizardForm, Offer } from './lib/types'
import { INITIAL_USERS, INITIAL_BONUSES } from './data/backoffice'
import { OverviewPage } from './pages/backoffice/Overview'
import { PlayersPage } from './pages/backoffice/Players'
import { BonusTypeChooserModal, BonusWizardModal, BonusesPage } from './pages/backoffice/Bonuses'
import { TransactionsPage } from './pages/backoffice/Transactions'
import { DepositsPage } from './pages/backoffice/Deposits'
import { WithdrawalsPage } from './pages/backoffice/Withdrawals'
import { ReportsPage } from './pages/backoffice/Reports'
import { SettingsPage } from './pages/backoffice/Settings'
import { PlayerProfilePage } from './pages/backoffice/PlayerProfile'
import { UserFormModal } from './components/UserFormModal'
import { CmsCategoriesPage } from './pages/cms/Categories'
import { CmsBannersPage } from './pages/cms/Banners'
import { CmsPromotionsPage } from './pages/cms/Promotions'
import { CmsPagesPage } from './pages/cms/Pages'
import { CmsSkinGamesPage, INITIAL_CMS_SKIN_GAMES, type CmsSkinGame } from './pages/cms/SkinGames'
import { CmsProvidersPage } from './pages/cms/Providers'

function AdminDashboard() {
  const auth = useAdminAuth()
  const adminDisplayName = auth.admin.displayName?.trim() || auth.admin.email || 'Administrator'
  const adminInitials = adminDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'AD'
  const [workspace, setWorkspace] = useState<WorkspaceMode>(() => workspaceForPage(pageFromPath(window.location.pathname)))
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false)
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromPath(window.location.pathname))
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS)
  const [bonuses, setBonuses] = useState<Offer[]>(INITIAL_BONUSES)
  const [games, setGames] = useState<CmsSkinGame[]>(INITIAL_CMS_SKIN_GAMES)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [bonusTypeChooserOpen, setBonusTypeChooserOpen] = useState(false)
  const [bonusWizardOpen, setBonusWizardOpen] = useState(false)
  const [bonusWizardType, setBonusWizardType] = useState('Deposit Bonus')
  const [userOpen, setUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => {
    const redirectLegacyBackofficeRoutes = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/'
      if (path === '/backoffice/games') {
        window.history.replaceState({}, '', PAGE_PATHS.overview)
      } else if (path === '/backoffice/promotions') {
        window.history.replaceState({}, '', PAGE_PATHS['cms-promotions'])
      }
    }
    const syncRoute = () => {
      redirectLegacyBackofficeRoutes()
      const nextPage = pageFromPath(window.location.pathname)
      setActivePage(nextPage)
      setWorkspace(workspaceForPage(nextPage))
      setSelectedUser(null)
      setMobileNavOpen(false)
      setWorkspaceSwitcherOpen(false)
      setProfileOpen(false)
      setNotificationOpen(false)
      setSearchQuery('')
    }
    window.addEventListener('popstate', syncRoute)
    syncRoute()
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])
  const page = PAGE_INFO[activePage]

  function navigate(next: PageKey) {
    const nextPath = PAGE_PATHS[next]
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setActivePage(next)
    setWorkspace(workspaceForPage(next))
    setSelectedUser(null)
    setMobileNavOpen(false)
    setWorkspaceSwitcherOpen(false)
    setProfileOpen(false)
    setNotificationOpen(false)
    setSearchQuery('')
  }

  function switchWorkspace(next: WorkspaceMode) {
    navigate(next === 'backoffice' ? 'overview' : 'cms-banners')
  }

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  function toggleUserStatus(id: string) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, status: current.status === 'Active' ? 'Suspended' : 'Active' } : current)
    notify('Sample account status updated in this preview.')
  }

  function savePlayerProfile(id: string, patch: Partial<UserRow>) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, ...patch } : current)
    notify('Demo player profile updated locally.')
  }

  function toggleOffer(id: string) {
    setBonuses((current) => current.map((offer) => offer.id === id ? { ...offer, status: offer.status === 'Active' ? 'Paused' : 'Active' } : offer))
    notify('Sample bonus status updated in this preview.')
  }

  function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const country = String(data.get('country') || 'Tunisia')
    const tier = String(data.get('tier') || 'Standard') as UserRow['tier']
    if (!name || !email) return
    const newUser: UserRow = { id: 'BC-' + String(20482 + users.length).padStart(6, '0'), name, email, country, joined: 'Oct 19, 2026', balance: '€0.00', status: 'Active', tier }
    setUsers((current) => [newUser, ...current])
    setUserOpen(false)
    setSearchQuery('')
    notify('Sample player added to this browser preview.')
  }

  function handleBonusWizardCreate(values: BonusWizardForm) {
    const bonusNumber = bonuses.length + 1
    const dateLabel = (value: string) => value ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
    const productChannel: Offer['channel'] = values.productType === 'Sportsbook' ? 'Sports' : values.productType === 'Casino + Sports' ? 'Both' : 'Casino'
    const endDate = dateLabel(values.programEnd)
    const bonus: Offer = {
      id: 'BN-' + String(bonusNumber).padStart(4, '0'),
      name: values.name.trim(), description: values.description.trim(), channel: productChannel,
      reward: values.calculationType === 'Percentage' ? values.bonusAmount + '% bonus' : values.bonusAmount + ' bonus',
      claims: '0', ends: endDate, status: 'Active', bonusType: bonusWizardType,
      productType: values.productType, expirationDate: dateLabel(values.expirationDate),
      expirationDays: values.expirationType === 'N Days After Activation' ? 'Configured by activation' : '—',
      startDate: dateLabel(values.programStart), endDate, platformDefinitionBonusId: '—',
    }
    setBonuses((current) => [bonus, ...current])
    setBonusWizardOpen(false)
    setBonusTypeChooserOpen(false)
    setActivePage('bonuses')
    setSearchQuery('')
    notify('Bonus created in the local preview. Nothing was published.')
  }

  const createHeaderAction = () => {
    if (workspace === 'cms') return null
    if (activePage === 'bonuses' || activePage === 'deposits' || activePage === 'withdrawals') return null
    if (activePage === 'users') return <Button onClick={() => setUserOpen(true)}><Plus className="h-4 w-4" /> New player</Button>
    if (activePage === 'reports' || activePage === 'transactions') return <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Export</Button>
    return <Button onClick={() => navigate('cms-promotions')}><Plus className="h-4 w-4" /> New campaign</Button>
  }

  return (
    <div className="app-shell min-h-screen bg-white text-slate-900">
      {mobileNavOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" /> : null}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-slate-200 bg-white text-slate-900 transition-transform duration-200 lg:translate-x-0', mobileNavOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-3.5">
          <button type="button" onClick={() => navigate(workspace === 'backoffice' ? 'overview' : 'cms-banners')} className="flex items-center gap-3 text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800"><Zap className="h-4 w-4" /></span>
            <span><span className="block text-[11px] font-semibold leading-4 text-slate-900">Bclick Admin</span><span className="block text-[9px] leading-3 text-slate-500">Backoffice + CMS</span></span>
          </button>
          <button type="button" className="text-slate-500 hover:text-white lg:hidden" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <div className="relative px-2.5 pt-3">
          <button type="button" aria-haspopup="menu" aria-expanded={workspaceSwitcherOpen} onClick={() => setWorkspaceSwitcherOpen((open) => !open)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <div className="flex items-center gap-2"><span className={cn('flex h-7 w-7 items-center justify-center rounded-md text-white', workspace === 'backoffice' ? 'bg-slate-900' : 'bg-violet-700')}>{workspace === 'backoffice' ? <Shield className="h-3.5 w-3.5" /> : <Paintbrush className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800">{workspace === 'backoffice' ? 'Backoffice' : 'CMS'}</span><span className="mt-0.5 block text-[10px] text-slate-500">{workspace === 'backoffice' ? 'Operations & analytics' : 'Casino content studio'}</span></span><ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', workspaceSwitcherOpen && 'rotate-180')} /></div>
          </button>
          {workspaceSwitcherOpen ? <div role="menu" aria-label="Switch workspace" className="absolute left-3 right-3 top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <button type="button" role="menuitem" onClick={() => switchWorkspace('backoffice')} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', workspace === 'backoffice' ? 'bg-slate-100' : 'hover:bg-slate-50')}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Shield className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">Backoffice</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Players, transactions, reports & account operations</span></span>{workspace === 'backoffice' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</button>
            <button type="button" role="menuitem" onClick={() => switchWorkspace('cms')} className={cn('mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', workspace === 'cms' ? 'bg-violet-50' : 'hover:bg-slate-50')}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-700 text-white"><Paintbrush className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">CMS</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Banners, promotions, pages, skins & providers</span></span>{workspace === 'cms' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</button>
          </div> : null}
        </div>
        <nav className="admin-scrollbar flex-1 overflow-y-auto px-2.5 py-4">
          {(workspace === 'backoffice' ? NAV_GROUPS : CMS_NAV_GROUPS).map((group) => <div key={group.title} className="mb-6">
            <p className="mb-1.5 px-2.5 text-[10px] font-medium text-slate-500">{group.title}</p>
            <div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const active = activePage === item.page; return <button type="button" key={item.page} onClick={() => navigate(item.page)} className={cn('group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition', active ? 'workspace-nav-active bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950')}><Icon className={cn('h-[17px] w-[17px]', active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900')} /><span className="flex-1">{item.label}</span>{item.count ? <span className={cn('rounded px-1.5 py-0.5 text-[9px]', active ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500')}>{item.count}</span> : null}<ChevronRight className={cn('ml-auto h-3.5 w-3.5 text-slate-300 transition', active && 'text-slate-500')} /></button> })}</div>
          </div>)}
        </nav>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-[50px] items-center gap-2.5 border-b border-slate-200 bg-white px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="icon" className="relative h-8 w-8 shrink-0 border-slate-200 shadow-none" aria-label="Notifications" onClick={() => { setNotificationOpen((open) => !open); setProfileOpen(false) }}><Bell className="h-[18px] w-[18px] text-slate-600" /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">2</span></Button>
              {notificationOpen ? <div className="absolute right-0 top-10 z-40 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="flex items-center justify-between px-2 py-1"><p className="text-sm font-bold text-slate-800">Notifications</p><Badge variant="warning">3 new</Badge></div>{[{ title: 'Withdrawal needs review', text: 'TX-1048250 · 250.00 EUR', icon: CreditCard }, { title: 'Promotion is nearly over', text: 'Super Sunday · ended Oct 12', icon: BadgePercent }, { title: 'New player registered', text: 'Youssef Mansour · 21 min ago', icon: UserPlus }].map((item) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => { setNotificationOpen(false); notify('Notification preview opened.') }} className="mt-1 flex w-full items-start gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-[10px] text-slate-400">{item.text}</span></span></button> })}<button type="button" onClick={() => { setNotificationOpen(false); notify('All sample notifications marked as read.') }} className="mt-2 w-full border-t border-slate-100 pt-3 text-center text-xs font-semibold text-slate-500 hover:text-slate-900">Mark all as read</button></div> : null}
            </div>
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} aria-label="Open profile menu" onClick={() => { setProfileOpen((open) => !open); setNotificationOpen(false) }} className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-left shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e4e9f0] text-[10px] font-extrabold text-slate-800">{adminInitials}</span>
                <span className="hidden text-[11px] font-medium text-slate-700 sm:inline">{adminDisplayName}</span>
                <ChevronDown className={"h-3.5 w-3.5 text-slate-500 transition-transform " + (profileOpen ? "rotate-180" : "")} />
              </button>
              {profileOpen ? <div role="menu" aria-label="Profile menu" className="absolute right-0 top-10 z-50 w-[min(240px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4e9f0] text-xs font-extrabold text-slate-800">{adminInitials}</div>
                  <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{adminDisplayName}</p><p className="mt-1 truncate text-[10px] text-slate-500">{auth.roles.join(', ') || 'Administrator'}</p></div>
                </div>
                <div className="my-1 border-t border-slate-100" />
                <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); void auth.signOut() }} disabled={auth.signOutBusy} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"><LogOut className="h-4 w-4" /> {auth.signOutBusy ? 'Signing out…' : 'Sign out'}</button>
              </div> : null}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-50px)] bg-white px-4 py-5 sm:px-5 xl:px-6">
          {selectedUser ? <PlayerProfilePage user={selectedUser} onBack={() => setSelectedUser(null)} onToggle={() => toggleUserStatus(selectedUser.id)} onNotify={notify} onSave={savePlayerProfile} /> : <>
                      {activePage !== 'transactions' && activePage !== 'bonuses' ? <>
                        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden"><div><p className="text-[10px] font-medium text-slate-500">{workspace === 'backoffice' ? 'Backoffice' : 'CMS'}</p><h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">{page.title}</h1></div>{createHeaderAction()}</div>
                        <div className="mb-5 hidden items-center justify-between gap-4 lg:flex"><div><h1 className="text-xl font-semibold tracking-tight text-slate-900">{page.title}</h1><p className="mt-1 text-xs text-slate-500">{page.description}</p></div><div className="flex items-center gap-2">{createHeaderAction()}</div></div>
                      </> : null}
                      {activePage === 'overview' ? <OverviewPage /> : null}
                      {activePage === 'users' ? <PlayersPage users={users} query={searchQuery} onQueryChange={setSearchQuery} onAdd={() => setUserOpen(true)} onSelect={setSelectedUser} onToggleStatus={toggleUserStatus} /> : null}
                      {activePage === 'bonuses' ? <BonusesPage offers={bonuses} onCreate={() => setBonusTypeChooserOpen(true)} onToggle={toggleOffer} onNotify={notify} /> : null}
                      {activePage === 'transactions' ? <TransactionsPage query={searchQuery} onQueryChange={setSearchQuery} users={users} onNotify={notify} onSelectPlayer={setSelectedUser} /> : null}
                      {activePage === 'deposits' ? <DepositsPage onNotify={notify} /> : null}
                      {activePage === 'withdrawals' ? <WithdrawalsPage onNotify={notify} /> : null}
                      {activePage === 'reports' ? <ReportsPage /> : null}
                      {activePage === 'settings' ? <SettingsPage onNotify={notify} /> : null}

            {workspace === 'cms' && activePage === 'cms-banners' ? <CmsBannersPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-promotions' ? <CmsPromotionsPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-pages' ? <CmsPagesPage onNotify={notify} /> : null}
             {workspace === 'cms' && activePage === 'cms-skin-games' ? <CmsSkinGamesPage games={games} onSaveGame={(updatedGame) => setGames((current) => current.map((game) => game.id === updatedGame.id ? updatedGame : game))} onMoveGame={(draggedId, targetId) => setGames((current) => { const from = current.findIndex((game) => game.id === draggedId); if (from < 0) return current; const next = [...current]; const [moved] = next.splice(from, 1); if (!moved) return current; const to = next.findIndex((game) => game.id === targetId); if (to < 0) return current; next.splice(to, 0, moved); return next })} onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-categories' ? <CmsCategoriesPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-providers' ? <CmsProvidersPage onNotify={notify} /> : null}

          </>}
          <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-[10px] text-slate-400 sm:flex-row"><span>© 2026 Bclick Admin · UI prototype</span><span className="flex items-center gap-3"><button type="button" className="hover:text-slate-600" onClick={() => notify('Admin documentation has not been added yet.')}>Documentation</button><button type="button" className="hover:text-slate-600" onClick={() => notify('Support is not connected in this prototype.')}>Contact support</button><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Demo data</span></span></footer>
        </main>
      </div>

      <BonusTypeChooserModal open={bonusTypeChooserOpen} onOpenChange={setBonusTypeChooserOpen} onChoose={(type) => { setBonusWizardType(type); setBonusWizardOpen(true) }} />
      <BonusWizardModal open={bonusWizardOpen} onOpenChange={setBonusWizardOpen} bonusType={bonusWizardType} onCreate={handleBonusWizardCreate} />
      <UserFormModal open={userOpen} onOpenChange={setUserOpen} onSubmit={handleUserSubmit} />

      {toast ? <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{toast}</div> : null}
    </div>
  )
}


export default function App() {
  return <AdminAuthGate><AdminDashboard /></AdminAuthGate>
}
