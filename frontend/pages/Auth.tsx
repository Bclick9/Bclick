import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  BadgeHelp, CalendarDays, Check, ChevronDown, Chrome, Circle, Eye, EyeOff, Gift,
  LockKeyhole, Mail, MoreHorizontal, Phone, Send, ShieldCheck, Sparkles,
  WalletCards, X, type LucideIcon,
} from 'lucide-react'

type AuthMode = 'login' | 'signup'

const SOCIAL_OPTIONS: { label: string; icon: LucideIcon }[] = [
  { label: 'Google', icon: Chrome },
  { label: 'MetaMask', icon: WalletCards },
  { label: 'Telegram', icon: Send },
  { label: 'TON', icon: Circle },
  { label: 'Trust Wallet', icon: ShieldCheck },
  { label: 'More sign-in options', icon: MoreHorizontal },
]

function AuthField({
  label,
  icon: Icon,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon: LucideIcon
  trailing?: ReactNode
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-sm font-semibold text-[#dbe4ec]">{label}</span>
      <span className="relative flex min-w-0 items-center">
        <Icon className="pointer-events-none absolute left-3.5 h-5 w-5 text-[#8fa3b8]" strokeWidth={1.8} />
        <input
          {...props}
          className="h-12 w-full min-w-0 rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] pl-11 pr-12 text-sm text-white outline-none transition-colors placeholder:text-[#6f8596] focus:border-[var(--cb-yellow)] focus:ring-2 focus:ring-[var(--cb-yellow)]/10"
        />
        {trailing}
      </span>
    </label>
  )
}

function WelcomeBanner() {
  return (
    <aside className="relative flex min-h-[150px] shrink-0 flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_18%_8%,rgba(255,191,0,.24),transparent_42%),linear-gradient(150deg,#12313e_0%,#0b202c_52%,#091722_100%)] p-5 sm:p-6 md:min-h-0 md:w-[36%] md:p-7">
      <Link to="/" className="relative z-10 inline-flex w-fit items-center font-black leading-none tracking-[-0.075em]" aria-label="CampeonBet home">
        <span className="text-[25px] text-white">campeón</span>
        <span className="text-[25px] text-[var(--cb-yellow)]">bet</span>
      </Link>

      <div className="pointer-events-none absolute -right-8 top-8 h-36 w-36 rounded-full border border-white/10 bg-white/[0.025] md:-right-12 md:top-1/3 md:h-52 md:w-52">
        <div className="absolute inset-5 rounded-full border border-[var(--cb-yellow)]/20" />
        <div className="absolute inset-10 rounded-full border border-white/10" />
        <Gift className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-[var(--cb-yellow)]/80 md:h-16 md:w-16" strokeWidth={1.2} />
      </div>
      <div className="relative z-10 mt-3 max-w-sm md:mt-auto md:pb-4">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--cb-yellow)]/30 bg-[var(--cb-yellow)]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--cb-yellow)]">
          <Sparkles className="h-3.5 w-3.5" /> Welcome offer
        </div>
        <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">
          Your game
          <br />
          starts here.
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#d1dce3]">Welcome bonus up to 590%</p>
        <p className="mt-0.5 text-xs text-[#9eb1bf]">+ 225 Free Spins</p>
      </div>
      <div className="relative z-10 mt-4 hidden items-center gap-2 text-[11px] text-[#8fa3b8] md:flex">
        <ShieldCheck className="h-4 w-4 text-[var(--cb-yellow)]" />
        A simple account UI preview
      </div>
    </aside>
  )
}

