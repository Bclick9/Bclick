import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, CalendarClock, Percent } from 'lucide-react'
import { PromoCard, PageTitle, Wireframe } from '../components/cards'
import { PROMOTIONS } from '../data/catalog'

export default function Promotions() {
  const casino = PROMOTIONS.filter((p) => p.scope === 'casino')
  const sports = PROMOTIONS.filter((p) => p.scope === 'sports')

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Promotions" subtitle="Bonuses, freebets and reload offers." />

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
          <Wireframe className="aspect-[16/8] w-full rounded-none border-0" label="promotion banner" />
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
