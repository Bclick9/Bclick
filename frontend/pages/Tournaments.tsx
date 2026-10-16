import { Link } from 'react-router-dom'
import { Clock, Users, ChevronLeft } from 'lucide-react'
import { PageTitle, Wireframe } from '../components/cards'
import { TOURNAMENTS } from '../data/catalog'

export default function Tournaments() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
      <PageTitle title="Tournaments" subtitle="Compete for leaderboard prizes." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOURNAMENTS.map((t) => (
          <div key={t.id} className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="relative">
              <Wireframe className="aspect-[16/9] w-full rounded-none border-0" label="tournament" />
              <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1.5 rounded">
                Prize pool {t.prize}
              </span>
            </div>
            <div className="p-5">
              <h2 className="text-lg font-extrabold text-foreground">{t.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Ends in {t.endsIn}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Open entry
                </span>
              </div>
              <div className="mt-5">
                <Link
                  to="/casino"
                  className="inline-flex h-10 px-5 rounded-lg cb-yellow text-primary-foreground font-bold text-sm items-center hover:brightness-110 transition-all"
                >
                  {t.scope === 'casino' ? 'Play games' : 'Bet on sports'}
                </Link>
              </div>

              {/* Demo leaderboard */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Leaderboard</p>
                {[
                  { pos: 1, name: 'Player 1***', pts: '12,480' },
                  { pos: 2, name: 'Player 2***', pts: '11,020' },
                  { pos: 3, name: 'Player 3***', pts: '9,735' },
                ].map((row) => (
                  <div key={row.pos} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-foreground font-semibold">
                      {row.pos}. {row.name}
                    </span>
                    <span className="text-muted-foreground font-mono">{row.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Leaderboard names and points are demonstration data and do not represent real players.
      </p>
      <Link to="/promotions" className="inline-flex items-center gap-1 text-sm text-primary mt-4">
        <ChevronLeft className="w-4 h-4" /> See related promotions
      </Link>
    </div>
  )
}
