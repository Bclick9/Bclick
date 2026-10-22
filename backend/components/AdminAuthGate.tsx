import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, KeyRound, LoaderCircle, LogIn, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, Input } from './ui'
import { AdminApiError, getAdminCsrfHeaders, requestAdminApi } from '../lib/adminApi'

type AuthScreen = 'checking' | 'login' | 'mfa' | 'enrollment' | 'ready' | 'unavailable'
type Envelope<T> = { data: T; requestId?: string }
export type AdminSession = {
  admin: { id?: string; email?: string; displayName?: string; status?: string }
  roles: string[]
  permissions: string[]
  mfa: { enabled: boolean; method: string }
  session: { authenticatedAt: string; expiresAt: string }
}
type AdminAuthContextValue = {
  admin: AdminSession['admin']
  roles: string[]
  permissions: string[]
  signOut: () => Promise<void>
  signOutBusy: boolean
}
const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function useAdminAuth(): AdminAuthContextValue {
  const auth = useContext(AdminAuthContext)
  if (!auth) throw new Error('useAdminAuth must be used inside AdminAuthGate')
  return auth
}

function displayError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function getEnrollmentCsrfHeaders(): Record<string, string> {
  return getAdminCsrfHeaders('__Host-bclick_admin_enrollment_csrf')
}

