import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Image as ImageIcon, ChevronRight, ChevronLeft, Radio, Play } from 'lucide-react'
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

/* ---------- Carousel controls matching the live reference ---------- */
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
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const updateButtons = () => {
      const maxScroll = element.scrollWidth - element.clientWidth
      setCanScrollLeft(element.scrollLeft > 2)
      setCanScrollRight(maxScroll > 2 && element.scrollLeft < maxScroll - 2)
    }

    updateButtons()
    element.addEventListener('scroll', updateButtons, { passive: true })
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateButtons)
      : null
    resizeObserver?.observe(element)
    Array.from(element.children).forEach((child) => resizeObserver?.observe(child))

    return () => {
      element.removeEventListener('scroll', updateButtons)
      resizeObserver?.disconnect()
    }
  }, [children])

  const scroll = (direction: -1 | 1) => {
    const element = scrollRef.current
    if (!element) return
    element.scrollBy({
      left: direction * Math.max(320, element.clientWidth * 0.82),
      behavior: 'smooth',
    })
  }

  return (
    <section className={compact ? '' : 'mb-6'}>
      {title ? (
        <div className="flex min-h-10 items-center justify-between gap-3 mb-4">
          <Link
            to={more ?? '#'}
            className="group inline-flex min-w-0 items-center font-black text-white text-base md:text-xl"
          >
            <span className="truncate">{title}</span>
            <span className="relative ml-2 inline-flex items-center overflow-hidden whitespace-nowrap pt-0.5">
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--cb-yellow)] transition-transform duration-150 group-hover:translate-x-1" />
              <span className="hidden md:inline ml-1 text-xs font-bold text-[var(--cb-yellow)] opacity-0 -translate-x-2 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                Show more
              </span>
            </span>
          </Link>

          <div className="hidden md:flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className="group rounded-[10px] bg-[var(--cb-arrow-bg)] p-1 transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors enabled:group-hover:bg-[var(--cb-hover)]">
                <ChevronLeft className="h-5 w-5 text-[var(--cb-arrow-icon)] transition-transform group-enabled:active:scale-90" />
              </span>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className="group rounded-[10px] bg-[var(--cb-arrow-bg)] p-1 transition-colors enabled:cursor-pointer enabled:hover:bg-[var(--cb-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors enabled:group-hover:bg-[var(--cb-hover)]">
                <ChevronRight className="h-5 w-5 text-[var(--cb-arrow-icon)] transition-transform group-enabled:active:scale-90" />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {children}
      </div>
    </section>
  )
}

/* ---------- Image-first casino card with the reference Play hover ---------- */
export function GameArtCard({
  title,
  provider,
  image,
  fallbackImage,
  spriteIndex,
  spriteSheet,
  spriteCount = 10,
  spriteRow = 0,
  spriteRows = 1,
  imageShowsTitle = true,
  href = '/casino',
  className,
}: {
  title: string
  provider: string
  image?: string
  fallbackImage?: string
  spriteIndex?: number
  spriteSheet?: string
  spriteCount?: number
  spriteRow?: number
  spriteRows?: number
  imageShowsTitle?: boolean
  href?: string
  className?: string
}) {
  const [currentImage, setCurrentImage] = useState(image)
  const [imageFailed, setImageFailed] = useState(false)
  const [spriteFailed, setSpriteFailed] = useState(false)

  const onImageError = () => {
    if (fallbackImage && currentImage !== fallbackImage) {
      setCurrentImage(fallbackImage)
      setImageFailed(false)
    } else {
      setImageFailed(true)
    }
  }

  const useSprite = typeof spriteIndex === 'number' && Boolean(spriteSheet) && !spriteFailed

  return (
    <Link
      to={href}
      aria-label={`Play ${title}`}
      className={cn(
        'cb-game-tile group relative isolate block shrink-0 w-[112px] sm:w-[124px] md:w-[141px] overflow-hidden rounded-[10px] bg-[var(--cb-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cb-yellow)]',
        className,
      )}
    >
      {useSprite ? (
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <img
            src={spriteSheet}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setSpriteFailed(true)}
            draggable={false}
            className="absolute max-w-none object-fill"
            style={{
              width: `${spriteCount * 100}%`,
              height: `${spriteRows * 100}%`,
              left: `${-(spriteIndex ?? 0) * 100}%`,
              top: `${-spriteRow * 100}%`,
            }}
          />
        </div>
      ) : currentImage && !imageFailed ? (
        <img
          src={currentImage}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={onImageError}
          className="aspect-[3/4] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.045]"
        />
      ) : (
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-[var(--cb-card)] px-2 text-center">
          <ImageIcon className="h-5 w-5 text-slate-500" />
          <span className="text-xs font-bold text-white">{title}</span>
          <span className="text-[10px] text-slate-400">{provider}</span>
        </div>
      )}

      {!useSprite && (!image || imageFailed || !imageShowsTitle) ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2 pt-7">
          <p className="text-center text-[10px] font-extrabold uppercase leading-tight text-white line-clamp-2">{title}</p>
          <p className="mt-0.5 text-center text-[9px] uppercase tracking-wide text-slate-300">{provider}</p>
        </div>
      ) : null}

      <span className="cb-game-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-[var(--cb-yellow)] text-[#00151e] shadow-xl transition-transform duration-200 group-hover:scale-100 group-focus-visible:scale-100">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
        <span className="translate-y-1 text-xs font-black uppercase tracking-wide text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          Play
        </span>
      </span>
    </Link>
  )
}

