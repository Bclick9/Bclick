import { useEffect, useState } from 'react'
import { PageTitle, Wireframe } from '../components/cards'
import { JACKPOTS, GAMES } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

/* Animated demo jackpot counter — increments are display-only */
function useTickingJackpot(base: string) {
  const [value, setValue] = useState(() => parseAmount(base))
  useEffect(() => {
    const t = setInterval(() => setValue((v) => v + Math.random() * 0.9), 1000)
    return () => clearInterval(t)
  }, [])
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseAmount(s: string) {
  return Number(s.replace(/[€,]/g, '')) || 0
}

export default function Jackpots() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Jackpots" subtitle="Network and in-game progressive jackpots." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {JACKPOTS.map((j) => (
          <TickerJackpot key={j.id} jackpot={j} />
        ))}
      </div>

      <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Jackpot games</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {GAMES.filter((g) => g.categories.includes('jackpots')).map((g) => (
          <div key={g.id} className="rounded-xl bg-card border border-border overflow-hidden">
            <Wireframe className="aspect-[3/4] w-full rounded-none border-0" label="game" />
            <div className="p-2">
              <p className="text-[11px] font-bold text-foreground leading-tight truncate">{g.title}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{g.provider}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TickerJackpot({ jackpot }: { jackpot: (typeof JACKPOTS)[number] }) {
  const amount = useTickingJackpot(jackpot.amount)
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="block h-10 w-16 rounded-md bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60" aria-hidden />
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide',
            jackpot.type === 'Grand' && 'bg-[var(--cb-red)] text-white',
            jackpot.type === 'Minor' && 'bg-primary text-primary-foreground',
          )}
        >
          {jackpot.type}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{jackpot.title}</p>
      <p className="text-xl md:text-2xl font-extrabold text-primary font-mono mt-1">€{amount}</p>
      <p className="text-[11px] text-muted-foreground mt-2">Demonstration counter — not a real prize pool.</p>
    </div>
  )
}
