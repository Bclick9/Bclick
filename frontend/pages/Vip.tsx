import { Check, Crown, ChevronLeft, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/cards'
import { VIP_TIERS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

export default function Vip() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Home
      </Link>
      <PageTitle title="VIP Club" subtitle="Wager more, earn more — five tiers of rewards." />

      <div className="rounded-2xl bg-card border border-border p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center gap-6">
        <span className="w-16 h-16 rounded-2xl bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60 flex items-center justify-center">
          <Crown className="w-8 h-8 text-zinc-600 dark:text-zinc-300" />
        </span>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground">Climb the VIP ladder</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Every real-money wager earns comp points. Higher tiers unlock bigger cashback,
            reload bonuses, a personal VIP host and exclusive events.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-lg px-4 py-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Comp points</p>
            <p className="text-sm font-bold text-foreground font-mono">0 / 2,000</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-10">
        {VIP_TIERS.map((t, i) => (
          <div
            key={t.name}
            className={cn(
              'rounded-2xl bg-card border p-5 flex flex-col',
              i === VIP_TIERS.length - 1 ? 'border-primary/60' : 'border-border',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="block w-10 h-10 rounded-lg bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60" aria-hidden />
              <Crown className={cn('w-5 h-5', i >= 3 ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <h3 className="text-lg font-extrabold text-foreground">{t.name}</h3>
            <p className="text-sm text-primary font-bold mt-1">{t.cashback} cashback</p>
            <p className="text-xs text-muted-foreground mt-1">{t.requirement}</p>
            <ul className="mt-4 space-y-1.5 flex-1">
              {t.perks.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-success shrink-0 mt-px" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">How it works</h2>
      <div className="rounded-2xl bg-card border border-border divide-y divide-[var(--cb-line)]">
        {[
          ['1', 'Play', 'Every €10 wagered in casino or sports earns 1 comp point.'],
          ['2', 'Level up', 'Reach each tier requirement automatically — no opt-in needed.'],
          ['3', 'Redeem', 'Convert comp points to bonus funds at 100 points = €1.'],
        ].map(([n, t, d]) => (
          <div key={n} className="flex items-start gap-4 p-5">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
              {n}
            </span>
            <div>
              <p className="font-bold text-foreground">{t}</p>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