export function GameCard({ game, className }: { game: Game; className?: string }) {
  return (
    <GameArtCard
      title={game.title}
      provider={game.provider}
      image={game.image}
      fallbackImage={game.imageFallback}
      imageShowsTitle={game.imageShowsTitle !== false}
      href={`/casino/play/demo/${encodeURIComponent(game.id)}`}
      className={className}
    />
  )
}

/* ---------- Screenshot-matched promotion atlas card ---------- */
export function PromoAtlasCard({
  promo,
  index,
}: {
  promo: Promotion
  index: number
}) {
  return (
    <Link
      to={`/promotions/${promo.slug}`}
      aria-label={promo.title}
      className="cb-promo-atlas group relative isolate block min-w-0 shrink-0 overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cb-yellow)]"
    >
      <img
        src="/assets/home/promotions.webp"
        alt={promo.title}
        loading={index === 0 ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="absolute top-0 h-full max-w-none object-fill transition-transform duration-300 group-hover:scale-[1.015]"
        style={{ width: '300%', left: `${-index * 100}%` }}
      />
      <span className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 transition-colors group-hover:border-[var(--cb-yellow)]" />
    </Link>
  )
}

/* ---------- Promotion card ---------- */
const LOCAL_PROMOTION_IMAGES: Record<string, string> = {
  'welcome-casino-package': '/assets/home/welcome-casino-bonus.webp',
  'welcome-sports-bonus': '/assets/home/welcome-sports-bonus.jpg',
  'welcome-sports-freebet': '/assets/home/welcome-sports-freebet.jpg',
  'welcome-crypto-combo': '/assets/home/welcome-crypto-bonus.jpg',
  'mondays-reload-bonus': '/assets/home/monday-reload-bonus.jpg',
}

export function PromoCard({ promo, className }: { promo: Promotion; className?: string }) {
  const [imageSource, setImageSource] = useState(LOCAL_PROMOTION_IMAGES[promo.slug] ?? promo.image)
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Link
      to={`/promotions/${promo.slug}`}
      className={cn(
        'cb-promo-card group shrink-0 min-w-[260px] overflow-hidden rounded-xl border border-[var(--cb-line)] bg-[var(--cb-card)] transition-colors hover:border-[var(--cb-yellow)]',
        className,
      )}
    >
      <div className="relative">
        {!imageFailed ? (
          <img
            src={imageSource}
            alt={promo.tag}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (imageSource !== promo.image) setImageSource(promo.image)
              else setImageFailed(true)
            }}
            className="aspect-[2.2/1] w-full object-cover"
          />
        ) : (
          <div className="aspect-[2.2/1] w-full bg-[var(--cb-card)]" />
        )}
        <span className="absolute left-0.5 top-0.5 rounded bg-[var(--cb-yellow)] px-2 py-1 text-[10px] font-bold text-[#00151e] md:text-xs">
          {promo.tag}
        </span>
      </div>
      <div className="flex min-h-[62px] items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm font-bold leading-snug text-white">{promo.title}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cb-yellow)] text-[#00151e] transition-transform duration-150 group-hover:translate-x-0.5">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

/* ---------- Live / upcoming match card ---------- */
export function MatchCard({ event, className }: { event: SportsEvent; className?: string }) {
  return (
    <div className={cn('shrink-0 w-[400px] rounded-xl bg-card border border-border p-2', className)}>
      <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground mb-1">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[13px]" aria-hidden>
          {event.sport === 'Tennis' ? '🎾' : event.sport === 'Basketball' ? '🏀' : event.sport === 'Football' ? '⚽' : '🏟️'}
        </span>
        {event.sport !== 'Tennis' ? <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-black text-[#00151e]">BB</span> : null}
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
      <div className="flex justify-between gap-2 mb-2">
        <p className="w-1/2 text-[13px] font-bold leading-snug text-foreground">{event.home}</p>
        <p className="w-1/2 text-right text-[13px] font-bold leading-snug text-foreground">{event.away}</p>
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
