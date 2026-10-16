import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PageTitle } from '../components/cards'

interface Section { heading: string; body: string[] }
interface InfoPage {
  title: string
  intro: string
  sections: Section[]
}

const PAGES: Record<string, InfoPage> = {
  about: {
    title: 'About Us',
    intro: 'CampeonBet is an online casino and sportsbook built for players who want a full gaming experience in one place.',
    sections: [
      { heading: 'Who we are', body: ['CampeonBet brings together a large casino catalogue, a live casino studio and a full sportsbook under one account and one wallet. This page is part of a frontend-only prototype recreation and represents the structure of the original page.'] },
      { heading: 'Our promise', body: ['Fast withdrawals, transparent bonus terms and 24/7 human support. Responsible gaming tools are available to every player from the account menu.'] },
      { heading: 'Licensing', body: ['In the reference product, operations run under an offshore gaming licence. This prototype does not represent a real operator.'] },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'These terms govern the use of the CampeonBet website. Prototype text, structured like the original.',
    sections: [
      { heading: '1. Account', body: ['You must be at least 18 years old (or the legal age in your jurisdiction) to hold an account. One account per person, household and device is permitted.'] },
      { heading: '2. Deposits and withdrawals', body: ['Minimum deposit is €10 for most methods. Withdrawals are returned to the original deposit method where possible. Identity verification is required before the first withdrawal.'] },
      { heading: '3. Bonuses', body: ['Bonus funds are subject to the General Bonus Terms. Abuse of bonus mechanics may lead to forfeiture of bonus funds and associated winnings.'] },
      { heading: '4. Fair play', body: ['All casino outcomes are produced by certified random number generators provided by the game suppliers. Collusion, bot use and arbitrage are prohibited.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'How your personal data is collected, used and protected.',
    sections: [
      { heading: 'Data we collect', body: ['Identity and contact data supplied during registration and KYC; transaction and betting history; device and technical data such as IP address; marketing preferences.'] },
      { heading: 'Why we process it', body: ['To operate your account, meet anti-money-laundering obligations, personalise offers where you have consented, and keep the platform secure.'] },
      { heading: 'Your rights', body: ['You can request access, correction, deletion, restriction or portability of your data, and object to direct marketing, by contacting support.'] },
      { heading: 'Cookies', body: ['Strictly necessary cookies keep you logged in and secure; analytics and marketing cookies are used only with your consent.'] },
    ],
  },
  'bonus-terms': {
    title: 'General Bonus Terms',
    intro: 'These terms apply to every bonus unless a specific promotion states otherwise.',
    sections: [
      { heading: 'Wagering', body: ['Casino bonuses carry a 35x wagering requirement on the bonus amount; sports bonuses carry 6x at minimum odds of 1.60. Free spin winnings are credited as bonus funds and carry the same requirement.'] },
      { heading: 'Game weighting', body: ['Slots count 100% towards wagering. Most table games and live casino games count 10% or 0%. Some titles are excluded entirely.'] },
      { heading: 'Limits', body: ['Maximum bet while wagering an active bonus is €5 per spin or €10 per round. Maximum conversion from a no-deposit bonus is €100.'] },
      { heading: 'Expiry', body: ['Bonuses expire after 7 days unless stated otherwise in the specific promotion. Unused free spins are removed at expiry.'] },
    ],
  },
  'responsible-gaming': {
    title: 'Responsible Gaming & Self-Exclusion',
    intro: 'Tools to keep gambling fun and under control.',
    sections: [
      { heading: 'Deposit and loss limits', body: ['Set daily, weekly or monthly limits on deposits, losses and wagering from the Responsible gaming section of your account menu. Limits apply immediately; increases take effect after a cooling-off period.'] },
      { heading: 'Session reminders', body: ['Choose a reminder interval between 15 and 180 minutes. The reminder pauses your game until acknowledged.'] },
      { heading: 'Time-out and self-exclusion', body: ['Take a break of 1–30 days (time-out) or self-exclude for 6 months or longer. Self-exclusion cannot be reversed before expiry.'] },
      { heading: 'Getting help', body: ['If gambling stops being fun, contact support or an independent help organisation such as GamCare, Gambling Therapy or BeGambleAware.'] },
    ],
  },
  contact: {
    title: 'Contact Us',
    intro: 'We are here 24/7.',
    sections: [
      { heading: 'Live chat', body: ['Fastest way to reach us — open the chat icon in the sidebar or bottom of any page. Average response time is under 2 minutes.'] },
      { heading: 'Email', body: ['support@campeonbet.io for general questions; kyc@campeonbet.io for verification documents; complaints@campeonbet.io for formal complaints.'] },
      { heading: 'Complaints', body: ['Formal complaints are acknowledged within 24 hours and answered in full within 10 business days.'] },
    ],
  },
  'aml-kyc': {
    title: 'AML & KYC Policy',
    intro: 'Anti-money-laundering and know-your-customer procedures.',
    sections: [
      { heading: 'Verification', body: ['Before your first withdrawal, we verify your identity (government-issued ID), address (proof issued within 3 months) and, where required, the source of your funds.'] },
      { heading: 'Monitoring', body: ['Transactions are monitored for suspicious patterns. Structuring, rapid deposit-withdraw cycling and third-party funding are prohibited and reported where legally required.'] },
      { heading: 'Consequences', body: ['Accounts failing verification may be suspended and balances withheld pending review, in line with licence requirements.'] },
    ],
  },
  'underage-gaming': {
    title: 'Underage Gaming Policy',
    intro: 'Strictly 18+. Protecting minors from gambling.',
    sections: [
      { heading: 'Age verification', body: ['Age is verified during registration and re-verified before the first withdrawal using independent databases and document checks.'] },
      { heading: 'Parental controls', body: ['We recommend filtering software such as Net Nanny, CyberPatrol or GamBlock on shared devices to block gambling sites for minors.'] },
      { heading: 'Consequences', body: ['Accounts of minors are closed immediately and all transactions reversed. Funds deposited by a minor are returned to the source where possible.'] },
    ],
  },
  'sports-betting-rules': {
    title: 'Sports Betting Rules',
    intro: 'How bets are placed, settled and paid.',
    sections: [
      { heading: 'Bet acceptance', body: ['A bet is accepted when it appears in your bet history with a confirmation ID. Obvious pricing errors (palpable error) may be voided.'] },
      { heading: 'Settlement', body: ['Bets are settled on the official result of the governing body within the scheduled event time, unless stated otherwise in the market rules. Postponed events void unless rescheduled within 48 hours.'] },
      { heading: 'Cashout', body: ['Cashout availability is not guaranteed and may be withdrawn at any time. Cashout value is offered at our discretion.'] },
      { heading: 'Limits', body: ['Maximum winnings per bet slip: €100,000 unless stated otherwise in the market.'] },
    ],
  },
  payments: {
    title: 'Payments & Withdrawals',
    intro: 'Depositing and cashing out.',
    sections: [
      { heading: 'Deposits', body: ['Minimum deposit is €10 (€20–€25 for some e-wallets; see the Deposit screen for per-method limits). Deposits are usually instant and free of charge.'] },
      { heading: 'Withdrawals', body: ['Withdrawals are paid back to the original deposit method. E-wallets: within 24 hours. Crypto: typically within 1 hour after approval. Bank transfer: 3–5 business days.'] },
      { heading: 'Fees and limits', body: ['One free withdrawal per 24 hours; a 2% fee applies to additional withdrawals in the same period. Per-transaction limits are shown on each payment method card.'] },
      { heading: 'Verification', body: ['KYC must be complete before your first withdrawal. See the AML & KYC Policy for details.'] },
    ],
  },
}

export default function Info() {
  const { slug = '' } = useParams()
  const page = PAGES[slug]
  if (!page) return <Navigate to="/info/about" replace />

  return (
    <div className="max-w-[820px] mx-auto px-4 md:px-8 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Home
      </Link>
      <PageTitle title={page.title} />
      <p className="text-sm md:text-base text-muted-foreground mb-8">{page.intro}</p>

      <div className="space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-extrabold text-foreground mb-2">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-2">{p}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-card border border-border p-5 text-sm text-muted-foreground">
        Prototype recreation — the text above mirrors the structure of the original page and is not
        the legally binding version.
      </div>
    </div>
  )
}
