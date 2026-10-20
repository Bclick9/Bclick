import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { ChevronLeft, CalendarClock, Percent } from 'lucide-react'
import { PROMOTIONS, type Promotion } from '../data/catalog'

type PromotionFilter = 'all' | 'casino' | 'sports'

const ALL_PROMOTIONS: Promotion[] = PROMOTIONS


function PromotionTile({ promo }: { promo: Promotion }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Link
      to={`/promotions/${promo.slug}`}
      aria-label={`View promotion: ${promo.tag}`}
      className="group block min-w-0 overflow-hidden rounded-lg border border-transparent bg-[var(--cb-card)] transition-colors hover:border-[var(--cb-yellow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cb-yellow)]"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-[#07141c]">
        {!imageFailed ? (
          <img
            src={promo.image}
            alt={promo.tag}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="h-full w-full bg-[var(--cb-card)]" />
        )}
      </div>
      <div className="px-4 py-4">
        <h2 className="line-clamp-2 text-sm font-extrabold leading-5 text-white">{promo.tag}</h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[#aebfca]">{promo.title}</p>
      </div>
    </Link>
  )
}

export default function Promotions() {
  const [filter, setFilter] = useState<PromotionFilter>('all')
  const visiblePromotions = ALL_PROMOTIONS.filter((promo) => filter === 'all' || promo.scope === filter)

  const filters: { value: PromotionFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'casino', label: 'Casino' },
    { value: 'sports', label: 'Sports' },
  ]

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-4">
      <header className="mb-4 flex min-h-9 items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold leading-7 text-white">Promotions</h1>
        <div role="group" aria-label="Filter promotions" className="flex shrink-0 items-center gap-2">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cb-yellow)] ${filter === value ? 'bg-[#203646] text-white' : 'bg-[var(--cb-card)] text-[#aebfca] hover:bg-[var(--cb-hover)] hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visiblePromotions.map((promo) => (
          <PromotionTile key={promo.slug} promo={promo} />
        ))}
      </div>
    </div>
  )
}

export function PromotionDetail() {
  const { slug = '' } = useParams()
  const promo = ALL_PROMOTIONS.find((p) => p.slug === slug)

  if (!promo) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center">
        <p className="text-muted-foreground">This promotion could not be found.</p>
        <Link to="/promotions" className="mt-3 inline-block text-sm font-semibold text-primary">
          Back to promotions
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-8">
      <Link to="/promotions" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Promotions
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative">
          <img src={promo.image} alt={promo.tag} className="aspect-[16/8] w-full object-cover" />
          <span className="absolute left-3 top-3 rounded bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground">
            {promo.tag}
          </span>
        </div>
        <div className="p-5 md:p-8">
          <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">{promo.tag}</h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">{promo.title}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{promo.description}</p>

          <div className="my-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4">
              <Percent className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Offer type</p>
                <p className="text-sm font-bold capitalize text-foreground">{promo.scope} bonus</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-4">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Availability</p>
                <p className="text-sm font-bold text-foreground">Limited period</p>
              </div>
            </div>
          </div>

          <Link
            to="/wallet/deposit"
            className="cb-yellow inline-flex h-11 items-center rounded-lg px-6 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
          >
            Deposit &amp; claim
          </Link>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="mb-3 text-base font-extrabold text-foreground">Bonus terms</h2>
            <ul className="space-y-2">
              {promo.terms.map((term) => (
                <li key={term} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {term}
                </li>
              ))}
            </ul>
            <Link to="/info/bonus-terms" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
              Read the full General Bonus Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