function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  </main>
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<AuthScreen>('checking')
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [email, setEmail] = useState('admin@admin.com')
  const [password, setPassword] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [mfaFactor, setMfaFactor] = useState<'totp' | 'recovery_code'>('totp')
  const [mfaCode, setMfaCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [busy, setBusy] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadingError, setLoadingError] = useState('')

  async function establishSession(): Promise<void> {
    const result = await requestAdminApi<Envelope<AdminSession>>('/api/v1/admin/session')
    if (result.data.admin.status !== 'active' || result.data.mfa?.enabled !== true) {
      throw new Error('This administrator account is not active or has not completed MFA.')
    }
    setAdminSession(result.data)
    setError('')
    setLoadingError('')
    setScreen('ready')
  }

  async function checkSession(): Promise<void> {
    setScreen('checking')
    setLoadingError('')
    try {
      await establishSession()
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 401) {
        setAdminSession(null)
        setScreen('login')
        return
      }
      setAdminSession(null)
      setLoadingError(displayError(caught, 'The local API could not verify the administrator session.'))
      setScreen('unavailable')
    }
  }

  useEffect(() => {
    let active = true
    void requestAdminApi<Envelope<AdminSession>>('/api/v1/admin/session').then((result) => {
      if (!active) return
      if (result.data.admin.status !== 'active' || result.data.mfa?.enabled !== true) {
        setLoadingError('This administrator account is inactive or has not completed MFA.')
        setScreen('unavailable')
        return
      }
      setAdminSession(result.data)
      setScreen('ready')
    }).catch((caught: unknown) => {
      if (!active) return
      setAdminSession(null)
      if (caught instanceof AdminApiError && caught.status === 401) {
        setScreen('login')
        return
      }
      setLoadingError(displayError(caught, 'The local API could not verify the administrator session.'))
      setScreen('unavailable')
    })
    return () => { active = false }
  }, [])

  // Expire the visible admin shell with the server session and re-check whenever the tab resumes.
  useEffect(() => {
    if (screen !== 'ready' || !adminSession) return
    let active = true
    const revalidate = async (): Promise<void> => {
      try {
        const result = await requestAdminApi<Envelope<AdminSession>>('/api/v1/admin/session')
        if (!active) return
        if (result.data.admin.status !== 'active' || result.data.mfa?.enabled !== true) {
          setAdminSession(null)
          setScreen('login')
          setPassword('')
          setMfaCode('')
          return
        }
        setAdminSession(result.data)
      } catch (caught) {
        if (!active) return
        if (caught instanceof AdminApiError && caught.status === 401) {
          setAdminSession(null)
          setScreen('login')
          setPassword('')
          setMfaCode('')
          return
        }
        setError(displayError(caught, 'Could not revalidate the administrator session.'))
      }
    }
    const expiry = Date.parse(adminSession.session.expiresAt)
    const delay = Number.isFinite(expiry) ? Math.max(0, expiry - Date.now()) : 8 * 60 * 60 * 1000
    const timer = window.setTimeout(() => { void revalidate() }, delay)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void revalidate()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      active = false
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [screen, adminSession?.session.expiresAt])

  async function submitLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await requestAdminApi<Envelope<{
        status: 'mfa_required' | 'enrollment_required'
        challengeId: string
        expiresAt: string
      }>>('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      setChallengeId(result.data.challengeId)
      setMfaCode('')
      if (result.data.status === 'enrollment_required') {
        const setup = await requestAdminApi<Envelope<{ secret: string; otpauthUri: string; expiresAt: string }>>(
          '/api/v1/admin/auth/mfa/totp/setup',
          { method: 'POST', headers: getEnrollmentCsrfHeaders(), body: JSON.stringify({}) },
        )
        setTotpSecret(setup.data.secret)
        setTotpUri(setup.data.otpauthUri)
        setScreen('enrollment')
      } else {
        setScreen('mfa')
      }
    } catch (caught) {
      setError(displayError(caught, 'Administrator sign-in failed.'))
    } finally {
      setBusy(false)
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, factor: mfaFactor, code: mfaCode.trim() }),
      })
      setPassword('')
      setMfaCode('')
      await establishSession()
    } catch (caught) {
      setError(displayError(caught, 'The authentication code was not accepted.'))
    } finally {
      setBusy(false)
    }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestAdminApi('/api/v1/admin/auth/mfa/totp/verify', {
        method: 'POST',
        headers: getEnrollmentCsrfHeaders(),
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      setTotpSecret('')
      setTotpUri('')
      setPassword('')
      setMfaCode('')
      await establishSession()
    } catch (caught) {
      setError(displayError(caught, 'The authenticator code could not be verified.'))
    } finally {
      setBusy(false)
    }
  }

  async function signOut(): Promise<void> {
    setSignOutBusy(true)
    setError('')
    try {
      await requestAdminApi<void>('/api/v1/admin/auth/logout', {
        method: 'POST',
        headers: getAdminCsrfHeaders(),
      })
      setAdminSession(null)
      setScreen('login')
      setPassword('')
      setMfaCode('')
      setChallengeId('')
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 401) {
        // The server already considers this session unauthenticated or expired.
        setAdminSession(null)
        setScreen('login')
        setPassword('')
        setMfaCode('')
        return
      }
      setError(displayError(caught, 'Could not sign out safely.'))
    } finally {
      setSignOutBusy(false)
    }
  }

  const contextValue = useMemo<AdminAuthContextValue | null>(() => {
    if (!adminSession) return null
    return {
      admin: adminSession.admin,
      roles: adminSession.roles,
      permissions: adminSession.permissions,
      signOut,
      signOutBusy,
    }
  }, [adminSession, signOutBusy])

  if (screen === 'checking') {
    return <AuthCard title="Checking administrator session" description="Bclick Admin verifies your server-side session before showing any dashboard or CMS content.">
      <div className="flex items-center gap-3 py-3 text-sm text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" /> Verifying session and MFA…</div>
    </AuthCard>
  }

  if (screen === 'unavailable') {
    return <AuthCard title="Administrator access unavailable" description="The dashboard stays hidden until the local API confirms a valid administrator session.">
      <div role="alert" className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{loadingError}</div>
      <Button type="button" className="mt-4 w-full" onClick={() => void checkSession()}><RefreshCw className="h-4 w-4" /> Retry connection</Button>
    </AuthCard>
  }

  if (screen === 'login') {
    return <AuthCard title="Administrator sign-in" description="Sign in to Bclick Admin. No sidebar, pages, demo records or CMS controls are rendered until the server confirms your active administrator session and MFA.">
      <form onSubmit={submitLogin} className="space-y-4">
        <div className="space-y-1.5"><label htmlFor="bclick-admin-email" className="text-xs font-medium text-slate-700">Administrator email</label><Input id="bclick-admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@admin.com" /></div>
        <div className="space-y-1.5"><label htmlFor="bclick-admin-password" className="text-xs font-medium text-slate-700">Password</label><Input id="bclick-admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Administrator password" /></div>
        {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in</Button>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><strong>Local development only.</strong> The project has a temporary owner-requested default credential exception for the local database. First login must complete authenticator-app enrollment. Never use the default credential in a shared environment.</div>
      </form>
    </AuthCard>
  }

  if (screen === 'mfa') {
    return <AuthCard title="Verify administrator MFA" description="Enter your current authenticator code or a single-use recovery code to continue.">
      <form onSubmit={verifyMfa} className="space-y-4">
        <div className="space-y-1.5"><label htmlFor="bclick-admin-factor" className="text-xs font-medium text-slate-700">Verification method</label><select id="bclick-admin-factor" value={mfaFactor} onChange={(event) => setMfaFactor(event.target.value as 'totp' | 'recovery_code')} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"><option value="totp">Authenticator app</option><option value="recovery_code">Recovery code</option></select></div>
        <div className="space-y-1.5"><label htmlFor="bclick-admin-code" className="text-xs font-medium text-slate-700">{mfaFactor === 'totp' ? '6-digit authenticator code' : 'Single-use recovery code'}</label><Input id="bclick-admin-code" autoComplete="one-time-code" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} maxLength={mfaFactor === 'totp' ? 6 : 64} inputMode={mfaFactor === 'totp' ? 'numeric' : 'text'} placeholder={mfaFactor === 'totp' ? '123456' : 'XXXX-XXXX-XXXX-XXXX'} /></div>
        {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p> : null}
        <Button type="submit" disabled={busy || !mfaCode.trim()} className="w-full">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify and continue</Button>
        <button type="button" className="w-full text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900" onClick={() => { setScreen('login'); setMfaCode(''); setError('') }}>Return to sign in</button>
      </form>
    </AuthCard>
  }

  if (screen === 'enrollment') {
    return <AuthCard title="Set up administrator authenticator" description="Add the setup key to your authenticator app, then enter its current six-digit code.">
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Keep this setup key private.</strong> Do not send it in screenshots or messages.</div>
        <div className="space-y-1.5"><p className="text-xs font-medium text-slate-700">Manual setup key</p><code className="block break-all rounded-md bg-slate-100 p-3 font-mono text-sm font-semibold text-slate-900">{totpSecret}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(totpSecret).then(() => setError('Authenticator setup key copied to clipboard.')).catch(() => setError('Clipboard access was denied. Select and copy the key manually.')) }} className="text-xs text-slate-600 underline underline-offset-2">Copy setup key</button></div>
        <details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium">Advanced setup URI</summary><p className="mt-2 break-all rounded-md bg-slate-50 p-3 font-mono">{totpUri}</p></details>
        <form onSubmit={verifyEnrollment} className="space-y-3">
          <div className="space-y-1.5"><label htmlFor="bclick-admin-enroll-code" className="text-xs font-medium text-slate-700">Authenticator code</label><Input id="bclick-admin-enroll-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="123456" /></div>
          {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p> : null}
          <Button type="submit" disabled={busy || !/^[0-9]{6}$/.test(mfaCode)} className="w-full">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Verify and finish setup</Button>
        </form>
      </div>
    </AuthCard>
  }

  if (!adminSession || !contextValue) return null
  return <AdminAuthContext.Provider value={contextValue}>
    {error ? <div role="alert" className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div> : null}
    {children}
  </AdminAuthContext.Provider>
}
