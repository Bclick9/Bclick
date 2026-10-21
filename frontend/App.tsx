/** @jsxRuntime automatic */

import { Routes, Route, Navigate, Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import { CasinoCategory, CasinoIndex, Providers, ProviderPage } from './pages/Casino'
import CasinoPlay from './pages/CasinoPlay'
import VirtualSportsKiron from './pages/VirtualSportsKiron'
import LiveCasino from './pages/LiveCasino'
import Sports, { SportsCategory } from './pages/Sports'
import Promotions, { PromotionDetail } from './pages/Promotions'
import Jackpots from './pages/Jackpots'
import Tournaments from './pages/Tournaments'
import Vip from './pages/Vip'
import Support from './pages/Support'
import AccountPage from './pages/Account'
import { WalletRouter } from './pages/Wallet'
import Info from './pages/Info'
import { LoginPage, RegisterPage } from './pages/Auth'
import './appTheme.css'

function NotFound() {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <p className="text-muted-foreground mt-3">This page does not exist.</p>
      <Link to="/" className="inline-block mt-6 h-10 px-6 rounded-lg cb-yellow text-primary-foreground font-bold text-sm leading-10">
        Back to home
      </Link>
    </div>
  )
}

/**
 * Client-side presentation guard for private player areas.
 * Every private API endpoint must still enforce its own server-side session checks.
 */
function RequirePlayerSession() {
  const { player, isLoading, apiStatus } = useAuth()
  const location = useLocation()

  if (isLoading || apiStatus === 'checking') {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-4 text-sm text-[#aebfca]" role="status">
        Checking your account session…
      </div>
    )
  }

  if (apiStatus === 'offline' || apiStatus === 'identity-disabled') {
    return (
      <section className="mx-auto my-10 max-w-xl rounded-2xl border border-[var(--cb-line)] bg-[#0c1d28] p-6 text-center">
        <h1 className="text-lg font-extrabold text-white">Account unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#aebfca]" role="alert">
          {apiStatus === 'offline'
            ? 'We could not verify your session because the Bclick API is unavailable. Your private account pages remain locked.'
            : 'Player authentication is not enabled. Your private account pages remain locked.'}
        </p>
        <Link to="/login" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--cb-yellow)] px-5 text-sm font-bold text-[#00151e]">
          Go to Login
        </Link>
      </section>
    )
  }

  if (!player) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      {/* Game play uses its own full-screen shell, independent from the regular site layout. */}
      <Route path="casino/play" element={<Navigate to="/casino/lobby" replace />} />
      <Route path="casino/play/:gameId" element={<CasinoPlay />} />
      <Route path="casino/play/:mode/:gameId" element={<CasinoPlay />} />
      <Route path="virtual-sports/kiron" element={<VirtualSportsKiron />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="casino" element={<CasinoIndex />} />
        <Route path="casino/providers" element={<Providers />} />
        <Route path="casino/rng/brands" element={<Providers />} />
        <Route path="casino/providers/:provider" element={<ProviderPage />} />
        <Route path="casino/:category" element={<CasinoCategory />} />
        <Route path="live-casino" element={<LiveCasino />} />
        <Route path="sports" element={<Sports />} />
        <Route path="sports/live" element={<Sports />} />
        <Route path="sports/favorites" element={<Sports />} />
        <Route path="sports/search" element={<Sports />} />
        <Route path="sports/:category" element={<SportsCategory />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="promotions/:slug" element={<PromotionDetail />} />
        <Route path="jackpots" element={<Jackpots />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="vip" element={<Vip />} />
        <Route path="rewards" element={<Vip />} />
        {/* Legacy standalone search URL now redirects to the site; search is handled by SearchDialog. */}
        <Route path="search" element={<Navigate to="/" replace />} />
        <Route path="support" element={<Support />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="signup" element={<Navigate to="/register" replace />} />

        {/* Player account and personal betting history must not render without a valid session. */}
        <Route element={<RequirePlayerSession />}>
          <Route path="sports/my-bets" element={<Sports />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/bonuses-available" element={<Navigate to="/account/bonuses" replace />} />
          <Route path="account/bonuses-active" element={<Navigate to="/account/bonuses" replace />} />
          <Route path="account/bonuses-closed" element={<Navigate to="/account/bonuses" replace />} />
          <Route path="account/bonuses" element={<AccountPage />} />
          <Route path="account/bonuses/:bonusTab" element={<AccountPage />} />
          <Route path="account/account-statement" element={<Navigate to="/account/betslips" replace />} />
          <Route path="account/profit-and-loss" element={<Navigate to="/account/betslips" replace />} />
          <Route path="account/wallet/:tab" element={<WalletRouter />} />
          <Route path="account/betslips/:betId" element={<AccountPage />} />
          <Route path="account/:section" element={<AccountPage />} />
        </Route>

        <Route path="wallet" element={<Navigate to="/account/wallet/deposit" replace />} />
        <Route path="wallet/:tab" element={<LegacyWalletRedirect />} />
        <Route path="info/:slug" element={<Info />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function LegacyWalletRedirect() {
  const { tab = 'deposit' } = useParams()
  return <Navigate to={`/account/wallet/${tab}`} replace />
}
