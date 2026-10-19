/** @jsxRuntime automatic */

import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
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
        <Route path="sports/my-bets" element={<Sports />} />
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
        {/* Legacy standalone auth pages are no longer used; auth opens from the header modal. */}
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="register" element={<Navigate to="/" replace />} />
        <Route path="signup" element={<Navigate to="/" replace />} />
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
        <Route path="wallet" element={<Navigate to="/account/wallet/deposit" replace />} />
        <Route path="wallet/:tab" element={<LegacyWalletRedirect />} />
        <Route path="account/:section" element={<AccountPage />} />
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
