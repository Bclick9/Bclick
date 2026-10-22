import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Gamepad2, KeyRound,
  LoaderCircle, LogIn, LogOut, RefreshCw, Search, ShieldCheck, ShieldX,
} from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import { cn } from '../../lib/utils'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../../lib/adminApi'

const PROVIDER_PERMISSION = 'casino.provider-settings.manage'
const PAGE_SIZE = 30

type Screen = 'checking' | 'login' | 'mfa' | 'enrollment' | 'app' | 'forbidden'
type Envelope<T> = { data: T; requestId?: string }
type AdminSession = {
  admin: { email?: string; displayName?: string; status?: string }
  roles: string[]
  permissions: string[]
  session: { authenticatedAt: string; expiresAt: string }
}
type BigBangSettings = {
  sourceCode: string
  selectedTier: string
  supportedTiers: string[]
  premiumAvailable: boolean
  premiumReason: string
  sync: { latestStatus: string | null; lastSucceededAt: string | null }
}
type ProviderRow = {
  id: string
  code: string
  name: string
  enabled: boolean
  updatedAt: string
  totalGames: number
  sourceAvailableGames: number
  enabledGames: number
}
type GameRow = {
  id: string
  slug: string
  title: string
  provider: { code: string; name: string }
  sourceAvailable: boolean
  catalogAvailable: boolean
  enabled: boolean
  providerEnabled: boolean
  updatedAt: string
}
type GamePage = { page: number; pageSize: number; total: number; nextPage: number | null }

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Not recorded'
  return date.toLocaleString()
}

function StatusBadge({ enabled, enabledLabel = 'Enabled', disabledLabel = 'Blocked' }: {
  enabled: boolean
  enabledLabel?: string
  disabledLabel?: string
}) {
  return <Badge variant={enabled ? 'success' : 'danger'}>{enabled ? enabledLabel : disabledLabel}</Badge>
}

function AuthShell({ children, title, description }: {
  children: React.ReactNode
  title: string
  description: string
}) {
  return <div className="mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"><ShieldCheck className="h-5 w-5" /></span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
}

