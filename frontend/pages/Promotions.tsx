import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, CalendarClock, Percent } from 'lucide-react'
import { PromoCard, PageTitle } from '../components/cards'
import { PROMOTIONS } from '../data/catalog'

const FEATURED_PROMOTION_IMAGES = [
  'https://i.imgur.com/LX0CyyU.jpeg',
  'https://i.imgur.com/X75yedd.jpeg',
  'https://i.imgur.com/v7bu7ga.jpeg',
  'https://i.imgur.com/7dRXAXI.jpeg',
  'https://i.imgur.com/CmuEAMk.jpeg',
  'https://i.imgur.com/V9tDnF9.jpeg',
  'https://i.imgur.com/InQuRtL.jpeg',
]

export default function Promotions() {
  const casino = PROMOTIONS.filter((p) => p.scope === 'casino')
  const sports = PROMOTIONS.filter((p) => p.scope === 'sports')

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Promotions" subtitle="Bonuses, freebets and reload offers." />

      <section aria-labelledby="featured-promotions-heading" className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="featured-promotions-heading" className="text-lg font-extrabold text-foreground md:text-xl">Featured promotions</h2>
          <span className="text-xs font-semibold text-muted-foreground">{FEATURED_PROMOTION_IMAGES.length} offers</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURED_PROMOTION_IMAGES.map((image, index) => (
            <a
              key={image}
              href={image}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open featured promotion image ${index + 1} in a new tab`}
              className="group block min-w-0 overflow-hidden rounded-xl border border-[var(--cb-line)] bg-[#07141c] transition-colors hover:border-[var(--cb-yellow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cb-yellow)]"
            >
              <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-[#07141c]">
                <img
                  src={image}
                  alt={`Featured promotion ${index + 1}`}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--cb-line)] px-3 py-2.5">
                <span className="text-sm font-bold text-white">Promotion {index + 1}</span>
                <span className="text-xs font-semibold text-[var(--cb-yellow)]">View offer ↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Casino offers</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {casino.map((p) => (
          <PromoCard key={p.slug} promo={p} className="w-full" />
        ))}
      </div>

      <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Sports offers</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sports.map((p) => (
          <PromoCard key={p.slug} promo={p} className="w-full" />
        ))}
      </div>
    </div>
  )
}

export function PromotionDetail() {
  const { slug = '' } = useParams()
  const promo = PROMOTIONS.find((p) => p.slug === slug)

  if (!promo) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 text-center">
        <p className="text-muted-foreground">This promotion could not be found.</p>
        <Link to="/promotions" className="text-primary font-semibold text-sm mt-3 inline-block">
          Back to promotions
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
      <Link to="/promotions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Promotions
      </Link>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="relative">
          <img
            src={promo.image}
            alt={promo.tag}
            className="aspect-[16/8] w-full object-cover"
          />
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1.5 rounded">
            {promo.tag}
          </span>
        </div>
        <div className="p-5 md:p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{promo.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-3">{promo.description}</p>

          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 flex items-center gap-3">
              <Percent className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Offer type</p>
                <p className="text-sm font-bold text-foreground capitalize">{promo.scope} bonus</p>
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 border border-border p-4 flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Availability</p>
                <p className="text-sm font-bold text-foreground">Limited period</p>
              </div>
            </div>
          </div>

          <Link
            to="/wallet/deposit"
            className="inline-flex h-11 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm items-center hover:brightness-110 transition-all"
          >
            Deposit &amp; claim
          </Link>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-base font-extrabold text-foreground mb-3">Bonus terms</h2>
            <ul className="space-y-2">
              {promo.terms.map((t) => (
                <li key={t} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/info/bonus-terms"
              className="text-xs text-primary font-semibold mt-4 inline-block hover:underline"
            >
              Read the full General Bonus Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
