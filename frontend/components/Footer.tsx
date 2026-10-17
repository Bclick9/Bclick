import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, MessageSquareText } from 'lucide-react'
import { LanguageFlag } from './Sidebar'

const PAYMENT_METHODS = [
  { alt: 'Jeton wallet', file: 'jeton_wallet_dark.png' },
  { alt: 'MiFinity Ewallet', file: 'mifinity_ewallet_dark.png' },
  { alt: 'LuxonPay', file: 'luxonpay_dark.png' },
  { alt: 'Cardano', file: 'ada_dark.png' },
  { alt: 'Bitcoin Cash', file: 'bch.png' },
  { alt: 'Binance Coin', file: 'bnb.png' },
  { alt: 'Bitcoin', file: 'btc_dark.png' },
  { alt: 'Dogecoin', file: 'doge_dark.png' },
  { alt: 'Ethereum', file: 'eth_dark.png' },
  { alt: 'Litecoin', file: 'ltc.png' },
  { alt: 'Solana', file: 'sol.png' },
  { alt: 'TRON', file: 'trx_dark.png' },
  { alt: 'USD Coin (Ethereum)', file: 'usdc_ethereum_dark.png' },
  { alt: 'USD Coin (Solana)', file: 'usdc_solana_dark.png' },
  { alt: 'USDT (Ethereum)', file: 'usdt_ethereum_dark.png' },
  { alt: 'USDT (TRON)', file: 'usdt_tron_dark.png' },
  { alt: 'XRP', file: 'xrp_dark.png' },
]

const FOOTER_LINKS = [
  { label: 'General Bonus T&Cs', to: '/info/bonus-terms' },
  { label: 'About Us', to: '/info/about' },
  { label: 'Terms & Conditions', to: '/info/terms' },
  { label: 'Privacy Policy', to: '/info/privacy' },
  { label: 'FAQ', to: '/support' },
  { label: 'Responsible Gaming & Self-Exclusion Policy', to: '/info/responsible-gaming' },
  { label: 'Contact Us', to: '/info/contact' },
  { label: 'AML and KYC Policy', to: '/info/aml-kyc' },
  { label: 'Underage Gaming Policy', to: '/info/underage-gaming' },
  { label: 'Sport Betting Rules', to: '/info/sports-betting-rules' },
  { label: 'Payments & Withdrawals', to: '/info/payments' },
  { label: 'Promotions', to: '/promotions' },
]

const ASSET_BASE = 'https://campeonbet.io/assets'
const PAYMENT_BASE = `${ASSET_BASE}/payments/`
const CMS_BASE = `${ASSET_BASE}/cms/2e5b6402-2fa4-4053-b7e2-b3466495cd16/`
const ANJOUAN_SEAL =
  'https://a6feeff0-47c6-4cde-861a-7d3aec090608.snippet.anjcdn.org/sealassets/25f9c2bf3b9a9ff737472cfbdf446654-campeonbet.io-b28edee7c4cf9744d8abe322b00d945bc7f76826c61a6bdcb3a45d281bb97722c48b9cbe8cb959786868acbd60a8df47-c2VhbC5wbmc%3D?status=valid'
const ANJOUAN_VERIFY =
  'https://verification.anjouangamingboard.org/validate?domain=campeonbet.io&seal_id=b28edee7c4cf9744d8abe322b00d945bc7f76826c61a6bdcb3a45d281bb97722c48b9cbe8cb959786868acbd60a8df47&stamp=25f9c2bf3b9a9ff737472cfbdf446654'

function PaymentBadge({ alt, file }: { alt: string; file: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-card)] px-2 md:h-14 md:w-[104px]"
      title={alt}
    >
      {!failed ? (
        <img
          className="h-auto max-h-6 w-auto max-w-12 object-contain object-center md:max-h-10 md:max-w-[72px]"
          src={PAYMENT_BASE + file}
          loading="lazy"
          decoding="async"
          alt={alt}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-center text-[9px] font-bold leading-tight text-slate-300">{alt}</span>
      )}
    </div>
  )
}

function ComplianceBadge({
  image,
  alt,
  href,
}: {
  image: string
  alt: string
  href?: string
}) {
  const [failed, setFailed] = useState(false)
  const logo = !failed ? (
    <img
      className="h-auto max-h-6 w-auto max-w-12 object-contain object-center md:max-h-10 md:max-w-[72px]"
      src={image}
      loading="lazy"
      decoding="async"
      alt={alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="text-center text-[9px] font-bold leading-tight text-slate-300">{alt}</span>
  )
  const boxClass = 'flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--cb-card)] px-2 md:h-14 md:w-[104px]'
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={alt} className={boxClass}>
      {logo}
    </a>
  ) : (
    <div className={boxClass} title={alt}>{logo}</div>
  )
}

