import { Link } from 'react-router-dom'
import { FOOTER_LINKS } from '../data/catalog'
import { LanguageFlag } from './Sidebar'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-[var(--cb-nav)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <span className="block h-8 w-[168px] rounded-md bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60" aria-hidden />
          <div className="md:ml-auto flex items-center gap-3">
            <span className="block w-8 h-5 rounded-sm bg-zinc-300 dark:bg-zinc-500/70 border border-zinc-400/60" aria-hidden />
            <span className="text-xs text-muted-foreground">English</span>
          </div>
        </div>

        <nav className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 mb-8">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {['18+', 'Curacao', 'SSL', 'Provably Fair'].map((b) => (
            <span
              key={b}
              className="w-14 h-14 rounded-full bg-zinc-300 dark:bg-zinc-600/70 border border-zinc-400/60 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300"
            >
              {b}
            </span>
          ))}
          <div className="flex gap-2 flex-wrap">
            {['Skrill', 'Paysafe', 'Jeton', 'NETELLER', 'MiFinity', 'Bitcoin'].map((p) => (
              <span
                key={p}
                className="h-8 w-16 rounded bg-zinc-300 dark:bg-zinc-600/70 border border-zinc-400/60"
                aria-label={`${p} logo placeholder`}
              />
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground max-w-3xl">
          CampeonBet is operated under license. Gambling can be addictive — play responsibly. This
          page is a frontend-only prototype: all balances, odds and transactions shown are
          demonstrations and are not real.
        </p>
        <p className="text-[11px] text-muted-foreground mt-3">
          © {new Date().getFullYear()} CampeonBet prototype. All rights reserved.
        </p>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
          <LanguageFlag /> English
        </p>
      </div>
    </footer>
  )
}
