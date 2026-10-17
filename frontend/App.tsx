/** @jsxRuntime automatic */

import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import { CasinoCategory, CasinoIndex, Providers, ProviderPage } from './pages/Casino'
import LiveCasino from './pages/LiveCasino'
import Sports, { SportsCategory } from './pages/Sports'
import Promotions, { PromotionDetail } from './pages/Promotions'
import Jackpots from './pages/Jackpots'
import Tournaments from './pages/Tournaments'
import Vip from './pages/Vip'
import Search from './pages/Search'
import Support from './pages/Support'
import { Login, Register, AccountPlaceholder } from './pages/Auth'
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
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="casino" element={<CasinoIndex />} />
        <Route path="casino/providers" element={<Providers />} />
        <Route path="casino/rng/brands" element={<Providers />} />
        <Route path="casino/providers/:provider" element={<ProviderPage />} />
        <Route path="casino/:category" element={<CasinoCategory />} />
        <Route path="live-casino" element={<LiveCasino />} />
        <Route path="sports" element={<Sports />} />
        <Route path="sports/:category" element={<SportsCategory />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="promotions/:slug" element={<PromotionDetail />} />
        <Route path="jackpots" element={<Jackpots />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="vip" element={<Vip />} />
        <Route path="rewards" element={<Vip />} />
        <Route path="search" element={<Search />} />
        <Route path="support" element={<Support />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="wallet" element={<Navigate to="/wallet/deposit" replace />} />
        <Route path="wallet/:tab" element={<WalletRouter />} />
        <Route
          path="account/:section"
          element={<AccountSection />}
        />
        <Route path="info/:slug" element={<Info />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AccountSection() {
  const { section = '' } = useParams()
  const titles: Record<string, string> = {
    profile: 'My profile',
    bonuses: 'Bonuses',
    history: 'History',
  }
  return <AccountPlaceholder title={titles[section] ?? 'Account'} />
}
