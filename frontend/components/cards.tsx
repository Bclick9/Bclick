import { useRef, useState, type ReactNode } from 'react'
import { Image as ImageIcon, ChevronRight, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Game, Promotion, SportsEvent } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

/* ---------- Image-free wireframe placeholder ---------- */
export function Wireframe({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-zinc-300 dark:bg-zinc-600/60 border border-zinc-400/60 dark:border-zinc-500/60',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1 text-zinc-500 dark:text-zinc-400">
        <ImageIcon className="w-5 h-5" />
        {label ? <span className="text-[10px] uppercase tracking-wide">{label}</span> : null}
      </div>
    </div>
  )
}

/* ---------- Horizontal section row with arrows ---------- */
export function SectionRow({
  title,
  children,
  more,
  compact,
}: {
  title?: string
  children: ReactNode
  more?: string
  compact?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <section className={compact ? '' : 'mb-8'}>
      {title ? (
        <div className="flex items-center justify-between mb-3">
          <Link
            to={more ?? '#'}
            className="flex items-center gap-2 font-bold text-foreground text-lg md:text-xl hover:text-primary transition-colors"
          >
            {title}
            <ChevronRight className="w-4 h-4 text-primary" />
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <button
              aria-label="Scroll left"
              onClick={() => scrollRef.current?.scrollBy({ left: -520, behavior: "smooth" })}
              className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              &lsaquo;
            </button>
            <button
              aria-label="Scroll right"
              onClick={() => scrollRef.current?.scrollBy({ left: 520, behavior: "smooth" })}
              className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      ) : null}
      <div ref={scrollRef} className="flex gap-2 md:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {children}
      </div>
    </section>
  )
}

/* ---------- Game card with a graceful image fallback ---------- */
export function GameCard({ game, className }: { game: Game; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Link
      to="/casino"
      className={cn(
        'group relative shrink-0 w-[124px] md:w-[132px] rounded-xl overflow-hidden border border-border bg-card hover:border-primary/60 transition-colors',
        className,
      )}
    >
      {game.image && !imageFailed ? (
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="aspect-[3/4] w-full object-cover"
        />
      ) : (
        <Wireframe className="aspect-[3/4] w-full" label={game.title} />
      )}
      {!game.image || imageFailed || game.imageShowsTitle === false ? (
        <div className="absolute inset-x-0 bottom-0 px-2 pt-6 pb-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <p className="text-[11px] md:text-xs font-bold uppercase leading-tight text-white text-center line-clamp-2">
            {game.title}
          </p>
          <p className="text-[9px] md:text-[10px] text-zinc-300 text-center uppercase tracking-wider mt-0.5">
            {game.provider}
          </p>
        </div>
      ) : null}
      {game.live ? (
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-[var(--cb-red)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
          <Radio className="w-2.5 h-2.5" /> LIVE
        </span>
      ) : null}
    </Link>
  )
}

/* ---------- Promotion card ---------- */
export function PromoCard({ promo, className }: { promo: Promotion; className?: string }) {
  return (
    <Link
      to={`/promotions/${promo.slug}`}
      className={cn(
        'group shrink-0 w-[260px] md:w-[460px] rounded-xl overflow-hidden bg-card border border-border hover:border-primary/60 transition-colors',
        className,
      )}
    >
      <div className="relative">
        <img
          src={promo.image}
          alt={promo.tag}
          loading="lazy"
          className="aspect-[2.2/1] w-full object-cover"
        />
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] md:text-xs font-bold px-2 py-1 rounded">
          {promo.tag}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 p-3 md:p-4">
        <p className="text-sm font-bold text-foreground">{promo.title}</p>
        <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

/* ---------- Live / upcoming match card ---------- */
export function MatchCard({ event, className }: { event: SportsEvent; className?: string }) {
  return (
    <div className={cn('shrink-0 w-[300px] md:w-[360px] rounded-xl bg-card border border-border p-3', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="w-4 h-4 rounded-full bg-zinc-500/60 flex-shrink-0" aria-hidden />
        <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">BB</span>
        <span className="font-semibold text-foreground">{event.time}</span>
        <span>{event.date}</span>
        <span className="text-primary">•</span>
        <span className="truncate">{event.league}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {event.live ? (
            <span className="border border-[var(--cb-red)] text-[var(--cb-red)] text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-1">
              LIVE <Radio className="w-2.5 h-2.5" />
            </span>
          ) : null}
          <span className="flex items-end gap-[2px]" aria-hidden>
            <span className="w-[2px] h-1.5 bg-muted-foreground rounded-sm" />
            <span className="w-[2px] h-2.5 bg-muted-foreground rounded-sm" />
            <span className="w-[2px] h-3.5 bg-muted-foreground rounded-sm" />
          </span>
        </span>
      </div>
      <div className="flex justify-between gap-2 mb-2.5">
        <p className="text-sm font-bold text-foreground leading-snug w-1/2">{event.home}</p>
        <p className="text-sm font-bold text-foreground leading-snug w-1/2 text-right">{event.away}</p>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${event.markets.length}, minmax(0, 1fr))` }}>
        {event.markets.map((m) => (
          <button
            key={m.label}
            className="flex items-center justify-between gap-1 bg-secondary hover:bg-accent text-[11px] md:text-xs rounded-md px-2 py-2 transition-colors"
          >
            <span className="text-muted-foreground truncate">{m.label}</span>
            <span className="font-bold text-foreground">{m.odds}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Page hero header for secondary pages ---------- */
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{title}</h1>
      {subtitle ? <p className="text-sm md:text-base text-muted-foreground mt-1">{subtitle}</p> : null}
    </div>
  )
}