export function Footer() {
  const [languageOpen, setLanguageOpen] = useState(false)
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }))

  useEffect(() => {
    const updateClock = () => setClock(new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }))
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <footer className="border-t border-[var(--cb-line)] bg-[var(--cb-nav)]">
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-16">
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-2">
            <div className="relative w-[168px] max-w-full md:w-[184px]">
              <button
                type="button"
                aria-expanded={languageOpen}
                aria-haspopup="menu"
                onClick={() => setLanguageOpen((open) => !open)}
                className="w-full rounded-[10px] border border-[var(--cb-line)] p-0 text-left text-white transition hover:bg-[var(--cb-card)]"
              >
                <span className="flex w-full items-center gap-2 overflow-hidden rounded-[10px] px-3 py-2">
                  <span className="flex size-8 shrink-0 items-center justify-center"><LanguageFlag /></span>
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold">British English</span>
                  <ChevronDown className="size-4 shrink-0 text-slate-400" />
                </span>
              </button>
              {languageOpen ? (
                <div role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-full rounded-[10px] border border-[var(--cb-line)] bg-[var(--cb-nav)] p-2 shadow-xl">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setLanguageOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg bg-[var(--cb-hover)] px-3 py-2 text-left text-sm font-semibold text-white"
                  >
                    <LanguageFlag />
                    British English
                    <span className="ml-auto text-[var(--cb-yellow)]" aria-label="Selected">✓</span>
                  </button>
                  <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-slate-400">English is the currently available site language.</p>
                </div>
              ) : null}
            </div>

            <Link
              to="/info/contact"
              className="w-[168px] max-w-full rounded-[10px] border border-[var(--cb-line)] p-0 text-left text-white transition hover:bg-[var(--cb-card)] md:w-[184px]"
            >
              <span className="flex w-full items-center gap-2 overflow-hidden rounded-[10px] px-3 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <MessageSquareText className="size-6 md:size-7" aria-hidden="true" />
                </span>
                <span className="truncate whitespace-nowrap text-sm font-semibold">Support</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {PAYMENT_METHODS.map((payment) => <PaymentBadge key={payment.file} {...payment} />)}
          </div>

          <div className="space-y-6 border-y border-[var(--cb-line)] py-4">
            <nav aria-label="Footer" className="grid grid-cols-2 justify-center gap-1 border-b border-[var(--cb-line)] pb-4 md:flex md:flex-wrap md:gap-1">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white transition-colors duration-300 hover:bg-[var(--cb-card)] md:px-3 md:py-2.5 md:text-center md:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap justify-center gap-2">
              <ComplianceBadge image={ANJOUAN_SEAL} alt="Anjouan Gaming Board — verified licence" href={ANJOUAN_VERIFY} />
              <ComplianceBadge image={CMS_BASE + 'evo_affiliates.svg'} alt="Evo Affiliates" href="https://evoaffiliates.com/" />
              <ComplianceBadge image={CMS_BASE + 'moody.svg'} alt="Gambling Therapy" href="https://gamblingtherapy.org/" />
              <ComplianceBadge image={CMS_BASE + '18.svg'} alt="18+ only" />
              <ComplianceBadge image={CMS_BASE + 'gamble_aware.png'} alt="GambleAware" href="https://www.gambleaware.org/" />
            </div>
          </div>

          <p className="text-center text-xs leading-relaxed text-[var(--cb-body-text,#c4d0d8)] sm:text-sm">
            Campeonbet is owned and operated by Green Champions Leader SRL, registration number: 3-102-917157, registered address: Costa Rica, San José, Montes de Oca, San Pedro, Los Yoses, Avenidas Ocho y Diez, Calle Treinta y Nueve, LY Center. Contact us{' '}
            <a href="mailto:support@campeonbet.io" className="whitespace-nowrap hover:text-white">support@campeonbet.io</a>. Campeonbet is licensed and regulated by the Government of the Autonomous Island of Anjouan, Union of Comoros and operates under License ALSI-202502014-FI1. Payment processor is Widoma Trading Co. Limited (reg. nr. HE 468781), a company having its registered address at Lefkonos 22, 2nd floor, Strovolos 2064, Nicosia, Cyprus. Campeonbet has passed all regulatory compliance and is legally authorized to conduct gaming operations for any and all games of chance and wagering.
          </p>
        </div>

        <div className="flex flex-col space-y-2 text-center text-xs text-[var(--cb-body-text,#c4d0d8)]">
          <span>© {new Date().getFullYear()} CampeonBet. All rights reserved.</span>
          <time>{clock}</time>
        </div>
      </div>
    </footer>
  )
}