export function CmsProvidersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [screen, setScreen] = useState<Screen>('checking')
  const [adminName, setAdminName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [mfaFactor, setMfaFactor] = useState<'totp' | 'recovery_code'>('totp')
  const [mfaCode, setMfaCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpUri, setTotpUri] = useState('')

  const [settings, setSettings] = useState<BigBangSettings | null>(null)
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [providersSearch, setProvidersSearch] = useState('')
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [workingKey, setWorkingKey] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [gamePageNumber, setGamePageNumber] = useState(1)
  const [gameRows, setGameRows] = useState<GameRow[]>([])
  const [gamePage, setGamePage] = useState<GamePage>({ page: 1, pageSize: PAGE_SIZE, total: 0, nextPage: null })
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState('')
  const [gamesReloadKey, setGamesReloadKey] = useState(0)

  async function loadMainData(): Promise<void> {
    setPageLoading(true)
    setPageError('')
    try {
      const [settingsResult, providerResult] = await Promise.all([
        requestAdminApi<Envelope<BigBangSettings>>('/api/v1/admin/bigbang/settings'),
        requestAdminApi<Envelope<ProviderRow[]>>('/api/v1/admin/bigbang/providers'),
      ])
      setSettings(settingsResult.data)
      setProviders(providerResult.data)
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setScreen('login')
        setAuthError('Your administrator session expired. Sign in again to continue.')
      } else if (error instanceof AdminApiError && error.status === 403) {
        setScreen('forbidden')
      } else {
        setPageError(errorMessage(error, 'Could not load BigBang provider settings.'))
      }
    } finally {
      setPageLoading(false)
    }
  }

  async function establishAdminSession(): Promise<void> {
    const result = await requestAdminApi<Envelope<AdminSession>>('/api/v1/admin/session')
    const session = result.data
    if (!session.permissions.includes(PROVIDER_PERMISSION)) {
      setScreen('forbidden')
      return
    }
    setAdminName(session.admin.displayName || session.admin.email || 'Administrator')
    setAuthError('')
    setScreen('app')
    await loadMainData()
  }

  useEffect(() => {
    let active = true
    void requestAdminApi<Envelope<AdminSession>>('/api/v1/admin/session').then((result) => {
      if (!active) return
      const session = result.data
      if (!session.permissions.includes(PROVIDER_PERMISSION)) {
        setScreen('forbidden')
        return
      }
      setAdminName(session.admin.displayName || session.admin.email || 'Administrator')
      setScreen('app')
      void loadMainData()
    }).catch((error: unknown) => {
      if (!active) return
      if (error instanceof AdminApiError && error.status === 401) {
        setScreen('login')
        return
      }
      setAuthError(errorMessage(error, 'Could not verify the administrator session.'))
      setScreen('login')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (screen !== 'app') return
    let active = true
    setGamesLoading(true)
    setGamesError('')
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(gamePageNumber),
        pageSize: String(PAGE_SIZE),
      })
      if (gameSearch.trim()) params.set('query', gameSearch.trim())
      if (providerFilter) params.set('providerCode', providerFilter)
      void requestAdminApi<{
        data: GameRow[]
        page: GamePage
      }>('/api/v1/admin/bigbang/games?' + params.toString()).then((result) => {
        if (!active) return
        setGameRows(result.data)
        setGamePage(result.page)
      }).catch((error: unknown) => {
        if (!active) return
        setGamesError(errorMessage(error, 'Could not load Standard Sandbox games.'))
        if (error instanceof AdminApiError && error.status === 401) {
          setScreen('login')
          setAuthError('Your administrator session expired. Sign in again to continue.')
        } else if (error instanceof AdminApiError && error.status === 403) {
          setScreen('forbidden')
        }
      }).finally(() => {
        if (active) setGamesLoading(false)
      })
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [screen, gamePageNumber, gameSearch, providerFilter, gamesReloadKey])

  const shownProviders = useMemo(() => {
    const query = providersSearch.trim().toLowerCase()
    return providers
      .filter((provider) => !query || (provider.name + ' ' + provider.code).toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [providers, providersSearch])

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      const result = await requestAdminApi<Envelope<{
        status: 'mfa_required' | 'enrollment_required'
        challengeId: string
        expiresAt: string
      }>>('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      })
      setChallengeId(result.data.challengeId)
      setMfaCode('')
      if (result.data.status === 'enrollment_required') {
        const csrf = readEnrollmentCsrf()
        const setup = await requestAdminApi<Envelope<{ secret: string; otpauthUri: string; expiresAt: string }>>(
          '/api/v1/admin/auth/mfa/totp/setup',
          { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: '{}' },
        )
        setTotpSecret(setup.data.secret)
        setTotpUri(setup.data.otpauthUri)
        setScreen('enrollment')
      } else {
        setScreen('mfa')
      }
    } catch (error) {
      setAuthError(errorMessage(error, 'Administrator sign-in failed.'))
    } finally {
      setAuthBusy(false)
    }
  }

  function readEnrollmentCsrf(): string {
    const token = document.cookie.split(';').map((item) => item.trim())
      .find((item) => item.startsWith('__Host-bclick_admin_enrollment_csrf='))
      ?.slice('__Host-bclick_admin_enrollment_csrf='.length)
    if (!token) throw new Error('The first-login enrollment CSRF cookie is unavailable. Reload the local page and sign in again.')
    try {
      return decodeURIComponent(token)
    } catch {
      return token
    }
  }

  async function handleMfaVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      await requestAdminApi('/api/v1/admin/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, factor: mfaFactor, code: mfaCode.trim() }),
      })
      await establishAdminSession()
    } catch (error) {
      setAuthError(errorMessage(error, 'The authentication code was not accepted.'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleEnrollmentVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      await requestAdminApi('/api/v1/admin/auth/mfa/totp/verify', {
        method: 'POST',
        headers: { 'X-CSRF-Token': readEnrollmentCsrf() },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      setTotpSecret('')
      setTotpUri('')
      await establishAdminSession()
    } catch (error) {
      setAuthError(errorMessage(error, 'The authenticator code could not be verified.'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function logout(): Promise<void> {
    setAuthBusy(true)
    setAuthError('')
    try {
      await requestAdminApi<void>('/api/v1/admin/auth/logout', {
        method: 'POST',
        headers: getAdminCsrfHeaders(),
      })
    } catch (error) {
      setAuthError(errorMessage(error, 'Could not close the administrator session.'))
      setAuthBusy(false)
      return
    }
    setSettings(null)
    setProviders([])
    setGameRows([])
    setLoginPassword('')
    setMfaCode('')
    setScreen('login')
    setAuthBusy(false)
    onNotify('Administrator session closed.')
  }

  async function toggleProvider(provider: ProviderRow): Promise<void> {
    const enabled = !provider.enabled
    const action = enabled ? 'enable' : 'block'
    if (!window.confirm('Are you sure you want to ' + action + ' BigBang provider ' + provider.name + ' for Bclick Standard Sandbox?')) return
    setWorkingKey('provider:' + provider.code)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/providers/' + encodeURIComponent(provider.code), {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ enabled }),
      })
      await loadMainData()
      setGamesReloadKey((value) => value + 1)
      onNotify(provider.name + ' ' + (enabled ? 'enabled' : 'blocked') + ' in Bclick.')
    } catch (error) {
      setActionError(errorMessage(error, 'Could not update this provider.'))
    } finally {
      setWorkingKey('')
    }
  }

  async function toggleGame(game: GameRow): Promise<void> {
    const enabled = !game.enabled
    const action = enabled ? 'enable' : 'block'
    if (!window.confirm('Are you sure you want to ' + action + ' the game "' + game.title + '" from ' + game.provider.name + ' in Bclick Standard Sandbox?')) return
    setWorkingKey('game:' + game.id)
    setActionError('')
    try {
      await requestAdminApi('/api/v1/admin/bigbang/games/' + encodeURIComponent(game.id), {
        method: 'PATCH',
        headers: getAdminCsrfHeaders(),
        body: JSON.stringify({ enabled }),
      })
      setGamesReloadKey((value) => value + 1)
      await loadMainData()
      onNotify('Game "' + game.title + '" ' + (enabled ? 'enabled' : 'blocked') + ' in Bclick.')
    } catch (error) {
      setActionError(errorMessage(error, 'Could not update this game.'))
    } finally {
      setWorkingKey('')
    }
  }

  if (screen === 'checking' || screen === 'checking') {
    return <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Checking administrator session…</div>
  }

  if (screen === 'login') {
    return <AuthShell title="Administrator sign-in" description="Sign in to manage the actual BigBang Standard Sandbox catalogue. This screen uses the protected backend, not demo table data.">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5"><label htmlFor="admin-email" className="text-xs font-medium text-slate-700">Administrator email</label><Input id="admin-email" type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="admin@example.com" /></div>
        <div className="space-y-1.5"><label htmlFor="admin-password" className="text-xs font-medium text-slate-700">Password</label><Input id="admin-password" type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Administrator password" /></div>
        {authError ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{authError}</p> : null}
        <Button type="submit" disabled={authBusy} className="w-full">{authBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in</Button>
        <p className="text-[11px] leading-5 text-slate-500">Administrator accounts must be provisioned in the local development database. First login requires authenticator-app enrollment; existing accounts require their MFA code.</p>
      </form>
    </AuthShell>
  }

  if (screen === 'mfa') {
    return <AuthShell title="Verify administrator MFA" description="Complete the second authentication step to open provider controls.">
      <form onSubmit={handleMfaVerify} className="space-y-4">
        <div className="space-y-1.5"><label htmlFor="admin-mfa-factor" className="text-xs font-medium text-slate-700">Verification method</label><select id="admin-mfa-factor" value={mfaFactor} onChange={(event) => setMfaFactor(event.target.value as 'totp' | 'recovery_code')} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"><option value="totp">Authenticator app</option><option value="recovery_code">Recovery code</option></select></div>
        <div className="space-y-1.5"><label htmlFor="admin-mfa-code" className="text-xs font-medium text-slate-700">{mfaFactor === 'totp' ? '6-digit authenticator code' : 'Recovery code'}</label><Input id="admin-mfa-code" autoComplete="one-time-code" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} maxLength={mfaFactor === 'totp' ? 6 : 64} inputMode={mfaFactor === 'totp' ? 'numeric' : 'text'} placeholder={mfaFactor === 'totp' ? '123456' : 'XXXX-XXXX-XXXX-XXXX'} /></div>
        {authError ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{authError}</p> : null}
        <Button type="submit" disabled={authBusy || !mfaCode.trim()} className="w-full">{authBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify and continue</Button>
        <button type="button" className="w-full text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900" onClick={() => { setScreen('login'); setMfaCode(''); setAuthError('') }}>Return to sign in</button>
      </form>
    </AuthShell>
  }

  if (screen === 'enrollment') {
    return <AuthShell title="Set up administrator authenticator" description="Add this TOTP key to your authenticator app, then enter the current six-digit code. The key is shown only during this one-time enrollment.">
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Keep this key private.</strong> Do not send it in screenshots or messages.</div>
        <div className="space-y-1.5"><p className="text-xs font-medium text-slate-700">Manual setup key</p><code className="block break-all rounded-md bg-slate-100 p-3 font-mono text-sm font-semibold text-slate-900">{totpSecret}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(totpSecret).then(() => onNotify('Authenticator key copied.')).catch(() => setAuthError('Clipboard access was denied. You can select and copy the key manually.')) }} className="text-xs text-slate-600 underline underline-offset-2">Copy setup key</button></div>
        <details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium">Advanced setup URI</summary><p className="mt-2 break-all rounded-md bg-slate-50 p-3 font-mono">{totpUri}</p></details>
        <form onSubmit={handleEnrollmentVerify} className="space-y-3">
          <div className="space-y-1.5"><label htmlFor="admin-enrollment-code" className="text-xs font-medium text-slate-700">Authenticator code</label><Input id="admin-enrollment-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="123456" /></div>
          {authError ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{authError}</p> : null}
          <Button type="submit" disabled={authBusy || !/^[0-9]{6}$/.test(mfaCode)} className="w-full">{authBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Verify and finish setup</Button>
        </form>
      </div>
    </AuthShell>
  }

  if (screen === 'forbidden') {
    return <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6 sm:p-8">
      <div className="flex items-start gap-3"><ShieldX className="h-6 w-6 shrink-0 text-rose-600" /><div><h2 className="text-base font-semibold text-slate-900">Provider-management permission required</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your administrator session does not have the <code>casino.provider-settings.manage</code> permission. No provider or game settings were changed. Ask a project administrator to grant the required role, then sign in again.</p></div></div>
      <Button variant="outline" onClick={() => void logout()} disabled={authBusy} className="mt-5"><LogOut className="h-4 w-4" /> Sign out</Button>
    </div>
  }

  const blockedProviderCount = providers.filter((provider) => !provider.enabled).length
  const lastSuccess = settings?.sync.lastSucceededAt ?? null

  return <div className="page-enter min-w-0 w-full space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div><div className="flex items-center gap-2"><h2 className="text-base font-semibold text-slate-900">Provider & game availability</h2><Badge variant="info">Live API</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">Changes are persisted by the Bclick API and enforced on catalogue and Sandbox demo-launch routes.</p><p className="mt-1 text-[11px] text-slate-400">Signed in as {adminName}</p></div>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { void loadMainData(); setGamesReloadKey((value) => value + 1) }} disabled={pageLoading || gamesLoading}><RefreshCw className={cn('h-4 w-4', (pageLoading || gamesLoading) && 'animate-spin')} /> Refresh</Button><Button type="button" variant="ghost" onClick={() => void logout()} disabled={authBusy}><LogOut className="h-4 w-4" /> Sign out</Button></div>
    </div>

    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-sky-950">BigBang · Standard Sandbox only</p><Badge variant="success">Sandbox</Badge><Badge variant="danger">Premium unavailable</Badge></div><p className="mt-1 text-xs leading-5 text-sky-900">This page cannot select or import Premium. Blocking a provider hides its Standard catalogue games and denies their Sandbox launch; blocking a game affects that game only.</p><p className="mt-2 text-[11px] text-sky-800">Selected tier: <strong>{settings?.selectedTier ?? 'Loading…'}</strong> · Latest sync: <strong>{settings?.sync.latestStatus ?? 'No run recorded'}</strong> · Last successful sync: {formatDate(lastSuccess)}</p></div>
      </div>
    </div>

    {pageError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pageError}</span></div> : null}
    {actionError ? <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{actionError}</span></div> : null}

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Standard providers</p><p className="mt-2 text-2xl font-semibold text-slate-900">{pageLoading ? '—' : providers.length}</p><p className="mt-1 text-[11px] text-slate-400">Loaded from PostgreSQL via API</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Blocked providers</p><p className="mt-2 text-2xl font-semibold text-rose-700">{pageLoading ? '—' : blockedProviderCount}</p><p className="mt-1 text-[11px] text-slate-400">All Standard games under these providers are unavailable</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Games in current result</p><p className="mt-2 text-2xl font-semibold text-slate-900">{gamesLoading ? '—' : gamePage.total.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-400">Standard catalogue, server-filtered</p></div>
    </div>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-semibold text-slate-900">Providers</h3><p className="mt-1 text-xs text-slate-500">Disable a provider to block every game sourced from it.</p></div>
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search actual providers" value={providersSearch} onChange={(event) => setProvidersSearch(event.target.value)} placeholder="Search providers" className="h-9 pl-9 text-xs" /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead><tr className="bg-slate-50">
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Provider</th>
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Bclick control</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Games</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Source available</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Enabled games</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Action</th>
          </tr></thead>
          <tbody>
            {shownProviders.map((provider, index) => <tr key={provider.id} className={cn('hover:bg-slate-50', index % 2 === 1 && 'bg-slate-50/40')}>
              <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-800">{provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{provider.code}</p></td>
              <td className="border-b border-slate-100 px-4 py-3"><StatusBadge enabled={provider.enabled} /></td>
              <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums text-slate-700">{provider.totalGames.toLocaleString()}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums text-slate-700">{provider.sourceAvailableGames.toLocaleString()}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-right text-xs tabular-nums text-slate-700">{provider.enabledGames.toLocaleString()}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-right"><Button type="button" size="sm" variant={provider.enabled ? 'destructive' : 'default'} disabled={workingKey !== '' || pageLoading} onClick={() => void toggleProvider(provider)}>{workingKey === 'provider:' + provider.code ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}{provider.enabled ? 'Block provider' : 'Enable provider'}</Button></td>
            </tr>)}
            {!pageLoading && shownProviders.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">No provider matches this search.</td></tr> : null}
            {pageLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Loading providers from the API…</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h3 className="text-sm font-semibold text-slate-900">Games</h3><p className="mt-1 text-xs text-slate-500">Block a single game without disabling its whole provider.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 sm:min-w-[220px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search Standard games" value={gameSearch} onChange={(event) => { setGameSearch(event.target.value); setGamePageNumber(1) }} placeholder="Search games or providers" className="h-9 pl-9 text-xs" /></div>
          <select aria-label="Filter games by provider" value={providerFilter} onChange={(event) => { setProviderFilter(event.target.value); setGamePageNumber(1) }} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"><option value="">All providers</option>{providers.map((provider) => <option key={provider.code} value={provider.code}>{provider.name}</option>)}</select>
        </div>
      </div>
      {gamesError ? <div role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{gamesError}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
          <thead><tr className="bg-slate-50">
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Game</th>
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Provider</th>
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Source</th>
            <th className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-600">Effective state</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-semibold text-slate-600">Action</th>
          </tr></thead>
          <tbody>
            {gameRows.map((game, index) => {
              const effectivelyAvailable = game.sourceAvailable && game.catalogAvailable && game.enabled && game.providerEnabled
              const working = workingKey === 'game:' + game.id
              return <tr key={game.id} className={cn('hover:bg-slate-50', index % 2 === 1 && 'bg-slate-50/40')}>
                <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-800">{game.title}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{game.slug}</p></td>
                <td className="border-b border-slate-100 px-4 py-3"><p className="text-xs text-slate-700">{game.provider.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{game.provider.code}</p></td>
                <td className="border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap gap-1.5"><StatusBadge enabled={game.sourceAvailable} enabledLabel="Source on" disabledLabel="Source off" /><StatusBadge enabled={game.catalogAvailable} enabledLabel="Listed" disabledLabel="Source unavailable" /></div></td>
                <td className="border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap gap-1.5"><StatusBadge enabled={effectivelyAvailable} enabledLabel="Available" disabledLabel="Blocked" />{!game.providerEnabled ? <Badge variant="warning">Provider blocked</Badge> : null}{!game.enabled ? <Badge variant="danger">Game blocked</Badge> : null}</div></td>
                <td className="border-b border-slate-100 px-4 py-3 text-right"><Button type="button" size="sm" variant={game.enabled ? 'destructive' : 'default'} disabled={workingKey !== '' || gamesLoading || !game.providerEnabled} onClick={() => void toggleGame(game)}>{working ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}{!game.providerEnabled ? 'Enable provider first' : game.enabled ? 'Block game' : 'Enable game'}</Button></td>
              </tr>
            })}
            {!gamesLoading && gameRows.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400"><Gamepad2 className="mb-2 inline h-5 w-5" /><p>No Standard Sandbox games match the selected filters.</p></td></tr> : null}
            {gamesLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Loading catalogue rows…</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-slate-500">Showing {gameRows.length ? ((gamePageNumber - 1) * PAGE_SIZE + 1).toLocaleString() : '0'}–{Math.min(gamePageNumber * PAGE_SIZE, gamePage.total).toLocaleString()} of {gamePage.total.toLocaleString()} games</p>
        <div className="flex items-center justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={gamesLoading || gamePageNumber <= 1} onClick={() => setGamePageNumber((page) => Math.max(1, page - 1))}><ChevronLeft className="h-3.5 w-3.5" /> Previous</Button><span className="text-[11px] tabular-nums text-slate-500">Page {gamePageNumber}</span><Button type="button" size="sm" variant="outline" disabled={gamesLoading || gamePage.nextPage === null} onClick={() => setGamePageNumber((page) => page + 1)}>Next <ChevronRight className="h-3.5 w-3.5" /></Button></div>
      </div>
    </section>

    <p className="text-[11px] leading-5 text-slate-400">Every provider/game toggle is verified by the API, audited server-side, and applies only to the Standard catalogue. This control panel does not enable Premium, live play, wallet callbacks, payments, wagers, or money movement.</p>
  </div>
}
