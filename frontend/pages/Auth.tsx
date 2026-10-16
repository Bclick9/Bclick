import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User2, Lock, Mail, ChevronRight, Eye, EyeOff } from 'lucide-react'

/* Frontend-only login / register prototypes: validation and UI states only. */

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[440px] mx-auto px-4 py-10">
      <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
        {children}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-4">
        Prototype only — no real account is created and no authentication is performed.
      </p>
    </div>
  )
}

function Field({
  label, icon: Icon, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: React.ElementType; error?: string | undefined }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          {...props}
          className={`w-full h-11 pl-10 pr-3 rounded-lg bg-secondary border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none transition-colors ${
            error ? 'border-[var(--cb-red)]' : 'border-border focus:border-primary'
          }`}
        />
      </span>
      {error ? <span className="block text-xs text-[var(--cb-red)] mt-1">{error}</span> : null}
    </label>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { email?: string; password?: string } = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.'
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.'
    setErrors(errs)
    if (!errs.email && !errs.password) setDone(true)
  }

  return (
    <Shell title="Log in" subtitle="Welcome back, champion.">
      {done ? (
        <div className="rounded-lg bg-success/15 border border-success/40 p-4 text-sm text-foreground">
          Demo login validated. In the real product you would now be signed in.
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Field
            label="Password"
            icon={Lock}
            type={show ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <div className="flex justify-end -mt-3 mb-2">
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end mb-5">
            <Link to="/support" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full h-11 rounded-lg cb-yellow text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
          >
            Log in
          </button>
          <Link
            to="/register"
            className="mt-4 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t have an account? <span className="text-primary font-semibold flex items-center">Register <ChevronRight className="w-4 h-4" /></span>
          </Link>
        </form>
      )}
    </Shell>
  )
}

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<{ email: string; password: string; confirm: string; accept: boolean }>({
    email: '', password: '', confirm: '', accept: false,
  })
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; accept?: string }>({})
  const [done, setDone] = useState(false)

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { email?: string; password?: string; confirm?: string; accept?: string } = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.'
    if (!form.accept) errs.accept = 'You must accept the terms to continue.'
    setErrors(errs)
    if (Object.keys(errs).length === 0) setDone(true)
  }

  return (
    <Shell title="Register" subtitle="Create your account in under a minute.">
      {done ? (
        <div className="rounded-lg bg-success/15 border border-success/40 p-4 text-sm text-foreground">
          Demo registration validated. No real account was created.
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
          />
          <Field
            label="Password"
            icon={Lock}
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
          />
          <Field
            label="Confirm password"
            icon={Lock}
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            error={errors.confirm}
          />
          <label className="flex items-start gap-2 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={form.accept}
              onChange={(e) => set('accept', e.target.checked)}
              className="mt-0.5 accent-[var(--cb-yellow)]"
            />
            <span className="text-xs text-muted-foreground">
              I am 18+ and accept the{' '}
              <Link to="/info/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link> and{' '}
              <Link to="/info/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.accept ? <span className="block text-xs text-[var(--cb-red)] mb-3">{errors.accept}</span> : <span className="block mb-3" />}
          <button
            type="submit"
            className="w-full h-11 rounded-lg cb-yellow text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? <span className="text-primary font-semibold">Log in</span>
          </button>
        </form>
      )}
    </Shell>
  )
}

export function AccountPlaceholder({ title }: { title: string }) {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-12 text-center">
      <span className="mx-auto w-16 h-16 rounded-2xl bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60 flex items-center justify-center mb-4">
        <User2 className="w-8 h-8 text-zinc-600 dark:text-zinc-300" />
      </span>
      <h1 className="text-xl font-extrabold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2">
        This section exists in the reference inside the logged-in account area. This prototype
        keeps it as a placeholder — no real account data is available.
      </p>
      <Link to="/wallet/deposit" className="inline-block mt-5 h-10 px-6 rounded-lg bg-secondary text-foreground font-bold text-sm leading-10 hover:bg-accent transition-colors">
        Go to Wallet
      </Link>
    </div>
  )
}