function AuthScreen({ initialMode = 'login', modal = false, onClose }: { initialMode?: AuthMode; modal?: boolean; onClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showPromo, setShowPromo] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [countryCode, setCountryCode] = useState('TN')
  const [settlementCurrency, setSettlementCurrency] = useState<'TND' | 'EUR' | 'USD'>('TND')
  const [preferredLanguage, setPreferredLanguage] = useState('en')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const { login, register, apiStatus, isLoading: authLoading } = useAuth()

  useEffect(() => {
    setMode(modal ? initialMode : (location.pathname === '/register' ? 'signup' : 'login'))
    setShowPassword(false)
    setSubmitError('')
  }, [location.pathname, modal, initialMode])

  const changeMode = (next: AuthMode) => {
    setMode(next)
    setShowPassword(false)
    setSubmitError('')
    if (!modal) navigate(next === 'login' ? '/login' : '/register', { replace: true })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!termsAccepted || !ageConfirmed) throw new Error('Please confirm the age requirement and accept the terms to continue.')
        if (!dateOfBirth) throw new Error('Date of birth is required.')
        if (phone.trim() && !/^\+[1-9][0-9]{1,14}$/.test(phone.trim())) {
          throw new Error('Enter the phone number in international format, for example +21612345678.')
        }
        await register({
          email,
          password,
          countryCode,
          settlementCurrency,
          dateOfBirth,
          acceptTerms: true,
          acceptAgeConfirmation: true,
          preferredLanguage,
          ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
        })
      }
      onClose?.()
      navigate('/account')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={modal
      ? 'mx-auto flex w-full max-w-5xl items-start justify-center px-0 py-0 md:items-center'
      : 'mx-auto flex w-full max-w-5xl items-center justify-center px-3 py-5 sm:px-5 md:min-h-[calc(100vh-64px)] md:py-8'}>
      <section className={modal
        ? 'relative flex min-h-[100dvh] w-full max-w-[960px] flex-col overflow-hidden bg-[#0c1d28] md:min-h-[610px] md:flex-row md:rounded-2xl md:border md:border-[var(--cb-line)] md:shadow-2xl md:shadow-black/30'
        : 'relative flex w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-[var(--cb-line)] bg-[#0c1d28] shadow-2xl shadow-black/20 md:min-h-[610px] md:flex-row'}>
        {modal ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account form"
            className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Close account form"
            className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Link>
        )}

        <WelcomeBanner />

        <div className="min-w-0 flex-1 px-4 pb-5 pt-4 sm:px-6 md:px-8 md:pb-7 md:pt-8">
          <div className="mb-5 grid grid-cols-2 border-b border-[var(--cb-line)]" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => changeMode('login')}
              className={mode === 'login' ? 'relative min-h-12 px-3 text-sm font-bold text-white transition-colors' : 'relative min-h-12 px-3 text-sm font-bold text-[#8fa3b8] transition-colors hover:text-white'}
            >
              Login
              {mode === 'login' ? <span className="absolute inset-x-5 bottom-[-1px] h-0.5 rounded-full bg-[var(--cb-yellow)]" /> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => changeMode('signup')}
              className={mode === 'signup' ? 'relative min-h-12 px-3 text-sm font-bold text-white transition-colors' : 'relative min-h-12 px-3 text-sm font-bold text-[#8fa3b8] transition-colors hover:text-white'}
            >
              Sign Up
              {mode === 'signup' ? <span className="absolute inset-x-5 bottom-[-1px] h-0.5 rounded-full bg-[var(--cb-yellow)]" /> : null}
            </button>
          </div>

          <div className="mb-5">
            <h1 className="text-xl font-extrabold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#91a6b5]">
              {mode === 'login'
                ? 'Enter your details to continue.'
                : 'Create a player account with your details.'}
            </p>
            {apiStatus === 'online' ? <p role="status" className="mt-2 text-xs font-semibold text-emerald-300">Connected to the local Bclick API</p> : null}
            {apiStatus === 'checking' || authLoading ? <p role="status" className="mt-2 text-xs text-[#91a6b5]">Checking API session…</p> : null}
            {apiStatus === 'offline' ? (
              <p role="alert" className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
                API is offline. Start the backend with <code>pnpm api:dev</code> and check the database configuration.
              </p>
            ) : null}
            {apiStatus === 'identity-disabled' ? (
              <p role="alert" className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                API is reachable, but Identity routes are not enabled. Set <code>BCLICK_IDENTITY_ENABLED=true</code> and restart the API.
              </p>
            ) : null}
            {submitError ? <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm leading-relaxed text-rose-200">{submitError}</p> : null}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthField
              label="Email"
              icon={Mail}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <AuthField
              label="Password"
              icon={LockKeyhole}
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === 'signup' ? 12 : 1}
              maxLength={1024}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#8fa3b8] transition-colors hover:bg-white/5 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {mode === 'signup' ? (
              <>
                <AuthField
                  label="Phone number (optional)"
                  icon={Phone}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />

                <AuthField
                  label="Date of birth"
                  icon={CalendarDays}
                  type="date"
                  name="dateOfBirth"
                  autoComplete="bday"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1.5">
                    <span className="block text-sm font-semibold text-[#dbe4ec]">Country</span>
                    <select name="countryCode" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} required className="h-12 w-full rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] px-3 text-sm text-white outline-none focus:border-[var(--cb-yellow)]">
                      <option value="TN">Tunisia</option><option value="FR">France</option><option value="GB">United Kingdom</option><option value="US">United States</option><option value="DE">Germany</option><option value="IT">Italy</option><option value="ES">Spain</option>
                    </select>
                  </label>
                  <label className="block min-w-0 space-y-1.5">
                    <span className="block text-sm font-semibold text-[#dbe4ec]">Account currency</span>
                    <select name="settlementCurrency" value={settlementCurrency} onChange={(event) => setSettlementCurrency(event.target.value as 'TND' | 'EUR' | 'USD')} required className="h-12 w-full rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] px-3 text-sm text-white outline-none focus:border-[var(--cb-yellow)]">
                      <option value="TND">TND — Tunisian dinar</option><option value="EUR">EUR — Euro</option><option value="USD">USD — US dollar</option>
                    </select>
                  </label>
                  <label className="block min-w-0 space-y-1.5 sm:col-span-2">
                    <span className="block text-sm font-semibold text-[#dbe4ec]">Language</span>
                    <select name="preferredLanguage" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="h-12 w-full rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] px-3 text-sm text-white outline-none focus:border-[var(--cb-yellow)]">
                      <option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
                    </select>
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    aria-expanded={showPromo}
                    onClick={() => setShowPromo((value) => !value)}
                    className="inline-flex items-center gap-2 py-1 text-sm font-semibold text-[#c5d1d9] transition-colors hover:text-white"
                  >
                    <span>Enter referral/promo code</span>
                    <ChevronDown className={showPromo ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'} />
                  </button>
                  {showPromo ? (
                    <div className="mt-2">
                      <AuthField
                        label="Referral / promo code (optional)"
                        icon={Gift}
                        type="text"
                        name="promo"
                        autoComplete="off"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(event) => setPromoCode(event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] p-3">
                  <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cb-yellow)]" />
                  <span className="text-xs leading-relaxed text-[#a8bac6]">I confirm that I am at least 18 years old.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] p-3">
                  <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cb-yellow)]" />
                  <span className="text-xs leading-relaxed text-[#a8bac6]">
                    I have read and accept the{' '}
                    <Link to="/info/terms" className="font-semibold text-white underline underline-offset-2">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/info/privacy" className="font-semibold text-white underline underline-offset-2">Privacy Policy</Link>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!termsAccepted || !ageConfirmed || isSubmitting || authLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cb-yellow)] px-4 text-sm font-extrabold text-[#00151e] transition-all hover:brightness-105 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} /> {isSubmitting ? 'Creating account…' : 'Create Account'}
                </button>
              </>
            ) : (
              <>
                <div className="-mt-1 flex justify-end">
                  <Link to="/support" className="text-xs font-semibold text-[#aebfca] transition-colors hover:text-white">
                    Forgot password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || authLoading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--cb-yellow)] px-4 text-sm font-extrabold text-[#00151e] transition-all hover:brightness-105 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in…' : 'Login'}
                </button>
              </>
            )}
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--cb-line)]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#8298a7]">Or</span>
            <span className="h-px flex-1 bg-[var(--cb-line)]" />
          </div>

          <div className="flex items-center justify-center gap-2">
            {SOCIAL_OPTIONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cb-line)] bg-[#0a1b26] text-[#d2dde4] transition-colors hover:border-[#526b79] hover:bg-[#142b38] hover:text-white"
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </button>
            ))}
          </div>

          <p className="mt-5 text-center text-[10px] leading-relaxed text-[#718795]">
            Player login and registration use the local Bclick API. Social sign-in and promo codes are not connected yet.
          </p>
        </div>
      </section>
    </div>
  )
}


export function LoginPage() {
  return <AuthScreen initialMode="login" />
}

export function RegisterPage() {
  return <AuthScreen initialMode="signup" />
}

export interface AuthModalProps {
  open: boolean
  initialMode: 'login' | 'signup'
  onClose: () => void
}

export function AuthModal({ open, initialMode, onClose }: AuthModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="no-scrollbar fixed inset-0 z-[300] h-[100dvh] w-full overflow-y-auto overscroll-contain bg-[#0b1c27] md:flex md:items-center md:justify-center md:bg-black/75 md:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <AuthScreen initialMode={initialMode} modal onClose={onClose} />
    </div>,
    document.body,
  )
}

export function AccountPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[600px] px-4 py-12 text-center">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--cb-line)] bg-[#102733]">
        <BadgeHelp className="h-8 w-8 text-[#8fa3b8]" />
      </span>
      <h1 className="text-xl font-extrabold text-white">{title}</h1>
      <p className="mt-2 text-sm text-[#91a6b5]">
        This account section is a UI template. No real account data is connected.
      </p>
      <Link to="/account/wallet/deposit" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--cb-yellow)] px-6 text-sm font-bold text-[#00151e]">
        Go to Wallet
      </Link>
    </div>
  )
}
