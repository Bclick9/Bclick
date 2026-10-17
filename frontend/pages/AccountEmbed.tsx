import { useLocation } from 'react-router-dom'

const ACCOUNT_ROUTES: Record<string, string> = {
  '/account': '/profile/personal_info',
  '/account/personal-info': '/profile/personal_info',
  '/account/profile': '/profile/personal_info',
  '/account/documents': '/profile/documents',
  '/account/change-password': '/profile/change_password',
  '/account/messages': '/profile/inbox',
  '/account/bonuses-available': '/promotions/available',
  '/account/bonuses-active': '/promotions/active',
  '/account/bonuses-closed': '/promotions/closed',
  '/account/wallet/deposit': '/financials/deposit',
  '/account/wallet/withdraw': '/financials/withdraw',
  '/account/wallet/pending-withdrawals': '/financials/pending_withdraws',
  '/account/self-exclusion': '/responsible_gaming/self_exclusion',
  '/account/deposit-limits': '/responsible_gaming/deposit_limits',
  '/account/reality-check': '/responsible_gaming/reality_check',
  '/account/account-statement': '/history/account_statement',
  '/account/profit-and-loss': '/history/profit_and_loss',
}

const AVAILABLE_LANGUAGES = 'en-GB,de,fi,no,pt,fr,it,es,az,ru,tr,hu,cs,pl'

function getAccountToken(): string {
  // Vite client variables are visible to the browser; configure only a short-lived embed token.
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return env?.VITE_CAMPEONBET_ACCOUNT_TOKEN?.trim() ?? ''
}

export default function AccountEmbed() {
  const { pathname } = useLocation()
  const accountPath = ACCOUNT_ROUTES[pathname] ?? '/profile/personal_info'
  const token = getAccountToken()

  const params = new URLSearchParams()
  if (token) params.set('token', token)
  params.set('color', '#F6BD00')
  params.set('language', 'en-GB')
  params.set('incognito', 'false')
  params.set('languages', AVAILABLE_LANGUAGES)

  const src = `https://myaccount.campeonbet.io${accountPath}?${params.toString()}`

  return (
    <div className="relative h-full min-h-[calc(100dvh-3.5rem)] w-full bg-[#F3F4F6]">
      <iframe
        title="CampeonBet account"
        src={src}
        allow="clipboard-read; clipboard-write"
        className="h-full w-full border-0"
        style={{ minHeight: 1150 }}
      />
    </div>
  )
}
