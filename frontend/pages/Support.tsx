import { useState } from 'react'
import { MessageSquare, Phone, Mail, MapPin, ChevronDown } from 'lucide-react'
import { PageTitle } from '../components/cards'
import { FAQ_ITEMS } from '../data/catalog'
import { cn } from '../lib/shadcn/utils'

export default function Support() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Support & FAQ" subtitle="Answers and 24/7 live chat." />

      {/* Contact channels */}
      <div className="grid gap-3 sm:grid-cols-3 mb-10">
        {[
          { icon: MessageSquare, title: 'Live chat', sub: '24/7, avg. reply 2 min' },
          { icon: Mail, title: 'Email', sub: 'support@campeonbet.io' },
          { icon: Phone, title: 'Phone', sub: '+356 0000 0000' },
        ].map((c) => (
          <div key={c.title} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <c.icon className="w-5 h-5 text-primary" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-4">Frequently asked questions</h2>
      <div className="rounded-2xl bg-card border border-border divide-y divide-[var(--cb-line)] overflow-hidden">
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
            >
              <span className="text-sm md:text-base font-bold text-foreground">{item.q}</span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i ? (
              <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-card border border-border p-5 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-primary mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Company address: demo address, prototype only. Responses through this prototype are not
          sent anywhere — this is a frontend-only recreation.
        </p>
      </div>
    </div>
  )
}
