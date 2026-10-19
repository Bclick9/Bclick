import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgePercent, Bell, CalendarDays,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, CreditCard, Download,
  Eye, FileText, Filter, Gamepad2, Gift, Globe, LayoutDashboard, LifeBuoy, LogOut,
  Menu, MoreHorizontal, Plus, Search, Settings, ShieldCheck,
  Sparkles, TrendingUp, Users, Wallet, X, Zap, UserPlus, CircleDollarSign,
  Shield, Check, Pause, Play, Pencil, Trophy, RotateCcw,
  ArrowDown, ArrowUp, Image, Layers, LayoutGrid, Monitor, Paintbrush, Palette,
  GripVertical, SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Modal } from './components/ui'
import { cn } from './lib/utils'

type WorkspaceMode = 'backoffice' | 'cms'
type PageKey = 'overview' | 'users' | 'promotions' | 'bonuses' | 'games' | 'transactions' | 'reports' | 'settings' | 'cms-banners' | 'cms-promotions' | 'cms-pages' | 'cms-skin-games' | 'cms-categories' | 'cms-providers' | 'cms-customization'
type Status = 'Active' | 'Paused' | 'Scheduled' | 'Suspended' | 'Completed' | 'Pending' | 'Failed'
type UserRow = { id: string; name: string; email: string; country: string; joined: string; balance: string; status: 'Active' | 'Suspended'; tier: 'VIP' | 'Gold' | 'Standard' }
type BonusWizardForm = {
  name: string; description: string; regions: string[]; decision: 'Reject' | 'Allow'
  programStart: string; programEnd: string; expirationType: string; expirationDate: string
  productType: string; visibleForAll: boolean; maxPlayers: string; depositNumber: string
  paymentSystems: string[]; fromCashDesk: boolean; wallet: string; verifiedOnly: boolean
  availableOnRequest: boolean; currencies: string[]; periodType: string; period: string; count: string
  calculationType: string; bonusAmount: string; maxBonusAmount: string; minimumDeposit: string
  maximumDeposit: string; wageringMultiplier: string; maxBet: string; maxWithdrawal: string
  slots: boolean; liveCasino: boolean; tableGames: boolean; crashGames: boolean
  gameContribution: string; excludedGames: string; providers: string[]
}

type Offer = {
  id: string
  name: string
  description: string
  channel: 'Casino' | 'Sports' | 'Both'
  reward: string
  claims: string
  ends: string
  status: 'Active' | 'Paused' | 'Scheduled'
  bonusType?: string
  productType?: string
  expirationDate?: string
  expirationDays?: string
  startDate?: string
  endDate?: string
  platformDefinitionBonusId?: string
}
type GameRow = { id: string; title: string; provider: string; category: string; rtp: string; players: string; status: 'Active' | 'Paused' }

const NAV_GROUPS: { title: string; items: { page: PageKey; label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'WORKSPACE', items: [
    { page: 'overview', label: 'Overview', icon: LayoutDashboard },
    { page: 'users', label: 'Players', icon: Users, count: '2.4k' },
    { page: 'bonuses', label: 'Bonuses', icon: Gift },
  ] },
  { title: 'OPERATIONS', items: [
    { page: 'games', label: 'Casino games', icon: Gamepad2 },
    { page: 'transactions', label: 'Transactions', icon: CreditCard },
    { page: 'reports', label: 'Reports & analytics', icon: TrendingUp },
  ] },
  { title: 'SYSTEM', items: [
    { page: 'settings', label: 'Settings', icon: Settings },
  ] },
]

const CMS_NAV_GROUPS: { title: string; items: { page: PageKey; label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'CMS', items: [
    { page: 'cms-banners', label: 'Banners', icon: Image },
    { page: 'cms-promotions', label: 'Promotions', icon: BadgePercent },
    { page: 'cms-pages', label: 'Pages', icon: FileText },
    { page: 'cms-skin-games', label: 'Skin Games', icon: Gamepad2 },
    { page: 'cms-categories', label: 'Categories', icon: Layers },
    { page: 'cms-providers', label: 'Providers', icon: Users },
    { page: 'cms-customization', label: 'Customization', icon: Paintbrush },
  ] },
]

const PAGE_INFO: Record<PageKey, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Here’s what’s happening across your platform today.' },
  users: { title: 'Players', description: 'Manage player records, account status, verification, and profile activity.' },
  promotions: { title: 'Promotions', description: 'Create campaigns and track engagement across channels.' },
  bonuses: { title: 'Bonuses', description: 'Manage bonus offers, wagering requirements, and eligibility.' },
  games: { title: 'Casino games', description: 'Review your game catalogue and availability.' },
  transactions: { title: 'Transactions', description: 'Browse demo deposits, withdrawals, and wallet activity.' },
  reports: { title: 'Reports & analytics', description: 'Explore platform performance and engagement trends.' },
  settings: { title: 'Settings', description: 'Preview workspace preferences and admin controls.' },
  'cms-banners': { title: 'Banners', description: 'Manage promotional artwork, hero placements, and casino visuals.' },
  'cms-promotions': { title: 'Promotions', description: 'Manage CMS promotion content, placements, and player-facing campaign cards.' },
  'cms-pages': { title: 'Pages', description: 'Edit the player-facing information pages and their publication status.' },
  'cms-skin-games': { title: 'Skin Games', description: 'Manage the game tile skins and visual presentation shown in the casino.' },
  'cms-categories': { title: 'Categories', description: 'Organize casino categories, visibility, and display order.' },
  'cms-providers': { title: 'Providers', description: 'Manage provider visibility and how providers appear in the casino.' },
  'cms-customization': { title: 'Customization', description: 'Customize the casino look, theme, and brand accents.' },
}


const PAGE_PATHS: Record<PageKey, string> = {
  overview: '/backoffice/overview',
  users: '/backoffice/players',
  promotions: '/backoffice/promotions',
  bonuses: '/backoffice/bonuses',
  games: '/backoffice/games',
  transactions: '/backoffice/transactions',
  reports: '/backoffice/reports',
  settings: '/backoffice/settings',
  'cms-banners': '/cms/banners',
  'cms-promotions': '/cms/promotions',
  'cms-pages': '/cms/pages',
  'cms-skin-games': '/cms/skin-games',
  'cms-categories': '/cms/categories',
  'cms-providers': '/cms/providers',
  'cms-customization': '/cms/customization',
}
function pageFromPath(pathname: string): PageKey {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return (Object.keys(PAGE_PATHS) as PageKey[]).find((key) => PAGE_PATHS[key] === normalized) || 'overview'
}
function workspaceForPage(page: PageKey): WorkspaceMode {
  return page.startsWith('cms-') ? 'cms' : 'backoffice'
}

const INITIAL_USERS: UserRow[] = [
  { id: 'BC-020481', name: 'Amine Ben Salem', email: 'amine.bensalem@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€245.80', status: 'Active', tier: 'VIP' },
  { id: 'BC-020480', name: 'Maya Trabelsi', email: 'maya.trabelsi@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€82.10', status: 'Active', tier: 'Gold' },
  { id: 'BC-020479', name: 'Youssef Mansour', email: 'y.mansour@example.com', country: 'France', joined: 'Oct 16, 2026', balance: '€0.00', status: 'Active', tier: 'Standard' },
  { id: 'BC-020478', name: 'Sarah Gharbi', email: 'sarah.gharbi@example.com', country: 'Tunisia', joined: 'Oct 16, 2026', balance: '€1,250.00', status: 'Active', tier: 'VIP' },
  { id: 'BC-020477', name: 'Karim Haddad', email: 'karim.haddad@example.com', country: 'Italy', joined: 'Oct 15, 2026', balance: '€31.45', status: 'Suspended', tier: 'Standard' },
  { id: 'BC-020476', name: 'Ines Jaziri', email: 'ines.jaziri@example.com', country: 'Tunisia', joined: 'Oct 15, 2026', balance: '€416.25', status: 'Active', tier: 'Gold' },
  { id: 'BC-020475', name: 'Adam Kallel', email: 'adam.kallel@example.com', country: 'Germany', joined: 'Oct 14, 2026', balance: '€96.30', status: 'Active', tier: 'Standard' },
]

const INITIAL_PROMOTIONS: Offer[] = [
  { id: 'PR-0108', name: 'Weekend Reload', description: 'A little extra for the weekend.', channel: 'Casino', reward: '50% up to €100', claims: '1,284', ends: 'Oct 25, 2026', status: 'Active' },
  { id: 'PR-0107', name: 'Matchday Boost', description: 'Boost selected sports accumulators.', channel: 'Sports', reward: 'Odds boost +20%', claims: '842', ends: 'Oct 22, 2026', status: 'Active' },
  { id: 'PR-0106', name: 'Welcome to Bclick', description: 'The first-deposit welcome campaign.', channel: 'Both', reward: '100% up to €200', claims: '3,206', ends: 'Nov 30, 2026', status: 'Active' },
  { id: 'PR-0105', name: 'Midweek Spins', description: 'Free spins for eligible slot play.', channel: 'Casino', reward: '25 free spins', claims: '536', ends: 'Oct 20, 2026', status: 'Scheduled' },
  { id: 'PR-0104', name: 'Super Sunday', description: 'A special sports reward for Sunday.', channel: 'Sports', reward: '€10 free bet', claims: '1,096', ends: 'Oct 12, 2026', status: 'Paused' },
]

const INITIAL_BONUSES: Offer[] = []

const INITIAL_GAMES: GameRow[] = [
  { id: 'GM-001', title: 'Zeus vs Hades', provider: 'Demo Studio', category: 'Slots', rtp: '96.40%', players: '1,248', status: 'Active' },
  { id: 'GM-002', title: 'Wild Clusters', provider: 'Play’n GO', category: 'Slots', rtp: '96.10%', players: '982', status: 'Active' },
  { id: 'GM-003', title: 'Roulette Royale', provider: 'Evolution', category: 'Live casino', rtp: '97.30%', players: '764', status: 'Active' },
  { id: 'GM-004', title: 'Lightning Blackjack', provider: 'Evolution', category: 'Live casino', rtp: '99.10%', players: '538', status: 'Active' },
  { id: 'GM-005', title: 'Rocket Rush', provider: 'Demo Studio', category: 'Crash', rtp: '97.00%', players: '1,105', status: 'Paused' },
  { id: 'GM-006', title: 'Golden Pharaoh', provider: 'Pragmatic Play', category: 'Slots', rtp: '96.50%', players: '416', status: 'Active' },
]

type TransactionState = 'Confirmed' | 'Pending' | 'Rejected'
type TransactionRecord = {
  id: string
  playerId: string
  transactionDate: string
  createdDate: string
  type: string
  currency: string
  amount: number
  fromBuddy: string
  toBuddy: string
  modifiedDate: string
  paymentSystem: string
  note: string
  externalId: string
  state: TransactionState
  cashdesk: string
  cashDeskId: string
  paidCashDeskId: string
  clientLogin: string
  modifiedBy: string
  amountUsd: string
  playerName: string
}

type TransactionColumnKey = Exclude<keyof TransactionRecord, 'playerName'>
type TransactionColumn = { key: TransactionColumnKey; label: string; width: number }

const TRANSACTION_COLUMNS: TransactionColumn[] = [
  { key: 'id', label: 'ID', width: 150 },
  { key: 'playerId', label: 'Player ID', width: 150 },
  { key: 'transactionDate', label: 'Transaction Date', width: 165 },
  { key: 'createdDate', label: 'Created Date', width: 165 },
  { key: 'type', label: 'Type', width: 155 },
  { key: 'currency', label: 'Currency', width: 105 },
  { key: 'amount', label: 'Amount', width: 120 },
  { key: 'fromBuddy', label: 'From Buddy', width: 150 },
  { key: 'toBuddy', label: 'To Buddy', width: 150 },
  { key: 'modifiedDate', label: 'Modified Date', width: 165 },
  { key: 'paymentSystem', label: 'Payment System Name', width: 185 },
  { key: 'note', label: 'Notes', width: 205 },
  { key: 'externalId', label: 'External ID', width: 155 },
  { key: 'state', label: 'State', width: 125 },
  { key: 'cashdesk', label: 'Cashdesk', width: 150 },
  { key: 'cashDeskId', label: 'CashDesk Id', width: 140 },
  { key: 'paidCashDeskId', label: 'Paid Cash Desk', width: 150 },
  { key: 'clientLogin', label: 'Client Login', width: 225 },
  { key: 'modifiedBy', label: 'Modified By', width: 145 },
  { key: 'amountUsd', label: 'Amount In (USD)', width: 145 },
]

const TRANSACTIONS: TransactionRecord[] = [
  { id: '193807391437', playerId: '492719526', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 12:00:40', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 12:00:40', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Amine Ben Salem' },
  { id: '193808861299', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:00:45', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:00:45', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Maya Trabelsi' },
  { id: '193808881243', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:01:34', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:01:34', paymentSystem: '—', note: '—', externalId: '3268850888975', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Maya Trabelsi' },
  { id: '193808892781', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:02:04', type: 'Bet Cashout', currency: 'TND', amount: 1.29, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:02:04', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$0.43', playerName: 'Maya Trabelsi' },
  { id: '193808907428', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:02:41', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:02:41', paymentSystem: '—', note: '—', externalId: '3268850888975', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Karim Haddad' },
  { id: '193808941696', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:04:03', type: 'Bet', currency: 'TND', amount: 0.4, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:04:03', paymentSystem: '—', note: '—', externalId: '3268851514045', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.13', playerName: 'Karim Haddad' },
  { id: '193808948983', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:04:21', type: 'Increasing the winning', currency: 'TND', amount: 0.3, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:04:21', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '3268851514045', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'karim.haddad@example.com', modifiedBy: 'system', amountUsd: '$0.10', playerName: 'Karim Haddad' },
  { id: '193809429757', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:23:43', type: 'Promo Bonus', currency: 'TND', amount: 17, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:23:43', paymentSystem: '—', note: 'Promotion credit · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$5.71', playerName: 'Sarah Gharbi' },
  { id: '193809589536', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:29:53', type: 'Bet', currency: 'TND', amount: 2, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:29:53', paymentSystem: '—', note: '—', externalId: '3363950830053', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.67', playerName: 'Sarah Gharbi' },
  { id: '193809678260', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:33:29', type: 'Bet', currency: 'TND', amount: 2.16, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:33:29', paymentSystem: '—', note: '—', externalId: '3363950830053', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.73', playerName: 'Sarah Gharbi' },
  { id: '193809678381', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:33:29', type: 'Increasing the winning', currency: 'TND', amount: 5.35, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:33:29', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '3363950839833', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$1.80', playerName: 'Sarah Gharbi' },
  { id: '193809716871', playerId: '492735538', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 13:35:01', type: 'Bet', currency: 'TND', amount: 0.18, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 13:35:01', paymentSystem: '—', note: '—', externalId: '3363950839833', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$0.06', playerName: 'Sarah Gharbi' },
  { id: '193811780364', playerId: '492730933', transactionDate: '21-09-2026 00:00:00', createdDate: '21-09-2026 15:00:34', type: 'Increasing the winning', currency: 'TND', amount: 16.6, fromBuddy: '—', toBuddy: '—', modifiedDate: '21-09-2026 15:00:34', paymentSystem: '—', note: 'Manual adjustment · demo', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$5.58', playerName: 'Maya Trabelsi' },
  { id: '194268439077', playerId: '492735538', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:51:01', type: 'Bet', currency: 'TND', amount: 10, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:51:01', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'sarah.gharbi@example.com', modifiedBy: 'system', amountUsd: '$3.36', playerName: 'Sarah Gharbi' },
  { id: '194268439078', playerId: '492730933', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:53:17', type: 'Withdrawal', currency: 'TND', amount: 26, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:57:23', paymentSystem: 'Bank transfer', note: '—', externalId: '3274775554825', state: 'Pending', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'admin.demo', amountUsd: '$8.74', playerName: 'Maya Trabelsi' },
  { id: '194268439079', playerId: '492719526', transactionDate: '23-09-2026 00:00:00', createdDate: '23-09-2026 15:56:36', type: 'Deposit', currency: 'TND', amount: 40, fromBuddy: '—', toBuddy: '—', modifiedDate: '23-09-2026 15:56:36', paymentSystem: 'Visa •••• 4821', note: 'Card deposit · demo', externalId: '3274775068875', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'system', amountUsd: '$13.44', playerName: 'Amine Ben Salem' },
  { id: '194268439080', playerId: '492730933', transactionDate: '10-10-2026 00:00:00', createdDate: '10-10-2026 16:48:13', type: 'Bet', currency: 'TND', amount: 4.23, fromBuddy: '—', toBuddy: '—', modifiedDate: '10-10-2026 16:48:13', paymentSystem: '—', note: '—', externalId: '—', state: 'Confirmed', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'maya.trabelsi@example.com', modifiedBy: 'system', amountUsd: '$1.42', playerName: 'Maya Trabelsi' },
  { id: '194268439081', playerId: '492719526', transactionDate: '10-10-2026 00:00:00', createdDate: '10-10-2026 16:55:03', type: 'Refund', currency: 'TND', amount: 12, fromBuddy: '—', toBuddy: '—', modifiedDate: '10-10-2026 16:55:03', paymentSystem: 'Visa •••• 4821', note: 'Refund · demo', externalId: '—', state: 'Rejected', cashdesk: '—', cashDeskId: '—', paidCashDeskId: '—', clientLogin: 'amine.bensalem@example.com', modifiedBy: 'admin.demo', amountUsd: '$4.03', playerName: 'Amine Ben Salem' },
]

const ACTIVITY = [
  { name: 'Amine Ben Salem', action: 'made a deposit', detail: '€100.00 · Visa', time: '2 min ago', icon: Wallet, tone: 'bg-emerald-50 text-emerald-700' },
  { name: 'Weekend Reload', action: 'promotion was claimed', detail: 'Casino · 50% bonus', time: '8 min ago', icon: Gift, tone: 'bg-amber-50 text-amber-700' },
  { name: 'Sarah Gharbi', action: 'requested a withdrawal', detail: '€250.00 · Bank transfer', time: '14 min ago', icon: CreditCard, tone: 'bg-sky-50 text-sky-700' },
  { name: 'Youssef Mansour', action: 'created an account', detail: 'Email verified', time: '21 min ago', icon: UserPlus, tone: 'bg-violet-50 text-violet-700' },
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'Active' || status === 'Completed' ? 'success'
    : status === 'Scheduled' || status === 'Pending' ? 'warning'
      : status === 'Failed' || status === 'Suspended' ? 'danger'
        : status === 'Paused' ? 'secondary' : 'outline'
  return <Badge variant={variant}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80" />{status}</Badge>
}

function Avatar({ name, tone = 'bg-amber-100 text-amber-800', size = 'md' }: { name: string; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'
  return <div className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white', dimensions, tone)}>{initials(name)}</div>
}

function SectionHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function MetricCard({ title, value, change, note, icon: Icon, accent = 'amber' }: { title: string; value: string; change: string; note: string; icon: LucideIcon; accent?: 'amber' | 'blue' | 'green' | 'violet' }) {
  const color = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }[accent]
  return (
    <Card className="min-w-0 transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{title}</p>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{value}</p>
          </div>
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}><Icon className="h-[18px] w-[18px]" /></span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center text-[11px] font-bold', change.startsWith('−') ? 'text-rose-600' : 'text-emerald-600')}>{change.startsWith('−') ? <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" /> : <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />}{change}</span>
          <span className="text-[11px] text-slate-400">{note}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceChart({ compact = false }: { compact?: boolean }) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" /> Revenue</span>
        <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500" /> Deposits</span>
        <span className="ml-auto text-[11px] text-slate-400">Last 7 days</span>
      </div>
      <div className={cn('w-full', compact ? 'h-44' : 'h-[230px]')}>
        <svg className="h-full w-full" viewBox="0 0 740 230" role="img" aria-label="Revenue and deposits line chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f5c542" stopOpacity=".22" /><stop offset="100%" stopColor="#f5c542" stopOpacity="0" /></linearGradient>
            <linearGradient id="deposit-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f7fe8" stopOpacity=".12" /><stop offset="100%" stopColor="#4f7fe8" stopOpacity="0" /></linearGradient>
          </defs>
          <g className="chart-grid">
            {[28, 68, 108, 148, 188].map((y) => <line key={y} x1="24" x2="724" y1={y} y2={y} />)}
          </g>
          <path d="M24 155 C60 150 75 126 124 132 S190 153 224 112 S300 88 324 106 S390 127 424 88 S495 72 524 92 S590 57 624 66 S688 28 724 42 L724 202 L24 202 Z" fill="url(#revenue-area)" />
          <path d="M24 155 C60 150 75 126 124 132 S190 153 224 112 S300 88 324 106 S390 127 424 88 S495 72 524 92 S590 57 624 66 S688 28 724 42" fill="none" stroke="#e9af17" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 172 C56 165 83 176 124 158 S188 141 224 151 S287 126 324 139 S391 110 424 122 S493 104 524 119 S585 94 624 111 S687 72 724 90 L724 202 L24 202 Z" fill="url(#deposit-area)" />
          <path d="M24 172 C56 165 83 176 124 158 S188 141 224 151 S287 126 324 139 S391 110 424 122 S493 104 524 119 S585 94 624 111 S687 72 724 90" fill="none" stroke="#4f7fe8" strokeWidth="2.5" strokeLinecap="round" />
          {[24, 124, 224, 324, 424, 524, 624, 724].map((x) => <circle key={x} cx={x} cy={x === 24 ? 155 : x === 124 ? 132 : x === 224 ? 112 : x === 324 ? 106 : x === 424 ? 88 : x === 524 ? 92 : x === 624 ? 66 : 42} r="3.5" fill="#fff" stroke="#e9af17" strokeWidth="2" />)}
        </svg>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </div>
  )
}

type ReportRow = { label: string; values: string[] }

function ReportTable({ title, description, columns, rows }: { title: string; description?: string; columns: string[]; rows: ReportRow[] }) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className="admin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[470px] text-left text-sm">
          <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-[38%] px-4 py-3 font-medium sm:px-5">Metric</th>
              {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 text-right font-medium last:pr-5">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => <tr key={row.label} className="transition-colors hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-foreground sm:px-5">{row.label}</td>
              {row.values.map((value, index) => <td key={row.label + index} className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground last:pr-5">{value}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function OverviewPage() {
  const [period, setPeriod] = useState('Yesterday')
  const [customOpen, setCustomOpen] = useState(false)
  const [startDate, setStartDate] = useState('2026-10-18')
  const [endDate, setEndDate] = useState('2026-10-18')
  const [pokerTab, setPokerTab] = useState<'Poker Overview' | 'Skill Games Overview'>('Poker Overview')
  const periods = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'LMTD']
  const formatDate = (value: string) => value ? value.split('-').reverse().join('/') : 'Select date'
  const dateRange = period === 'Custom'
    ? formatDate(startDate) + ' — ' + formatDate(endDate)
    : period === 'Today'
      ? '19/10/2026 — 19/10/2026'
      : period === 'Yesterday'
        ? '18/10/2026 — 18/10/2026'
        : period === 'This Week'
          ? '19/10/2026 — 25/10/2026'
          : period === 'Last Week'
            ? '12/10/2026 — 18/10/2026'
            : period === 'This Month'
              ? '01/10/2026 — 19/10/2026'
              : period === 'Last Month'
                ? '01/09/2026 — 30/09/2026'
                : '01/10/2026 — 18/10/2026'

  const metrics: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: 'Total of Deposits', value: '$0.00', icon: Wallet, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Total of Withdrawals', value: '$0.00', icon: ArrowUpRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Logged In', value: '0', icon: Users, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Total login count', value: '0', icon: Activity, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Registered', value: '0', icon: UserPlus, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Balance', value: '$(1.00)', icon: CircleDollarSign, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Profit', value: '$0.00', icon: TrendingUp, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Making Deposit', value: '0', icon: Wallet, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Players Making Withdrawals', value: '0', icon: ArrowDownRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Bonus Balance', value: '$(1.00)', icon: Gift, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Correction Up', value: '$0.00', icon: ArrowUpRight, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Correction Down', value: '$0.00', icon: ArrowDownRight, tone: 'text-slate-700 bg-slate-100' },
  ]

  const sportsbookRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Open Bets', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'GGR', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Profitability', values: ['0%', '0%', '0%'] },
    { label: 'Number of Bets', values: ['0', '0', '0'] },
    { label: 'Average Bet', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Bet Per Player', values: ['0', '0', '0'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]
  const casinoRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'GGR', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Profitability', values: ['0%', '0%', '0%'] },
    { label: 'Average Bet', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]
  const pokerRows: ReportRow[] = [
    { label: 'Turnover', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Winning', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Win/Lost', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Rake', values: ['$0.00', '$0.00', '$0.00'] },
    { label: 'Number of Players', values: ['0', '0', '0'] },
  ]

  return (
    <div className="page-enter space-y-5">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <span>Reporting period</span>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="text-xs font-normal tabular-nums text-slate-500">{dateRange}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {periods.map((item) => <Button key={item} type="button" size="sm" variant={period === item ? 'default' : 'outline'} className="h-8 px-3 text-xs" onClick={() => { setPeriod(item); setCustomOpen(false) }}>{item}</Button>)}
            <Button type="button" size="sm" variant={period === 'Custom' ? 'default' : 'outline'} className="h-8 px-3 text-xs" onClick={() => { setPeriod('Custom'); setCustomOpen((open) => !open) }}><CalendarDays className="h-3.5 w-3.5" /> Custom</Button>
          </div>
        </CardContent>
        {customOpen ? <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-end">
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">Start date<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">End date<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <Button size="default" onClick={() => { setPeriod('Custom'); setCustomOpen(false) }}>Apply range</Button>
        </div> : null}
      </Card>

      <section aria-label="Financial and player metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return <Card key={metric.label} className="min-w-0 shadow-none transition-colors hover:bg-muted/20">
            <CardContent className="flex items-start gap-3.5 p-4">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', metric.tone)}><Icon className="h-[17px] w-[17px]" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="mt-2 font-display text-[25px] font-bold leading-none tracking-tight tabular-nums text-foreground">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        })}
      </section>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
          <div><CardTitle>Profit</CardTitle><CardDescription>Breakdown across products for the selected period.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-3.5 w-3.5" /> Export</Button>
        </CardHeader>
        <CardContent className="grid gap-px bg-border p-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Bet Sport', value: '$0.00' },
            { label: 'Win Sport', value: '$0.00' },
            { label: 'Bet Casino', value: '$0.00' },
            { label: 'Win Casino', value: '$0.00' },
            { label: 'Rake', value: '$0.00' },
            { label: 'Bonus', value: '$0.00' },
            { label: 'Tournament Cost', value: '$0.00' },
          ].map((item) => <div key={item.label} className="min-w-0 bg-white px-4 py-4"><p className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</p><p className="mt-2 font-display text-lg font-semibold tabular-nums text-foreground">{item.value}</p></div>)}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
        <ReportTable title="Sportsbook Overview" description="Pre-match and live sportsbook performance." columns={['Pre-Match', 'Live', 'Total']} rows={sportsbookRows} />
        <ReportTable title="Casino Overview" description="Live casino and RNG performance." columns={['Live', 'RNG', 'Total']} rows={casinoRows} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div><CardTitle>{pokerTab}</CardTitle><CardDescription>Poker and skill games activity for the selected period.</CardDescription></div>
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            {(['Poker Overview', 'Skill Games Overview'] as const).map((tab) => <button key={tab} type="button" onClick={() => setPokerTab(tab)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', pokerTab === tab ? 'bg-white text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}>{tab}</button>)}
          </div>
        </CardHeader>
        {pokerTab === 'Poker Overview' ? <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[470px] text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-medium sm:px-5">Metric</th><th className="px-3 py-3 text-right font-medium">Cash</th><th className="px-3 py-3 text-right font-medium">Tournament</th><th className="px-5 py-3 text-right font-medium">Total</th></tr></thead>
            <tbody className="divide-y divide-border">{pokerRows.map((row) => <tr key={row.label} className="hover:bg-muted/30"><td className="px-4 py-3 text-xs font-medium sm:px-5">{row.label}</td>{row.values.map((value, i) => <td key={row.label + i} className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground last:pr-5">{value}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-6 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Gamepad2 className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No data to display</p><p className="text-xs text-muted-foreground">No Skill Games Overview values were present in the supplied dashboard capture.</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5"><span className="text-xs font-medium text-muted-foreground">Hourly Rake</span><span className="text-xs text-muted-foreground">No data to display</span></div>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5"><CardTitle>Bonus Overview</CardTitle><CardDescription>Bonus awarded and cost metrics for the selected period.</CardDescription></CardHeader>
        <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><tr>{['Type', 'Product', 'Awarded', 'Number of Players', 'Deposit', 'Cost', 'Converted Bonus'].map((col) => <th key={col} className="whitespace-nowrap px-4 py-3 font-medium first:pl-5 last:pr-5">{col}</th>)}</tr></thead>
            <tbody><tr><td colSpan={7} className="px-5 py-12"><div className="flex flex-col items-center justify-center gap-2 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Gift className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No Result</p><p className="text-xs text-muted-foreground">There are no bonus records for this reporting period.</p></div></td></tr></tbody>
          </table>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
        {[
          { title: 'Top 5 Sports', description: 'Sports performance ranked by profit.', icon: Trophy, columns: ['Sport', 'Bet', 'Win', 'Profit'] },
          { title: 'Top 5 Games', description: 'Casino game performance ranked by profit.', icon: Gamepad2, columns: ['Game', 'Bet', 'Win', 'Profit'] },
        ].map((report) => {
          const Icon = report.icon
          return <Card key={report.title} className="shadow-none">
            <CardHeader className="border-b border-border px-4 py-3.5 sm:px-5"><CardTitle>{report.title}</CardTitle><CardDescription>{report.description}</CardDescription></CardHeader>
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div><p className="text-sm font-medium text-foreground">No Result</p><p className="text-xs text-muted-foreground">No ranking data is available for the selected period.</p></div>
            <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3 sm:px-5">{report.columns.map((column) => <Badge key={column} variant="outline" className="font-normal">{column}</Badge>)}</div>
          </Card>
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">Dashboard structure and values follow the supplied reference capture. Values are a UI preview and are not connected to live data.</p>
    </div>
  )
}

type PlayerColumn = { key: string; label: string; defaultVisible?: boolean }

const PLAYER_COLUMNS: PlayerColumn[] = [
  { key: 'login', label: 'Login', defaultVisible: true },
  { key: 'id', label: 'ID', defaultVisible: true },
  { key: 'firstName', label: 'First Name', defaultVisible: true },
  { key: 'lastName', label: 'Last Name', defaultVisible: true },
  { key: 'personalId', label: 'Personal ID', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'externalId', label: 'External ID', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'accountHolder', label: 'Account Holder' },
  { key: 'address', label: 'Address' },
  { key: 'additionalAddress', label: 'Additional Address' },
  { key: 'balance', label: 'Balance', defaultVisible: true },
  { key: 'birthCity', label: 'Birth City' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'birthDepartment', label: 'Birth Department' },
  { key: 'birthRegionCode', label: 'Birth Region Code' },
  { key: 'cashDeskId', label: 'CashDesk ID' },
  { key: 'created', label: 'Created', defaultVisible: true },
  { key: 'currency', label: 'Currency' },
  { key: 'customCategory', label: 'Custom Player Category', defaultVisible: true },
  { key: 'documentIssueDate', label: 'Document Issue Date' },
  { key: 'documentIssuedBy', label: 'Document Issued By' },
  { key: 'documentNumber', label: 'Document Number' },
  { key: 'gender', label: 'Gender' },
  { key: 'iban', label: 'IBAN' },
  { key: 'isResident', label: 'Is Resident' },
  { key: 'newsletter', label: 'Subscribed to Newsletter' },
  { key: 'isTest', label: 'Is Test' },
  { key: 'isVerified', label: 'Is Verified', defaultVisible: true },
  { key: 'language', label: 'Language' },
  { key: 'lastLogin', label: 'Last Login Date', defaultVisible: true },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'mobilePhone', label: 'Mobile Phone' },
  { key: 'phone', label: 'Phone' },
  { key: 'profileId', label: 'Profile ID' },
  { key: 'promoCode', label: 'Promo Code' },
  { key: 'province', label: 'Province' },
  { key: 'country', label: 'Country Name', defaultVisible: true },
  { key: 'registrationSource', label: 'Registration Source', defaultVisible: true },
  { key: 'registrationIp', label: 'Registration IP' },
  { key: 'clientCategory', label: 'Client Category', defaultVisible: true },
  { key: 'swiftCode', label: 'Swift Code' },
  { key: 'title', label: 'Title' },
  { key: 'zipCode', label: 'Zip Code' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'state', label: 'State' },
  { key: 'lastLoginIp', label: 'Last Login IP' },
  { key: 'lastSportBet', label: 'Sport Last Bet' },
  { key: 'lastCasinoBet', label: 'Gaming Last Bet' },
  { key: 'phoneCallSubscription', label: 'Subscribed to Phone Calls' },
  { key: 'pushSubscription', label: 'Subscribed to Push Notifications' },
  { key: 'firstDepositDate', label: 'First Deposit Date' },
  { key: 'internalMessages', label: 'Subscribed Internal Message' },
  { key: 'wrongLoginBlock', label: 'Wrong Login Block Time' },
  { key: 'wrongLoginAttempts', label: 'Wrong Login Attempts' },
  { key: 'pepStatus', label: 'PEP Status' },
  { key: 'incomeSource', label: 'Income Source' },
  { key: 'loyaltyPoints', label: 'Loyalty Points' },
  { key: 'city', label: 'City' },
  { key: 'loyaltyLevel', label: 'Loyalty Level' },
  { key: 'amlStatus', label: 'AML Status', defaultVisible: true },
  { key: 'lastDepositDate', label: 'Last Deposit Date' },
  { key: 'childId', label: 'Child ID' },
  { key: 'parentId', label: 'Parent ID' },
  { key: 'partnerFlag', label: 'Partner Flag' },
  { key: 'lastWrongLogin', label: 'Last Wrong Login Date' },
  { key: 'documentRegion', label: 'Document Region' },
]

const DEFAULT_PLAYER_COLUMNS = PLAYER_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.key)

function playerCellValue(user: UserRow, key: string): string {
  const names = user.name.split(/\s+/).filter(Boolean)
  const firstName = names[0] || '—'
  const lastName = names.slice(1).join(' ') || '—'
  const accountStatus = user.status === 'Active' ? 'Open' : 'Locked'
  const verified = user.tier === 'VIP' || user.tier === 'Gold'
  const city = user.country === 'Tunisia' ? 'Tunis' : '—'
  const masked = '••••••'
  const values: Record<string, string> = {
    login: user.email,
    id: user.id,
    firstName,
    lastName,
    personalId: '••••' + user.id.slice(-3),
    email: user.email.replace(/^(.).+(@.+)$/, '$1••••$2'),
    externalId: '—',
    status: accountStatus,
    accountHolder: '—',
    address: '—',
    additionalAddress: '—',
    balance: user.balance,
    birthCity: city,
    birthday: '—',
    birthDepartment: '—',
    birthRegionCode: '—',
    cashDeskId: '—',
    created: user.joined,
    currency: 'EUR',
    customCategory: user.tier,
    documentIssueDate: '—',
    documentIssuedBy: '—',
    documentNumber: '•••• ' + user.id.slice(-4),
    gender: '—',
    iban: '••••••••',
    isResident: user.country === 'Tunisia' ? 'Yes' : 'No',
    newsletter: 'Yes',
    isTest: 'No',
    isVerified: verified ? 'Yes' : 'No',
    language: 'en',
    lastLogin: '18 Oct 2026, 11:52',
    middleName: '—',
    mobilePhone: masked,
    phone: masked,
    profileId: '—',
    promoCode: '—',
    province: '—',
    country: user.country,
    registrationSource: 'Web',
    registrationIp: '•••.•••.•••.•••',
    clientCategory: user.tier === 'VIP' ? 'VIP Player' : user.tier === 'Gold' ? 'Gold Player' : 'Standard',
    swiftCode: '—',
    title: '—',
    zipCode: '—',
    bankName: '—',
    state: accountStatus,
    lastLoginIp: '•••.•••.•••.•••',
    lastSportBet: '—',
    lastCasinoBet: '—',
    phoneCallSubscription: 'No',
    pushSubscription: 'Yes',
    firstDepositDate: user.tier === 'Standard' ? '—' : '15 Oct 2026',
    internalMessages: 'Yes',
    wrongLoginBlock: '—',
    wrongLoginAttempts: '0',
    pepStatus: 'No',
    incomeSource: '—',
    loyaltyPoints: user.tier === 'VIP' ? '2,450' : user.tier === 'Gold' ? '860' : '120',
    city,
    loyaltyLevel: user.tier,
    amlStatus: 'Low',
    lastDepositDate: user.tier === 'Standard' ? '—' : '18 Oct 2026',
    childId: '—',
    parentId: '—',
    partnerFlag: 'No',
    lastWrongLogin: '—',
    documentRegion: '—',
  }
  return values[key] ?? '—'
}

function PlayersPage({ users, query, onQueryChange, onAdd, onSelect, onToggleStatus }: {
  users: UserRow[]
  query: string
  onQueryChange: (value: string) => void
  onAdd: () => void
  onSelect: (user: UserRow) => void
  onToggleStatus: (id: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Locked'>('All')
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Verified' | 'Unverified'>('All')
  const [countryFilter, setCountryFilter] = useState('All countries')
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_PLAYER_COLUMNS)
  const [sortKey, setSortKey] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null)
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      const valuesMatch = !needle || PLAYER_COLUMNS.some((column) => playerCellValue(user, column.key).toLowerCase().includes(needle))
      const statusMatch = statusFilter === 'All' || playerCellValue(user, 'status') === statusFilter
      const verificationMatch = verificationFilter === 'All' || (verificationFilter === 'Verified' ? playerCellValue(user, 'isVerified') === 'Yes' : playerCellValue(user, 'isVerified') === 'No')
      const countryMatch = countryFilter === 'All countries' || user.country === countryFilter
      return valuesMatch && statusMatch && verificationMatch && countryMatch
    }).sort((a, b) => {
      const aValue = playerCellValue(a, sortKey)
      const bValue = playerCellValue(b, sortKey)
      const result = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
      return sortDirection === 'asc' ? result : -result
    })
  }, [users, query, statusFilter, verificationFilter, countryFilter, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const shownColumns = PLAYER_COLUMNS.filter((column) => visibleColumns.includes(column.key))

  function resetPlayerView() {
    onQueryChange('')
    setStatusFilter('All')
    setVerificationFilter('All')
    setCountryFilter('All countries')
    setVisibleColumns(DEFAULT_PLAYER_COLUMNS)
    setSortKey('id')
    setSortDirection('desc')
    setPageNumber(1)
    setPageSize(10)
    setColumnSettingsOpen(false)
  }

  function sortBy(columnKey: string) {
    if (sortKey === columnKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(columnKey)
      setSortDirection(columnKey === 'id' ? 'desc' : 'asc')
    }
    setPageNumber(1)
  }

  function toggleColumn(columnKey: string) {
    setVisibleColumns((current) => {
      if (current.includes(columnKey)) {
        if (current.length === 1) return current
        return current.filter((key) => key !== columnKey)
      }
      return PLAYER_COLUMNS.filter((column) => current.includes(column.key) || column.key === columnKey).map((column) => column.key)
    })
  }

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Player directory</p>
          <p className="mt-1 text-xs text-muted-foreground">Search player records, review account details, and manage status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setColumnSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /> Columns <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{visibleColumns.length}</span></Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetPlayerView}><RotateCcw className="h-4 w-4" /> Reset</Button>
        </div>
      </div>

      {columnSettingsOpen ? <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div><CardTitle>Visible columns</CardTitle><CardDescription>Choose which player fields appear in the table.</CardDescription></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setVisibleColumns(DEFAULT_PLAYER_COLUMNS)}>Default</Button><Button size="icon" variant="ghost" aria-label="Close column settings" onClick={() => setColumnSettingsOpen(false)}><X className="h-4 w-4" /></Button></div>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {PLAYER_COLUMNS.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-600 transition hover:bg-muted/60">
            <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
            <span>{column.label}</span>
          </label>)}
        </CardContent>
      </Card> : null}

      <Card className="overflow-visible shadow-none">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { onQueryChange(event.target.value); setPageNumber(1) }} placeholder="Search login, ID, email..." className="pl-9" /></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:items-center">
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPageNumber(1) }} className="h-9 min-w-[125px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="All">All statuses</option><option value="Open">Open</option><option value="Locked">Locked</option></select>
            <select aria-label="Filter by verification" value={verificationFilter} onChange={(event) => { setVerificationFilter(event.target.value as typeof verificationFilter); setPageNumber(1) }} className="h-9 min-w-[145px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="All">All verification</option><option value="Verified">Verified</option><option value="Unverified">Unverified</option></select>
            <select aria-label="Filter by country" value={countryFilter} onChange={(event) => { setCountryFilter(event.target.value); setPageNumber(1) }} className="h-9 min-w-[145px] rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"><option>All countries</option>{Array.from(new Set(users.map((user) => user.country))).sort().map((country) => <option key={country}>{country}</option>)}</select>
          </div>
        </div>

        <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1550px] border-collapse text-left text-sm">
            <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>{shownColumns.map((column, index) => <th key={column.key} className={cn('whitespace-nowrap border-b border-border px-4 py-3 font-medium', index === 0 && 'sticky left-0 z-[1] min-w-[230px] bg-muted/95', column.key === 'id' && 'min-w-[130px]', ['balance', 'isVerified', 'status'].includes(column.key) && 'min-w-[110px]')}>
                <button type="button" onClick={() => sortBy(column.key)} className="inline-flex items-center gap-1.5 transition hover:text-foreground">{column.label}{sortKey === column.key ? <span className="text-[9px]">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</button>
              </th>)}<th className="sticky right-0 z-[1] w-[104px] border-b border-border bg-muted/95 px-4 py-3 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((user) => <tr key={user.id} className="group transition-colors hover:bg-muted/30">
                {shownColumns.map((column, index) => {
                  const value = playerCellValue(user, column.key)
                  return <td key={column.key} className={cn('max-w-[230px] whitespace-nowrap border-b border-border/70 px-4 py-3 text-xs text-slate-600', index === 0 && 'sticky left-0 z-[1] min-w-[230px] bg-white group-hover:bg-slate-50', column.key === 'id' && 'font-mono text-[11px] text-slate-500', column.key === 'balance' && 'font-semibold tabular-nums text-slate-800')}>
                    {column.key === 'login' ? <button type="button" onClick={() => onSelect(user)} className="max-w-[205px] truncate text-left font-medium text-slate-800 hover:underline">{value}</button>
                    : column.key === 'status' ? <Badge variant={user.status === 'Active' ? 'success' : 'danger'}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{value}</Badge>
                    : column.key === 'isVerified' ? <Badge variant={value === 'Yes' ? 'success' : 'warning'}>{value}</Badge>
                    : column.key === 'customCategory' || column.key === 'clientCategory' || column.key === 'loyaltyLevel' ? <Badge variant={user.tier === 'VIP' ? 'warning' : user.tier === 'Gold' ? 'info' : 'outline'}>{value}</Badge>
                    : <span title={value} className="block max-w-[205px] truncate">{value}</span>}
                  </td>
                })}
                <td className="sticky right-0 z-[1] border-b border-border/70 bg-white px-3 py-2.5 group-hover:bg-slate-50">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={'View player ' + user.id} title="View player profile" onClick={() => onSelect(user)}><Eye className="h-4 w-4 text-slate-500" /></Button>
                    <div className="relative">
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More player actions" title="More actions" onClick={() => setActionUserId((current) => current === user.id ? null : user.id)}><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button>
                      {actionUserId === user.id ? <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-border bg-white p-1.5 shadow-lg">
                        <button type="button" onClick={() => { setHistoryUser(user); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted"><Activity className="h-3.5 w-3.5" /> Log history</button>
                        <button type="button" onClick={() => { onSelect(user); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted"><Eye className="h-3.5 w-3.5" /> View profile</button>
                        <button type="button" onClick={() => { onToggleStatus(user.id); setActionUserId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-muted">{user.status === 'Active' ? <Shield className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{user.status === 'Active' ? 'Lock account (demo)' : 'Unlock account (demo)'}</button>
                      </div> : null}
                    </div>
                  </div>
                </td>
              </tr>)}
              {pageRows.length === 0 ? <tr><td colSpan={shownColumns.length + 1} className="px-5 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-foreground">No players found</p><p className="mt-1 text-xs text-muted-foreground">Try a different search term or reset the filters.</p><Button variant="outline" size="sm" className="mt-3" onClick={resetPlayerView}>Reset filters</Button></td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span> players <span className="text-slate-400">· Demo data</span></div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1) }} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
            <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronRight className="h-4 w-4 rotate-180" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-4 w-4" /></Button></div>
          </div>
        </div>
      </Card>
      <p className="text-center text-[10px] text-muted-foreground">Player records shown are fictional demonstration data. Personal identifiers and network addresses are masked in this interface preview.</p>

      <Modal open={!!historyUser} onOpenChange={(open) => { if (!open) setHistoryUser(null) }} title="Player log history" description={historyUser ? 'Sample activity for ' + historyUser.name + ' · ' + historyUser.id : undefined}>
        {historyUser ? <div className="space-y-3">
          {[{ title: 'Player record created', detail: 'Registration source: Web', time: historyUser.joined, icon: UserPlus }, { title: 'Email verification status checked', detail: playerCellValue(historyUser, 'isVerified') === 'Yes' ? 'Verified in sample record' : 'Verification pending in sample record', time: '18 Oct 2026, 11:52', icon: CheckCircle2 }, { title: 'Last login', detail: 'Device and IP details are masked in this preview', time: playerCellValue(historyUser, 'lastLogin'), icon: Eye }].map((event) => { const Icon = event.icon; return <div key={event.title} className="flex gap-3 rounded-lg border border-border p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.detail}</p><p className="mt-2 text-[10px] text-muted-foreground">{event.time}</p></div></div> }) }
          <div className="flex justify-end"><Button variant="outline" onClick={() => setHistoryUser(null)}>Close history</Button></div>
        </div> : null}
      </Modal>
    </div>
  )
}


const BONUS_TYPE_OPTIONS = [
  'Deposit Bonus', 'Welcome Bonus', 'No Deposit Bonus', 'Reload Bonus',
  'Free Spins Bonus', 'Cashback Bonus', 'Free Bet Bonus',
]

function BonusTypeChooserModal({ open, onOpenChange, onChoose }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (type: string) => void
}) {
  const [selectedType, setSelectedType] = useState('')
  const [search, setSearch] = useState('')
  const choices = BONUS_TYPE_OPTIONS.filter((type) => type.toLowerCase().includes(search.toLowerCase()))
  return <Modal size="wide" open={open} onOpenChange={onOpenChange} title="Choose bonus type" description="Select a bonus definition to start configuring it." footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!selectedType} onClick={() => { onChoose(selectedType); setSelectedType(''); setSearch('') }}>Add <ArrowRight className="h-4 w-4" /></Button></>}>
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bonus Type" className="h-11 pl-9" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {choices.map((type) => <button key={type} type="button" onClick={() => setSelectedType(type)} className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition', selectedType === type ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Gift className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{type}</span><span className="mt-1 block text-[10px] text-slate-400">{type.includes('Spins') ? 'Casino free spins' : type.includes('Bet') ? 'Sports reward' : type.includes('Cashback') ? 'Cashback reward' : 'Deposit and player reward'}</span></span>
          {selectedType === type ? <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-900" /> : null}
        </button>)}
      </div>
      {choices.length === 0 ? <p className="rounded-md border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">No matching bonus types.</p> : null}
      <p className="text-[10px] text-slate-400">Choose a type and select Add to continue to the bonus setup.</p>
    </div>
  </Modal>
}

function BonusWizardModal({ open, onOpenChange, bonusType, onCreate }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bonusType: string
  onCreate: (values: BonusWizardForm) => void
}) {
  const initialForm = (): BonusWizardForm => ({
    name: '', description: '', regions: [], decision: 'Reject',
    programStart: '', programEnd: '', expirationType: 'To Given Date', expirationDate: '',
    productType: 'Casino', visibleForAll: false, maxPlayers: '1000', depositNumber: 'Any',
    paymentSystems: [], fromCashDesk: false, wallet: 'None', verifiedOnly: false,
    availableOnRequest: false, currencies: ['TND'], periodType: 'None', period: '', count: '',
    calculationType: 'Percentage', bonusAmount: '', maxBonusAmount: '', minimumDeposit: '',
    maximumDeposit: '', wageringMultiplier: 'x30', maxBet: '', maxWithdrawal: '',
    slots: true, liveCasino: true, tableGames: false, crashGames: false,
    gameContribution: '100', excludedGames: '', providers: [],
  })
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<BonusWizardForm>(initialForm)
  const [validationMessage, setValidationMessage] = useState('')
  const steps = ['Setup', 'Financial Factors', 'Game']
  const stepDescriptions = ['Basic information, availability and schedule', 'Reward amount, deposit limits and wagering rules', 'Eligible game categories, providers and contribution']

  const setText = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggleArray = (key: 'regions' | 'paymentSystems' | 'currencies' | 'providers', value: string) => setForm((current) => {
    const values = current[key]
    return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] }
  })
  const setBool = (key: 'visibleForAll' | 'fromCashDesk' | 'verifiedOnly' | 'availableOnRequest' | 'slots' | 'liveCasino' | 'tableGames' | 'crashGames', value: boolean) => setForm((current) => ({ ...current, [key]: value }))
  const resetWizard = () => { setStep(0); setValidationMessage(''); setForm(initialForm()) }
  const closeWizard = (next: boolean) => { if (!next) resetWizard(); onOpenChange(next) }

  const field = (label: string, key: string, options?: string[]) => <label key={key} className="block min-w-0 space-y-1.5">
    <span className="block truncate text-[11px] font-medium text-slate-600">{label}</span>
    {options
      ? <select value={String(form[key as keyof BonusWizardForm])} onChange={(event) => setText(key, event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100">{options.map((option) => <option key={option}>{option}</option>)}</select>
      : <Input value={String(form[key as keyof BonusWizardForm])} onChange={(event) => setText(key, event.target.value)} className="h-10 min-w-0 text-xs" />}
  </label>

  const boolCheck = (label: string, key: 'visibleForAll' | 'fromCashDesk' | 'verifiedOnly' | 'availableOnRequest' | 'slots' | 'liveCasino' | 'tableGames' | 'crashGames') => <label key={key} className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 transition hover:bg-slate-50">
    <input type="checkbox" checked={form[key]} onChange={(event) => setBool(key, event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
    <span className="min-w-0">{label}</span>
  </label>
  const arrayCheck = (label: string, key: 'regions' | 'paymentSystems' | 'currencies' | 'providers', value: string) => <label key={key + value} className="flex min-w-0 cursor-pointer items-center gap-2 text-[10px] text-slate-600">
    <input type="checkbox" checked={form[key].includes(value)} onChange={() => toggleArray(key, value)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-slate-900" />
    <span>{label}</span>
  </label>

  const nextStep = () => {
    if (step === 0) {
      if (!form.name.trim() || !form.description.trim() || !form.programStart || !form.programEnd || !form.expirationDate || !form.maxPlayers.trim()) {
        setValidationMessage('Complete all required fields: Name, Bonus Program Period, Expiration Date, Max Players and Description.')
        return
      }
      if (new Date(form.programEnd) < new Date(form.programStart)) {
        setValidationMessage('The end of Bonus Program Period must be after its start.')
        return
      }
      if (new Date(form.expirationDate) < new Date(form.programStart)) {
        setValidationMessage('Expiration Date must be on or after the program start.')
        return
      }
    }
    if (step === 1 && (!form.bonusAmount || Number(form.bonusAmount) <= 0)) {
      setValidationMessage('Enter a bonus amount greater than zero to continue.')
      return
    }
    setValidationMessage('')
    setStep((current) => Math.min(2, current + 1))
  }
  const finish = () => {
    if (!form.name.trim() || !form.description.trim() || !form.bonusAmount || !form.expirationDate) {
      setStep(0)
      setValidationMessage('Complete the required setup and financial fields before adding the bonus.')
      return
    }
    onCreate(form)
    resetWizard()
  }

  return <Modal size="full" open={open} onOpenChange={closeWizard} title={'New ' + bonusType} description={stepDescriptions[step]} footer={<><Button variant="outline" onClick={() => step === 0 ? closeWizard(false) : setStep((current) => current - 1)}>{step === 0 ? 'Cancel' : 'Back'}</Button>{step < 2 ? <Button onClick={nextStep}>Next <ArrowRight className="h-4 w-4" /></Button> : <Button onClick={finish}><Plus className="h-4 w-4" /> Add</Button>}</>}>
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {steps.map((title, index) => <Fragment key={title}>
            <button type="button" onClick={() => { if (index <= step) { setStep(index); setValidationMessage('') } }} className={cn('flex min-w-0 items-center gap-2 text-left', index <= step ? 'text-slate-900' : 'text-slate-400')}>
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', index < step ? 'border-emerald-500 bg-emerald-500 text-white' : index === step ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white')}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
              <span className="truncate text-[11px] font-semibold sm:text-xs">{title}</span>
            </button>
            {index < 2 ? <div className={cn('h-px w-5 sm:w-12', index < step ? 'bg-emerald-500' : 'bg-slate-200')} /> : null}
          </Fragment>)}
        </div>
      </div>
      {validationMessage ? <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{validationMessage}</div> : null}

      {step === 0 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-4"><h3 className="text-sm font-semibold text-slate-900">Setup</h3><p className="mt-1 text-[11px] text-slate-500">Define the bonus name, product scope, eligibility and dates.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Name</span><Input value={form.name} onChange={(event) => setText('name', event.target.value)} placeholder="Bonus name" className="h-10 text-xs" required /></label>
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Regions</span><div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-slate-200 px-2.5 py-2">{['Tunisia','Europe','MENA'].map((region) => arrayCheck(region, 'regions', region))}</div></div>
            {field('Reject / Allow', 'decision', ['Reject', 'Allow'])}
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Bonus Program Period</span><div className="grid grid-cols-2 gap-1.5"><Input aria-label="Bonus program start" type="datetime-local" value={form.programStart} onChange={(event) => setText('programStart', event.target.value)} className="h-10 min-w-0 px-1.5 text-[10px]" required /><Input aria-label="Bonus program end" type="datetime-local" value={form.programEnd} onChange={(event) => setText('programEnd', event.target.value)} className="h-10 min-w-0 px-1.5 text-[10px]" required /></div></div>
            {field('Expiration Type', 'expirationType', ['To Given Date', 'N Days After Activation', 'End of Program'])}
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Expiration Date</span><Input aria-label="Expiration date" type="datetime-local" value={form.expirationDate} onChange={(event) => setText('expirationDate', event.target.value)} className="h-10 min-w-0 px-2 text-[10px]" required /></label>
            {field('Product', 'productType', ['Casino', 'Sportsbook', 'Casino + Sports'])}
            <div>{boolCheck('Visible For All', 'visibleForAll')}</div>
            <label className="block min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">* Max Players</span><Input type="number" min="1" value={form.maxPlayers} onChange={(event) => setText('maxPlayers', event.target.value)} className="h-10 text-xs" required /></label>
            {field('Deposit Number', 'depositNumber', ['Any', '1st Deposit', '2nd Deposit', '3rd Deposit', 'Every Deposit'])}
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Payment Systems</span><div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-slate-200 px-2 py-2">{['Visa','Mastercard','Bank transfer','Wallet'].map((item) => arrayCheck(item, 'paymentSystems', item))}</div></div>
            <div>{boolCheck('From Cash Desk', 'fromCashDesk')}</div>
            {field('Wallet', 'wallet', ['None', 'Real Wallet', 'Bonus Wallet'])}
            <div>{boolCheck('Available for verified players only', 'verifiedOnly')}</div>
            <div>{boolCheck('Available for bonus request', 'availableOnRequest')}</div>
            <div className="min-w-0 space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Available Currencies</span><div className="flex min-h-10 flex-wrap items-center gap-3 rounded-md border border-slate-200 px-2.5 py-2">{['TND','EUR','USD'].map((currency) => arrayCheck(currency, 'currencies', currency))}</div></div>
            <label className="block min-w-0 space-y-1.5 sm:col-span-2 2xl:col-span-4"><span className="block text-[11px] font-medium text-slate-600">* Description</span><textarea required rows={2} value={form.description} onChange={(event) => setText('description', event.target.value)} placeholder="Describe bonus terms and eligibility…" className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-2"><CircleHelp className="mt-0.5 h-4 w-4 text-slate-400" /><div><h3 className="text-sm font-semibold text-slate-900">Schedule</h3><p className="mt-1 text-[11px] text-slate-500">Optional recurring schedule rules.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {field('Period Type', 'periodType', ['None', 'Daily', 'Weekly', 'Monthly'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Period</span><Input type="number" min="1" disabled={form.periodType === 'None'} value={form.period} onChange={(event) => setText('period', event.target.value)} placeholder="Period" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Count</span><Input type="number" min="1" disabled={form.periodType === 'None'} value={form.count} onChange={(event) => setText('count', event.target.value)} placeholder="Count" className="h-10 text-xs" /></label>
            <div className="flex items-end"><p className="w-full rounded-md bg-slate-50 px-3 py-3 text-[10px] text-slate-500">{form.periodType === 'None' ? 'No recurring schedule' : form.periodType + ' · ' + (form.period || 'period') + ' · ' + (form.count || 'count')}</p></div>
          </div>
        </section>
      </div> : null}

      {step === 1 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Financial Factors</h3><p className="mt-1 text-[11px] text-slate-500">Set bonus value and the limits attached to it.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {field('Calculation Type', 'calculationType', ['Percentage', 'Fixed Amount'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">* Bonus Amount ({form.calculationType === 'Percentage' ? '%' : 'currency'})</span><Input type="number" min="0.01" step="0.01" value={form.bonusAmount} onChange={(event) => setText('bonusAmount', event.target.value)} placeholder={form.calculationType === 'Percentage' ? '100' : '50'} className="h-10 text-xs" required /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Bonus Amount</span><Input type="number" min="0" value={form.maxBonusAmount} onChange={(event) => setText('maxBonusAmount', event.target.value)} placeholder="500" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Minimum Deposit</span><Input type="number" min="0" value={form.minimumDeposit} onChange={(event) => setText('minimumDeposit', event.target.value)} placeholder="20" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Maximum Deposit</span><Input type="number" min="0" value={form.maximumDeposit} onChange={(event) => setText('maximumDeposit', event.target.value)} placeholder="5,000" className="h-10 text-xs" /></label>
            {field('Wagering Multiplier', 'wageringMultiplier', ['x1', 'x10', 'x20', 'x30', 'x35', 'x40', 'x50'])}
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Bet During Wagering</span><Input type="number" min="0" value={form.maxBet} onChange={(event) => setText('maxBet', event.target.value)} placeholder="5" className="h-10 text-xs" /></label>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Max Withdrawal</span><Input type="number" min="0" value={form.maxWithdrawal} onChange={(event) => setText('maxWithdrawal', event.target.value)} placeholder="1,000" className="h-10 text-xs" /></label>
          </div>
        </section>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-800">Financial rule summary</p><p className="mt-1 text-xs leading-5 text-slate-500">Configured as {form.calculationType.toLowerCase()} at {form.bonusAmount || '—'}{form.calculationType === 'Percentage' ? '%' : ''}, with wagering set to {form.wageringMultiplier}. Changes stay in this preview.</p></div>
      </div> : null}

      {step === 2 ? <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Game</h3><p className="mt-1 text-[11px] text-slate-500">Choose game categories and providers that qualify for this bonus.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{boolCheck('Slots', 'slots')}{boolCheck('Live Casino', 'liveCasino')}{boolCheck('Table Games', 'tableGames')}{boolCheck('Crash Games', 'crashGames')}</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><p className="text-[11px] font-medium text-slate-600">Game Providers</p><div className="grid grid-cols-2 gap-2">{['Evolution','Pragmatic Play','Play’n GO','Demo Studio'].map((provider) => arrayCheck(provider, 'providers', provider))}</div></div>
            <label className="block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Game Contribution (%)</span><Input type="number" min="0" max="100" value={form.gameContribution} onChange={(event) => setText('gameContribution', event.target.value)} className="h-10 text-xs" /><p className="text-[10px] text-slate-400">Contribution percentage for qualifying gameplay.</p></label>
          </div>
          <label className="mt-4 block space-y-1.5"><span className="text-[11px] font-medium text-slate-600">Excluded Games</span><textarea rows={3} value={form.excludedGames} onChange={(event) => setText('excludedGames', event.target.value)} placeholder="Optional game IDs or names, one per line…" className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>
        </section>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-900">Ready to add</p><p className="mt-1 text-xs leading-5 text-emerald-800/80">{form.name || 'New bonus'} · {form.productType} · {form.calculationType} {form.bonusAmount || '—'}{form.calculationType === 'Percentage' ? '%' : ''} · {form.wageringMultiplier} wagering</p></div>
      </div> : null}
      <p className="text-[10px] text-slate-400">Demo mode — no live bonuses, player wallets, or game restrictions will be changed.</p>
    </div>
  </Modal>
}

type BonusColumnKey = 'id' | 'name' | 'bonusType' | 'productType' | 'expirationDate' | 'expirationDays' | 'startDate' | 'endDate' | 'platformDefinitionBonusId'
type BonusColumn = { key: BonusColumnKey; label: string; width: number }
const BONUS_COLUMNS: BonusColumn[] = [
  { key: 'id', label: 'ID', width: 150 },
  { key: 'name', label: 'Name', width: 210 },
  { key: 'bonusType', label: 'Type', width: 160 },
  { key: 'productType', label: 'Product Type', width: 155 },
  { key: 'expirationDate', label: 'Expiration Date', width: 160 },
  { key: 'expirationDays', label: 'Expiration Days', width: 145 },
  { key: 'startDate', label: 'Start Date', width: 155 },
  { key: 'endDate', label: 'End Date', width: 155 },
  { key: 'platformDefinitionBonusId', label: 'Platform Definition Bonus Id', width: 230 },
]

function BonusesPage({ offers, onCreate, onToggle, onNotify }: { offers: Offer[]; onCreate: () => void; onToggle: (id: string) => void; onNotify: (message: string) => void }) {
  const [columnOrder, setColumnOrder] = useState<BonusColumnKey[]>(BONUS_COLUMNS.map((column) => column.key))
  const [visibleColumns, setVisibleColumns] = useState<BonusColumnKey[]>(BONUS_COLUMNS.map((column) => column.key))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionBonusId, setActionBonusId] = useState<string | null>(null)
  const [selectedBonus, setSelectedBonus] = useState<Offer | null>(null)
  const [sortKey, setSortKey] = useState<BonusColumnKey>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [draggedColumn, setDraggedColumn] = useState<BonusColumnKey | null>(null)

  const orderedColumns = columnOrder.map((key) => BONUS_COLUMNS.find((column) => column.key === key)).filter((column): column is BonusColumn => Boolean(column))
  const shownColumns = orderedColumns.filter((column) => visibleColumns.includes(column.key))
  const rowFor = (offer: Offer): Record<BonusColumnKey, string> => ({
    id: offer.id,
    name: offer.name,
    bonusType: offer.bonusType || (offer.name.toLowerCase().includes('welcome') ? 'Welcome Bonus' : offer.name.toLowerCase().includes('spin') ? 'Free Spins' : 'Deposit Bonus'),
    productType: offer.productType || (offer.channel === 'Both' ? 'Casino + Sports' : offer.channel === 'Sports' ? 'Sportsbook' : 'Casino'),
    expirationDate: offer.expirationDate || offer.ends || '—',
    expirationDays: offer.expirationDays || '30',
    startDate: offer.startDate || '—',
    endDate: offer.endDate || offer.ends || '—',
    platformDefinitionBonusId: offer.platformDefinitionBonusId || '—',
  })
  const sortedOffers = [...offers].sort((left, right) => {
    const a = rowFor(left)[sortKey]
    const b = rowFor(right)[sortKey]
    const compare = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection === 'asc' ? compare : -compare
  })
  const tableWidth = shownColumns.reduce((total, column) => total + column.width, 0)
  const resetTable = () => {
    setColumnOrder(BONUS_COLUMNS.map((column) => column.key))
    setVisibleColumns(BONUS_COLUMNS.map((column) => column.key))
    setSortKey('id')
    setSortDirection('desc')
    setSettingsOpen(false)
    setActionBonusId(null)
    onNotify('Bonus table layout reset.')
  }
  const sortBy = (key: BonusColumnKey) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
  }
  const moveColumn = (target: BonusColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return
    setColumnOrder((current) => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(target)
      if (from < 0 || to < 0) return current
      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }

  return <div className="page-enter min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
    <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center"><h1 className="truncate text-sm font-semibold text-slate-900">Bonuses</h1></div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Bonus table settings" title="Table settings" onClick={() => setSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /></Button>
          {settingsOpen ? <div className="absolute right-0 top-9 z-30 w-[min(300px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-xs font-semibold text-slate-900">Table settings</p><p className="mt-1 text-[10px] text-slate-500">Choose the visible bonus fields.</p></div><button type="button" onClick={() => setVisibleColumns(BONUS_COLUMNS.map((column) => column.key))} className="text-[10px] font-semibold text-slate-600 hover:text-slate-950">Show all</button></div>
            <div className="admin-scrollbar grid max-h-[320px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto py-1">
              {BONUS_COLUMNS.map((column) => <label key={column.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900" /><span className="truncate" title={column.label}>{column.label}</span></label>)}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag a column heading to change its order.</div>
          </div> : null}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Reset bonus table" title="Reset table" onClick={resetTable}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="flex min-h-[50px] items-center justify-end border-b border-slate-200 px-3 py-2.5">
      <Button size="sm" className="h-8 rounded-md px-3 text-xs" onClick={onCreate}><Plus className="h-3.5 w-3.5" /> New</Button>
    </div>

    <div className="table-holder">
      <div className="admin-scrollbar w-full overflow-auto bg-white" style={{ height: offers.length ? 'min(72vh, 660px)' : '270px', minHeight: '270px', maxHeight: 'min(72vh, 660px)' }}>
        <table className="border-separate border-spacing-0 text-left" style={{ width: tableWidth + 48, minWidth: tableWidth + 48, tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {shownColumns.map((column) => <th key={column.key} draggable onDragStart={() => setDraggedColumn(column.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(column.key)} onDragEnd={() => setDraggedColumn(null)} style={{ width: column.width, minWidth: column.width }} className={cn('group/bonus-th box-border h-10 overflow-hidden border-b border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600', draggedColumn === column.key && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover/bonus-th:opacity-100" />
                  <button type="button" onClick={() => sortBy(column.key)} className="inline-flex min-w-0 items-center gap-1.5 text-left hover:text-slate-950"><span className="truncate">{column.label}</span><Filter className="h-3 w-3 shrink-0 text-slate-300" />{sortKey === column.key ? <span className="text-[9px] text-slate-500">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</button>
                </div>
              </th>)}
              <th className="w-12 min-w-12 border-b border-slate-200 bg-white px-2" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {sortedOffers.map((offer, index) => {
              const row = rowFor(offer)
              return <tr key={offer.id} className={cn('group/bonus-row transition-colors hover:bg-slate-50', index % 2 === 1 && 'bg-slate-50/40')}>
                {shownColumns.map((column) => <td key={column.key} style={{ width: column.width, minWidth: column.width }} className="box-border h-[43px] overflow-hidden border-b border-slate-100 px-3 text-xs text-slate-600">
                  {column.key === 'name' ? <button type="button" onClick={() => setSelectedBonus(offer)} className="max-w-[245px] truncate text-left font-medium text-slate-800 hover:underline">{row[column.key]}</button>
                  : column.key === 'bonusType' ? <Badge variant="outline">{row[column.key]}</Badge>
                  : column.key === 'productType' ? <Badge variant="secondary">{row[column.key]}</Badge>
                  : <span title={row[column.key]} className="block max-w-[250px] truncate">{row[column.key]}</span>}
                </td>)}
                <td className="relative h-[43px] border-b border-slate-100 px-2 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" aria-label={'Actions for ' + offer.name} onClick={() => setActionBonusId((current) => current === offer.id ? null : offer.id)}><MoreHorizontal className="h-4 w-4" /></Button>
                  {actionBonusId === offer.id ? <div className="absolute right-2 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                    <button type="button" onClick={() => { onToggle(offer.id); setActionBonusId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">{offer.status === 'Active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{offer.status === 'Active' ? 'Pause bonus' : 'Activate bonus'}</button>
                    <button type="button" onClick={() => { setSelectedBonus(offer); setActionBonusId(null) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /> View details</button>
                  </div> : null}
                </td>
              </tr>
            })}
            {sortedOffers.length === 0 ? <tr><td colSpan={shownColumns.length + 1} className="p-0"><div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400"><Gift className="h-5 w-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">No Result</p></div></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
    {offers.length > 0 ? <div className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-400">Showing {offers.length} bonus definitions · Demo data only</div> : null}
    <Modal open={!!selectedBonus} onOpenChange={(open) => { if (!open) setSelectedBonus(null) }} title={selectedBonus ? selectedBonus.name : 'Bonus details'} description={selectedBonus ? rowFor(selectedBonus).id + ' · ' + rowFor(selectedBonus).bonusType : undefined}>
      {selectedBonus ? <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">{BONUS_COLUMNS.map((column) => <div key={column.key} className="rounded-md border border-slate-200 px-3 py-2.5"><p className="text-[10px] text-slate-400">{column.label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{rowFor(selectedBonus)[column.key]}</p></div>)}</div>
        <div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedBonus(null)}>Close</Button></div>
      </div> : null}
    </Modal>
  </div>
}

function OffersPage({ title, description, offers, kind, onCreate, onToggle }: { title: string; description: string; offers: Offer[]; kind: 'promotions' | 'bonuses'; onCreate: () => void; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState<'All' | 'Casino' | 'Sports' | 'Both'>('All')
  const [query, setQuery] = useState('')
  const filtered = offers.filter((offer) => (filter === 'All' || offer.channel === filter) && (offer.name + ' ' + offer.description + ' ' + offer.id).toLowerCase().includes(query.toLowerCase()))
  const isPromotions = kind === 'promotions'
  return <div className="page-enter">
    <SectionHeading title={title} description={description} actions={<><Button variant="outline"><Download className="h-4 w-4" /> Export</Button><Button onClick={onCreate}><Plus className="h-4 w-4" /> {isPromotions ? 'Create promotion' : 'Create bonus'}</Button></>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BadgePercent className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Total {isPromotions ? 'campaigns' : 'bonus offers'}</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Currently active</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.filter((offer) => offer.status === 'Active').length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Total claims</p><p className="mt-0.5 font-display text-2xl font-extrabold">{offers.reduce((sum, offer) => sum + Number(offer.claims.replace(',', '')), 0).toLocaleString()}</p></div></CardContent></Card>
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">{(['All', 'Casino', 'Sports', 'Both'] as const).map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition', filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{item === 'Both' ? 'Cross-channel' : item}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'Search ' + (isPromotions ? 'promotions' : 'bonuses') + '...'} className="pl-9 sm:w-64" /></div><Button variant="outline" onClick={() => { setFilter('All'); setQuery('') }}><Filter className="h-4 w-4" /> Clear filters</Button></div>
      </div>
      <div className="admin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">{isPromotions ? 'Promotion' : 'Bonus offer'}</th><th className="px-4 py-3.5">Channel</th><th className="px-4 py-3.5">Reward</th><th className="px-4 py-3.5">Claims</th><th className="px-4 py-3.5">End date</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((offer) => <tr key={offer.id} className="transition hover:bg-slate-50/70">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isPromotions ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700')}>{isPromotions ? <BadgePercent className="h-5 w-5" /> : <Gift className="h-5 w-5" />}</span><div className="min-w-0"><p className="max-w-[220px] truncate text-xs font-bold text-slate-800">{offer.name}</p><p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-400">{offer.description}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{offer.id}</p></div></div></td>
              <td className="px-4 py-4"><Badge variant={offer.channel === 'Casino' ? 'info' : offer.channel === 'Sports' ? 'success' : 'secondary'}>{offer.channel}</Badge></td>
              <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">{offer.reward}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{offer.claims}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{offer.ends}</td><td className="px-4 py-4"><StatusBadge status={offer.status} /></td>
              <td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => onToggle(offer.id)} aria-label={offer.status === 'Active' ? 'Pause offer' : 'Activate offer'}>{offer.status === 'Active' ? <Pause className="h-4 w-4 text-slate-500" /> : <Play className="h-4 w-4 text-slate-500" />}</Button><Button variant="ghost" size="icon" aria-label="Edit offer" onClick={onCreate}><Pencil className="h-4 w-4 text-slate-500" /></Button><Button variant="ghost" size="icon" aria-label="More offer actions"><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button></div></td>
            </tr>)}
            {filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No offers match the selected filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-5 py-3 text-[11px] text-slate-400">Showing {filtered.length} of {offers.length} demo {isPromotions ? 'promotions' : 'bonuses'} · No campaigns are sent or activated.</div>
    </Card>
  </div>
}

function GamesPage({ games, onToggle }: { games: GameRow[]; onToggle: (id: string) => void }) {
  const [category, setCategory] = useState('All games')
  const [query, setQuery] = useState('')
  const filtered = games.filter((game) => (category === 'All games' || game.category === category) && (game.title + ' ' + game.provider).toLowerCase().includes(query.toLowerCase()))
  const gradient = (categoryName: string) => categoryName === 'Live casino' ? 'from-blue-950 via-blue-800 to-sky-700' : categoryName === 'Crash' ? 'from-violet-950 via-violet-800 to-fuchsia-600' : 'from-slate-950 via-slate-800 to-amber-700'
  return <div className="page-enter">
    <SectionHeading title="Casino games" description="Curate your catalogue and preview availability by category." actions={<><Button variant="outline"><Download className="h-4 w-4" /> Export catalogue</Button><Button><Plus className="h-4 w-4" /> Add game</Button></>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total titles</p><p className="mt-1 font-display text-2xl font-extrabold">{games.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Available in lobby</p><p className="mt-1 font-display text-2xl font-extrabold">{games.filter((game) => game.status === 'Active').length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Providers represented</p><p className="mt-1 font-display text-2xl font-extrabold">{new Set(games.map((game) => game.provider)).size}</p></CardContent></Card>
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{['All games', 'Slots', 'Live casino', 'Crash'].map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', category === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{item}</button>)}</div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games or providers..." className="pl-9 sm:w-72" /></div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((game) => <div key={game.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
          <div className={cn('relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br', gradient(game.category))}>
            <span className="absolute -right-3 -top-8 h-32 w-32 rounded-full border border-white/10" /><span className="absolute -bottom-16 -left-5 h-40 w-40 rounded-full border border-white/10" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur"><Gamepad2 className="h-7 w-7" /></span>
            <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90">{game.category}</span>
            <span className="absolute right-3 top-3"><StatusBadge status={game.status} /></span>
          </div>
          <div className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{game.title}</p><p className="mt-1 text-[11px] text-slate-400">{game.provider}</p></div><Button size="icon" variant="ghost" aria-label="More game options"><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button></div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3"><div><p className="text-[10px] text-slate-400">RTP</p><p className="mt-1 text-xs font-bold text-slate-700">{game.rtp}</p></div><div><p className="text-[10px] text-slate-400">Active players</p><p className="mt-1 text-xs font-bold text-slate-700">{game.players}</p></div></div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => onToggle(game.id)}>{game.status === 'Active' ? <><Pause className="h-3.5 w-3.5" /> Pause game (demo)</> : <><Play className="h-3.5 w-3.5" /> Enable game (demo)</>}</Button>
          </div>
        </div>)}
        {filtered.length === 0 ? <div className="col-span-full py-12 text-center text-sm text-slate-400">No games match your search.</div> : null}
      </div>
    </Card>
    <p className="mt-4 text-center text-[10px] text-slate-400">Catalogue information is illustrative. Provider connections and game availability are not implemented.</p>
  </div>
}

function TransactionsPage({ query, onQueryChange, users, onNotify, onSelectPlayer }: {
  query: string
  onQueryChange: (value: string) => void
  users: UserRow[]
  onNotify: (message: string) => void
  onSelectPlayer: (player: UserRow) => void
}) {
  const [columnOrder, setColumnOrder] = useState<TransactionColumnKey[]>(TRANSACTION_COLUMNS.map((column) => column.key))
  const [visibleColumns, setVisibleColumns] = useState<TransactionColumnKey[]>(TRANSACTION_COLUMNS.map((column) => column.key))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All types')
  const [stateFilter, setStateFilter] = useState('All states')
  const [methodFilter, setMethodFilter] = useState('All methods')
  const [pageSize, setPageSize] = useState(20)
  const [pageNumber, setPageNumber] = useState(1)
  const [sortKey, setSortKey] = useState<TransactionColumnKey>('createdDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [draggedColumn, setDraggedColumn] = useState<TransactionColumnKey | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)

  const orderedColumns = columnOrder.map((key) => TRANSACTION_COLUMNS.find((column) => column.key === key)).filter((column): column is TransactionColumn => Boolean(column))
  const shownColumns = orderedColumns.filter((column) => visibleColumns.includes(column.key))
  const typeOptions = ['All types', ...Array.from(new Set(TRANSACTIONS.map((transaction) => transaction.type)))]
  const methodOptions = ['All methods', ...Array.from(new Set(TRANSACTIONS.map((transaction) => transaction.paymentSystem).filter((method) => method !== '—')))]
  const filtered = TRANSACTIONS.filter((transaction) => {
    const text = Object.values(transaction).join(' ').toLowerCase()
    return text.includes(query.toLowerCase())
      && (typeFilter === 'All types' || transaction.type === typeFilter)
      && (stateFilter === 'All states' || transaction.state === stateFilter)
      && (methodFilter === 'All methods' || transaction.paymentSystem === methodFilter)
  }).sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const compare = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection === 'asc' ? compare : -compare
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const tableWidth = shownColumns.reduce((total, column) => total + column.width, 0)

  const resetView = () => {
    setColumnOrder(TRANSACTION_COLUMNS.map((column) => column.key))
    setVisibleColumns(TRANSACTION_COLUMNS.map((column) => column.key))
    setSettingsOpen(false)
    onQueryChange('')
    setTypeFilter('All types')
    setStateFilter('All states')
    setMethodFilter('All methods')
    setPageSize(20)
    setPageNumber(1)
    setSortKey('createdDate')
    setSortDirection('desc')
    onNotify('Transaction table layout and filters reset.')
  }
  const sortBy = (key: TransactionColumnKey) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
    setPageNumber(1)
  }
  const moveColumn = (targetKey: TransactionColumnKey) => {
    if (!draggedColumn || draggedColumn === targetKey) return
    setColumnOrder((current) => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(targetKey)
      if (from < 0 || to < 0) return current
      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }
  const valueFor = (transaction: TransactionRecord, key: TransactionColumnKey) => {
    const value = transaction[key]
    if (key === 'amount') return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return String(value || '—')
  }

  return <div className="page-enter min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex min-h-[58px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"><CreditCard className="h-4 w-4" /></span>
        <h2 className="truncate text-sm font-semibold text-slate-900">Transactions</h2>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">{filtered.length}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Table settings" title="Show or hide columns" onClick={() => setSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /></Button>
          {settingsOpen ? <div className="absolute right-0 top-10 z-30 w-[min(310px,calc(100vw-2.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="text-xs font-semibold text-slate-900">Table settings</p><p className="mt-1 text-[10px] text-slate-500">Choose the columns to show.</p></div><button type="button" onClick={() => setVisibleColumns(TRANSACTION_COLUMNS.map((column) => column.key))} className="text-[10px] font-semibold text-slate-600 hover:text-slate-950">Show all</button></div>
            <div className="admin-scrollbar grid max-h-[320px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto py-1">
              {TRANSACTION_COLUMNS.map((column) => <label key={column.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900" /><span className="truncate" title={column.label}>{column.label}</span></label>)}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag column headings to reorder them.</div>
          </div> : null}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Reset table" title="Reset table layout and filters" onClick={resetView}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>

    <div className="table-holder">
      <div className="flex flex-col gap-2.5 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="relative w-full sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search transactions" value={query} onChange={(event) => { onQueryChange(event.target.value); setPageNumber(1) }} placeholder="Search transactions…" className="h-9 rounded-md border-slate-200 bg-white pl-9 text-xs placeholder:text-slate-400 focus:bg-white" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><Filter className="h-3.5 w-3.5" /><select aria-label="Filter by transaction type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPageNumber(1) }} className="max-w-[145px] bg-transparent text-xs text-slate-800 outline-none">{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><select aria-label="Filter by state" value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPageNumber(1) }} className="max-w-[125px] bg-transparent text-xs text-slate-800 outline-none">{['All states', 'Confirmed', 'Pending', 'Rejected'].map((state) => <option key={state}>{state}</option>)}</select></label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] text-slate-500"><CreditCard className="h-3.5 w-3.5" /><select aria-label="Filter by payment system" value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setPageNumber(1) }} className="max-w-[150px] bg-transparent text-xs text-slate-800 outline-none">{methodOptions.map((method) => <option key={method}>{method}</option>)}</select></label>
        </div>
      </div>

      <div className="admin-scrollbar overflow-auto bg-white" style={{ height: 'min(72vh, 900px)', minHeight: '400px' }} onClick={() => { if (settingsOpen) setSettingsOpen(false) }}>
        <table className="border-separate border-spacing-0 text-left" style={{ minWidth: tableWidth }}>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {shownColumns.map((column) => <th key={column.key} draggable onDragStart={() => setDraggedColumn(column.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(column.key)} onDragEnd={() => setDraggedColumn(null)} style={{ width: column.width, minWidth: column.width }} className={cn('group/th h-10 border-b border-r border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-600 last:border-r-0', draggedColumn === column.key && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover/th:opacity-100" />
                  <button type="button" onClick={() => sortBy(column.key)} className="inline-flex min-w-0 items-center gap-1.5 text-left hover:text-slate-950"><span className="truncate">{column.label}</span><span className="text-[9px] text-slate-300">{sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></button>
                </div>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((transaction, rowIndex) => <tr key={transaction.id} className={cn('group/row transition-colors hover:bg-slate-50', rowIndex % 2 === 1 && 'bg-slate-50/40')}>
              {shownColumns.map((column) => {
                const value = valueFor(transaction, column.key)
                const isAmount = column.key === 'amount'
                const isState = column.key === 'state'
                const isPlayerLogin = column.key === 'clientLogin'
                const isPlayerId = column.key === 'playerId'
                return <td key={column.key} style={{ width: column.width, minWidth: column.width }} className={cn('h-[43px] max-w-[240px] border-b border-slate-100 px-3 text-xs text-slate-600', isAmount && 'font-medium tabular-nums text-slate-950', isPlayerId && 'font-mono text-[11px]')}>
                  {isState ? <Badge variant={transaction.state === 'Confirmed' ? 'success' : transaction.state === 'Pending' ? 'warning' : 'danger'}><span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full bg-current', transaction.state === 'Pending' && 'animate-pulse')} />{transaction.state}</Badge>
                    : isPlayerId || isPlayerLogin ? <button type="button" onClick={() => { const player = users.find((user) => user.email === transaction.clientLogin || user.name === transaction.playerName); if (player) onSelectPlayer(player); else onNotify('No matching demo player was found.') }} className="max-w-[215px] truncate text-left text-slate-700 decoration-slate-300 underline-offset-2 hover:text-slate-950 hover:underline">{value}</button>
                      : <span title={value} className="block max-w-[240px] truncate" >{value}</span>}
                </td>
              })}
            </tr>)}
            {pageRows.length === 0 ? <tr><td colSpan={shownColumns.length} className="px-5 py-16 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Search className="h-4 w-4" /></div><p className="mt-3 text-sm font-medium text-slate-800">No transactions found</p><p className="mt-1 text-xs text-slate-500">Change your search or reset the table filters.</p><Button variant="outline" size="sm" className="mt-3" onClick={resetView}>Reset filters</Button></td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-slate-500">Showing <span className="font-medium text-slate-900">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-medium text-slate-900">{filtered.length}</span> transactions <span className="text-slate-400">· Demo data</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-slate-500">Rows per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1) }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-slate-400"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
          <span className="text-[11px] text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronRight className="h-3.5 w-3.5 rotate-180" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button></div>
        </div>
      </div>
    </div>
    <p className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">Transaction records are fictional preview data. No payment, wallet, or account operations are connected.</p>

    <Modal open={!!selectedTransaction} onOpenChange={(open) => { if (!open) setSelectedTransaction(null) }} title={selectedTransaction ? 'Transaction ' + selectedTransaction.id : 'Transaction details'} description={selectedTransaction ? selectedTransaction.type + ' · ' + selectedTransaction.playerName : undefined}>
      {selectedTransaction ? <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">{[
          ['Transaction ID', selectedTransaction.id], ['Player ID', selectedTransaction.playerId], ['Amount', selectedTransaction.amount + ' ' + selectedTransaction.currency], ['State', selectedTransaction.state], ['Created date', selectedTransaction.createdDate], ['Payment system', selectedTransaction.paymentSystem], ['External ID', selectedTransaction.externalId], ['Modified by', selectedTransaction.modifiedBy],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{value}</p></div>)}</div>
        <div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button></div>
      </div> : null}
    </Modal>
  </div>
}


type ReportColumn = { key: string; label: string; width: number }
type DetailedReportRow = { id: string; values: Record<string, string> }
type ReportTableConfig = {
  columns: ReportColumn[]
  rows: DetailedReportRow[]
  totals: Record<string, string>
  searchable: boolean
  sportFilter: boolean
  defaultSortKey?: string
  defaultSortDirection?: 'asc' | 'desc'
  hideRowDetails?: boolean
  showTotals?: boolean
  emptyState?: boolean
}
const makeReportRows = (columns: ReportColumn[], rows: { id: string; values: Record<string, string> }[]): DetailedReportRow[] =>
  rows.map((row) => ({ id: row.id, values: Object.fromEntries(columns.map((column) => [column.key, row.values[column.key] ?? '—'] as const)) }))

const BET_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'betId', label: 'Bet ID', width: 150 },
  { key: 'playerId', label: 'Player ID', width: 150 },
  { key: 'currency', label: 'Currency', width: 110 },
  { key: 'stake', label: 'Stake', width: 125 },
  { key: 'stakeUsd', label: 'Stake In (USD)', width: 145 },
  { key: 'odds', label: 'Odds', width: 110 },
  { key: 'winning', label: 'Winning', width: 125 },
  { key: 'winningUsd', label: 'Winning In (USD)', width: 155 },
  { key: 'type', label: 'Type', width: 125 },
  { key: 'state', label: 'State', width: 125 },
  { key: 'firstName', label: 'First Name', width: 130 },
  { key: 'lastName', label: 'Last Name', width: 130 },
  { key: 'username', label: 'Username', width: 180 },
  { key: 'externalId', label: 'External ID', width: 130 },
  { key: 'created', label: 'Created', width: 170 },
  { key: 'calcDate', label: 'Calc. Date', width: 155 },
  { key: 'source', label: 'Source', width: 115 },
  { key: 'playerCategory', label: 'Player Category', width: 145 },
  { key: 'isLive', label: 'Is Live', width: 100 },
  { key: 'isTest', label: 'Is Test', width: 100 },
  { key: 'bonusId', label: 'Bonus Id', width: 125 },
  { key: 'bonusAmount', label: 'Bonus', width: 115 },
  { key: 'bonusType', label: 'Bonus Type', width: 135 },
  { key: 'cashDeskName', label: 'CashDesk Name', width: 150 },
  { key: 'cashDeskInfo', label: 'Cashdesk Info', width: 145 },
  { key: 'betshopInfo', label: 'Betshop Info', width: 145 },
  { key: 'bonusBetAmount', label: 'Bonus Bet Amount', width: 155 },
  { key: 'bonusWinAmount', label: 'Bonus Win Amount', width: 155 },
  { key: 'systemMin', label: 'System Min', width: 120 },
  { key: 'betNumber', label: 'Bet Number', width: 130 },
  { key: 'paidDate', label: 'Paid Date', width: 160 },
  { key: 'paidCashDesk', label: 'Paid Cash Desk', width: 155 },
  { key: 'taxAmount', label: 'Tax Amount', width: 125 },
  { key: 'selectionCount', label: 'Selection Count', width: 145 },
  { key: 'freeBetAmount', label: 'Free Bet Amount', width: 145 },
  { key: 'clientCashDesk', label: 'Client Cashdesk', width: 155 },
  { key: 'barcode', label: 'Barcode', width: 125 },
  { key: 'betshopGroup', label: 'Betshop Group', width: 150 },
  { key: 'betshopName', label: 'Betshop Name', width: 150 },
  { key: 'ggrUsd', label: 'GGR (USD)', width: 125 },
  { key: 'eachWay', label: 'Each Way', width: 115 },
  { key: 'possibleWin', label: 'Possible Winning', width: 155 },
  { key: 'actualSportBonus', label: 'Actual Sport Bonus', width: 165 },
  { key: 'stakeTax', label: 'Stake Tax', width: 120 },
  { key: 'calculatedBy', label: 'Calculated By', width: 150 },
  { key: 'autoCashout', label: 'Auto Cashout', width: 145 },
  { key: 'cashoutDisabled', label: 'Cashout Disabled', width: 155 },
  { key: 'partialCashout', label: 'Partial Cashout', width: 150 },
  { key: 'remainingAmount', label: 'Remaining Amount', width: 160 },
  { key: 'remainingUsd', label: 'Remaining Amount In (USD)', width: 200 },
]
const BET_REPORT_ROWS = makeReportRows(BET_REPORT_COLUMNS, [
  { id: 'bet-6760318180', values: { betId: '6760318180', playerId: '500435780', currency: 'TND', stake: '5.00', stakeUsd: '$1.68', odds: '42.107', winning: '0.00', winningUsd: '$0.00', type: 'Multiple', state: 'Accepted', firstName: 'Alex', lastName: 'Morgan', username: 'alex.morgan', externalId: '—', created: '19-10-2026 14:28:31', calcDate: '—', source: 'Web', playerCategory: 'New User', isLive: 'Yes', isTest: 'No', bonusId: '—', bonusAmount: '0.00', bonusType: '—', bonusBetAmount: '0.00', bonusWinAmount: '0.00', taxAmount: '0.00', selectionCount: '3', freeBetAmount: '0.00', ggrUsd: '$1.68', eachWay: 'No', possibleWin: '$70.76', actualSportBonus: '$0.00', stakeTax: '0.00', autoCashout: 'No', cashoutDisabled: 'No', partialCashout: 'No', remainingAmount: '0.00', remainingUsd: '$0.00' } },
  { id: 'bet-6760318181', values: { betId: '6760318181', playerId: '500435781', currency: 'EUR', stake: '10.00', stakeUsd: '$10.85', odds: '2.450', winning: '24.50', winningUsd: '$26.59', type: 'Single', state: 'Won', firstName: 'Jordan', lastName: 'Taylor', username: 'jtaylor', created: '19-10-2026 13:47:12', source: 'Mobile', playerCategory: 'Regular', isLive: 'No', isTest: 'No', selectionCount: '1', possibleWin: '$26.59', ggrUsd: '-$15.74', autoCashout: 'No', cashoutDisabled: 'No', partialCashout: 'No' } },
  { id: 'bet-6760318182', values: { betId: '6760318182', playerId: '500435782', currency: 'USD', stake: '15.00', stakeUsd: '$15.00', odds: '1.850', winning: '0.00', winningUsd: '$0.00', type: 'Multiple', state: 'Lost', firstName: 'Casey', lastName: 'Reed', username: 'casey.reed', created: '19-10-2026 12:55:04', source: 'Web', playerCategory: 'VIP', isLive: 'Yes', isTest: 'No', selectionCount: '4', possibleWin: '$27.75', ggrUsd: '$15.00', eachWay: 'No', autoCashout: 'No', cashoutDisabled: 'No', partialCashout: 'No' } },
  { id: 'bet-6760318183', values: { betId: '6760318183', playerId: '500435783', currency: 'TND', stake: '8.00', stakeUsd: '$2.68', odds: '3.200', winning: '25.60', winningUsd: '$8.58', type: 'Single', state: 'Paid', firstName: 'Riley', lastName: 'Parker', username: 'riley.p', created: '19-10-2026 11:32:45', source: 'Retail', playerCategory: 'Regular', isLive: 'No', isTest: 'No', selectionCount: '1', possibleWin: '$8.58', ggrUsd: '-$5.90', paidDate: '19-10-2026 12:00:00', autoCashout: 'No', cashoutDisabled: 'No', partialCashout: 'No' } },
])

const SPORTS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'sport', label: 'Sport', width: 250 },
  { key: 'stakes', label: 'Stakes (USD)', width: 250 },
  { key: 'winnings', label: 'Winning (USD)', width: 250 },
  { key: 'profit', label: 'P/L (USD)', width: 250 },
  { key: 'profitability', label: 'Profitability %', width: 160 },
]
const SPORTS_REPORT_ROWS = makeReportRows(SPORTS_REPORT_COLUMNS, [
  { id: 'sport-football', values: { sport: 'Football', stakes: '$1.68', winnings: '$0.00', profit: '$1.68', profitability: '100%' } },
  { id: 'sport-basketball', values: { sport: 'Basketball', stakes: '$245.80', winnings: '$174.20', profit: '$71.60', profitability: '29.1%' } },
  { id: 'sport-tennis', values: { sport: 'Tennis', stakes: '$182.40', winnings: '$196.80', profit: '-$14.40', profitability: '-7.9%' } },
])
const COMPETITIONS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'sport', label: 'Sport', width: 170 },
  { key: 'region', label: 'Region', width: 170 },
  { key: 'competition', label: 'Competitions', width: 250 },
  { key: 'stakes', label: 'Stakes (USD)', width: 170 },
  { key: 'winnings', label: 'Winning (USD)', width: 170 },
  { key: 'profit', label: 'P/L (USD)', width: 160 },
  { key: 'profitability', label: 'Profitability %', width: 160 },
]
const COMPETITIONS_REPORT_ROWS = makeReportRows(COMPETITIONS_REPORT_COLUMNS, [
  { id: 'competition-ucl', values: { sport: 'Football', region: 'Europe', competition: 'UEFA Champions League', stakes: '$1.46', winnings: '$0.00', profit: '$1.46', profitability: '100%' } },
  { id: 'competition-greece', values: { sport: 'Football', region: 'Greece', competition: 'Super League 2', stakes: '$0.23', winnings: '$0.00', profit: '$0.23', profitability: '100%' } },
  { id: 'competition-nba', values: { sport: 'Basketball', region: 'North America', competition: 'NBA', stakes: '$245.80', winnings: '$174.20', profit: '$71.60', profitability: '29.1%' } },
  { id: 'competition-atp', values: { sport: 'Tennis', region: 'International', competition: 'ATP Tour', stakes: '$182.40', winnings: '$196.80', profit: '-$14.40', profitability: '-7.9%' } },
])
const MARKET_TYPES_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'sport', label: 'Sport', width: 170 },
  { key: 'marketType', label: 'Market Type', width: 230 },
  { key: 'betCount', label: 'Bet', width: 130 },
  { key: 'stakes', label: 'Stakes (USD)', width: 170 },
  { key: 'winnings', label: 'Winning (USD)', width: 170 },
  { key: 'profit', label: 'P/L (USD)', width: 160 },
  { key: 'profitability', label: 'Profitability %', width: 160 },
]
const MARKET_TYPES_REPORT_ROWS = makeReportRows(MARKET_TYPES_REPORT_COLUMNS, [
  { id: 'market-result', values: { sport: 'Football', marketType: 'Match Result', betCount: '3', stakes: '$1.68', winnings: '$0.00', profit: '$1.68', profitability: '100%' } },
  { id: 'market-over-under', values: { sport: 'Football', marketType: 'Over / Under', betCount: '18', stakes: '$84.25', winnings: '$63.90', profit: '$20.35', profitability: '24.2%' } },
  { id: 'market-handicap', values: { sport: 'Basketball', marketType: 'Asian Handicap', betCount: '24', stakes: '$245.80', winnings: '$174.20', profit: '$71.60', profitability: '29.1%' } },
  { id: 'market-winner', values: { sport: 'Tennis', marketType: 'Match Winner', betCount: '11', stakes: '$182.40', winnings: '$196.80', profit: '-$14.40', profitability: '-7.9%' } },
])


const reportColumns = (entries: [string, string, number][]): ReportColumn[] =>
  entries.map(([key, label, width]) => ({ key, label, width }))

const GAME_REPORT_COLUMNS = reportColumns([
  ['gameId', 'Game ID', 150], ['game', 'Game', 250], ['provider', 'Provider', 175], ['type', 'Type', 120],
  ['currency', 'Currency', 110], ['bet', 'Bet', 125], ['win', 'Win', 125], ['ggr', 'GGR', 125],
  ['winRake', 'Win Rake', 125], ['betRake', 'Bet Rake', 125], ['rake', 'Rake', 115], ['winningsCount', 'Winnings Count', 145],
  ['betUsd', 'Bet (USD)', 135], ['winUsd', 'Win In (USD)', 145], ['ggrUsd', 'GGR (USD)', 135],
  ['winRakeUsd', 'Win Rake (USD)', 155], ['betRakeUsd', 'Bet Rake (USD)', 155], ['rakeUsd', 'Rake (USD)', 135],
  ['round', 'Round', 110], ['playerCount', 'Player Count', 130], ['ticketAmount', 'Ticket Amount', 145],
  ['taxUsd', 'Tax Amount (USD)', 165], ['vatUsd', 'Vat (USD)', 130],
])
const GAME_REPORT_ROWS = makeReportRows(GAME_REPORT_COLUMNS, [
  { id: 'game-500008372', values: { gameId: '500008372', game: 'Gates of Olympus Super Scatter', provider: 'Pragmatic Play', type: 'Slots', currency: 'TND', bet: '26.40', win: '5.65', ggr: '20.75', winRake: '0', betRake: '0', rake: '0', winningsCount: '8', betUsd: '$8.83', winUsd: '$1.89', ggrUsd: '$6.94', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', round: '52', playerCount: '1', ticketAmount: '0', taxUsd: '$0.00', vatUsd: '$0.00' } },
  { id: 'game-3510047', values: { gameId: '3510047', game: 'Madame Destiny Megaways', provider: 'Pragmatic Play', type: 'Slots', currency: 'TND', bet: '1.00', win: '0.18', ggr: '0.82', winRake: '0', betRake: '0', rake: '0', winningsCount: '2', betUsd: '$0.33', winUsd: '$0.06', ggrUsd: '$0.27', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', round: '5', playerCount: '1', ticketAmount: '0', taxUsd: '$0.00', vatUsd: '$0.00' } },
  { id: 'game-3300891', values: { gameId: '3300891', game: '5 Lions Gold', provider: 'Pragmatic Play', type: 'Slots', currency: 'TND', bet: '2.16', win: '0.36', ggr: '1.80', winRake: '0', betRake: '0', rake: '0', winningsCount: '3', betUsd: '$0.72', winUsd: '$0.12', ggrUsd: '$0.60', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', round: '6', playerCount: '1', ticketAmount: '0', taxUsd: '$0.00', vatUsd: '$0.00' } },
])

const PARTNER_REPORT_COLUMNS = reportColumns([
  ['currency', 'Currency', 150], ['bet', 'Bet', 150], ['win', 'Win', 150], ['ggr', 'GGR', 150],
  ['winRake', 'Win Rake', 150], ['betRake', 'Bet Rake', 150], ['rake', 'Rake', 150], ['bank', 'Bank', 150],
  ['tip', 'Tip', 150], ['bonus', 'Bonus', 150], ['tax', 'Tax Amount', 150], ['round', 'Round', 150],
  ['taxUsd', 'Tax Amount In RC (USD)', 185], ['betUsd', 'Bet (USD)', 150], ['winUsd', 'Win (USD)', 150],
  ['ggrUsd', 'GGR (USD)', 150], ['winRakeUsd', 'Win Rake (USD)', 165], ['betRakeUsd', 'Bet Rake (USD)', 165],
  ['rakeUsd', 'Rake (USD)', 150], ['bankUsd', 'Bank (USD)', 150], ['tipUsd', 'Tip (USD)', 150],
  ['bonusUsd', 'Bonus (USD)', 150], ['ticketAmount', 'Ticket Amount', 150],
])
const PARTNER_REPORT_ROWS = makeReportRows(PARTNER_REPORT_COLUMNS, [
  { id: 'partner-demo-tnd', values: { currency: 'TND', bet: '29.56', win: '6.19', ggr: '23.37', winRake: '0', betRake: '0', rake: '0', bank: '0', tip: '0', bonus: '0', tax: '0', round: '63', taxUsd: '$0.00', betUsd: '$9.88', winUsd: '$2.07', ggrUsd: '$7.81', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', bankUsd: '$0.00', tipUsd: '$0.00', bonusUsd: '$0.00', ticketAmount: '0' } },
])

const PROVIDER_REPORT_COLUMNS = reportColumns([
  ['provider', 'Provider', 190], ['currency', 'Currency', 150], ['bet', 'Bet', 150], ['win', 'Win', 150],
  ['ggr', 'GGR', 150], ['winRake', 'Win Rake', 150], ['betRake', 'Bet Rake', 150], ['rake', 'Rake', 150],
  ['betUsd', 'Bet (USD)', 150], ['winUsd', 'Win (USD)', 150], ['ggrUsd', 'GGR (USD)', 150],
  ['winRakeUsd', 'Win Rake (USD)', 165], ['betRakeUsd', 'Bet Rake (USD)', 165], ['rakeUsd', 'Rake (USD)', 150],
  ['round', 'Round', 150], ['ticketAmount', 'Ticket Amount', 150],
])
const PROVIDER_REPORT_ROWS = makeReportRows(PROVIDER_REPORT_COLUMNS, [
  { id: 'provider-pragmatic-demo', values: { provider: 'Pragmatic Play', currency: 'TND', bet: '29.56', win: '6.19', ggr: '23.37', winRake: '0', betRake: '0', rake: '0', betUsd: '$9.88', winUsd: '$2.07', ggrUsd: '$7.81', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', round: '63', ticketAmount: '0' } },
])

const PLAYER_REPORT_COLUMNS = reportColumns([
  ['playerId', 'Player ID', 150], ['name', 'Name', 180], ['externalId', 'External ID', 150], ['currency', 'Currency', 120],
  ['bet', 'Bet', 130], ['win', 'Win', 130], ['ggr', 'GGR', 130], ['winRake', 'Win Rake', 130],
  ['betRake', 'Bet Rake', 130], ['rake', 'Rake', 120], ['tip', 'Tip', 120], ['bonus', 'Bonus', 120],
  ['betUsd', 'Bet (USD)', 130], ['winUsd', 'Win (USD)', 130], ['ggrUsd', 'GGR (USD)', 130],
  ['winRakeUsd', 'Win Rake (USD)', 155], ['betRakeUsd', 'Bet Rake (USD)', 155], ['rakeUsd', 'Rake (USD)', 130],
  ['tipUsd', 'Tip (USD)', 130], ['bonusUsd', 'Bonus (USD)', 130], ['username', 'Username', 180], ['ticketAmount', 'Ticket Amount', 150],
])
const PLAYER_REPORT_ROWS = makeReportRows(PLAYER_REPORT_COLUMNS, [
  { id: 'player-demo-500100101', values: { playerId: '500100101', name: 'Alex Morgan', externalId: 'DEMO-EXT-001', currency: 'TND', bet: '3.16', win: '0.54', ggr: '2.62', winRake: '0', betRake: '0', rake: '0', tip: '0', bonus: '0', betUsd: '$1.06', winUsd: '$0.18', ggrUsd: '$0.88', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', tipUsd: '$0.00', bonusUsd: '$0.00', username: 'alex.demo', ticketAmount: '0' } },
  { id: 'player-demo-500100102', values: { playerId: '500100102', name: 'Jordan Taylor', externalId: 'DEMO-EXT-002', currency: 'TND', bet: '26.40', win: '5.65', ggr: '20.75', winRake: '0', betRake: '0', rake: '0', tip: '0', bonus: '0', betUsd: '$8.83', winUsd: '$1.89', ggrUsd: '$6.94', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', tipUsd: '$0.00', bonusUsd: '$0.00', username: 'jordan.demo', ticketAmount: '0' } },
])

const PAYMENTS_REPORT_COLUMNS = reportColumns([
  ['paymentType', 'Payment Type', 170], ['accountId', 'Account ID', 150], ['currencyId', 'Currency Id', 140],
  ['openingBalance', 'Opening Balance', 165], ['openingBalanceUsd', 'Opening Balance (USD)', 190],
  ['debit', 'Debit', 140], ['debitUsd', 'Debit (USD)', 140], ['credit', 'Credit', 140],
  ['creditUsd', 'Credit (USD)', 140], ['closingBalance', 'Closing Balance', 165], ['closingBalanceUsd', 'Closing Balance (USD)', 190],
])

const ACCOUNT_BALANCE_COLUMNS = reportColumns([
  ['balanceTypeId', 'Balance Type Id', 150], ['balanceTypeName', 'Balance Type Name', 220],
  ['currencyId', 'Currency Id', 150], ['openingBalance', 'Opening Balance', 165],
  ['debit', 'Debit', 150], ['credit', 'Credit', 150], ['closingBalance', 'Closing Balance', 165],
])
const ACCOUNT_BALANCE_ROWS = makeReportRows(ACCOUNT_BALANCE_COLUMNS, [
  { id: 'account-balance-client', values: { balanceTypeId: '5211', balanceTypeName: 'Client Balance', currencyId: 'TND', openingBalance: '0', debit: '50.56', credit: '96.31', closingBalance: '45.75' } },
  { id: 'account-balance-corrections', values: { balanceTypeId: '7141', balanceTypeName: 'Expense From Corrections', currencyId: 'TND', openingBalance: '0', debit: '68', credit: '0', closingBalance: '68' } },
])

const BALANCE_REPORT_COLUMNS = reportColumns([
  ['clientId', 'Client ID', 150], ['clientName', 'Client Name', 180], ['currencyId', 'Currency Id', 150],
  ['promoCode', 'Promo Code', 150], ['loyaltyLevel', 'Loyalty Level', 150], ['startBalance', 'Start Balance', 150],
  ['deposit', 'Deposit', 150], ['withdrawals', 'Withdrawals', 150], ['correctionUp', 'Correction +', 150],
  ['correctionDown', 'Correction -', 150], ['bonusCorrectionUp', 'Bonus Correction +', 180],
  ['bonusCorrectionDown', 'Bonus Correction -', 180], ['buddyDeposit', 'Buddy Deposit', 150],
  ['buddyWithdrawal', 'Buddy Withdrawal', 175], ['sportBets', 'Sport Bets', 150],
  ['sportsbookPaidBonus', 'SportsBook Paid Bonus', 190], ['sportsWin', 'Sports Win', 150],
  ['sportReturn', 'Sport Return', 150], ['sportBonusBet', 'Sport Bonus Bet Amount', 190],
  ['sportBonusWin', 'Sport Bonus Win', 170], ['casinoBonusBet', 'Casino Bonus Bet Amount', 190],
  ['casinoBonusWin', 'Casino Bonus Win', 170], ['casinoBets', 'Casino Bets', 150],
  ['casinoWinAmount', 'Casino Win Amount', 175], ['casinoPaidBonus', 'Casino Paid Bonus', 175],
  ['exchangedMoney', 'Exchanged Money', 170], ['pointEarned', 'Point Earned', 150],
  ['exchangedPoints', 'Exchanged Points', 170], ['pointBalance', 'Point Balance', 150],
  ['endBalance', 'End Balance', 150], ['ggr', 'GGR', 150], ['status', 'Status', 130],
  ['sportDecreaseWin', 'Sport Decrease Win Amount', 190],
])
const BALANCE_REPORT_ROWS = makeReportRows(BALANCE_REPORT_COLUMNS, [
  { id: 'balance-report-demo-client', values: {
    clientId: '500100101', clientName: 'Alex Morgan', currencyId: 'TND', promoCode: 'DEMO1', loyaltyLevel: '—',
    startBalance: '0', deposit: '0', withdrawals: '0', correctionUp: '17', correctionDown: '0',
    bonusCorrectionUp: '0', bonusCorrectionDown: '0', buddyDeposit: '0', buddyWithdrawal: '0',
    sportBets: '5', sportsbookPaidBonus: '0', sportsWin: '0', sportReturn: '0',
    sportBonusBet: '0', sportBonusWin: '0', casinoBonusBet: '0', casinoBonusWin: '0',
    casinoBets: '0', casinoWinAmount: '0', casinoPaidBonus: '0', exchangedMoney: '0',
    pointEarned: '0', exchangedPoints: '0', pointBalance: '0', endBalance: '12',
    ggr: '5', status: 'Temporary', sportDecreaseWin: '0',
  } },
])

function getReportTableConfig(title: string): ReportTableConfig | null {
  if (title === 'Bets Report') return {
    columns: BET_REPORT_COLUMNS, rows: BET_REPORT_ROWS,
    totals: { betId: 'Total', stakeUsd: '$30.21', winningUsd: '$35.17', bonusAmount: '0.00', bonusBetAmount: '0.00', bonusWinAmount: '0.00', taxAmount: '0.00', selectionCount: '9', freeBetAmount: '0.00', ggrUsd: '-$4.96', possibleWin: '$133.68', actualSportBonus: '$0.00', stakeTax: '0.00', remainingAmount: '0.00', remainingUsd: '$0.00' },
    searchable: false, sportFilter: false, defaultSortKey: 'betId', defaultSortDirection: 'desc',
  }
  if (title === 'Sports Report') return {
    columns: SPORTS_REPORT_COLUMNS, rows: SPORTS_REPORT_ROWS,
    totals: { sport: 'Total', stakes: '$429.88', winnings: '$371.00', profit: '$58.88', profitability: '13.7%' },
    searchable: true, sportFilter: false,
  }
  if (title === 'Competitions Report') return {
    columns: COMPETITIONS_REPORT_COLUMNS, rows: COMPETITIONS_REPORT_ROWS,
    totals: { sport: 'Total', stakes: '$429.89', winnings: '$371.00', profit: '$58.89', profitability: '13.7%' },
    searchable: true, sportFilter: true,
  }
  if (title === 'Market Types Report') return {
    columns: MARKET_TYPES_REPORT_COLUMNS, rows: MARKET_TYPES_REPORT_ROWS,
    totals: { sport: 'Total', betCount: '56', stakes: '$514.13', winnings: '$434.90', profit: '$79.23', profitability: '15.4%' },
    searchable: true, sportFilter: true,
  }
  if (title === 'Report By Game') return {
    columns: GAME_REPORT_COLUMNS, rows: GAME_REPORT_ROWS,
    totals: { gameId: 'Total', winningsCount: '13', betUsd: '$9.88', winUsd: '$2.07', ggrUsd: '$7.81', round: '63', taxUsd: '$0.00', vatUsd: '$0.00' },
    searchable: true, sportFilter: false, hideRowDetails: true, defaultSortKey: 'gameId', defaultSortDirection: 'desc',
  }
  if (title === 'Report By Partner') return {
    columns: PARTNER_REPORT_COLUMNS, rows: PARTNER_REPORT_ROWS,
    totals: { currency: 'Total', round: '63', taxUsd: '$0.00', betUsd: '$9.88', winUsd: '$2.07', ggrUsd: '$7.81', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', bankUsd: '$0.00', tipUsd: '$0.00', bonusUsd: '$0.00' },
    searchable: true, sportFilter: false, hideRowDetails: true, defaultSortKey: 'betUsd', defaultSortDirection: 'desc',
  }
  if (title === 'Report By Provider') return {
    columns: PROVIDER_REPORT_COLUMNS, rows: PROVIDER_REPORT_ROWS,
    totals: { provider: 'Total', betUsd: '$9.88', winUsd: '$2.07', ggrUsd: '$7.81', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', round: '63' },
    searchable: true, sportFilter: false, hideRowDetails: true, defaultSortKey: 'provider', defaultSortDirection: 'desc',
  }
  if (title === 'Report By Player') return {
    columns: PLAYER_REPORT_COLUMNS, rows: PLAYER_REPORT_ROWS,
    totals: { playerId: 'Total', betUsd: '$9.89', winUsd: '$2.07', ggrUsd: '$7.82', winRakeUsd: '$0.00', betRakeUsd: '$0.00', rakeUsd: '$0.00', tipUsd: '$0.00', bonusUsd: '$0.00', ticketAmount: '0' },
    searchable: true, sportFilter: false, hideRowDetails: true, defaultSortKey: 'playerId', defaultSortDirection: 'desc',
  }
  if (title === 'Payments Report') return {
    columns: PAYMENTS_REPORT_COLUMNS, rows: [],
    totals: {}, searchable: true, sportFilter: false, hideRowDetails: true, showTotals: false, emptyState: true,
  }
  if (title === 'Account Balance') return {
    columns: ACCOUNT_BALANCE_COLUMNS, rows: ACCOUNT_BALANCE_ROWS,
    totals: {}, searchable: true, sportFilter: false, showTotals: false, defaultSortKey: 'balanceTypeId', defaultSortDirection: 'asc',
  }
  if (title === 'Balance Report') return {
    columns: BALANCE_REPORT_COLUMNS, rows: BALANCE_REPORT_ROWS,
    totals: { clientId: 'Total', correctionUp: '17', sportBets: '5', endBalance: '12', ggr: '5' },
    searchable: false, sportFilter: false, hideRowDetails: true, defaultSortKey: 'clientId', defaultSortDirection: 'desc',
  }
  return null
}

function ReportDataTable({ title }: { title: string }) {
  const config = getReportTableConfig(title)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('All sports')
  const [columnOrder, setColumnOrder] = useState<string[]>(() => (config?.columns ?? []).map((column) => column.key))
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => (config?.columns ?? []).map((column) => column.key))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(config?.defaultSortKey ?? null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(config?.defaultSortDirection ?? 'asc')
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [pageSize, setPageSize] = useState(20)
  const [pageNumber, setPageNumber] = useState(1)

  if (!config) return null
  const orderedColumns = columnOrder.map((key) => config.columns.find((column) => column.key === key)).filter((column): column is ReportColumn => Boolean(column))
  const shownColumns = orderedColumns.filter((column) => visibleColumns.includes(column.key))
  const filteredRows = config.rows.filter((row) => {
    const matchesSearch = !config.searchable || Object.values(row.values).join(' ').toLowerCase().includes(search.toLowerCase())
    const matchesSport = !config.sportFilter || sportFilter === 'All sports' || row.values.sport === sportFilter
    return matchesSearch && matchesSport
  })
  const sortedRows = [...filteredRows].sort((left, right) => {
    if (!sortKey) return 0
    const a = left.values[sortKey] ?? ''
    const b = right.values[sortKey] ?? ''
    const numericA = Number(a.replace(/[$,%\s,]/g, ''))
    const numericB = Number(b.replace(/[$,%\s,]/g, ''))
    const numeric = a !== '' && b !== '' && !Number.isNaN(numericA) && !Number.isNaN(numericB)
    const compare = numeric ? numericA - numericB : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    return sortDirection === 'asc' ? compare : -compare
  })
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(pageNumber, totalPages)
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const tableWidth = shownColumns.reduce((total, column) => total + column.width, 0)
  const hasDetailsColumn = !config.hideRowDetails
  const resetTable = () => {
    setSearch('')
    setSportFilter('All sports')
    setColumnOrder(config.columns.map((column) => column.key))
    setVisibleColumns(config.columns.map((column) => column.key))
    setSortKey(config.defaultSortKey ?? null)
    setSortDirection(config.defaultSortDirection ?? 'asc')
    setExpandedRows([])
    setPageNumber(1)
    setPageSize(20)
    setDraggedColumn(null)
    setSettingsOpen(false)
  }
  const sortBy = (key: string) => {
    if (sortKey === key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
    setPageNumber(1)
  }
  const moveColumn = (targetKey: string) => {
    if (!draggedColumn || draggedColumn === targetKey) return
    setColumnOrder((current) => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(targetKey)
      if (from < 0 || to < 0) return current
      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)
      return next
    })
    setDraggedColumn(null)
  }
  const exportCsv = () => {
    const csvCell = (value: string) => '"' + value.replace(/"/g, '""') + '"'
    const csv = [shownColumns.map((column) => csvCell(column.label)).join(','), ...sortedRows.map((row) => shownColumns.map((column) => csvCell(row.values[column.key] ?? '—')).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  const toggleExpanded = (id: string) => setExpandedRows((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
    <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <h2 className="min-w-0 truncate text-sm font-semibold text-slate-900">{title}</h2>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Report table settings" title="Table settings" onClick={() => setSettingsOpen((open) => !open)}><Settings className="h-4 w-4" /></Button>
          {settingsOpen ? <div className="absolute right-0 top-9 z-30 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div><p className="text-xs font-semibold text-slate-900">Table settings</p><p className="mt-1 text-[10px] text-slate-500">Choose which columns are visible.</p></div>
              <button type="button" onClick={() => setVisibleColumns(config.columns.map((column) => column.key))} className="text-[10px] font-semibold text-slate-600 hover:text-slate-950">Show all</button>
            </div>
            <div className="admin-scrollbar grid max-h-[300px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto py-1">
              {config.columns.map((column) => <label key={column.key} className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-slate-900" /><span className="truncate" title={column.label}>{column.label}</span></label>)}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag column headings to change their order.</div>
          </div> : null}
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md px-2.5 text-xs" onClick={exportCsv} disabled={config.rows.length === 0}><Download className="h-3.5 w-3.5" /> Export</Button>
        <div className="h-5 w-px bg-slate-200" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Reset report" title="Reset report table" onClick={resetTable}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>

    {config.searchable || config.sportFilter ? <div className="flex flex-col gap-2.5 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      {config.searchable ? <div className="relative w-full sm:max-w-[320px]">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input aria-label={'Search ' + title} value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1) }} placeholder="Search" className="h-9 rounded-md border-slate-200 bg-white pl-9 text-xs placeholder:text-slate-400 focus:bg-white" />
      </div> : <span className="text-[11px] text-slate-400">All bets</span>}
      {config.sportFilter ? <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[11px] text-slate-500"><span>Sport</span><select aria-label="Filter by sport" value={sportFilter} onChange={(event) => { setSportFilter(event.target.value); setPageNumber(1) }} className="bg-transparent text-xs text-slate-800 outline-none">{['All sports', ...Array.from(new Set(config.rows.map((row) => row.values.sport).filter(Boolean)))].map((sport) => <option key={sport}>{sport}</option>)}</select></label> : null}
    </div> : null}

    <div className="admin-scrollbar max-h-[min(62vh,620px)] min-h-[220px] w-full overflow-auto bg-white">
      {shownColumns.length > 0 ? <table className="border-separate border-spacing-0 text-left" style={{ width: tableWidth + (hasDetailsColumn ? 42 : 0), minWidth: tableWidth + (hasDetailsColumn ? 42 : 0), tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            {hasDetailsColumn ? <th className="sticky left-0 z-20 w-[42px] min-w-[42px] border-b border-slate-200 bg-white px-2" aria-label="Details" /> : null}
            {shownColumns.map((column) => <th key={column.key} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', column.key); event.dataTransfer.effectAllowed = 'move'; setDraggedColumn(column.key) }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => { event.preventDefault(); const key = event.dataTransfer.getData('text/plain') || draggedColumn; if (key) { setDraggedColumn(key); moveColumn(column.key) } }} onDragEnd={() => setDraggedColumn(null)} style={{ width: column.width, minWidth: column.width }} className={cn('group/report-th box-border h-10 overflow-hidden border-b border-r border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 last:border-r-0', draggedColumn === column.key && 'opacity-40')}>
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover/report-th:opacity-100" />
                <button type="button" onClick={() => sortBy(column.key)} className="inline-flex min-w-0 items-center gap-1.5 text-left hover:text-slate-950"><span className="truncate">{column.label}</span><span className="text-[9px] text-slate-300">{sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></button>
              </div>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, rowIndex) => <Fragment key={row.id}>
            <tr className={cn('group/report-row transition-colors hover:bg-slate-50', rowIndex % 2 === 1 && 'bg-slate-50/40')}>
              {hasDetailsColumn ? <td className="sticky left-0 z-[1] border-b border-slate-100 bg-inherit px-2 py-2 text-center">
                <button type="button" aria-label={(expandedRows.includes(row.id) ? 'Hide' : 'Show') + ' details for row'} onClick={() => toggleExpanded(row.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"><ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expandedRows.includes(row.id) && 'rotate-90')} /></button>
              </td> : null}
              {shownColumns.map((column, columnIndex) => {
                const value = row.values[column.key] ?? '—'
                const numeric = /amount|stake|winning|profit|ggr|odds|selection|count|tax|remaining|bonus|bet|win|rake|round|player|ticket|bank|tip|debit|credit|balance/i.test(column.key)
                const status = column.key === 'state'
                return <td key={column.key} style={{ width: column.width, minWidth: column.width }} className={cn('box-border h-[43px] overflow-hidden border-b border-slate-100 px-3 text-xs', status ? 'text-slate-700' : numeric ? 'text-right tabular-nums text-slate-600' : 'text-slate-600', columnIndex === 0 && 'font-medium text-slate-800')} title={value}>
                  {status ? <Badge variant={value === 'Won' || value === 'Paid' ? 'success' : value === 'Lost' ? 'warning' : 'outline'}>{value}</Badge> : <span className="block truncate">{value}</span>}
                </td>
              })}
            </tr>
            {hasDetailsColumn && expandedRows.includes(row.id) ? <tr className="bg-slate-50/80"><td colSpan={shownColumns.length + 1} className="border-b border-slate-200 px-4 py-3"><div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">{shownColumns.slice(0, title === 'Bets Report' ? 8 : shownColumns.length).map((column) => <div key={column.key} className="min-w-0"><p className="text-[10px] font-medium text-slate-400">{column.label}</p><p className="mt-1 truncate text-xs font-medium text-slate-700">{row.values[column.key] ?? '—'}</p></div>)}</div></td></tr> : null}
          </Fragment>)}
          {pageRows.length === 0 ? <tr><td colSpan={shownColumns.length + (hasDetailsColumn ? 1 : 0)} className="border-b border-slate-100 px-4 py-12 text-center text-xs text-slate-400">{config.emptyState ? <div className="flex flex-col items-center justify-center gap-2.5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300"><FileText className="h-5 w-5" /></span><span className="font-medium text-slate-500">No Result</span></div> : 'No matching records.'}</td></tr> : null}
        </tbody>
        {config.showTotals !== false ? <tfoot><tr className="sticky bottom-0 z-[2] bg-slate-50">
          {hasDetailsColumn ? <td className="sticky left-0 z-[3] border-t border-slate-200 bg-slate-50 px-2 py-3" /> : null}
          {shownColumns.map((column) => <td key={column.key} style={{ width: column.width, minWidth: column.width }} className="border-t border-slate-200 px-3 py-3 text-xs font-semibold tabular-nums text-slate-700"><span className="block truncate" title={config.totals[column.key] ?? ''}>{config.totals[column.key] ?? ''}</span></td>)}
        </tr></tfoot> : null}
      </table> : <div className="flex min-h-52 items-center justify-center px-4 text-center text-xs text-slate-400">Choose at least one column in table settings to display the report.</div>}
    </div>

    {!config.emptyState ? <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex items-center gap-2">
        <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPageNumber(1) }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-600"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select>
        <span>{sortedRows.length === 0 ? '0' : (currentPage - 1) * pageSize + 1 + '–' + Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronRight className="h-3.5 w-3.5 rotate-180" /></Button>
        <span className="min-w-8 text-center tabular-nums">{currentPage} / {totalPages}</span>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div> : null}

  </section>
}

function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<{
    group: string
    report: { title: string; description: string; icon: LucideIcon }
  } | null>(null)

  const reportGroups: {
    title: string
    description: string
    icon: LucideIcon
    reports: { title: string; description: string; icon: LucideIcon }[]
  }[] = [
    {
      title: 'Sportsbook Reports',
      description: 'Betting activity, sports performance and market analysis.',
      icon: Trophy,
      reports: [
        { title: 'Bets Report', description: 'Review bets, stakes, outcomes and settlement status.', icon: Activity },
        { title: 'Sports Report', description: 'Explore sportsbook performance by sport and event.', icon: Globe },
        { title: 'Competitions Report', description: 'Analyze betting activity across competitions.', icon: Trophy },
        { title: 'Market Types Report', description: 'Compare activity and results by market type.', icon: LayoutGrid },
      ],
    },
    {
      title: 'Casino Reports',
      description: 'Casino performance organized by game, partner, provider and player.',
      icon: Gamepad2,
      reports: [
        { title: 'Report By Game', description: 'Review rounds, stakes and results for each game.', icon: Gamepad2 },
        { title: 'Report By Partner', description: 'Compare casino performance across partners.', icon: Globe },
        { title: 'Report By Provider', description: 'Review game activity and results by provider.', icon: Layers },
        { title: 'Report By Player', description: 'Explore player-level casino activity.', icon: Users },
      ],
    },
    {
      title: 'Financial Reports',
      description: 'Payments, account balances and balance movements.',
      icon: CircleDollarSign,
      reports: [
        { title: 'Payments Report', description: 'Review payment activity and transaction outcomes.', icon: CreditCard },
        { title: 'Account Balance', description: 'View account and wallet balance snapshots.', icon: Wallet },
        { title: 'Balance Report', description: 'Review balance movements and reconciliation.', icon: CircleDollarSign },
      ],
    },
  ]

  if (selectedReport) {
    const ReportIcon = selectedReport.report.icon
    const supportsDataTable = ['Bets Report', 'Sports Report', 'Competitions Report', 'Market Types Report', 'Report By Game', 'Report By Partner', 'Report By Provider', 'Report By Player', 'Payments Report', 'Account Balance', 'Balance Report'].includes(selectedReport.report.title)
    return <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => setSelectedReport(null)} className="font-medium text-slate-500 transition hover:text-slate-900">Reports &amp; analytics</button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-slate-500">{selectedReport.group}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="truncate font-semibold text-slate-900">{selectedReport.report.title}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReport(null)}><ArrowRight className="h-3.5 w-3.5 rotate-180" /> All reports</Button>
      </div>
      {supportsDataTable ? <ReportDataTable key={selectedReport.report.title} title={selectedReport.report.title} /> : <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600"><ReportIcon className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{selectedReport.group}</p><h1 className="mt-1 text-base font-semibold text-slate-900">{selectedReport.report.title}</h1><p className="mt-1 text-xs leading-5 text-slate-500">{selectedReport.report.description}</p></div>
        </div>
        <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400"><FileText className="h-5 w-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-slate-800">Report view</h2>
          <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-500">This report is listed in the reporting workspace. Its filters and report data will appear here when a reporting data source is connected.</p>
          <p className="mt-3 text-[10px] text-slate-400">Navigation preview · No production data connected</p>
          <Button type="button" variant="outline" size="sm" className="mt-5" onClick={() => setSelectedReport(null)}>Back to all reports</Button>
        </div>
      </section>}
    </div>
  }

  return <div className="page-enter space-y-5">
    <SectionHeading title="Reports & analytics" description="Browse reports by business area. Select a report to open it in this workspace." />
    <div className="space-y-4">
      {reportGroups.map((group) => {
        const GroupIcon = group.icon
        return <section key={group.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none">
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600"><GroupIcon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">{group.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{group.description}</p>
            </div>
            <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium tabular-nums text-slate-500">{group.reports.length} reports</span>
          </div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
            {group.reports.map((report) => {
              const ReportIcon = report.icon
              return <button key={report.title} type="button" onClick={() => setSelectedReport({ group: group.title, report })} className="group flex min-h-[100px] min-w-0 items-start gap-3 bg-white px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition group-hover:border-slate-300 group-hover:text-slate-800"><ReportIcon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{report.title}</span><span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{report.description}</span></span>
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
              </button>
            })}
          </div>
        </section>
      })}
    </div>
    <p className="text-[10px] text-slate-400">Report navigation is available in this preview. Live reporting data is not connected.</p>
  </div>
}

function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [twoFactor, setTwoFactor] = useState(true)
  const [compactTables, setCompactTables] = useState(false)
  return <div className="page-enter">
    <SectionHeading title="Workspace settings" description="The controls below are interaction previews and do not save to a server." actions={<Button onClick={() => notify('UI preview only — settings have not been saved.')}><Check className="h-4 w-4" /> Save preferences</Button>} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>General</CardTitle><CardDescription>Basic details about your workspace.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Workspace name</span><Input defaultValue="Bclick Admin" /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Default currency</span><select defaultValue="EUR" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>EUR</option><option>USD</option><option>TND</option><option>GBP</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Timezone</span><select defaultValue="Europe/Tunis" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="Europe/Tunis">Africa / Tunis (UTC+1)</option><option>UTC</option><option>Europe/London</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Language</span><select defaultValue="English" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>English</option><option>Français</option><option>العربية</option></select></label></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose which events the admin experience should highlight.</CardDescription></CardHeader><CardContent className="divide-y divide-slate-100">
          {[{ label: 'Email alerts', detail: 'Receive account and platform alerts by email.', value: emailAlerts, change: setEmailAlerts }, { label: 'Daily activity digest', detail: 'A summary of deposits, registrations, and campaigns.', value: true, change: () => {} }].map((item) => <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold text-slate-800">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div><button type="button" aria-pressed={item.value} onClick={() => item.change(!item.value)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', item.value ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', item.value ? 'left-[22px]' : 'left-0.5')} /></button></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Display</CardTitle><CardDescription>Personalize how information appears in tables.</CardDescription></CardHeader><CardContent><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-800">Compact tables</p><p className="mt-1 text-xs text-slate-500">Reduce row spacing for dense data views.</p></div><button type="button" aria-pressed={compactTables} onClick={() => setCompactTables(!compactTables)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', compactTables ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', compactTables ? 'left-[22px]' : 'left-0.5')} /></button></div></CardContent></Card>
      </div>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Security checklist</CardTitle><CardDescription>Recommended controls for a production admin.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">Two-factor authentication</p><p className="mt-1 text-[10px] text-slate-400">UI toggle only</p></div><button type="button" aria-pressed={twoFactor} onClick={() => setTwoFactor(!twoFactor)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', twoFactor ? 'bg-slate-900' : 'bg-slate-200')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', twoFactor ? 'left-[22px]' : 'left-0.5')} /></button></div>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-800">Role-based access</p><p className="mt-1 text-[10px] text-slate-400">Not configured in this prototype</p></div><Badge variant="warning">Planned</Badge></div>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-800">Audit log</p><p className="mt-1 text-[10px] text-slate-400">Sample activity only</p></div><Badge variant="secondary">Preview</Badge></div>
        </CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/60 shadow-none"><CardContent className="p-5"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-950">Prototype reminder</p><p className="mt-1.5 text-xs leading-5 text-amber-900/80">Authentication, permissions, persistence, and notification delivery have intentionally not been implemented.</p></div></div></CardContent></Card>
      </div>
    </div>
  </div>
}

function PlayerProfilePage({ user, onBack, onToggle, onNotify, onSave }: {
  user: UserRow
  onBack: () => void
  onToggle: () => void
  onNotify: (message: string) => void
  onSave: (id: string, patch: Partial<UserRow>) => void
}) {
  const [mainTab, setMainTab] = useState('General')
  const [detailTab, setDetailTab] = useState('Player Info')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)
  const [noteDraft, setNoteDraft] = useState('')
  const [notes, setNotes] = useState<{ text: string; date: string }[]>([
    { text: 'Demo profile created for UI review. No live player data is connected.', date: '19 Oct 2026 · 10:30' },
  ])
  const [messageDraft, setMessageDraft] = useState('')
  const [messages, setMessages] = useState<{ text: string; date: string; direction: 'out' | 'in' }[]>([
    { text: 'Welcome to Bclick. This is a sample message thread.', date: '18 Oct 2026 · 11:52', direction: 'in' },
  ])
  const details = (fields: { label: string; key?: string; value?: string; flag?: boolean }[]) => (
    <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map((field) => {
        const raw = field.value ?? (field.key ? playerCellValue(user, field.key) : '—')
        const empty = !raw || raw === '—'
        return <div key={field.label} className="min-w-0 border-b border-slate-100 px-1 py-3.5 last:border-b-0">
          <p className="text-[11px] font-medium text-slate-400">{field.label}</p>
          <div className="mt-1.5 break-words text-[13px] font-medium text-slate-800">
            {field.flag !== undefined
              ? <Badge variant={field.flag ? 'success' : 'outline'}>{field.flag ? 'Enabled' : 'Disabled'}</Badge>
              : <span className={empty ? 'text-slate-300' : ''}>{empty ? '—' : raw}</span>}
          </div>
        </div>
      })}
    </div>
  )
  const section = (title: string, fields: { label: string; key?: string; value?: string; flag?: boolean }[], description?: string) => (
    <section key={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      </div>
      <div className="px-4 sm:px-5">{details(fields)}</div>
    </section>
  )
  const mainTabs = ['General', 'Financial', 'Reports', 'Settings', 'Log history']
  const generalTabs = ['Player Info', 'Additional Info', 'Player Verification', 'Notes', 'Messages']
  const accountOpen = user.status === 'Active'
  const maskedIp = '•••.•••.•••.•••'

  return <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-center gap-2 text-xs">
            <button type="button" onClick={onBack} className="font-semibold text-slate-500 transition hover:text-slate-900">Players</button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="truncate font-semibold text-slate-900">{user.email}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Avatar name={user.name} size="lg" tone="bg-slate-100 text-slate-700" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <p className="mt-1 text-xs text-slate-500">Player ID <span className="font-mono text-slate-700">{user.id}</span><span className="mx-2 text-slate-300">·</span>{user.country}</p>
            </div>
            <StatusBadge status={user.status} />
            <Badge variant={user.tier === 'VIP' ? 'warning' : user.tier === 'Gold' ? 'info' : 'outline'}>{user.tier}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages') }}><FileText className="h-4 w-4" /> Message</Button>
          <Button variant="outline" onClick={() => { setMainTab('General'); setDetailTab('Messages'); onNotify('SMS preview opened in the Messages tab.') }}><Bell className="h-4 w-4" /> SMS</Button>
          <Button variant="outline" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /> Settings</Button>
        </div>
      </div>
      <div className="border-b border-slate-200 px-3 sm:px-5">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Player sections">
          {mainTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={mainTab === tab} onClick={() => setMainTab(tab)} className={cn('relative shrink-0 px-3 py-3.5 text-xs font-semibold transition sm:px-4', mainTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
            {tab}
            {mainTab === tab ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-slate-900 sm:inset-x-4" /> : null}
          </button>)}
        </div>
      </div>

      <div className="p-3 sm:p-5 lg:p-6">
        {mainTab === 'General' ? <div>
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-100 pb-1" role="tablist" aria-label="General player information">
            {generalTabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)} className={cn('shrink-0 rounded-md px-3 py-2 text-xs font-medium transition', detailTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>{tab}</button>)}
          </div>

          {detailTab === 'Player Info' ? <div className="space-y-4">
            <div className="mb-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-bold text-slate-900">Player Info</h2><p className="mt-1 text-xs text-slate-500">Personal, contact, financial, promotional and account details.</p></div>
              <div className="flex gap-2">
                <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((current) => !current)}><Pencil className="h-3.5 w-3.5" />{editMode ? 'Cancel edit' : 'Edit profile'}</Button>
                <Button size="icon" variant="outline" aria-label="Profile settings" onClick={() => setMainTab('Settings')}><Settings className="h-4 w-4" /></Button>
              </div>
            </div>
            {editMode ? <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault()
              const names = editName.trim()
              const email = editEmail.trim()
              if (!names || !email) {
                onNotify('Name and email are required in the profile preview.')
                return
              }
              onSave(user.id, { name: names, email })
              setEditMode(false)
            }}>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input value={editName} onChange={(event) => setEditName(event.target.value)} required /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email / login</span><Input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} required /></label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><Button type="submit"><Check className="h-4 w-4" /> Save demo changes</Button><p className="text-[11px] text-slate-500">Saved only in this browser preview state.</p></div>
            </form> : null}
            {section('Personal Info', [
              { label: 'First Name', key: 'firstName' }, { label: 'Middle Name', key: 'middleName' },
              { label: 'Last Name', key: 'lastName' }, { label: 'Birthday', key: 'birthday' },
              { label: 'Birth City', key: 'birthCity' }, { label: 'Birth Department', key: 'birthDepartment' },
              { label: 'Birth Name', value: '—' }, { label: 'Citizenship', value: user.country },
              { label: 'Gender', key: 'gender' }, { label: 'Personal ID', key: 'personalId' },
              { label: 'Document Number', key: 'documentNumber' }, { label: 'Document Expiration Date', value: '—' },
              { label: 'Document Issue Code', value: '—' }, { label: 'Document Issued By', key: 'documentIssuedBy' },
              { label: 'Document Issue Date', key: 'documentIssueDate' }, { label: 'Document Region', key: 'documentRegion' },
            ])}
            {section('Contact Info', [
              { label: 'Region', key: 'country' }, { label: 'Province', key: 'province' }, { label: 'Zip-Code', key: 'zipCode' },
              { label: 'City', key: 'city' }, { label: 'Address', key: 'address' }, { label: 'Additional Address', key: 'additionalAddress' },
              { label: 'Phone', key: 'phone' }, { label: 'Mobile', key: 'mobilePhone' },
              { label: 'Email', key: 'email' }, { label: 'Email is verified', value: playerCellValue(user, 'isVerified') },
              { label: 'Is Phone Verified', value: 'No' }, { label: 'Is Mobile Verified', value: 'No' },
            ])}
            {section('Financial Info', [
              { label: 'Bank Name', key: 'bankName' }, { label: 'IBAN', key: 'iban' },
              { label: 'SwiftCode', key: 'swiftCode' }, { label: 'Account Holder', key: 'accountHolder' },
            ])}
            {section('Promotional Info', [
              { label: 'Using Loyalty Program', value: user.tier !== 'Standard' ? 'Yes' : 'No' },
              { label: 'Loyalty Level', key: 'loyaltyLevel' }, { label: 'Loyalty Point', key: 'loyaltyPoints' },
              { label: 'Excluded From Bonuses', value: 'No' },
            ])}
            {section('Account Info', [
              { label: 'Player ID', key: 'id' }, { label: 'Username', key: 'login' },
              { label: 'External ID', key: 'externalId' }, { label: 'Account Status', value: accountOpen ? 'Open' : 'Locked' },
              { label: 'Verified', key: 'isVerified' }, { label: 'Verification Date', value: user.tier === 'Standard' ? '—' : '15 Oct 2026' },
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Date Registered', key: 'created' },
              { label: 'Balance', key: 'balance' }, { label: 'Is Casino Blocked', value: 'No' },
              { label: 'Is Sport Blocked', value: 'No' }, { label: 'Is RMT Blocked', value: 'No' },
              { label: 'State', value: accountOpen ? 'Open' : 'Locked' }, { label: 'Status', value: 'Offline' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Player Category', key: 'clientCategory' },
              { label: 'Exclusion Type', value: '—' }, { label: 'Excluded From', value: '—' },
              { label: 'Excluded Until', value: '—' }, { label: 'Language', key: 'language' },
              { label: 'Cashdesk', value: '—' }, { label: 'BTag', value: '—' },
              { label: 'Promo Code', key: 'promoCode' }, { label: 'Custom Player Category', key: 'customCategory' },
              { label: 'RFId', value: '—' }, { label: 'Title', key: 'title' },
              { label: 'QR code is applied', value: 'No' }, { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Two factor authentication', value: 'Disabled' },
              { label: 'Resident', key: 'isResident' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'AML Status', key: 'amlStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Parent Id', key: 'parentId' }, { label: 'Child Id', key: 'childId' },
              { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
            ])}
            {section('Social Preferences', [
              { label: 'Subscribed To Email', value: 'Yes' }, { label: 'Subscribed To Direct Email', value: 'Yes' },
              { label: 'Subscribed to push notifications', key: 'pushSubscription' }, { label: 'Subscribed To Sms', value: 'No' },
              { label: 'Subscribed to phone call', key: 'phoneCallSubscription' }, { label: 'Subscribed to Newsletter', key: 'newsletter' },
              { label: 'TC Version Acceptance Date', value: user.joined }, { label: 'Subscribed to internal message', key: 'internalMessages' },
              { label: 'Subscribe To Casino Email', value: 'Yes' }, { label: 'Subscribe To Casino Internal Message', value: 'Yes' },
              { label: 'Subscribe To Casino Newsletter', value: 'Yes' }, { label: 'Subscribe To Casino Phone Call', value: 'No' },
              { label: 'Subscribe To Casino Push Notification', value: 'Yes' }, { label: 'Subscribe To Casino SMS', value: 'No' },
              { label: 'Terms And Conditions Version', value: '1' },
            ])}
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-start">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div><p className="text-xs font-semibold text-amber-950">Prototype reminder</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Player details are generated from local demo records. Sensitive identifiers are masked and no live account system is connected.</p></div>
            </div>
          </div> : null}

          {detailTab === 'Additional Info' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Additional Info</h2><p className="mt-1 text-xs text-slate-500">Registration, device, affiliate, activity and compliance metadata.</p></div>
            {section('Registration & Activity', [
              { label: 'Registration Source', key: 'registrationSource' }, { label: 'Registration IP', value: maskedIp },
              { label: 'Client Category', key: 'clientCategory' }, { label: 'Last Login Date', key: 'lastLogin' },
              { label: 'Last Login IP', value: maskedIp }, { label: 'Sport Last Bet', key: 'lastSportBet' },
              { label: 'Gaming Last Bet', key: 'lastCasinoBet' }, { label: 'First Deposit Date', key: 'firstDepositDate' },
              { label: 'Last Deposit Date', key: 'lastDepositDate' }, { label: 'Cashdesk ID', key: 'cashDeskId' },
            ])}
            {section('Risk & Compliance', [
              { label: 'AML Status', key: 'amlStatus' }, { label: 'PEP Status', key: 'pepStatus' },
              { label: 'Income Source', key: 'incomeSource' }, { label: 'Is Test', value: 'No' },
              { label: 'Wrong Login Attempts', key: 'wrongLoginAttempts' }, { label: 'Last Wrong Login Date', key: 'lastWrongLogin' },
              { label: 'Wrong Login Block Time', key: 'wrongLoginBlock' }, { label: 'Resident', key: 'isResident' },
            ])}
            {section('Affiliation & Security', [
              { label: 'Partner', value: 'Bclick Demo Partner' }, { label: 'Partner Flag', key: 'partnerFlag' },
              { label: 'Affiliate ID', value: '—' }, { label: 'Promo Code', key: 'promoCode' },
              { label: 'Parent ID', key: 'parentId' }, { label: 'Child ID', key: 'childId' },
              { label: 'Two factor authentication', value: 'Disabled' }, { label: 'QR code is applied', value: 'No' },
            ])}
          </div> : null}

          {detailTab === 'Player Verification' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Player Verification</h2><p className="mt-1 text-xs text-slate-500">Identity and contact verification review.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Account verification</p><div className="mt-3 flex items-center gap-2"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Pending' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">Demo status derived from player tier.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Email verification</p><div className="mt-3"><Badge variant={user.tier === 'Standard' ? 'warning' : 'success'}>{user.tier === 'Standard' ? 'Unverified' : 'Verified'}</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No verification email is sent.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Phone verification</p><div className="mt-3"><Badge variant="outline">Not provided</Badge></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No phone number is stored in this demo record.</p></div>
            </div>
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Identity documents</h3></div>
              <div className="flex flex-col items-center px-5 py-10 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileText className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-slate-800">No documents in this preview</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Document upload, verification providers and approval workflows are not connected.</p><Button className="mt-4" variant="outline" onClick={() => onNotify('Document upload is not connected in this preview.')}><Plus className="h-4 w-4" /> Add document</Button></div>
            </section>
          </div> : null}

          {detailTab === 'Notes' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Notes</h2><p className="mt-1 text-xs text-slate-500">Internal player notes visible in this local preview only.</p></div>
            <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={(event) => {
              event.preventDefault()
              if (!noteDraft.trim()) return
              setNotes((current) => [{ text: noteDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }, ...current])
              setNoteDraft('')
              onNotify('Demo note added locally.')
            }}>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="player-note">Add a note</label>
              <textarea id="player-note" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Write an internal note about this player…" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              <div className="flex justify-end"><Button type="submit" disabled={!noteDraft.trim()}><Plus className="h-4 w-4" /> Add note</Button></div>
            </form>
            <div className="space-y-3">{notes.map((note, index) => <article key={note.date + index} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-800">Admin Demo</p><time className="text-[10px] text-slate-400">{note.date}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{note.text}</p></article>)}</div>
          </div> : null}

          {detailTab === 'Messages' ? <div className="space-y-4">
            <div><h2 className="text-base font-bold text-slate-900">Messages</h2><p className="mt-1 text-xs text-slate-500">Sample messages only. Nothing is sent to a real player.</p></div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              {messages.map((message, index) => <div key={message.date + index} className={cn('flex', message.direction === 'out' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[88%] rounded-xl px-4 py-3 sm:max-w-[75%]', message.direction === 'out' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800')}><p className="whitespace-pre-wrap text-sm leading-5">{message.text}</p><p className={cn('mt-2 text-[10px]', message.direction === 'out' ? 'text-slate-300' : 'text-slate-400')}>{message.direction === 'out' ? 'Admin Demo' : 'Player'} · {message.date}</p></div></div>)}
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
              event.preventDefault()
              if (!messageDraft.trim()) return
              setMessages((current) => [...current, { text: messageDraft.trim(), date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), direction: 'out' }])
              setMessageDraft('')
              onNotify('Demo message added locally. No message was delivered.')
            }}>
              <Input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a sample message…" aria-label="Message text" />
              <Button type="submit" disabled={!messageDraft.trim()}><ArrowRight className="h-4 w-4" /> Add message</Button>
            </form>
          </div> : null}
        </div> : null}

        {mainTab === 'Financial' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Financial Overview</h2><p className="mt-1 text-xs text-slate-500">Illustrative player wallet and transaction activity.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[{ label: 'Available balance', value: user.balance, icon: Wallet }, { label: 'Total deposits', value: '€1,245.00', icon: ArrowDownRight }, { label: 'Total withdrawals', value: '€320.00', icon: ArrowUpRight }, { label: 'Net deposits', value: '€925.00', icon: CircleDollarSign }].map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><Icon className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{metric.value}</p></div> })}
          </div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-white px-4 py-3.5"><h3 className="text-sm font-semibold text-slate-800">Recent transactions</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date', 'Transaction ID', 'Type', 'Method', 'Amount', 'Status'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:48', 'TR-104821', 'Deposit', 'Bank card', '+€120.00', 'Completed'],
              ['16 Oct 2026, 17:22', 'TR-104506', 'Withdrawal', 'Bank transfer', '−€60.00', 'Completed'],
              ['15 Oct 2026, 09:14', 'TR-104102', 'Deposit', 'Bank card', '+€250.00', 'Completed'],
              ['12 Oct 2026, 20:01', 'TR-103882', 'Bonus credit', 'Promotion', '+€15.00', 'Completed'],
            ].map((row) => <tr key={row[1]}>{row.map((cell, index) => <td key={index} className={cn('whitespace-nowrap px-4 py-3.5', index === 4 ? 'font-semibold text-slate-900' : 'text-slate-600')}>{index === 5 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">All amounts and transaction records are fabricated demonstration values.</p>
        </div> : null}

        {mainTab === 'Reports' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Player Reports</h2><p className="mt-1 text-xs text-slate-500">A compact view of sample activity for this player.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: 'Total sessions', value: '38', detail: 'Last 30 days' },
            { label: 'Sports bets', value: '124', detail: 'Demo count' },
            { label: 'Casino rounds', value: '286', detail: 'Demo count' },
            { label: 'Average session', value: '12m 40s', detail: 'Illustrative' },
          ].map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p><p className="mt-1 text-[10px] text-slate-400">{metric.detail}</p></div>)}</div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><h3 className="text-sm font-semibold text-slate-800">Activity summary</h3><div className="mt-5 space-y-4">{[{label:'Casino activity',value:72},{label:'Sportsbook activity',value:48},{label:'Login frequency',value:86},{label:'Promotion engagement',value:35}].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-600">{item.label}</span><span className="font-semibold tabular-nums text-slate-800">{item.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{width: item.value + '%'}} /></div></div>)}</div></section>
          <p className="text-[11px] text-slate-400">Analytics shown here are sample values and are not calculated from live events.</p>
        </div> : null}

        {mainTab === 'Settings' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Account Settings</h2><p className="mt-1 text-xs text-slate-500">Review access status and player-level restrictions.</p></div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="text-sm font-semibold text-slate-900">Player account</h3><p className="mt-1 text-xs text-slate-500">Changing this only updates the local mock record.</p><div className="mt-2"><StatusBadge status={user.status} /></div></div></div><Button variant={accountOpen ? 'destructive' : 'default'} onClick={onToggle}>{accountOpen ? <><Pause className="h-4 w-4" /> Lock account (demo)</> : <><Play className="h-4 w-4" /> Unlock account (demo)</>}</Button></div>
          </section>
          {section('Access & Preferences', [
            { label: 'Language', key: 'language' }, { label: 'Two factor authentication', value: 'Disabled' },
            { label: 'Email notifications', value: 'Enabled' }, { label: 'SMS notifications', value: 'Disabled' },
            { label: 'Casino access', value: 'Enabled' }, { label: 'Sportsbook access', value: 'Enabled' },
            { label: 'RMT access', value: 'Enabled' }, { label: 'Account verification', value: user.tier === 'Standard' ? 'Pending' : 'Verified' },
          ])}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-950">Demo-only control</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Security settings, access rules and notifications are not saved to a server and have no effect on real accounts.</p></div>
        </div> : null}

        {mainTab === 'Log history' ? <div className="space-y-5">
          <div><h2 className="text-base font-bold text-slate-900">Log history</h2><p className="mt-1 text-xs text-slate-500">Recent account events used as sample history.</p></div>
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Date & time', 'Event', 'Details', 'Performed by', 'Result'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white text-xs">{[
              ['18 Oct 2026, 11:52', 'Player login', 'Web session opened', 'Player', 'Success'],
              [user.joined, 'Account created', 'Player record registered', 'System', 'Success'],
              ['18 Oct 2026, 11:49', 'Deposit', 'Sample deposit recorded', 'Payment demo', 'Success'],
              ['17 Oct 2026, 14:05', 'Profile updated', 'Player details reviewed', 'Admin Demo', 'Success'],
            ].map((row) => <tr key={row[0] + row[1]}>{row.map((cell, index) => <td key={index} className="whitespace-nowrap px-4 py-3.5 text-slate-600">{index === 4 ? <Badge variant="success">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <p className="text-[11px] text-slate-400">This history is illustrative and is not connected to authentication or payment logs.</p>
        </div> : null}
      </div>
    </div>
  </div>
}

function OfferFormModal({ open, onOpenChange, kind, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; kind: 'promotion' | 'bonus'; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const isPromotion = kind === 'promotion'
  return <Modal open={open} onOpenChange={onOpenChange} title={isPromotion ? 'Create promotion' : 'New bonus'} description={isPromotion ? 'Design a new campaign. This is a UI-only preview.' : 'Define the bonus type, product scope, and validity dates.'} footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form={isPromotion ? 'promotion-form' : 'bonus-form'}><Plus className="h-4 w-4" /> Create {isPromotion ? 'promotion' : 'bonus'}</Button></>}>
    <form id={isPromotion ? 'promotion-form' : 'bonus-form'} className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Name</span><Input name="name" required placeholder={isPromotion ? 'e.g. Weekend Reload' : 'e.g. Casino Welcome Bonus'} /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Description</span><Input name="description" placeholder="Add a short internal description" /></label>
      {isPromotion ? <>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Channel</span><select name="channel" defaultValue="Casino" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Casino</option><option>Sports</option><option>Both</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Reward display</span><Input name="reward" required placeholder="e.g. 50% up to €100" /></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">End date</span><Input name="ends" type="date" /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Initial status</span><select name="status" defaultValue="Scheduled" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Scheduled</option><option>Active</option><option>Paused</option></select></label></div>
      </> : <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Type</span><select name="bonusType" defaultValue="Deposit Bonus" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Deposit Bonus</option><option>Welcome Bonus</option><option>No Deposit Bonus</option><option>Reload Bonus</option><option>Free Spins</option><option>Cashback</option><option>Free Bet</option></select></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Product Type</span><select name="productType" defaultValue="Casino" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Casino</option><option>Sportsbook</option><option>Casino + Sports</option></select></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Expiration Date</span><Input name="expirationDate" type="date" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Expiration Days</span><Input name="expirationDays" type="number" min="1" defaultValue="30" /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Start Date</span><Input name="starts" type="date" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">End Date</span><Input name="ends" type="date" /></label>
        </div>
        <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Platform Definition Bonus Id</span><Input name="platformDefinitionBonusId" placeholder="Optional platform definition ID" /></label>
      </>}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600"><Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> Preview only. Creating this item updates the local table and does not publish it to a live system.</div>
    </form>
  </Modal>
}

function UserFormModal({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal open={open} onOpenChange={onOpenChange} title="Add player" description="Add a sample row to preview the user-management flow." footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="user-form"><UserPlus className="h-4 w-4" /> Add player</Button></>}>
    <form id="user-form" className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Full name</span><Input name="name" required placeholder="Player name" /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Email address</span><Input name="email" required type="email" placeholder="player@example.com" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Country</span><select name="country" defaultValue="Tunisia" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Tunisia</option><option>France</option><option>Italy</option><option>Germany</option><option>United Kingdom</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Segment</span><select name="tier" defaultValue="Standard" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Standard</option><option>Gold</option><option>VIP</option></select></label></div>
      <p className="text-[11px] text-slate-400">No invitation email is sent and no user account is created in a server.</p>
    </form>
  </Modal>
}


type CmsCategory = { id: string; name: string; items: number; visible: boolean; description: string }
type BannerStatus = 'Published' | 'Unpublished' | 'Trash'
type CmsBannerGroup = { id: string; slug: string; status: BannerStatus }
type CmsBannerDraft = {
  title: string
  platform: string
  status: BannerStatus
  showForUsers: string
  excludedCountries: string
  includedCountries: string
  newWindow: string
  startDate: string
  endDate: string
  additionalFeatures: string
  language: string
  altText: string
  hrefType: string
  href: string
  profileType: string
  depositStatus: string
  profileStatus: string
  excludedCurrencies: string
  ageAction: string
  minAge: string
  maxAge: string
  content: string
  mediaType: string
  imageName: string
  visibility: string
  countryRestriction: string
  countdownDate: string
  casinoJackpot: string
  matchId: string
  profileTypes: string
  customProfileTypes: string
  verifiedProfile: string
}
type CmsBanner = CmsBannerDraft & { id: string; groupId: string; modifiedDate: string }

const createEmptyCmsBannerDraft = (): CmsBannerDraft => ({
  title: '', platform: 'Web', status: 'Published', showForUsers: 'Guest and Logged In',
  excludedCountries: '', includedCountries: '', newWindow: 'No', startDate: '', endDate: '',
  additionalFeatures: 'None', language: 'Français', altText: '', hrefType: 'URL', href: '',
  profileType: 'Global', depositStatus: 'Not selected', profileStatus: 'Not selected',
  excludedCurrencies: '', ageAction: 'Not selected', minAge: '', maxAge: '', content: '',
  mediaType: 'Image', imageName: '', visibility: 'All', countryRestriction: 'All',
  countdownDate: 'All', casinoJackpot: 'All', matchId: 'All', profileTypes: 'All',
  customProfileTypes: 'All', verifiedProfile: 'All',
})

const INITIAL_CMS_CATEGORIES: CmsCategory[] = [
  { id: 'cat-featured', name: 'Featured', items: 8, visible: true, description: 'Hand-picked games and highlights' },
  { id: 'cat-popular', name: 'Popular Games', items: 24, visible: true, description: 'Top games by engagement' },
  { id: 'cat-new', name: 'New Releases', items: 12, visible: true, description: 'Recently added casino titles' },
  { id: 'cat-slots', name: 'Slots', items: 186, visible: true, description: 'Video slots and classic reels' },
  { id: 'cat-live', name: 'Live Casino', items: 42, visible: true, description: 'Live dealer tables and shows' },
  { id: 'cat-jackpot', name: 'Jackpot', items: 16, visible: false, description: 'Progressive jackpot games' },
  { id: 'cat-crash', name: 'Crash Games', items: 9, visible: true, description: 'Fast-play and multiplier games' },
]

const INITIAL_CMS_BANNER_GROUPS: CmsBannerGroup[] = []
const INITIAL_CMS_BANNERS: CmsBanner[] = []

function CmsCategoriesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [categories, setCategories] = useState<CmsCategory[]>(INITIAL_CMS_CATEGORIES)
  const [draftName, setDraftName] = useState('')
  const [search, setSearch] = useState('')
  const move = (index: number, direction: -1 | 1) => setCategories((current) => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const toggle = (id: string) => setCategories((current) => current.map((category) => category.id === id ? { ...category, visible: !category.visible } : category))
  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = draftName.trim()
    if (!name) return
    setCategories((current) => [...current, { id: 'cat-custom-' + (current.length + 1), name, items: 0, visible: true, description: 'New custom casino collection' }])
    setDraftName('')
    onNotify('Category added to the local CMS preview.')
  }
  const filtered = categories.filter((category) => (category.name + ' ' + category.description).toLowerCase().includes(search.toLowerCase()))
  return <div className="page-enter space-y-5">
    <SectionHeading title="Categories" description="Organize casino categories, control their visibility, and change display order." />
    <div className="grid gap-3 sm:grid-cols-3">
      {[{label:'Total categories',value:categories.length},{label:'Visible in lobby',value:categories.filter((item)=>item.visible).length},{label:'Games assigned',value:categories.reduce((total,item)=>total+item.items,0)}].map((metric) => <Card key={metric.label}><CardContent className="p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{metric.value}</p></CardContent></Card>)}
    </div>
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Casino categories</CardTitle><CardDescription className="mt-1">The top row is displayed first. Ordering and visibility are preview-only.</CardDescription></div>
        <div className="relative w-full sm:max-w-[230px]"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search categories…" className="pl-9" /></div>
      </div>
      <div className="p-4">
        <form onSubmit={addCategory} className="mb-4 flex flex-col gap-2 sm:flex-row"><Input value={draftName} onChange={(event)=>setDraftName(event.target.value)} placeholder="New category name…" aria-label="New category name" /><Button type="submit" disabled={!draftName.trim()}><Plus className="h-4 w-4" /> Add category</Button></form>
        <div className="space-y-2">
          {filtered.map((category) => {
            const index = categories.findIndex((item) => item.id === category.id)
            return <div key={category.id} className={cn('flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center', category.visible ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/70')}>
              <div className="flex items-center gap-2 sm:flex-col"><button type="button" aria-label={'Move ' + category.name + ' up'} disabled={index === 0} onClick={()=>move(index,-1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={'Move ' + category.name + ' down'} disabled={index === categories.length - 1} onClick={()=>move(index,1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button></div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-500 text-white"><Layers className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-slate-900">{category.name}</p><Badge variant={category.visible ? 'success' : 'outline'}>{category.visible ? 'Visible' : 'Hidden'}</Badge></div><p className="mt-1 text-[11px] text-slate-500">{category.description}</p></div>
              <div className="text-left sm:min-w-20 sm:text-right"><p className="text-sm font-bold text-slate-800">{category.items}</p><p className="text-[10px] text-slate-400">games</p></div>
              <Button size="sm" variant="outline" onClick={()=>toggle(category.id)}>{category.visible ? 'Hide category' : 'Show category'}</Button>
            </div>
          })}
          {filtered.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 py-9 text-center text-xs text-slate-400">No categories match that search.</div> : null}
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 text-[10px] text-slate-400">Category changes are local. No casino configuration has been published.</div>
    </Card>
  </div>
}

function CmsBannersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [groups, setGroups] = useState<CmsBannerGroup[]>(INITIAL_CMS_BANNER_GROUPS)
  const [banners, setBanners] = useState<CmsBanner[]>(INITIAL_CMS_BANNERS)
  const [view, setView] = useState<'groups' | 'banners' | 'editor'>('groups')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupSlug, setGroupSlug] = useState('Casino')
  const [groupStatus, setGroupStatus] = useState<BannerStatus>('Published')
  const [groupTab, setGroupTab] = useState<BannerStatus>('Published')
  const [bannerTab, setBannerTab] = useState<BannerStatus>('Published')
  const [groupSearch, setGroupSearch] = useState('')
  const [bannerSearch, setBannerSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('Français')
  const [stateFilter, setStateFilter] = useState('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    visibility: 'All', showForUsers: 'All', excludedCountry: 'Not selected',
    includedCountry: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', countdownDate: 'All', casinoJackpot: 'All',
    matchId: 'All', profileTypes: 'All', customProfileTypes: 'All',
    depositStatus: 'All', verifiedProfile: 'All',
  })
  const [pageSize, setPageSize] = useState('25')
  const [groupPage, setGroupPage] = useState(1)
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CmsBannerDraft>(createEmptyCmsBannerDraft())
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null
  const groupCounts = (status: BannerStatus) => groups.filter((group) => group.status === status).length
  const bannerCounts = (status: BannerStatus) => banners.filter((banner) => banner.groupId === activeGroupId && banner.status === status).length
  const visibleGroups = groups.filter((group) => group.status === groupTab && group.slug.toLowerCase().includes(groupSearch.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(visibleGroups.length / Number(pageSize)))
  const currentGroups = visibleGroups.slice((groupPage - 1) * Number(pageSize), groupPage * Number(pageSize))
  const visibleBanners = banners.filter((banner) => {
    if (banner.groupId !== activeGroupId || banner.status !== bannerTab) return false
    if (languageFilter !== 'All' && banner.language !== languageFilter) return false
    if (stateFilter !== 'All' && banner.status !== stateFilter) return false
    if (platformFilter !== 'All' && banner.platform !== platformFilter) return false
    if (!(banner.title + ' ' + banner.altText + ' ' + banner.href + ' ' + banner.platform).toLowerCase().includes(bannerSearch.toLowerCase())) return false
    if (advancedFilters.visibility !== 'All' && banner.visibility !== advancedFilters.visibility) return false
    if (advancedFilters.showForUsers !== 'All' && banner.showForUsers !== advancedFilters.showForUsers) return false
    if (advancedFilters.newWindow !== 'All' && banner.newWindow !== advancedFilters.newWindow) return false
    if (advancedFilters.startDate && banner.startDate && banner.startDate.slice(0, 10) < advancedFilters.startDate) return false
    if (advancedFilters.endDate && banner.endDate && banner.endDate.slice(0, 10) > advancedFilters.endDate) return false
    return true
  })
  const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const inputClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const tabButton = (label: string, count: number, active: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition', active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
      <span>{label}</span><span className={cn('rounded px-1.5 py-0.5 text-[10px]', active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
    </button>
  )
  const resetAdvancedFilters = () => setAdvancedFilters({
    visibility: 'All', showForUsers: 'All', excludedCountry: 'Not selected',
    includedCountry: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', countdownDate: 'All', casinoJackpot: 'All',
    matchId: 'All', profileTypes: 'All', customProfileTypes: 'All',
    depositStatus: 'All', verifiedProfile: 'All',
  })
  const createGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupSlug.trim()) return
    const group: CmsBannerGroup = { id: 'BG-' + String(groups.length + 1).padStart(3, '0'), slug: groupSlug.trim(), status: groupStatus }
    setGroups((current) => [group, ...current])
    setGroupTab(groupStatus)
    setGroupSearch('')
    setGroupPage(1)
    setGroupDialogOpen(false)
    setGroupSlug('Casino')
    setGroupStatus('Published')
    onNotify('Banner group added to the local CMS preview.')
  }
  const openGroup = (group: CmsBannerGroup) => {
    setActiveGroupId(group.id)
    setBannerTab('Published')
    setBannerSearch('')
    setLanguageFilter('Français')
    setStateFilter('All')
    setPlatformFilter('All')
    resetAdvancedFilters()
    setView('banners')
  }
  const openNewBanner = () => {
    setDraft({ ...createEmptyCmsBannerDraft(), language: languageFilter === 'All' ? 'Français' : languageFilter })
    setEditingBannerId(null)
    setView('editor')
  }
  const openEditBanner = (banner: CmsBanner) => {
    const { id, groupId, modifiedDate, ...bannerDraft } = banner
    setDraft(bannerDraft)
    setEditingBannerId(id)
    setView('editor')
  }
  const saveBanner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim() || !activeGroup) return
    if (editingBannerId) {
      setBanners((current) => current.map((banner) => banner.id === editingBannerId ? { ...banner, ...draft, title: draft.title.trim(), modifiedDate: '19 Oct 2026' } : banner))
      onNotify('Banner updated in the local CMS preview.')
    } else {
      const created: CmsBanner = { ...draft, title: draft.title.trim(), id: 'BNR-' + String(banners.length + 1).padStart(3, '0'), groupId: activeGroup.id, modifiedDate: '19 Oct 2026' }
      setBanners((current) => [created, ...current])
      onNotify('Banner saved in the local CMS preview.')
    }
    setBannerTab(draft.status)
    setView('banners')
  }
  const cancelEditor = () => setView(activeGroup ? 'banners' : 'groups')
  const updateDraft = (key: keyof CmsBannerDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }) as CmsBannerDraft)
  const textField = (label: string, key: keyof CmsBannerDraft, options?: { placeholder?: string; type?: string; required?: boolean }) => (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-[11px] font-medium text-slate-600">{label}{options?.required ? <span className="text-rose-500"> *</span> : null}</span>
      <input className={inputClass} required={options?.required} placeholder={options?.placeholder ?? label} type={options?.type ?? 'text'} value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} />
    </label>
  )
  const selectField = (label: string, key: keyof CmsBannerDraft, options: string[]) => (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-[11px] font-medium text-slate-600">{label}</span>
      <select className={selectClass} value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option || 'Not selected'}</option>)}</select>
    </label>
  )
  const advancedSelect = (label: string, key: keyof typeof advancedFilters, options: string[]) => (
    <label key={key} className="block min-w-0 space-y-1.5">
      <span className="block text-[10px] font-medium text-slate-500">{label}</span>
      <select className={selectClass} value={advancedFilters[key]} onChange={(event) => setAdvancedFilters((current) => ({ ...current, [key]: event.target.value }))}>{options.map((option) => <option key={option}>{option}</option>)}</select>
    </label>
  )
  const sectionCard = (title: string, description: string, children: ReactNode) => (
    <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>
  )

  if (view === 'editor') {
    return <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={() => setView('groups')}>Banners</button><ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <button type="button" className="hover:text-slate-900" onClick={() => setView('banners')}>{activeGroup?.slug ?? 'Group'}</button><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="font-semibold text-slate-900">{editingBannerId ? 'Edit Banner' : 'New Banner'}</span>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-semibold text-slate-900">{editingBannerId ? 'Edit Banner' : 'New Banner'}</h2><p className="mt-1 text-xs text-slate-500">Configure the banner content, visibility, schedule, and media.</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-banner-editor-form') as HTMLFormElement | null; form?.requestSubmit() }}><Check className="h-4 w-4" /> Save</Button></div>
      </div>
      <form id="cms-banner-editor-form" onSubmit={saveBanner} className="space-y-4">
        {sectionCard('General Details', 'Choose where and when the banner can be shown.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Platform', 'platform', ['Web', 'Mobile', 'Both'])}
          {selectField('Status', 'status', ['Published', 'Unpublished'])}
          {selectField('Show for users', 'showForUsers', ['Guest and Logged In', 'Guest only', 'Logged In only', 'All'])}
          {selectField('Excluded countries', 'excludedCountries', ['', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('Included Countries', 'includedCountries', ['', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('New Window', 'newWindow', ['No', 'Yes'])}
          {textField('Start Date', 'startDate', { type: 'datetime-local' })}
          {textField('End Date', 'endDate', { type: 'datetime-local' })}
          {selectField('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
          <div className="flex flex-col justify-end gap-2 rounded-lg border border-dashed border-slate-200 p-3 sm:col-span-2 xl:col-span-1"><div><p className="text-[11px] font-semibold text-slate-700">Additional features</p><p className="mt-1 text-[10px] text-slate-400">Optional banner behaviour flags.</p></div><Button type="button" variant="outline" onClick={() => updateDraft('additionalFeatures', draft.additionalFeatures === 'None' ? 'Countdown, Jackpot' : 'None')}><Plus className="h-3.5 w-3.5" /> {draft.additionalFeatures === 'None' ? 'Add features' : 'Remove features'}</Button><span className="text-[10px] text-slate-500">{draft.additionalFeatures}</span></div>
        </div>)}
        {sectionCard('Banner Properties', 'Set the banner title, language, alternative text, and destination.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {textField('Title', 'title', { required: true, placeholder: 'Banner title' })}
          {selectField('Language', 'language', ['Français', 'English', 'العربية'])}
          {textField('Alt Text', 'altText', { placeholder: 'Accessible image description' })}
          {selectField('Destination type', 'hrefType', ['URL', 'Internal page', 'Promotion'])}
          <div className="sm:col-span-2"><label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Destination URL</span><input className={inputClass} type="url" placeholder="https://example.com or /promotions" value={draft.href} onChange={(event) => updateDraft('href', event.target.value)} /></label></div>
        </div>)}
        {sectionCard('Visibility Setup', 'Control profile and account conditions for displaying this banner.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Select Profile Type', 'profileType', ['Global', 'Player profile', 'Custom profile'])}
          {selectField('Deposit Status', 'depositStatus', ['Not selected', 'All', 'Has deposited', 'Never deposited'])}
          {selectField('Profile Status', 'profileStatus', ['Not selected', 'All', 'Active', 'Inactive', 'Verified'])}
          {selectField('Excluded Currencies', 'excludedCurrencies', ['', 'EUR', 'USD', 'TND', 'GBP'])}
        </div>)}
        {sectionCard('Age Restriction', 'Optional age-based display rules.', <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectField('Action', 'ageAction', ['Not selected', 'Show banner', 'Hide banner'])}
          {textField('Min Age', 'minAge', { type: 'number', placeholder: 'Minimum age' })}
          {textField('Max Age', 'maxAge', { type: 'number', placeholder: 'Maximum age' })}
        </div>)}
        {sectionCard('Editor', 'Add optional formatted copy to the banner.', <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Banner content</span><textarea rows={6} value={draft.content} onChange={(event) => updateDraft('content', event.target.value)} placeholder="Enter optional banner copy…" className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-xs leading-5 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" /></label>)}
        {sectionCard('Media', 'Select the type of media used by this banner.', <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {selectField('Type', 'mediaType', ['Image', 'Video'])}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"><div className="flex flex-col items-center justify-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Image className="h-5 w-5" /></span>
            <p className="mt-3 text-xs font-semibold text-slate-800">{draft.imageName || 'Drag and drop a file'}</p><p className="mt-1 text-[10px] text-slate-500">Choose media for the local preview. No file is uploaded to a server.</p>
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Browse<input className="sr-only" type="file" accept="image/*,video/*" onChange={(event) => updateDraft('imageName', event.target.files?.[0]?.name ?? '')} /></label>
            <p className="mt-2 text-[10px] text-slate-400">Reference upload limit: 2 MB · JPG, PNG, PDF, SVG, GIF</p>
          </div></div>
        </div>)}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="submit"><Check className="h-4 w-4" /> Save Banner</Button></div>
      </form>
      <p className="text-[10px] text-slate-400">All edits, publication states, and media selections remain local to this UI prototype.</p>
    </div>
  }

  return <div className="page-enter space-y-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
      <button type="button" className={cn('hover:text-slate-900', view === 'groups' && 'font-semibold text-slate-900')} onClick={() => setView('groups')}>Banners</button>
      {view === 'banners' && activeGroup ? <><ChevronRight className="h-3.5 w-3.5 text-slate-300" /><span className="font-semibold text-slate-900">{activeGroup.slug}</span></> : null}
    </div>
    {view === 'groups' ? <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-wrap items-center gap-1">
        {tabButton('Published', groupCounts('Published'), groupTab === 'Published', () => { setGroupTab('Published'); setGroupPage(1) })}
        {tabButton('Unpublished', groupCounts('Unpublished'), groupTab === 'Unpublished', () => { setGroupTab('Unpublished'); setGroupPage(1) })}
        {tabButton('Trash', groupCounts('Trash'), groupTab === 'Trash', () => { setGroupTab('Trash'); setGroupPage(1) })}
      </div><Button onClick={() => setGroupDialogOpen(true)}><Plus className="h-4 w-4" /> Add Banner Group</Button></div>
      <div className="px-5 py-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={groupSearch} onChange={(event) => { setGroupSearch(event.target.value); setGroupPage(1) }} placeholder="Search" className="pl-9" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] table-fixed text-left"><thead><tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-12 px-5 py-3"></th><th className="px-3 py-3 font-medium">Title</th><th className="w-40 px-3 py-3 font-medium">Status</th><th className="w-40 px-5 py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody>{currentGroups.map((group) => <tr key={group.id} className="border-b border-slate-100 text-xs transition hover:bg-slate-50"><td className="px-5 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Layers className="h-4 w-4" /></span></td><td className="px-3 py-3"><button type="button" onClick={() => openGroup(group)} className="font-semibold text-slate-800 hover:underline">{group.slug}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{group.id}</p></td><td className="px-3 py-3"><Badge variant={group.status === 'Published' ? 'success' : group.status === 'Trash' ? 'warning' : 'outline'}>{group.status}</Badge></td><td className="px-5 py-3 text-right"><div className="inline-flex gap-1.5"><Button size="sm" variant="outline" onClick={() => openGroup(group)}>Open</Button>{group.status === 'Trash' ? <Button size="sm" variant="outline" onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, status: 'Unpublished' } : item))}>Restore</Button> : <Button size="sm" variant="outline" onClick={() => setGroups((current) => current.map((item) => item.id === group.id ? { ...item, status: 'Trash' } : item))}>Trash</Button>}</div></td></tr>)}</tbody>
      </table>
      {currentGroups.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center border-b border-slate-100 px-4 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Image className="h-6 w-6" /></span><p className="mt-3 text-xs font-semibold text-slate-500">No data to display</p><p className="mt-1 text-[10px] text-slate-400">Add a banner group to start organizing banner content.</p></div> : null}
      </div>
      <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><select aria-label="Rows per page" className={selectClass + ' w-[76px]'} value={pageSize} onChange={(event) => { setPageSize(event.target.value); setGroupPage(1) }}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select><span>{visibleGroups.length ? (groupPage - 1) * Number(pageSize) + 1 : 0}-{Math.min(groupPage * Number(pageSize), visibleGroups.length)} of {visibleGroups.length}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={groupPage <= 1} onClick={() => setGroupPage((page) => Math.max(1, page - 1))}>Previous</Button><span className="min-w-5 text-center">{groupPage}</span><Button variant="outline" size="sm" disabled={groupPage >= pageCount} onClick={() => setGroupPage((page) => Math.min(pageCount, page + 1))}>Next</Button></div></div>
    </> : null}

    {view === 'banners' && activeGroup ? <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-wrap items-center gap-1">
        {tabButton('Published', bannerCounts('Published'), bannerTab === 'Published', () => setBannerTab('Published'))}
        {tabButton('Unpublished', bannerCounts('Unpublished'), bannerTab === 'Unpublished', () => setBannerTab('Unpublished'))}
        {tabButton('Trash', bannerCounts('Trash'), bannerTab === 'Trash', () => setBannerTab('Trash'))}
      </div><Button onClick={openNewBanner}><Plus className="h-4 w-4" /> Add Banner</Button></div>
      <div className="space-y-4 border-b border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={bannerSearch} onChange={(event) => setBannerSearch(event.target.value)} placeholder="Search" className="pl-9" /></div>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">Language</span><select className={selectClass} value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}><option>All</option><option>Français</option><option>English</option><option>العربية</option></select></label>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">State</span><select className={selectClass} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option>All</option><option>Published</option><option>Unpublished</option></select></label>
          <label className="space-y-1"><span className="block text-[10px] text-slate-400">Platform</span><select className={selectClass} value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option>All</option><option>Web</option><option>Mobile</option><option>Both</option></select></label>
        </div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setShowAdvancedFilters((open) => !open)} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900"><SlidersHorizontal className="h-3.5 w-3.5" /> Additional filters<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvancedFilters && 'rotate-180')} /></button><span className="text-[10px] text-slate-400">{visibleBanners.length} banners</span></div>
        {showAdvancedFilters ? <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {advancedSelect('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
          {advancedSelect('Show for users', 'showForUsers', ['All', 'Guest and Logged In', 'Guest only', 'Logged In only'])}
          {advancedSelect('Excluded Country', 'excludedCountry', ['Not selected', 'Tunisia', 'France', 'Italy', 'Germany'])}
          {advancedSelect('Included Country', 'includedCountry', ['Not selected', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany'])}
          {advancedSelect('Country Restriction', 'countryRestriction', ['All', 'Include only', 'Exclude selected'])}
          {advancedSelect('New Window', 'newWindow', ['All', 'No', 'Yes'])}
          <label className="block space-y-1.5"><span className="block text-[10px] font-medium text-slate-500">Start Date</span><input type="date" className={inputClass} value={advancedFilters.startDate} onChange={(event) => setAdvancedFilters((current) => ({ ...current, startDate: event.target.value }))} /></label>
          <label className="block space-y-1.5"><span className="block text-[10px] font-medium text-slate-500">End Date</span><input type="date" className={inputClass} value={advancedFilters.endDate} onChange={(event) => setAdvancedFilters((current) => ({ ...current, endDate: event.target.value }))} /></label>
          {advancedSelect('Countdown Date', 'countdownDate', ['All', 'Enabled', 'Disabled'])}
          {advancedSelect('Casino Jackpot', 'casinoJackpot', ['All', 'Enabled', 'Disabled'])}
          {advancedSelect('Match ID', 'matchId', ['All', 'Set', 'Not set'])}
          {advancedSelect('Profile Types', 'profileTypes', ['All', 'Global', 'Specific'])}
          {advancedSelect('Custom Profile Types', 'customProfileTypes', ['All', 'Selected', 'Not selected'])}
          {advancedSelect('Deposit Status', 'depositStatus', ['All', 'Has deposited', 'Never deposited'])}
          {advancedSelect('Verified Profile', 'verifiedProfile', ['All', 'Verified', 'Unverified'])}
          <div className="flex items-end justify-end"><Button type="button" size="sm" variant="outline" onClick={resetAdvancedFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset Filters</Button></div>
        </div> : null}
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[960px] table-fixed text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-16 px-4 py-3 font-medium">Image</th><th className="w-[24%] px-3 py-3 font-medium">Title</th><th className="w-[10%] px-3 py-3 font-medium">Platform</th><th className="w-[15%] px-3 py-3 font-medium">Start Date</th><th className="w-[15%] px-3 py-3 font-medium">End Date</th><th className="w-[15%] px-3 py-3 font-medium">Modified Date</th><th className="w-[16%] px-4 py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody>{visibleBanners.map((banner) => <tr key={banner.id} className="border-b border-slate-100 text-xs hover:bg-slate-50">
          <td className="px-4 py-3"><div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-slate-900 via-violet-800 to-amber-500 text-white">{banner.imageName ? <span className="max-w-full truncate px-1 text-[7px]">{banner.imageName}</span> : <Image className="h-4 w-4" />}</div></td>
          <td className="px-3 py-3"><button type="button" onClick={() => openEditBanner(banner)} className="font-semibold text-slate-800 hover:underline">{banner.title}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{banner.id}</p></td>
          <td className="px-3 py-3 text-slate-600">{banner.platform}</td><td className="px-3 py-3 text-slate-500">{banner.startDate || '—'}</td><td className="px-3 py-3 text-slate-500">{banner.endDate || '—'}</td><td className="px-3 py-3 text-slate-500">{banner.modifiedDate}</td>
          <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => openEditBanner(banner)}><Pencil className="h-3 w-3" /> Edit</Button>{banner.status === 'Trash' ? <Button size="sm" variant="outline" onClick={() => setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, status: 'Unpublished' } : item))}>Restore</Button> : <Button size="sm" variant="outline" onClick={() => setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, status: 'Trash' } : item))}>Trash</Button>}</div></td>
        </tr>)}</tbody></table>
        {visibleBanners.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Image className="h-6 w-6" /></span><p className="mt-3 text-xs font-semibold text-slate-500">No data to display</p><p className="mt-1 text-[10px] text-slate-400">Use Add Banner to create the first banner in this group.</p></div> : null}
      </div>
      <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><select aria-label="Rows per page" className={selectClass + ' w-[76px]'} defaultValue="25"><option>25</option><option>50</option><option>100</option></select><span>1-{visibleBanners.length} of {visibleBanners.length}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled>Previous</Button><span className="rounded-md bg-slate-100 px-2.5 py-1.5">1</span><Button variant="outline" size="sm" disabled>Next</Button></div></div>
    </> : null}

    <Modal open={groupDialogOpen} onOpenChange={setGroupDialogOpen} title="Add Banner Group" description="Create a group to organize banners." footer={<><Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-banner-group-form') as HTMLFormElement | null; form?.requestSubmit() }}>Save</Button></>}>
      <form id="cms-banner-group-form" onSubmit={createGroup} className="space-y-4">
        <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Slug</span><select className={selectClass} value={groupSlug} onChange={(event) => setGroupSlug(event.target.value)}><option>Casino</option><option>Sports</option><option>Poker</option><option>Homepage</option><option>Live Casino</option><option>Promotions</option></select></label>
        <label className="block space-y-1.5"><span className="block text-[11px] font-medium text-slate-600">Status</span><select className={selectClass} value={groupStatus} onChange={(event) => setGroupStatus(event.target.value as BannerStatus)}><option>Published</option><option>Unpublished</option></select></label>
      </form>
    </Modal>
  </div>
}

type CmsPromotionStatus = 'Published' | 'Unpublished' | 'Trash'
type CmsPromotion = {
  id: string
  title: string
  altText: string
  platform: string
  status: CmsPromotionStatus
  category: string
  startDate: string
  endDate: string
  modifiedDate: string
  language: string
  showForUsers: string
  excludedCountries: string
  includedCountries: string
  newWindow: string
  visibility: string
  optInId: string
  countdownDate: string
  profileType: string
  customProfileTypes: string
  depositStatus: string
  profileStatus: string
  excludedCurrencies: string
  ageAction: string
  minAge: string
  maxAge: string
  content: string
  imageName: string
}
type CmsPromotionDraft = Omit<CmsPromotion, 'id' | 'modifiedDate'>

type CmsPromotionCategory = { id: string; name: string; slug: string; status: 'Published' | 'Unpublished' }

const EMPTY_CMS_PROMOTION: CmsPromotionDraft = {
  title: '', altText: '', platform: 'Web', status: 'Published', category: '',
  startDate: '', endDate: '', language: 'Français',
  showForUsers: 'Guest and Logged In', excludedCountries: '', includedCountries: '',
  newWindow: 'Yes', visibility: 'All', optInId: '', countdownDate: '',
  profileType: 'Global', customProfileTypes: 'All', depositStatus: 'Not selected',
  profileStatus: 'Not selected', excludedCurrencies: '', ageAction: 'Not selected',
  minAge: '', maxAge: '', content: '', imageName: '',
}
const INITIAL_CMS_PROMOTION_CATEGORIES: CmsPromotionCategory[] = [
  { id: 'CAT-001', name: 'Casino', slug: 'casino', status: 'Published' },
  { id: 'CAT-002', name: 'Poker', slug: 'poker', status: 'Published' },
  { id: 'CAT-003', name: 'Sports', slug: 'sports', status: 'Published' },
]

function CmsPromotionsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [promotions, setPromotions] = useState<CmsPromotion[]>([])
  const [categories, setCategories] = useState<CmsPromotionCategory[]>(INITIAL_CMS_PROMOTION_CATEGORIES)
  const [activeTab, setActiveTab] = useState<CmsPromotionStatus>('Published')
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('Français')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)
  const [filters, setFilters] = useState({
    visibility: 'All', showForUsers: 'All', excludedCountries: 'Not selected',
    includedCountries: 'Not selected', countryRestriction: 'All', newWindow: 'All',
    startDate: '', endDate: '', optInId: 'All', countdownDate: 'All',
    profileTypes: 'All', customProfileTypes: 'All', depositStatus: 'All', verifiedProfile: 'All',
  })
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CmsPromotionDraft>({ ...EMPTY_CMS_PROMOTION })
  const [showCategories, setShowCategories] = useState(false)
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'Published' | 'Unpublished'>('Published')
  const [categoryLanguage, setCategoryLanguage] = useState('Français')
  const [showCategoryDraft, setShowCategoryDraft] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryDraft, setCategoryDraft] = useState({ name: '', slug: '' })
  const [categorySearch, setCategorySearch] = useState('')

  const setDraftValue = (key: keyof CmsPromotionDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const setFilterValue = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const openNewPromotion = () => {
    setEditingId(null)
    setDraft({ ...EMPTY_CMS_PROMOTION })
    setView('editor')
  }
  const openEditPromotion = (promotion: CmsPromotion) => {
    const { id, modifiedDate, ...values } = promotion
    setEditingId(id)
    setDraft(values)
    setView('editor')
  }
  const cancelEditor = () => {
    setView('list')
    setEditingId(null)
    setDraft({ ...EMPTY_CMS_PROMOTION })
  }
  const savePromotion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      onNotify('Enter a title before saving the promotion.')
      return
    }
    const now = '19 Oct 2026'
    const values: CmsPromotion = {
      ...draft,
      id: editingId || 'PROM-' + String(promotions.length + 1).padStart(3, '0'),
      title: draft.title.trim(),
      modifiedDate: now,
      status: draft.status as CmsPromotionStatus,
    }
    if (editingId) {
      setPromotions((current) => current.map((item) => item.id === editingId ? values : item))
    } else {
      setPromotions((current) => [...current, values])
    }
    setActiveTab(values.status)
    setView('list')
    setEditingId(null)
    onNotify(editingId ? 'Promotion updated in this local preview.' : 'Promotion saved in this local preview.')
  }
  const setPromotionStatus = (id: string, status: CmsPromotionStatus) => {
    setPromotions((current) => current.map((item) => item.id === id ? { ...item, status, modifiedDate: '19 Oct 2026' } : item))
  }
  const resetFilters = () => {
    setSearch('')
    setLanguageFilter('Français')
    setCategoryFilter('All')
    setStateFilter('All')
    setPlatformFilter('All')
    setFilters({
      visibility: 'All', showForUsers: 'All', excludedCountries: 'Not selected',
      includedCountries: 'Not selected', countryRestriction: 'All', newWindow: 'All',
      startDate: '', endDate: '', optInId: 'All', countdownDate: 'All',
      profileTypes: 'All', customProfileTypes: 'All', depositStatus: 'All', verifiedProfile: 'All',
    })
  }

  const visiblePromotions = promotions.filter((item) => {
    if (item.status !== activeTab) return false
    if (search && !(item.title + ' ' + item.altText + ' ' + item.id + ' ' + item.category).toLowerCase().includes(search.toLowerCase())) return false
    if (languageFilter !== 'All' && item.language !== languageFilter) return false
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false
    if (stateFilter !== 'All' && item.status !== stateFilter) return false
    if (platformFilter !== 'All' && item.platform !== platformFilter && item.platform !== 'Both') return false
    if (filters.visibility !== 'All' && item.visibility !== filters.visibility) return false
    if (filters.showForUsers !== 'All' && item.showForUsers !== filters.showForUsers) return false
    if (filters.excludedCountries !== 'Not selected' && item.excludedCountries !== filters.excludedCountries) return false
    if (filters.includedCountries !== 'Not selected' && item.includedCountries !== filters.includedCountries) return false
    if (filters.newWindow !== 'All' && item.newWindow !== filters.newWindow) return false
    if (filters.startDate && (!item.startDate || item.startDate < filters.startDate)) return false
    if (filters.endDate && (!item.endDate || item.endDate > filters.endDate)) return false
    if (filters.optInId !== 'All' && item.optInId !== filters.optInId) return false
    if (filters.countdownDate !== 'All' && item.countdownDate !== filters.countdownDate) return false
    if (filters.profileTypes !== 'All' && item.profileType !== filters.profileTypes) return false
    if (filters.customProfileTypes !== 'All' && item.customProfileTypes !== filters.customProfileTypes) return false
    if (filters.depositStatus !== 'All' && item.depositStatus !== filters.depositStatus) return false
    if (filters.verifiedProfile !== 'All' && item.profileStatus !== filters.verifiedProfile) return false
    return true
  })
  const categoryRows = categories.filter((item) =>
    item.status === categoryStatusFilter &&
    (item.name + ' ' + item.slug).toLowerCase().includes(categorySearch.toLowerCase()),
  )

  const fieldClass = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-600'
  const textField = (label: string, key: keyof CmsPromotionDraft, placeholder?: string, type = 'text', disabled = false) => (
    <label key={key} className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <Input type={type} disabled={disabled} className={fieldClass} value={draft[key]} onChange={(event) => setDraftValue(key, event.target.value)} placeholder={placeholder || label} />
    </label>
  )
  const selectField = (label: string, key: keyof CmsPromotionDraft, options: string[]) => (
    <label key={key} className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <select className={fieldClass} value={draft[key]} onChange={(event) => setDraftValue(key, event.target.value)}>
        {options.map((option) => <option key={option} value={option === '—' ? '' : option}>{option}</option>)}
      </select>
    </label>
  )
  const filterSelect = (label: string, value: string, onChange: (value: string) => void, options: string[]) => (
    <label key={label} className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
  const section = (title: string, description: string, children: ReactNode, extraClass = '') => (
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white', extraClass)}>
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{children}</div>
    </section>
  )
  const insertEditorToken = (token: string) => setDraft((current) => ({ ...current, content: current.content + token }))

  if (view === 'editor') {
    return <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={cancelEditor}>Promotions</button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="font-semibold text-slate-900">{editingId ? 'Edit Promotion' : 'New Promotion'}</span>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-semibold text-slate-900">{editingId ? 'Edit Promotion' : 'New Promotion'}</h2><p className="mt-1 text-xs text-slate-500">Configure promotion details, visibility rules, content, and artwork.</p></div>
        <div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="button" onClick={() => { const form = document.getElementById('cms-promotion-editor-form') as HTMLFormElement | null; form?.requestSubmit() }}><Check className="h-4 w-4" /> Save</Button></div>
      </div>
      <form id="cms-promotion-editor-form" onSubmit={savePromotion} className="space-y-4">
        {section('General Details', 'Select platform, publication status, audience, countries, categories, and schedule.', <>
          {selectField('Platform', 'platform', ['Web', 'Mobile', 'Both'])}
          {selectField('Status', 'status', ['Published', 'Unpublished'])}
          {selectField('Show for users', 'showForUsers', ['Guest and Logged In', 'Guest only', 'Logged In only', 'All'])}
          {selectField('Excluded countries', 'excludedCountries', ['—', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('Included Countries', 'includedCountries', ['—', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
          {selectField('New Window', 'newWindow', ['Yes', 'No'])}
          <label className="block min-w-0"><span className={labelClass}>Categories</span><select className={fieldClass} value={draft.category} onChange={(event) => setDraftValue('category', event.target.value)}><option value="">Select category</option>{categories.filter((item) => item.status === 'Published').map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          {textField('Start Date', 'startDate', '', 'date')}
          {textField('End Date', 'endDate', '', 'date')}
          {textField('Opt-in ID', 'optInId', 'Enter opt-in ID')}
          {textField('Countdown Date', 'countdownDate', '', 'date')}
        </>)}
        {section('Promotion Properties', 'The title and alternative text identify this promotion in the CMS.', <>
          <div className="sm:col-span-2 xl:col-span-1">{textField('Title', 'title', 'Promotion title')}</div>
          <label className="block min-w-0"><span className={labelClass}>Language</span><select disabled value={draft.language} className={cn(fieldClass, 'bg-slate-50 text-slate-500')} onChange={() => undefined}><option>Français</option><option>English</option><option>العربية</option></select></label>
          {textField('Alt Text', 'altText', 'Describe the promotion image')}
        </>)}
        {section('Visibility Setup', 'Limit promotions by account profile and eligibility conditions.', <>
          {selectField('Select Profile Type', 'profileType', ['Global', 'Guest', 'Registered', 'VIP', 'Custom'])}
          {selectField('Custom Profile Types', 'customProfileTypes', ['All', 'New players', 'VIP players', 'Casino players', 'Sports players'])}
          {selectField('Deposit Status', 'depositStatus', ['Not selected', 'Deposited', 'Never deposited', 'First deposit'])}
          {selectField('Profile Status', 'profileStatus', ['Not selected', 'All', 'Verified', 'Unverified'])}
          {selectField('Excluded Currencies', 'excludedCurrencies', ['—', 'EUR', 'USD', 'GBP', 'TND'])}
          {selectField('Visibility', 'visibility', ['All', 'Visible', 'Hidden'])}
        </>)}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Age Restriction</h3><p className="mt-1 text-[11px] text-slate-500">Optional age-based display restrictions.</p></div>
          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            {selectField('Action', 'ageAction', ['Not selected', 'Allow', 'Hide', 'Reject'])}
            {textField('Min Age', 'minAge', 'Minimum age', 'number', draft.ageAction === 'Not selected')}
            {textField('Max Age', 'maxAge', 'Maximum age', 'number', draft.ageAction === 'Not selected')}
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Editor</h3><p className="mt-1 text-[11px] text-slate-500">Write promotion copy. Formatting controls insert simple markup into this local demo field.</p></div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-1 rounded-t-md border border-slate-200 bg-slate-50 p-2">
              {[['Bold', '<strong></strong>'], ['Italic', '<em></em>'], ['Link', '<a href=""></a>'], ['List', '<ul><li></li></ul>']].map(([label, token]) => <button key={label} type="button" onClick={() => insertEditorToken(token)} className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100">{label}</button>)}
            </div>
            <textarea value={draft.content} onChange={(event) => setDraftValue('content', event.target.value)} rows={8} placeholder="Add promotion content…" className="block w-full resize-y rounded-b-md border border-t-0 border-slate-200 p-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-100" />
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-slate-900">Image</h3><p className="mt-1 text-[11px] text-slate-500">Choose artwork for this promotion. Files remain local to this preview.</p></div>
          <div className="p-4 sm:p-5">
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center hover:bg-slate-100/70">
              <Image className="h-7 w-7 text-slate-400" />
              <span className="mt-3 text-xs font-medium text-slate-700">{draft.imageName || 'Drag and drop a file or browse'}</span>
              <span className="mt-1 text-[10px] text-slate-400">Maximum upload file size: 2 MB · JPG, PNG, PDF, SVG, GIF</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.svg,.gif,image/*" className="sr-only" onChange={(event) => setDraftValue('imageName', event.target.files?.[0]?.name || '')} />
            </label>
          </div>
        </section>
        <div className="flex justify-end gap-2 pb-2"><Button type="button" variant="outline" onClick={cancelEditor}>Cancel</Button><Button type="submit"><Check className="h-4 w-4" /> Save promotion</Button></div>
      </form>
    </div>
  }

  return <div className="page-enter space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div><p className="text-xs text-slate-500">CMS</p><h2 className="mt-1 text-base font-semibold text-slate-900">Promotions</h2></div>
      <div className="flex items-center gap-2"><Button variant="outline" onClick={() => setShowCategories(true)}><Pencil className="h-3.5 w-3.5" /> Manage Categories</Button><Button onClick={openNewPromotion}><Plus className="h-4 w-4" /> Add</Button></div>
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-1">
          {(['Published', 'Unpublished', 'Trash'] as CmsPromotionStatus[]).map((tab) => {
            const count = promotions.filter((item) => item.status === tab).length
            return <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={cn('relative -mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition', activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              {tab}<span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
            </button>
          })}
        </div>
        <div className="pb-3 text-[10px] text-slate-400">{promotions.length} total promotions · local preview</div>
      </div>
      <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className={cn(fieldClass, 'pl-9')} /></div>
          {filterSelect('Language', languageFilter, setLanguageFilter, ['All', 'Français', 'English', 'العربية'])}
          {filterSelect('Category', categoryFilter, setCategoryFilter, ['All', ...categories.filter((item) => item.status === 'Published').map((item) => item.name)])}
          {filterSelect('State', stateFilter, setStateFilter, ['All', 'Published', 'Unpublished'])}
          {filterSelect('Platform', platformFilter, setPlatformFilter, ['All', 'Web', 'Mobile', 'Both'])}
        </div>
        <div>
          <button type="button" onClick={() => setShowAdditionalFilters((current) => !current)} className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"><ChevronDown className={cn('h-4 w-4 transition', showAdditionalFilters ? 'rotate-180' : '')} />{showAdditionalFilters ? 'Hide additional filters' : 'Additional filters'}<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">14</span></button>
          {showAdditionalFilters ? <div className="mt-3 space-y-3 rounded-lg bg-slate-50/70 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {filterSelect('Visibility', filters.visibility, (value) => setFilterValue('visibility', value), ['All', 'Visible', 'Hidden'])}
              {filterSelect('Show for users', filters.showForUsers, (value) => setFilterValue('showForUsers', value), ['All', 'Guest and Logged In', 'Guest only', 'Logged In only'])}
              {filterSelect('Excluded country', filters.excludedCountries, (value) => setFilterValue('excludedCountries', value), ['Not selected', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
              {filterSelect('Included country', filters.includedCountries, (value) => setFilterValue('includedCountries', value), ['Not selected', 'All countries', 'Tunisia', 'France', 'Italy', 'Germany', 'United States'])}
              {filterSelect('Country Restriction', filters.countryRestriction, (value) => setFilterValue('countryRestriction', value), ['All', 'Included', 'Excluded', 'No restriction'])}
              {filterSelect('New Window', filters.newWindow, (value) => setFilterValue('newWindow', value), ['All', 'Yes', 'No'])}
              <label className="block min-w-0"><span className="sr-only">Start Date</span><Input aria-label="Start Date" type="date" className={fieldClass} value={filters.startDate} onChange={(event) => setFilterValue('startDate', event.target.value)} /></label>
              <label className="block min-w-0"><span className="sr-only">End Date</span><Input aria-label="End Date" type="date" className={fieldClass} value={filters.endDate} onChange={(event) => setFilterValue('endDate', event.target.value)} /></label>
              {filterSelect('Opt-in ID', filters.optInId, (value) => setFilterValue('optInId', value), ['All'])}
              {filterSelect('Countdown Date', filters.countdownDate, (value) => setFilterValue('countdownDate', value), ['All'])}
              {filterSelect('Profile Types', filters.profileTypes, (value) => setFilterValue('profileTypes', value), ['All', 'Global', 'Guest', 'Registered', 'VIP', 'Custom'])}
              {filterSelect('Custom Profile Types', filters.customProfileTypes, (value) => setFilterValue('customProfileTypes', value), ['All', 'New players', 'VIP players', 'Casino players', 'Sports players'])}
              {filterSelect('Deposit Status', filters.depositStatus, (value) => setFilterValue('depositStatus', value), ['All', 'Not selected', 'Deposited', 'Never deposited', 'First deposit'])}
              {filterSelect('Verified Profile', filters.verifiedProfile, (value) => setFilterValue('verifiedProfile', value), ['All', 'Not selected', 'Verified', 'Unverified'])}
            </div>
            <div className="flex justify-end"><Button variant="ghost" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset Filters</Button></div>
          </div> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500">
            <tr><th className="w-10 px-3 py-3"></th><th className="px-3 py-3">Image</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Start Date</th><th className="px-3 py-3">End Date</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Modified Date</th><th className="w-24 px-3 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiblePromotions.map((item) => <tr key={item.id} className="text-xs hover:bg-slate-50/70">
              <td className="px-3 py-3 text-slate-300"><span className="cursor-grab">⠿</span></td>
              <td className="px-3 py-3"><div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400">{item.imageName ? <Image className="h-4 w-4" /> : <span className="text-[9px]">No image</span>}</div>{item.imageName ? <p className="mt-1 max-w-20 truncate text-[9px] text-slate-400">{item.imageName}</p> : null}</td>
              <td className="px-3 py-3"><p className="font-medium text-slate-800">{item.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{item.id}</p></td>
              <td className="px-3 py-3 text-slate-600">{item.startDate || '—'}</td><td className="px-3 py-3 text-slate-600">{item.endDate || '—'}</td><td className="px-3 py-3 text-slate-600">{item.category || '—'}</td><td className="px-3 py-3 text-slate-500">{item.modifiedDate}</td>
              <td className="px-3 py-3"><div className="flex justify-end gap-1">
                {item.status === 'Trash' ? <Button variant="ghost" size="icon" aria-label="Restore promotion" onClick={() => setPromotionStatus(item.id, 'Unpublished')}><RotateCcw className="h-4 w-4 text-slate-500" /></Button> : <Button variant="ghost" size="icon" aria-label="Edit promotion" onClick={() => openEditPromotion(item)}><Pencil className="h-4 w-4 text-slate-500" /></Button>}
                {item.status !== 'Trash' ? <Button variant="ghost" size="icon" aria-label="Move promotion to trash" onClick={() => setPromotionStatus(item.id, 'Trash')}><X className="h-4 w-4 text-slate-500" /></Button> : <Button variant="ghost" size="icon" aria-label="Delete permanently" onClick={() => setPromotions((current) => current.filter((promo) => promo.id !== item.id))}><MoreHorizontal className="h-4 w-4 text-slate-500" /></Button>}
              </div></td>
            </tr>)}
            {visiblePromotions.length === 0 ? <tr><td colSpan={8} className="px-4 py-14"><div className="flex flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400"><Gift className="h-5 w-5" /></span><p className="mt-3 text-xs font-medium text-slate-700">No data to display</p><p className="mt-1 text-[10px] text-slate-400">{search ? 'Try changing the search or filters.' : 'Add a promotion to see it listed here.'}</p></div></td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
        <div className="flex items-center gap-3"><select aria-label="Rows per page" className="h-8 rounded-md border border-slate-200 bg-white px-2" defaultValue="25"><option>25</option><option>50</option><option>100</option></select><span>{visiblePromotions.length ? '1-' + visiblePromotions.length + ' of ' + visiblePromotions.length : '0-0 of 0'}</span></div>
        <div className="flex items-center gap-2"><Button size="icon" variant="ghost" disabled><ChevronRight className="h-4 w-4 rotate-180" /></Button><span className="rounded border border-slate-200 px-2 py-1">1</span><Button size="icon" variant="ghost" disabled><ChevronRight className="h-4 w-4" /></Button></div>
      </div>
    </div>

    <Modal open={showCategories} onOpenChange={(open) => { setShowCategories(open); if (!open) { setShowCategoryDraft(false); setEditingCategoryId(null); } }} title="Categories" description="Manage the categories available to CMS promotions." size="wide" footer={<Button variant="outline" onClick={() => setShowCategories(false)}>Close</Button>}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select aria-label="Category status" className={fieldClass} value={categoryStatusFilter} onChange={(event) => setCategoryStatusFilter(event.target.value as 'Published' | 'Unpublished')}><option>Published</option><option>Unpublished</option></select>
          <select aria-label="Category language" className={fieldClass} value={categoryLanguage} onChange={(event) => setCategoryLanguage(event.target.value)}><option>Français</option><option>English</option><option>العربية</option></select>
          <Button onClick={() => { setShowCategoryDraft(true); setEditingCategoryId(null); setCategoryDraft({ name: '', slug: '' }) }}><Plus className="h-3.5 w-3.5" /> Add Category</Button>
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search categories" className={cn(fieldClass, 'pl-9')} placeholder="Search categories" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} /></div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] text-slate-500"><tr><th className="w-10 px-3 py-3"></th><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Slug</th><th className="w-32 px-3 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {showCategoryDraft ? <tr>
                <td className="px-3 py-3 text-slate-300">⠿</td>
                <td className="px-3 py-3"><Input autoFocus value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Category name" className="h-9 text-xs" /></td>
                <td className="px-3 py-3"><Input value={categoryDraft.slug} onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="category-slug" className="h-9 text-xs" /></td>
                <td className="px-3 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Save category" disabled={!categoryDraft.name.trim()} onClick={() => {
                  const newCategory: CmsPromotionCategory = { id: 'CAT-' + String(categories.length + 1).padStart(3, '0'), name: categoryDraft.name.trim(), slug: categoryDraft.slug.trim() || categoryDraft.name.trim().toLowerCase().replace(/\s+/g, '-'), status: categoryStatusFilter }
                  setCategories((current) => [...current, newCategory]); setShowCategoryDraft(false); setCategoryDraft({ name: '', slug: '' }); onNotify('Category added in this local preview.')
                }}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Cancel category" onClick={() => setShowCategoryDraft(false)}><X className="h-4 w-4" /></Button></div></td>
              </tr> : null}
              {categoryRows.map((item) => <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 text-slate-300"><span className="cursor-grab">⠿</span></td>
                <td className="px-3 py-3">{editingCategoryId === item.id ? <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} className="h-9 text-xs" /> : <span className="font-medium text-slate-700">{item.name}</span>}</td>
                <td className="px-3 py-3">{editingCategoryId === item.id ? <Input value={categoryDraft.slug} onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value }))} className="h-9 text-xs" /> : <span className="text-slate-500">{item.slug}</span>}</td>
                <td className="px-3 py-3"><div className="flex justify-end gap-1">
                  {editingCategoryId === item.id ? <><Button size="icon" variant="ghost" aria-label="Save category changes" onClick={() => { setCategories((current) => current.map((category) => category.id === item.id ? { ...category, name: categoryDraft.name.trim() || category.name, slug: categoryDraft.slug.trim() || category.slug } : category)); setEditingCategoryId(null); onNotify('Category updated in this local preview.') }}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Cancel category edits" onClick={() => setEditingCategoryId(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" aria-label="Edit category" onClick={() => { setEditingCategoryId(item.id); setShowCategoryDraft(false); setCategoryDraft({ name: item.name, slug: item.slug }) }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={item.status === 'Published' ? 'Unpublish category' : 'Publish category'} onClick={() => setCategories((current) => current.map((category) => category.id === item.id ? { ...category, status: category.status === 'Published' ? 'Unpublished' : 'Published' } : category))}>{item.status === 'Published' ? <Eye className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button></>}
                </div></td>
              </tr>)}
              {!showCategoryDraft && categoryRows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400">No categories to display.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500"><span>{categoryRows.length + (showCategoryDraft ? 1 : 0)} categories</span><span>Language: {categoryLanguage}</span></div>
      </div>
    </Modal>
  </div>
}

type CmsContentPage = { id: string; title: string; slug: string; language: string; status: 'Published' | 'Draft'; updated: string; content: string }
const INITIAL_CMS_PAGES: CmsContentPage[] = [
  { id: 'PAGE-001', title: 'About Us', slug: '/about-us', language: 'English', status: 'Published', updated: '15 Oct 2026', content: 'Learn more about Bclick and the services provided to players.' },
  { id: 'PAGE-002', title: 'Responsible Gaming', slug: '/responsible-gaming', language: 'English', status: 'Published', updated: '14 Oct 2026', content: 'Information about safe play, limits, and support resources.' },
  { id: 'PAGE-003', title: 'Terms & Conditions', slug: '/terms-and-conditions', language: 'English', status: 'Published', updated: '10 Oct 2026', content: 'The terms that govern use of the platform.' },
  { id: 'PAGE-004', title: 'Privacy Policy', slug: '/privacy-policy', language: 'English', status: 'Draft', updated: '09 Oct 2026', content: 'How player information is handled in this demo copy.' },
  { id: 'PAGE-005', title: 'FAQ', slug: '/faq', language: 'English', status: 'Published', updated: '08 Oct 2026', content: 'Answers to common player questions.' },
]
function CmsPagesPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [pages, setPages] = useState<CmsContentPage[]>(INITIAL_CMS_PAGES)
  const [search, setSearch] = useState('')
  const [activePage, setActivePage] = useState<CmsContentPage | null>(null)
  const [draft, setDraft] = useState({ title: '', slug: '', language: 'English', content: '' })
  const [creating, setCreating] = useState(false)
  const shown = pages.filter((item) => (item.title + ' ' + item.slug + ' ' + item.content).toLowerCase().includes(search.toLowerCase()))
  const savePage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.slug.trim() || !draft.content.trim()) return
    const created: CmsContentPage = { id: 'PAGE-' + String(pages.length + 1).padStart(3, '0'), title: draft.title.trim(), slug: draft.slug.startsWith('/') ? draft.slug : '/' + draft.slug, language: draft.language, status: 'Draft', updated: '19 Oct 2026', content: draft.content.trim() }
    setPages((current) => [created, ...current])
    setDraft({ title: '', slug: '', language: 'English', content: '' })
    setCreating(false)
    onNotify('Content page saved as a local draft.')
  }
  const toggleStatus = (id: string) => setPages((current) => current.map((item) => item.id === id ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published', updated: '19 Oct 2026' } : item))
  return <div className="page-enter space-y-5">
    <SectionHeading title="Pages" description="Manage the static information pages shown to players." actions={<Button onClick={() => setCreating((current) => !current)}><Plus className="h-4 w-4" /> New page</Button>} />
    {creating ? <Card><CardHeader><CardTitle>Create content page</CardTitle><CardDescription>Draft a new player-facing information page.</CardDescription></CardHeader><CardContent><form onSubmit={savePage} className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Title</span><Input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Page title" /></label>
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">URL slug</span><Input required value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="/page-name" /></label>
      <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Language</span><select value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs"><option>English</option><option>French</option><option>Arabic</option></select></label>
      <label className="space-y-1.5 md:col-span-2"><span className="block text-xs font-medium text-slate-600">Content</span><textarea rows={4} required value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Page content…" className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><Button variant="outline" type="button" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit">Save draft</Button></div>
    </form></CardContent></Card> : null}
    <Card><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-800">{shown.length} content pages</p><div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages…" className="pl-9" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] table-fixed text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-[29%] px-4 py-2.5 font-medium">Page</th><th className="w-[22%] px-4 py-2.5 font-medium">Slug</th><th className="w-[15%] px-4 py-2.5 font-medium">Language</th><th className="w-[14%] px-4 py-2.5 font-medium">Updated</th><th className="w-[10%] px-4 py-2.5 font-medium">Status</th><th className="w-[10%] px-4 py-2.5" /></tr></thead><tbody>{shown.map((item) => <tr key={item.id} className="border-b border-slate-100 text-xs hover:bg-slate-50"><td className="px-4 py-3"><button type="button" onClick={() => setActivePage(item)} className="text-left font-medium text-slate-800 hover:underline">{item.title}</button><p className="mt-1 font-mono text-[9px] text-slate-400">{item.id}</p></td><td className="truncate px-4 py-3 font-mono text-[11px] text-slate-500">{item.slug}</td><td className="px-4 py-3 text-slate-600">{item.language}</td><td className="px-4 py-3 text-slate-500">{item.updated}</td><td className="px-4 py-3"><Badge variant={item.status === 'Published' ? 'success' : 'outline'}>{item.status}</Badge></td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => toggleStatus(item.id)}>{item.status === 'Published' ? 'Unpublish' : 'Publish'}</Button></td></tr>)}</tbody></table></div></CardContent></Card>
    <Modal open={!!activePage} onOpenChange={(open) => { if (!open) setActivePage(null) }} title={activePage ? activePage.title : 'Page preview'} description={activePage ? activePage.slug + ' · ' + activePage.language : undefined}><div className="space-y-3"><div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">{activePage?.content}</div><div className="flex justify-end"><Button variant="outline" onClick={() => setActivePage(null)}>Close</Button></div></div></Modal>
    <p className="text-[10px] text-slate-400">Content editing and publication states are local preview data.</p>
  </div>
}

type CmsSkinGame = {
  id: string
  title: string
  provider: string
  category: string
  rtp: string
  players: string
  categories: string[]
  categoryExpirations: Record<string, string>
  showOnPage: string[]
  gameParameters: string[]
  badge: string
  active: boolean
  description: string
  iconImage: string
  backgroundImage: string
  certificateNumber: string
  betLimitCurrency: string
  betLimitMin: string
  betLimitMax: string
  skin: string
  status: 'Active' | 'Draft' | 'Paused'
  art: string
  updated: string
}
const INITIAL_CMS_SKIN_GAMES: CmsSkinGame[] = [
  { id: 'GM-001', title: 'Zeus vs Hades', provider: 'Demo Studio', category: 'Slots', rtp: '96.40%', players: '1,248', categories: ['Video Slots', 'New', 'Popular Games'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'new', active: true, description: 'A mythology-themed slot adventure.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Mythology Gold', status: 'Active', art: 'from-indigo-950 via-violet-800 to-amber-500', updated: '18 Oct 2026' },
  { id: 'GM-002', title: 'Wild Clusters', provider: 'Play’n GO', category: 'Slots', rtp: '96.10%', players: '982', categories: ['Video Slots', 'Megaways'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: '', active: true, description: 'A cascading reel slot game.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Emerald Reels', status: 'Active', art: 'from-emerald-950 via-green-800 to-lime-500', updated: '17 Oct 2026' },
  { id: 'GM-003', title: 'Roulette Royale', provider: 'Evolution', category: 'Live casino', rtp: '97.30%', players: '764', categories: ['Live Dealer', 'Table Games'], categoryExpirations: {}, showOnPage: [], gameParameters: ['Play Now'], badge: 'top', active: true, description: 'Live roulette from a royal gaming table.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Royal Table', status: 'Active', art: 'from-slate-950 via-red-950 to-amber-600', updated: '16 Oct 2026' },
  { id: 'GM-004', title: 'Lightning Blackjack', provider: 'Evolution', category: 'Live casino', rtp: '99.10%', players: '538', categories: ['Live Dealer', 'Table Games'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now'], badge: '', active: true, description: 'Live blackjack with fast-paced rounds.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Royal Table', status: 'Active', art: 'from-slate-950 via-red-950 to-amber-600', updated: '16 Oct 2026' },
  { id: 'GM-005', title: 'Rocket Rush', provider: 'Demo Studio', category: 'Crash', rtp: '97.00%', players: '1,105', categories: ['Crash Games', 'New'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'promo', active: false, description: 'A fast-paced crash-style game.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Neon Rush', status: 'Paused', art: 'from-blue-950 via-cyan-800 to-fuchsia-500', updated: '14 Oct 2026' },
  { id: 'GM-006', title: 'Golden Pharaoh', provider: 'Pragmatic Play', category: 'Slots', rtp: '96.50%', players: '416', categories: ['Video Slots', 'Jackpots'], categoryExpirations: {}, showOnPage: ['Home'], gameParameters: ['Play Now', 'For Fun'], badge: 'jackpot', active: true, description: 'An Egyptian-themed slot adventure.', iconImage: '', backgroundImage: '', certificateNumber: '', betLimitCurrency: 'EUR', betLimitMin: '', betLimitMax: '', skin: 'Mythology Gold', status: 'Active', art: 'from-amber-950 via-yellow-800 to-orange-500', updated: '15 Oct 2026' },
]
const SKIN_GAME_CATEGORY_OPTIONS = [
  'Achievements Slots', 'Age of the Gods', 'All', 'All Games', 'Arcade Games', 'Autumn Slots',
  'Award Winners', 'Betting Games', 'BFTH Casino', 'BFTH Live Casino', 'BFTH Live Dealer', 'BFTH Slots',
  'Buy Bonus', 'Choice', 'Crash Games', 'Drops & Wins Slots', 'EGT Black Friday', 'Exclusive', 'Finished',
  'Fire Blaze Jackpots', 'Fishing & Hunting', 'From R$0,01', 'Halloween', 'Hidden', 'Highest Multiplier',
  'Instant Game', 'Jackpot Mania', 'Jackpots', 'LAUNCH GAMES', 'Live Dealer', 'Lottery Games', 'Mega jackpot',
  'Megaways', 'Mini Games', 'Must Drop Jackpots', 'New', 'Olimpiada Sloturilor', 'Ongoing', 'PG Soft',
  'Popular Games', 'Prize and Drops', 'Scratch Games', 'Skill Games', 'SLOTS FOR BONUSES', 'Table Games',
  'Tiki Ques', 'Tv Games', 'Upcoming', 'Video Bingo', 'Video Poker', 'Video Slots', 'Virtual Betting',
]
const SKIN_GAME_PROVIDER_OPTIONS = [
  '7777 Gaming', '77GAMING', 'Aardvark', 'AGT', 'AMAtic', 'AVIATRIX', 'AbraCadabra', 'Arcadem',
  'CT INTERACTIVE', 'Armadillo Studios', 'Advant Play', 'FBastard', 'Thunderspin', 'AGTsoftware',
  'Air Dice', 'Amigo Gaming', 'MASCOT', 'Apollo Games', 'Apparat', 'Suprema Games', 'BETCONSTRUCT',
  'Spinoro', 'Aspect Gaming', 'SYnot', 'Amatic', 'TomHorn', 'Atlas-V', 'Aura Gaming', 'AvatarUX',
  'Aviator Studio', 'Aviatrix', 'Babylon', 'Banana Games', 'BETgames', 'Barbara Bang', 'BOOMing Games',
  'Big Daddy', 'Endorphina', 'Betora', 'Netent', 'EVOlution', 'EZugi', 'BF GAMES', 'Big Time Gaming',
  'Bragg', 'BGaming', '3 Oaks Gaming', 'GreenTube', 'BIG TIME GAMING', 'Bahatika', 'F*Bastards',
  'KAGaming', 'National Lottery', 'Lagio Studio', 'Blueprint', 'Belatra', 'BOOMING Games', '3 Oaks GAMING',
  'Play’n Go', 'PLAYTECH', 'PLAYTECH LIVE', 'Bitville Roulette', 'BetRadarLotto', 'RED TIGER', 'Kiron',
  'Smartsoft', 'Betradar', 'Slot Builder', 'SPribe', 'BETSOFT', 'BetGames BetShop', 'SA Gaming',
  'Superlotto', 'Splitthepot', 'TV BET', 'BETGAMES', 'ICONIC21', 'Betsolutions', 'Lucky Numbers',
  'VIVO Gaming', 'Bally Wulff', 'Betxpro', 'Caleta', 'CandleBets', 'Comtrade Gaming', 'Champion',
  'Kiss Live Casino', 'Celestar', 'Spinexis', 'Capecod', 'CP Games', 'COLOSSUS', 'CT Interactive',
  'Clawbuster', 'CasinoWM', 'Cozmo Play', 'Dubibet', 'DLV', 'Dream Gaming', 'Dream Play',
  'Darpha Studios', 'Player Bets', 'EURASIAN Gaming', 'Eclipse', 'EYECON', 'Merkur games',
  'ENDORPHINA', 'EZUGI', 'EVOLUTION', 'The Better Platform', 'EGT Digital', 'E-Gaming', 'AMUSNET',
  'ELA Games', 'Elbet', 'ELK Studios', 'Spearhead', 'EvoPersia', 'Esa Gaming', 'Demo Studio',
  'Play’n GO', 'Evolution', 'Pragmatic Play', 'NetEnt',
]
const SKIN_GAME_ART_PRESETS = [
  { label: 'Mythology Gold', art: 'from-indigo-950 via-violet-800 to-amber-500' },
  { label: 'Emerald Reels', art: 'from-emerald-950 via-green-800 to-lime-500' },
  { label: 'Royal Table', art: 'from-slate-950 via-red-950 to-amber-600' },
  { label: 'Neon Rush', art: 'from-blue-950 via-cyan-800 to-fuchsia-500' },
  { label: 'Midnight Gold', art: 'from-slate-950 via-slate-800 to-yellow-600' },
  { label: 'Minimal Light', art: 'from-slate-100 via-slate-200 to-slate-400' },
]
const SKIN_GAME_BADGES = [
  { value: '', label: 'None' }, { value: 'new', label: 'New' }, { value: 'promo', label: 'Promo' },
  { value: 'jackpot', label: 'Jackpot' }, { value: 'top', label: 'Top' }, { value: 'exclusive', label: 'Exclusive' },
  { value: 'vpn', label: 'VPN' }, { value: 'tournament', label: 'Tournament' }, { value: 'hot', label: 'Hot' },
  { value: 'ortak', label: 'Ortak' }, { value: 'trending', label: 'Trending' },
]
function CmsSkinGamesPage({ games, onSaveGame, onMoveGame, onNotify }: { games: CmsSkinGame[]; onSaveGame: (game: CmsSkinGame) => void; onMoveGame: (draggedId: string, targetId: string) => void; onNotify: (message: string) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | CmsSkinGame['status']>('All')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [openFilter, setOpenFilter] = useState<'categories' | 'providers' | null>(null)
  const [categorySearch, setCategorySearch] = useState('')
  const [providerSearch, setProviderSearch] = useState('')
  const [draggedGameId, setDraggedGameId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CmsSkinGame | null>(null)
  const [editCategorySearch, setEditCategorySearch] = useState('')
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false)
  const [showBetLimits, setShowBetLimits] = useState(false)
  const [showRegulationInfo, setShowRegulationInfo] = useState(false)
  const categoryOptions = SKIN_GAME_CATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(categorySearch.toLowerCase()))
  const providerOptions = SKIN_GAME_PROVIDER_OPTIONS.filter((item, index, all) => all.indexOf(item) === index).filter((item) => item.toLowerCase().includes(providerSearch.toLowerCase()))
  const editCategoryOptions = SKIN_GAME_CATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(editCategorySearch.toLowerCase()))
  const shown = games.filter((item) =>
    (statusFilter === 'All' || item.status === statusFilter)
    && (selectedCategories.length === 0 || item.categories.some((category) => selectedCategories.includes(category)))
    && (selectedProviders.length === 0 || selectedProviders.includes(item.provider))
    && (item.title + ' ' + item.provider + ' ' + item.category + ' ' + item.categories.join(' ') + ' ' + item.skin).toLowerCase().includes(search.toLowerCase())
  )
  const toggleCategory = (category: string) => setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])
  const toggleProvider = (provider: string) => setSelectedProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider])
  const openEditor = (game: CmsSkinGame) => {
    setEditDraft({ ...game, categories: [...game.categories], categoryExpirations: { ...game.categoryExpirations }, showOnPage: [...game.showOnPage], gameParameters: [...game.gameParameters] })
    setEditCategorySearch('')
    setShowEditCategoryPicker(false)
    setShowBetLimits(false)
    setShowRegulationInfo(false)
  }
  const patchDraft = (patch: Partial<CmsSkinGame>) => setEditDraft((current) => current ? { ...current, ...patch } : current)
  const toggleDraftArray = (key: 'categories' | 'showOnPage' | 'gameParameters', value: string) => setEditDraft((current) => {
    if (!current) return current
    const currentValues = current[key]
    const nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value]
    if (key === 'categories') {
      const categoryExpirations = { ...current.categoryExpirations }
      if (currentValues.includes(value)) delete categoryExpirations[value]
      return { ...current, categories: nextValues, category: nextValues[0] || '', categoryExpirations }
    }
    return { ...current, [key]: nextValues }
  })
  const saveEditedGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editDraft) return
    const saved: CmsSkinGame = { ...editDraft, category: editDraft.categories[0] || '', status: !editDraft.active ? 'Paused' : (editDraft.status === 'Paused' ? 'Active' : editDraft.status), updated: '19 Oct 2026' }
    onSaveGame(saved)
    setEditDraft(null)
    setShowEditCategoryPicker(false)
    onNotify('Game details saved in this local CMS preview. Publishing is not connected.')
  }
  const resetFilters = () => {
    setSelectedCategories([])
    setSelectedProviders([])
    setCategorySearch('')
    setProviderSearch('')
    setSearch('')
    setStatusFilter('All')
    setOpenFilter(null)
  }
  const multiSelectButtonClass = 'flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-left text-xs text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200'
  const fieldClass = 'h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-100'
  const labelClass = 'mb-1.5 block text-[11px] font-medium text-slate-600'
  const sectionClass = 'rounded-lg border border-slate-200 bg-white p-4'
  const inlineCheckClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-600 hover:bg-slate-50'
  return <div className="page-enter space-y-5">
    <Card>
      <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><div><CardTitle>Game filters</CardTitle><CardDescription className="mt-1">Filter the website game catalogue by category and provider.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Reset filters</Button></div></CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        <div className="relative min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Categories</label>
          <button type="button" aria-expanded={openFilter === 'categories'} onClick={() => setOpenFilter((current) => current === 'categories' ? null : 'categories')} className={multiSelectButtonClass}>
            <span className="truncate">{selectedCategories.length === 0 ? '0 selected' : selectedCategories.length + ' selected'}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', openFilter === 'categories' && 'rotate-180')} />
          </button>
          {openFilter === 'categories' ? <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2.5"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search categories…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={categoryOptions.length > 0 && categoryOptions.every((item) => selectedCategories.includes(item))} onChange={() => setSelectedCategories((current) => categoryOptions.every((item) => current.includes(item)) ? current.filter((item) => !categoryOptions.includes(item)) : [...new Set([...current, ...categoryOptions])])} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-800" /> Select All</label>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5">{categoryOptions.map((category) => <li key={category}><label className={inlineCheckClass}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} className="h-3.5 w-3.5 accent-slate-800" /><span>{category}</span></label></li>)}{categoryOptions.length === 0 ? <li className="px-2 py-5 text-center text-xs text-slate-400">No categories match your search.</li> : null}</ul>
          </div> : null}
        </div>
        <div className="relative min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Providers</label>
          <button type="button" aria-expanded={openFilter === 'providers'} onClick={() => setOpenFilter((current) => current === 'providers' ? null : 'providers')} className={multiSelectButtonClass}>
            <span className="truncate">{selectedProviders.length === 0 ? '0 selected' : selectedProviders.length + ' selected'}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', openFilter === 'providers' && 'rotate-180')} />
          </button>
          {openFilter === 'providers' ? <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2.5"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="Search providers…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={providerOptions.length > 0 && providerOptions.every((item) => selectedProviders.includes(item))} onChange={() => setSelectedProviders((current) => providerOptions.every((item) => current.includes(item)) ? current.filter((item) => !providerOptions.includes(item)) : [...new Set([...current, ...providerOptions])])} className="h-3.5 w-3.5 accent-slate-800" /> Select All</label>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5">{providerOptions.map((provider) => <li key={provider}><label className={inlineCheckClass}><input type="checkbox" checked={selectedProviders.includes(provider)} onChange={() => toggleProvider(provider)} className="h-3.5 w-3.5 accent-slate-800" /><span>{provider}</span></label></li>)}{providerOptions.length === 0 ? <li className="px-2 py-5 text-center text-xs text-slate-400">No providers match your search.</li> : null}</ul>
          </div> : null}
        </div>
      </CardContent>
    </Card>
    <Card><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search games by name, provider, category…" className="pl-9" /></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={fieldClass}><option>All</option><option>Active</option><option>Draft</option><option>Paused</option></select></div></div><p className="mt-3 text-[11px] text-slate-400">Showing {shown.length} of {games.length} games</p>
       <div className="mt-4 overflow-x-auto">
         <table className="w-full min-w-[860px] table-fixed text-left">
           <thead><tr className="border-y border-slate-200 bg-slate-50 text-[11px] text-slate-500"><th className="w-10 px-2 py-2.5" aria-label="Reorder games"></th><th className="w-[26%] px-3 py-2.5 font-medium">Game</th><th className="w-[15%] px-3 py-2.5 font-medium">Provider</th><th className="w-[17%] px-3 py-2.5 font-medium">Categories</th><th className="w-[15%] px-3 py-2.5 font-medium">Skin</th><th className="w-[10%] px-3 py-2.5 font-medium">Status</th><th className="w-[14%] px-3 py-2.5 text-right">Action</th></tr></thead>
           <tbody>{shown.map((game) => <tr key={game.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move" }} onDrop={(event) => { event.preventDefault(); const movingId = event.dataTransfer.getData("text/plain") || draggedGameId; if (movingId && movingId !== game.id) { onMoveGame(movingId, game.id); onNotify("Game order updated in the local CMS preview.") } setDraggedGameId(null) }} className={cn("group/game-row border-b border-slate-100 text-xs transition-colors hover:bg-slate-50/80", draggedGameId === game.id && "opacity-40")}>
             <td className="px-2 py-3"><span draggable role="button" tabIndex={0} aria-label={"Drag to reorder " + game.title} title="Drag to reorder" onDragStart={(event) => { event.dataTransfer.setData("text/plain", game.id); event.dataTransfer.effectAllowed = "move"; setDraggedGameId(game.id) }} onDragEnd={() => setDraggedGameId(null)} className="inline-flex cursor-grab items-center justify-center rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span></td>
             <td className="px-3 py-3"><div className="flex items-center gap-3"><div className={cn("h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br", game.art)}>{game.iconImage ? <img src={game.iconImage} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{game.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{game.id}</p></div></div></td>
             <td className="px-3 py-3 text-slate-600">{game.provider}</td>
             <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{game.categories.slice(0, 2).map((category) => <span key={category} className="rounded bg-slate-100 px-1.5 py-1 text-[9px] text-slate-600">{category}</span>)}{game.categories.length > 2 ? <span className="text-[9px] text-slate-400">+{game.categories.length - 2}</span> : null}</div></td>
             <td className="px-3 py-3 text-slate-600">{game.skin}</td>
             <td className="px-3 py-3"><Badge variant={game.status === "Active" ? "success" : game.status === "Draft" ? "warning" : "outline"}>{game.status}</Badge><p className="mt-1 text-[9px] text-slate-400">{game.active ? "Enabled" : "Inactive"}</p></td>
             <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" onClick={() => openEditor(game)}><Pencil className="h-3.5 w-3.5" /> Edit Game</Button></td>
           </tr>)}</tbody>
         </table>
         {shown.length === 0 ? <div className="py-12 text-center text-xs text-slate-400">No games match these filters.</div> : null}
         <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Drag the grip beside a game to change its order. Game ordering remains local to this preview.</p>
       </div>
     </CardContent></Card>

    <Modal open={!!editDraft} onOpenChange={(open) => { if (!open) { setEditDraft(null); setShowEditCategoryPicker(false) } }} title={editDraft ? 'Edit Game - ' + editDraft.title : 'Edit Game'} description={editDraft ? editDraft.provider + ' · ' + editDraft.id : undefined} size="full" footer={editDraft ? <><Button type="button" variant="outline" onClick={() => { setEditDraft(null); setShowEditCategoryPicker(false) }}>Cancel</Button><Button type="submit" form="skin-game-edit-form"><Check className="h-4 w-4" /> Save</Button></> : null}>
      {editDraft ? <form id="skin-game-edit-form" onSubmit={saveEditedGame} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Assign categories and optional expiration dates.</p>
            <button type="button" onClick={() => setShowEditCategoryPicker((open) => !open)} className={cn(fieldClass, 'mt-3 flex items-center justify-between text-left')}><span>Add categories</span><ChevronDown className={cn('h-4 w-4 transition-transform', showEditCategoryPicker && 'rotate-180')} /></button>
            {showEditCategoryPicker ? <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
              <div className="border-b border-slate-100 p-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={editCategorySearch} onChange={(event) => setEditCategorySearch(event.target.value)} placeholder="Search categories…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400" /></div>
                <label className={cn(inlineCheckClass, 'mt-1 font-medium')}><input type="checkbox" checked={editCategoryOptions.length > 0 && editCategoryOptions.every((item) => editDraft.categories.includes(item))} onChange={() => setEditDraft((current) => { if (!current) return current; const addAll = !editCategoryOptions.every((item) => current.categories.includes(item)); const categories = addAll ? [...new Set([...current.categories, ...editCategoryOptions])] : current.categories.filter((item) => !editCategoryOptions.includes(item)); return { ...current, categories, category: categories[0] || '', categoryExpirations: Object.fromEntries(Object.entries(current.categoryExpirations).filter(([key]) => categories.includes(key))) } })} className="h-3.5 w-3.5 accent-slate-800" /> Select All</label>
              </div>
              <div className="max-h-44 overflow-y-auto p-1">{editCategoryOptions.map((category) => <label key={category} className={inlineCheckClass}><input type="checkbox" checked={editDraft.categories.includes(category)} onChange={() => toggleDraftArray('categories', category)} className="h-3.5 w-3.5 accent-slate-800" /><span>{category}</span></label>)}{editCategoryOptions.length === 0 ? <p className="px-2 py-4 text-center text-xs text-slate-400">No categories match.</p> : null}</div>
            </div> : null}
            <div className="mt-3 space-y-2">{editDraft.categories.map((category) => <div key={category} className="rounded-md border border-slate-200 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-700">{category}</span><button type="button" aria-label={'Remove ' + category} onClick={() => toggleDraftArray('categories', category)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div><label className="mt-2 block"><span className="mb-1 block text-[10px] text-slate-500">Expiration date (optional)</span><input type="date" value={editDraft.categoryExpirations[category] || ''} onChange={(event) => patchDraft({ categoryExpirations: { ...editDraft.categoryExpirations, [category]: event.target.value } })} className={fieldClass} /></label></div>)}{editDraft.categories.length === 0 ? <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">No categories assigned.</p> : null}</div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Display settings</h3>
            <div className="mt-3"><p className={labelClass}>Show on Page</p><div className="space-y-1 rounded-md border border-slate-200 p-2">{['Home'].map((pageName) => <label key={pageName} className={inlineCheckClass}><input type="checkbox" checked={editDraft.showOnPage.includes(pageName)} onChange={() => toggleDraftArray('showOnPage', pageName)} className="h-3.5 w-3.5 accent-slate-800" /><span>{pageName}</span></label>)}</div></div>
            <div className="mt-4"><p className={labelClass}>Game Parameters</p><div className="space-y-1 rounded-md border border-slate-200 p-2">{['Play Now', 'For Fun', 'View Mode'].map((parameter) => <label key={parameter} className={cn(inlineCheckClass, parameter === 'View Mode' && 'cursor-not-allowed opacity-50')}><input type="checkbox" disabled={parameter === 'View Mode'} checked={editDraft.gameParameters.includes(parameter)} onChange={() => toggleDraftArray('gameParameters', parameter)} className="h-3.5 w-3.5 accent-slate-800" /><span>{parameter}</span>{parameter === 'View Mode' ? <span className="ml-auto text-[9px]">Unavailable</span> : null}</label>)}</div></div>
            <div className="mt-4"><label className="block"><span className={labelClass}>Badge</span><select value={editDraft.badge} onChange={(event) => patchDraft({ badge: event.target.value })} className={fieldClass}>{SKIN_GAME_BADGES.map((badge) => <option key={badge.value || 'none'} value={badge.value}>{badge.label}</option>)}</select></label></div>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-3"><span><span className="block text-xs font-semibold text-slate-800">Active</span><span className="mt-1 block text-[10px] text-slate-500">Make this game available on the website.</span></span><input type="checkbox" checked={editDraft.active} onChange={(event) => patchDraft({ active: event.target.checked })} className="h-4 w-4 accent-slate-900" /></label>
            <div className="mt-4"><label className="block"><span className={labelClass}>Skin preset</span><select value={editDraft.skin} onChange={(event) => { const preset = SKIN_GAME_ART_PRESETS.find((item) => item.label === event.target.value); patchDraft({ skin: event.target.value, art: preset?.art || editDraft.art }) }} className={fieldClass}>{[editDraft.skin, ...SKIN_GAME_ART_PRESETS.map((item) => item.label)].filter((item, index, all) => all.indexOf(item) === index).map((item) => <option key={item}>{item}</option>)}</select></label></div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900">Game details</h3>
            <div className="mt-3"><p className={labelClass}>Game</p><p className="rounded-md bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800">{editDraft.title}</p><p className="mt-1 text-[10px] text-slate-400">ID: {editDraft.id} · Provider: {editDraft.provider}</p></div>
            <label className="mt-4 block"><span className={labelClass}>Description</span><textarea rows={7} value={editDraft.description} onChange={(event) => patchDraft({ description: event.target.value })} placeholder="Game description…" className="w-full resize-y rounded-md border border-input bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:ring-2 focus:ring-slate-100" /></label>
            <div className="mt-4"><button type="button" aria-expanded={showBetLimits} onClick={() => setShowBetLimits((open) => !open)} className="flex w-full items-center justify-between border-t border-slate-200 py-3 text-left text-xs font-semibold text-slate-700"><span>Bet Limits</span><ChevronDown className={cn('h-4 w-4 transition-transform', showBetLimits && 'rotate-180')} /></button>{showBetLimits ? <div className="grid gap-2 sm:grid-cols-3"><label><span className={labelClass}>Currency</span><select value={editDraft.betLimitCurrency} onChange={(event) => patchDraft({ betLimitCurrency: event.target.value })} className={fieldClass}>{['EUR','USD','GBP','BRL'].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label><span className={labelClass}>Minimum</span><Input type="number" min="0" value={editDraft.betLimitMin} onChange={(event) => patchDraft({ betLimitMin: event.target.value })} placeholder="Min bet" className="h-9 text-xs" /></label><label><span className={labelClass}>Maximum</span><Input type="number" min="0" value={editDraft.betLimitMax} onChange={(event) => patchDraft({ betLimitMax: event.target.value })} placeholder="Max bet" className="h-9 text-xs" /></label></div> : null}</div>
            <div><button type="button" aria-expanded={showRegulationInfo} onClick={() => setShowRegulationInfo((open) => !open)} className="flex w-full items-center justify-between border-t border-slate-200 py-3 text-left text-xs font-semibold text-slate-700"><span>Regulation Info</span><ChevronDown className={cn('h-4 w-4 transition-transform', showRegulationInfo && 'rotate-180')} /></button>{showRegulationInfo ? <label className="block"><span className={labelClass}>Certification Report Number</span><Input value={editDraft.certificateNumber} onChange={(event) => patchDraft({ certificateNumber: event.target.value })} placeholder="Certification report number" className="h-9 text-xs" /></label> : null}</div>
          </section>
        </div>

        <section className={sectionClass}>
          <h3 className="text-sm font-semibold text-slate-900">Images</h3>
          <p className="mt-1 text-[10px] text-slate-500">Choose a preview style or upload an image (440 × 310).</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div><p className={labelClass}>Game icon (440 × 310)</p><div className="grid grid-cols-3 gap-2">{SKIN_GAME_ART_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => patchDraft({ iconImage: '', art: preset.art })} className={cn('overflow-hidden rounded-md border p-1.5 text-left', editDraft.art === preset.art && !editDraft.iconImage ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400')}><div className={cn('h-14 rounded bg-gradient-to-br', preset.art)} /><span className="mt-1 block truncate text-[9px] text-slate-600">{preset.label}</span></button>)}</div><label className="mt-3 block"><span className="sr-only">Upload game icon</span><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) patchDraft({ iconImage: URL.createObjectURL(file) }) }} className="block w-full text-[10px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700" /></label>{editDraft.iconImage ? <img src={editDraft.iconImage} alt="Game icon preview" className="mt-2 h-20 w-28 rounded-md border border-slate-200 object-cover" /> : null}</div>
            <div><p className={labelClass}>Background</p><div className="grid grid-cols-3 gap-2">{SKIN_GAME_ART_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => patchDraft({ backgroundImage: preset.art })} className={cn('overflow-hidden rounded-md border p-1.5 text-left', editDraft.backgroundImage === preset.art ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400')}><div className={cn('h-14 rounded bg-gradient-to-br', preset.art)} /><span className="mt-1 block truncate text-[9px] text-slate-600">{preset.label}</span></button>)}</div><label className="mt-3 block"><span className="sr-only">Upload background image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) patchDraft({ backgroundImage: URL.createObjectURL(file) }) }} className="block w-full text-[10px] text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700" /></label>{editDraft.backgroundImage && editDraft.backgroundImage.startsWith('blob:') ? <img src={editDraft.backgroundImage} alt="Background preview" className="mt-2 h-20 w-full rounded-md border border-slate-200 object-cover" /> : null}</div>
          </div>
        </section>
      </form> : null}
    </Modal>
    <p className="text-[10px] text-slate-400">The game editor saves changes to this browser session's local CMS preview. A live catalogue API or publishing endpoint is not connected here.</p>
  </div>
}

type CmsProvider = { id: string; name: string; providerCode: string; badge: boolean }
const INITIAL_CMS_PROVIDERS: CmsProvider[] = [
  { id: 'PRV-001', name: 'Evolution', providerCode: 'EVO', badge: false },
  { id: 'PRV-002', name: 'Pragmatic Play', providerCode: 'TPG', badge: false },
  { id: 'PRV-003', name: 'Play’n GO', providerCode: 'PNG', badge: false },
  { id: 'PRV-004', name: 'Demo Studio', providerCode: 'DEM', badge: false },
  { id: 'PRV-005', name: 'NetEnt', providerCode: 'NET', badge: false },
]

type ProviderSortKey = 'name' | 'id' | 'providerCode'
function CmsProvidersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [providers, setProviders] = useState<CmsProvider[]>(INITIAL_CMS_PROVIDERS)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ProviderSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null)

  const filteredProviders = providers.filter((item) => (item.name + ' ' + item.id + ' ' + item.providerCode).toLowerCase().includes(search.toLowerCase()))
  const shown = sortKey
    ? [...filteredProviders].sort((left, right) => {
        const compare = left[sortKey].localeCompare(right[sortKey], undefined, { numeric: true, sensitivity: 'base' })
        return sortDirection === 'asc' ? compare : -compare
      })
    : filteredProviders

  const sortBy = (key: ProviderSortKey) => {
    if (sortKey === key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }
  const reorderProvider = (targetId: string, movingId: string) => {
    if (targetId === movingId) return
    setProviders((current) => {
      const next = [...current]
      const from = next.findIndex((item) => item.id === movingId)
      const to = next.findIndex((item) => item.id === targetId)
      if (from < 0 || to < 0) return current
      const [moving] = next.splice(from, 1)
      if (!moving) return current
      next.splice(to, 0, moving)
      return next
    })
    setSortKey(null)
    setSortDirection('asc')
    onNotify('Provider order updated in this local preview.')
  }
  const toggleBadge = (id: string) => {
    setProviders((current) => current.map((item) => item.id === id ? { ...item, badge: !item.badge } : item))
    onNotify('Provider badge updated in this local preview.')
  }
  const resetTable = () => {
    setProviders(INITIAL_CMS_PROVIDERS)
    setSearch('')
    setSortKey(null)
    setSortDirection('asc')
    onNotify('Provider table reset.')
  }

  const sortButton = (key: ProviderSortKey, label: string) => (
    <button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1.5 text-left hover:text-slate-900">
      <span>{label}</span>
      <span className="text-[10px] text-slate-300">{sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return <div className="page-enter min-w-0 w-full space-y-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none lg:w-1/2">
    <div className="flex min-h-[54px] items-center border-b border-slate-200 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">Providers</h2>
    </div>

    <div className="border-b border-slate-200 p-3 sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search providers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" autoComplete="off" className="h-9 rounded-md border-slate-200 bg-white pl-9 text-xs placeholder:text-slate-400 focus:bg-white" />
        </div>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-md" aria-label="Reset provider table" title="Reset table" onClick={resetTable}><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>
    </div>

    <div className="admin-scrollbar w-full overflow-auto">
      <table className="w-full min-w-[540px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="w-[38%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('name', 'Provider Title')}</th>
            <th className="w-[24%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('id', 'id')}</th>
            <th className="w-[20%] border-b border-slate-200 bg-white px-3 py-3 text-[11px] font-medium text-slate-600">{sortButton('providerCode', 'Provider')}</th>
            <th className="w-[18%] border-b border-slate-200 bg-white px-3 py-3 text-right text-[11px] font-medium text-slate-600">Tools</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((item, index) => <tr
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', item.id)
              event.dataTransfer.effectAllowed = 'move'
              setDraggedProviderId(item.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const movingId = event.dataTransfer.getData('text/plain') || draggedProviderId
              if (movingId) reorderProvider(item.id, movingId)
              setDraggedProviderId(null)
            }}
            onDragEnd={() => setDraggedProviderId(null)}
            className={cn('group/provider-row cursor-grab transition-colors hover:bg-slate-50 active:cursor-grabbing', index % 2 === 1 && 'bg-slate-50/40', draggedProviderId === item.id && 'opacity-40')}
          >
            <td className="border-b border-slate-100 px-3 py-3 text-xs">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/provider-row:opacity-100" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.badge ? <Badge variant="success">Featured</Badge> : null}
                  </div>
                </div>
              </div>
            </td>
            <td className="border-b border-slate-100 px-3 py-3 font-mono text-[10px] text-slate-500">{item.id}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-xs text-slate-600">{item.providerCode}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-right">
              <Button type="button" variant="ghost" size="icon" className={cn('h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900', item.badge && 'text-emerald-700')} aria-label={'Change badge for ' + item.name} title="Change Badge" onClick={() => toggleBadge(item.id)}><BadgePercent className="h-4 w-4" /></Button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {shown.length === 0 ? <div className="border-b border-slate-100 px-4 py-10 text-center text-xs text-slate-400">No providers match your search.</div> : null}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
      <span>{shown.length} providers</span>
      <span>Drag rows to reorder</span>
    </div>
  </div>
}

function CmsCustomizationPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [theme, setTheme] = useState('Midnight')
  const [accent, setAccent] = useState('#E9B15B')
  const [cornerStyle, setCornerStyle] = useState('Rounded')
  const [fontStyle, setFontStyle] = useState('Modern Sans')
  const [compactCards, setCompactCards] = useState(false)
  const [showProviderNames, setShowProviderNames] = useState(true)
  const themes = [{ name: 'Midnight', description: 'Dark casino, warm gold accents', base: 'from-slate-950 to-amber-800' }, { name: 'Royal', description: 'Deep violet with premium highlights', base: 'from-violet-950 to-fuchsia-700' }, { name: 'Ocean', description: 'Cool blue, clean and modern', base: 'from-blue-950 to-cyan-600' }]
  const accents = [{ name: 'Gold', color: '#E9B15B' }, { name: 'Violet', color: '#8B5CF6' }, { name: 'Cyan', color: '#06B6D4' }, { name: 'Emerald', color: '#10B981' }, { name: 'Rose', color: '#F43F5E' }]
  const activeTheme = themes.find((item) => item.name === theme) ?? themes[0]
  return <div className="page-enter space-y-5">
    <SectionHeading title="Customization" description="Customize the casino brand presentation, themes, and lobby card appearance." actions={<Button onClick={() => onNotify('Customization saved in the local preview only.')}><Check className="h-4 w-4" /> Save preview</Button>} />
    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <Card><CardHeader><CardTitle>Theme presets</CardTitle><CardDescription>Pick a visual direction for the player-facing casino.</CardDescription></CardHeader><div className="space-y-3 px-5 pb-5">{themes.map((item) => <button key={item.name} type="button" onClick={() => setTheme(item.name)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', theme === item.name ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300')}><div className={cn('h-12 w-16 shrink-0 rounded-lg bg-gradient-to-br', item.base)} /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">{item.name}</span><span className="mt-1 block text-[10px] text-slate-500">{item.description}</span></span>{theme === item.name ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}</button>)}</div></Card>
      <div className="space-y-5">
        <Card><CardHeader><CardTitle>Brand accent</CardTitle><CardDescription>Preview accent color usage throughout the casino UI.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-3">{accents.map((item) => <button key={item.name} type="button" onClick={() => setAccent(item.color)} className={cn('flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition', accent === item.color ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300')}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />{item.name}</button>)}</div><div className={cn('mt-5 rounded-xl bg-gradient-to-br p-5 text-white', activeTheme.base)}><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/70">Live preview · {theme}</p><h3 className="mt-2 text-xl font-bold">Play your way</h3><p className="mt-1 text-xs text-white/70">Slots · Live Casino · New Releases</p><button type="button" className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-slate-950" style={{ backgroundColor: accent }}>Explore games</button></div></CardContent></Card>
        <Card><CardHeader><CardTitle>UI presentation</CardTitle><CardDescription>Additional display settings for casino content tiles.</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium text-slate-800">Compact game cards</p><p className="mt-1 text-[10px] text-slate-500">Use tighter spacing in game shelves.</p></div><input type="checkbox" checked={compactCards} onChange={(event) => setCompactCards(event.target.checked)} className="h-4 w-4 accent-slate-900" /></div>
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium text-slate-800">Show provider names</p><p className="mt-1 text-[10px] text-slate-500">Display provider labels under game titles.</p></div><input type="checkbox" checked={showProviderNames} onChange={(event) => setShowProviderNames(event.target.checked)} className="h-4 w-4 accent-slate-900" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Card corners</span><select value={cornerStyle} onChange={(event) => setCornerStyle(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs"><option>Square</option><option>Rounded</option><option>Soft</option></select></label><label className="space-y-1.5"><span className="block text-xs font-medium text-slate-600">Typography</span><select value={fontStyle} onChange={(event) => setFontStyle(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs"><option>Modern Sans</option><option>Geometric</option><option>Editorial</option></select></label></div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500">Current preview: {cornerStyle} cards · {fontStyle} · {compactCards ? 'compact spacing' : 'standard spacing'} · provider labels {showProviderNames ? 'visible' : 'hidden'}.</div>
        </CardContent></Card>
      </div>
    </div>
    <p className="text-[10px] text-slate-400">Appearance settings are local previews. They do not change the live storefront.</p>
  </div>
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceMode>(() => workspaceForPage(pageFromPath(window.location.pathname)))
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false)
  const [topSearchOpen, setTopSearchOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [themeName, setThemeName] = useState<'Default' | 'Violet' | 'Blue'>('Default')
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromPath(window.location.pathname))
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS)
  const [promotions, setPromotions] = useState<Offer[]>(INITIAL_PROMOTIONS)
  const [bonuses, setBonuses] = useState<Offer[]>(INITIAL_BONUSES)
  const [games, setGames] = useState<CmsSkinGame[]>(INITIAL_CMS_SKIN_GAMES)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [promotionOpen, setPromotionOpen] = useState(false)
  const [bonusOpen, setBonusOpen] = useState(false)
  const [bonusTypeChooserOpen, setBonusTypeChooserOpen] = useState(false)
  const [bonusWizardOpen, setBonusWizardOpen] = useState(false)
  const [bonusWizardType, setBonusWizardType] = useState('Deposit Bonus')
  const [userOpen, setUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => {
    const syncRoute = () => {
      const nextPage = pageFromPath(window.location.pathname)
      setActivePage(nextPage)
      setWorkspace(workspaceForPage(nextPage))
      setSelectedUser(null)
      setMobileNavOpen(false)
      setWorkspaceSwitcherOpen(false)
      setSearchQuery('')
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])
  const page = PAGE_INFO[activePage]

  function navigate(next: PageKey) {
    const nextPath = PAGE_PATHS[next]
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setActivePage(next)
    setWorkspace(workspaceForPage(next))
    setSelectedUser(null)
    setMobileNavOpen(false)
    setWorkspaceSwitcherOpen(false)
    setSearchQuery('')
  }

  function switchWorkspace(next: WorkspaceMode) {
    navigate(next === 'backoffice' ? 'overview' : 'cms-banners')
  }

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  function toggleUserStatus(id: string) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, status: current.status === 'Active' ? 'Suspended' : 'Active' } : current)
    notify('Sample account status updated in this preview.')
  }

  function savePlayerProfile(id: string, patch: Partial<UserRow>) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user))
    setSelectedUser((current) => current && current.id === id ? { ...current, ...patch } : current)
    notify('Demo player profile updated locally.')
  }

  function toggleOffer(kind: 'promotions' | 'bonuses', id: string) {
    const setter = kind === 'promotions' ? setPromotions : setBonuses
    setter((current) => current.map((offer) => offer.id === id ? { ...offer, status: offer.status === 'Active' ? 'Paused' : 'Active' } : offer))
    notify('Sample offer status updated in this preview.')
  }

  function toggleGame(id: string) {
    setGames((current) => current.map((game) => game.id === id ? { ...game, status: game.status === 'Active' ? 'Paused' : 'Active' } : game))
    notify('Sample game availability updated in this preview.')
  }

  function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const country = String(data.get('country') || 'Tunisia')
    const tier = String(data.get('tier') || 'Standard') as UserRow['tier']
    if (!name || !email) return
    const newUser: UserRow = { id: 'BC-' + String(20482 + users.length).padStart(6, '0'), name, email, country, joined: 'Oct 19, 2026', balance: '€0.00', status: 'Active', tier }
    setUsers((current) => [newUser, ...current])
    setUserOpen(false)
    setSearchQuery('')
    notify('Sample player added to this browser preview.')
  }

  function handleBonusWizardCreate(values: BonusWizardForm) {
    const bonusNumber = bonuses.length + 1
    const dateLabel = (value: string) => value ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
    const productChannel: Offer['channel'] = values.productType === 'Sportsbook' ? 'Sports' : values.productType === 'Casino + Sports' ? 'Both' : 'Casino'
    const endDate = dateLabel(values.programEnd)
    const bonus: Offer = {
      id: 'BN-' + String(bonusNumber).padStart(4, '0'),
      name: values.name.trim(), description: values.description.trim(), channel: productChannel,
      reward: values.calculationType === 'Percentage' ? values.bonusAmount + '% bonus' : values.bonusAmount + ' bonus',
      claims: '0', ends: endDate, status: 'Active', bonusType: bonusWizardType,
      productType: values.productType, expirationDate: dateLabel(values.expirationDate),
      expirationDays: values.expirationType === 'N Days After Activation' ? 'Configured by activation' : '—',
      startDate: dateLabel(values.programStart), endDate, platformDefinitionBonusId: '—',
    }
    setBonuses((current) => [bonus, ...current])
    setBonusWizardOpen(false)
    setBonusTypeChooserOpen(false)
    setActivePage('bonuses')
    setSearchQuery('')
    notify('Bonus created in the local preview. Nothing was published.')
  }

  function handleOfferSubmit(kind: 'promotion' | 'bonus', event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const description = String(data.get('description') || '').trim() || 'New offer preview.'
    const productType = String(data.get('productType') || 'Casino')
    const channel = (kind === 'bonus'
      ? productType === 'Sportsbook' ? 'Sports' : productType === 'Casino + Sports' ? 'Both' : 'Casino'
      : String(data.get('channel') || 'Casino')) as Offer['channel']
    const reward = String(data.get('reward') || (kind === 'bonus' ? 'Configured bonus' : '')).trim()
    const rawEndDate = String(data.get('ends') || '')
    const rawExpirationDate = String(data.get('expirationDate') || '')
    const rawStartDate = String(data.get('starts') || '')
    const formatDate = (rawDate: string) => rawDate ? new Date(rawDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    const ends = rawEndDate ? formatDate(rawEndDate) : 'Not set'
    const status = (kind === 'bonus' ? 'Active' : String(data.get('status') || 'Scheduled')) as Offer['status']
    if (!name || (kind === 'promotion' && !reward)) return
    const list = kind === 'promotion' ? promotions : bonuses
    const id = kind === 'promotion'
      ? 'PR-' + String(109 + list.length).padStart(4, '0')
      : 'BN-' + String(list.length + 1).padStart(4, '0')
    const offer: Offer = {
      id, name, description, channel, reward, claims: '0', ends, status,
      ...(kind === 'bonus' ? {
        bonusType: String(data.get('bonusType') || 'Deposit Bonus'),
        productType,
        expirationDate: formatDate(rawExpirationDate),
        expirationDays: String(data.get('expirationDays') || '30'),
        startDate: formatDate(rawStartDate),
        endDate: formatDate(rawEndDate),
        platformDefinitionBonusId: String(data.get('platformDefinitionBonusId') || '—').trim() || '—',
      } : {}),
    }
    if (kind === 'promotion') {
      setPromotions((current) => [offer, ...current])
      setPromotionOpen(false)
      navigate('promotions')
    } else {
      setBonuses((current) => [offer, ...current])
      setBonusOpen(false)
      navigate('bonuses')
    }
    notify('Sample ' + kind + ' added locally. Nothing was published.')
  }
  const createHeaderAction = () => {
    if (workspace === 'cms') return null
    if (activePage === 'bonuses') return null
    if (activePage === 'promotions') return <Button onClick={() => setPromotionOpen(true)}><Plus className="h-4 w-4" /> Create promotion</Button>
    if (activePage === 'users') return <Button onClick={() => setUserOpen(true)}><Plus className="h-4 w-4" /> New player</Button>
    if (activePage === 'reports' || activePage === 'transactions') return <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Export</Button>
    if (activePage === 'games') return <Button onClick={() => notify('Game provider connection is not included in this UI prototype.')}><Plus className="h-4 w-4" /> Add game</Button>
    return <Button onClick={() => navigate('promotions')}><Plus className="h-4 w-4" /> New campaign</Button>
  }

  return (
    <div className={cn('app-shell min-h-screen bg-white text-slate-900', themeName === 'Violet' && 'theme-violet', themeName === 'Blue' && 'theme-blue')}>
      {mobileNavOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" /> : null}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-slate-200 bg-white text-slate-900 transition-transform duration-200 lg:translate-x-0', mobileNavOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-3.5">
          <button type="button" onClick={() => navigate(workspace === 'backoffice' ? 'overview' : 'cms-banners')} className="flex items-center gap-3 text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800"><Zap className="h-4 w-4" /></span>
            <span><span className="block text-[11px] font-semibold leading-4 text-slate-900">Bclick Admin</span><span className="block text-[9px] leading-3 text-slate-500">Backoffice + CMS</span></span>
          </button>
          <button type="button" className="text-slate-500 hover:text-white lg:hidden" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <div className="relative px-2.5 pt-3">
          <button type="button" aria-haspopup="menu" aria-expanded={workspaceSwitcherOpen} onClick={() => setWorkspaceSwitcherOpen((open) => !open)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100">
            <div className="flex items-center gap-2"><span className={cn('flex h-7 w-7 items-center justify-center rounded-md text-white', workspace === 'backoffice' ? 'bg-slate-900' : 'bg-violet-700')}>{workspace === 'backoffice' ? <Shield className="h-3.5 w-3.5" /> : <Paintbrush className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800">{workspace === 'backoffice' ? 'Backoffice' : 'CMS'}</span><span className="mt-0.5 block text-[10px] text-slate-500">{workspace === 'backoffice' ? 'Operations & analytics' : 'Casino content studio'}</span></span><ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', workspaceSwitcherOpen && 'rotate-180')} /></div>
          </button>
          {workspaceSwitcherOpen ? <div role="menu" aria-label="Switch workspace" className="absolute left-3 right-3 top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <button type="button" role="menuitem" onClick={() => switchWorkspace('backoffice')} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', workspace === 'backoffice' ? 'bg-slate-100' : 'hover:bg-slate-50')}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Shield className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">Backoffice</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Players, transactions, reports & account operations</span></span>{workspace === 'backoffice' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</button>
            <button type="button" role="menuitem" onClick={() => switchWorkspace('cms')} className={cn('mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', workspace === 'cms' ? 'bg-violet-50' : 'hover:bg-slate-50')}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-700 text-white"><Paintbrush className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">CMS</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Banners, promotions, pages, skins & providers</span></span>{workspace === 'cms' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</button>
          </div> : null}
        </div>
        <nav className="admin-scrollbar flex-1 overflow-y-auto px-2.5 py-4">
          {(workspace === 'backoffice' ? NAV_GROUPS : CMS_NAV_GROUPS).map((group) => <div key={group.title} className="mb-6">
            <p className="mb-1.5 px-2.5 text-[10px] font-medium text-slate-500">{group.title}</p>
            <div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const active = activePage === item.page; return <button type="button" key={item.page} onClick={() => navigate(item.page)} className={cn('group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition', active ? 'workspace-nav-active bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950')}><Icon className={cn('h-[17px] w-[17px]', active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900')} /><span className="flex-1">{item.label}</span>{item.count ? <span className={cn('rounded px-1.5 py-0.5 text-[9px]', active ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500')}>{item.count}</span> : null}<ChevronRight className={cn('ml-auto h-3.5 w-3.5 text-slate-300 transition', active && 'text-slate-500')} /></button> })}</div>
          </div>)}
        </nav>
        <div className="border-t border-slate-200 p-2.5">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4e9f0] text-xs font-extrabold text-slate-800">AD</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">Admin Demo</p><p className="mt-0.5 truncate text-[10px] text-slate-500">Super administrator</p></div><button type="button" aria-label="Sign out (demo)" onClick={() => notify('Authentication is outside the scope of this UI prototype.')} className="text-slate-500 hover:text-white"><LogOut className="h-4 w-4" /></button></div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-[50px] items-center gap-2.5 border-b border-slate-200 bg-white px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="hidden min-w-0 sm:block"><p className="truncate text-[13px] font-medium text-slate-900">{workspace === 'backoffice' ? 'Bclick Backoffice' : 'Bclick CMS'}</p></div>
          <div className="ml-auto flex items-center gap-2">
            <div className={cn('relative w-[min(220px,42vw)]', topSearchOpen ? 'block' : 'hidden lg:block')}><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={activePage === 'transactions' ? 'Search transactions…' : 'Search…'} className="h-8 rounded-md border-slate-200 bg-white pl-8 pr-2 text-[11px] shadow-none focus-visible:ring-1" /></div>
            <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 shadow-none" onClick={() => setTopSearchOpen((open) => !open)} aria-label="Search" title="Search"><Search className="h-3.5 w-3.5 text-slate-600" /></Button>
          </div>
          <div className="relative">
            <Button variant="outline" size="icon" className="relative h-8 w-8 shrink-0 border-slate-200 shadow-none" aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell className="h-[18px] w-[18px] text-slate-600" /><span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">2</span></Button>
            {notificationOpen ? <div className="absolute right-0 top-12 z-40 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="flex items-center justify-between px-2 py-1"><p className="text-sm font-bold text-slate-800">Notifications</p><Badge variant="warning">3 new</Badge></div>{[{ title: 'Withdrawal needs review', text: 'TX-1048250 · 250.00 EUR', icon: CreditCard }, { title: 'Promotion is nearly over', text: 'Super Sunday · ended Oct 12', icon: BadgePercent }, { title: 'New player registered', text: 'Youssef Mansour · 21 min ago', icon: UserPlus }].map((item) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => { setNotificationOpen(false); notify('Notification preview opened.') }} className="mt-1 flex w-full items-start gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-[10px] text-slate-400">{item.text}</span></span></button> })}<button type="button" onClick={() => { setNotificationOpen(false); notify('All sample notifications marked as read.') }} className="mt-2 w-full border-t border-slate-100 pt-3 text-center text-xs font-semibold text-slate-500 hover:text-slate-900">Mark all as read</button></div> : null}
          </div>
          <Button variant="outline" size="icon" className="hidden h-8 w-8 border-slate-200 shadow-none sm:inline-flex" onClick={() => notify('Display preview is not connected to a device service.')} aria-label="Display options"><Monitor className="h-3.5 w-3.5 text-slate-600" /></Button>
          <div className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={themeOpen} onClick={() => setThemeOpen((open) => !open)} className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-left text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><span className="flex gap-0.5"><span className={cn('h-3 w-3 rounded-full border border-slate-200', themeName === 'Violet' ? 'bg-violet-600' : themeName === 'Blue' ? 'bg-blue-600' : 'bg-slate-900')} /><span className="h-3 w-3 rounded-full border border-slate-200 bg-white" /><span className="h-3 w-3 rounded-full border border-slate-200 bg-slate-100" /><span className="h-3 w-3 rounded-full border border-slate-200 bg-slate-50" /></span><span className="hidden sm:inline">{themeName}</span><ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', themeOpen && 'rotate-180')} /></button>
            {themeOpen ? <div role="menu" aria-label="Choose theme" className="absolute right-0 top-10 z-50 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">{(['Default','Violet','Blue'] as const).map((name) => <button key={name} type="button" role="menuitemradio" aria-checked={themeName === name} onClick={() => { setThemeName(name); setThemeOpen(false) }} className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition', themeName === name ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50')}><span className={cn('h-3.5 w-3.5 rounded-full border', name === 'Violet' ? 'border-violet-700 bg-violet-600' : name === 'Blue' ? 'border-blue-700 bg-blue-600' : 'border-slate-700 bg-slate-900')} />{name}{themeName === name ? <Check className="ml-auto h-3.5 w-3.5" /> : null}</button>)}</div> : null}
          </div>
        </header>

        <main className="min-h-[calc(100vh-50px)] bg-white px-4 py-5 sm:px-5 xl:px-6">
          {selectedUser ? <PlayerProfilePage user={selectedUser} onBack={() => setSelectedUser(null)} onToggle={() => toggleUserStatus(selectedUser.id)} onNotify={notify} onSave={savePlayerProfile} /> : <>
                      {activePage !== 'transactions' && activePage !== 'bonuses' ? <>
                        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden"><div><p className="text-[10px] font-medium text-slate-500">{workspace === 'backoffice' ? 'Backoffice' : 'CMS'}</p><h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">{page.title}</h1></div>{createHeaderAction()}</div>
                        <div className="mb-5 hidden items-center justify-between gap-4 lg:flex"><div><h1 className="text-xl font-semibold tracking-tight text-slate-900">{page.title}</h1><p className="mt-1 text-xs text-slate-500">{page.description}</p></div><div className="flex items-center gap-2">{createHeaderAction()}</div></div>
                      </> : null}
                      {activePage === 'overview' ? <OverviewPage onNavigate={navigate} onCreatePromotion={() => setPromotionOpen(true)} /> : null}
                      {activePage === 'users' ? <PlayersPage users={users} query={searchQuery} onQueryChange={setSearchQuery} onAdd={() => setUserOpen(true)} onSelect={setSelectedUser} onToggleStatus={toggleUserStatus} /> : null}
                      {activePage === 'promotions' ? <OffersPage title="Promotions" description="Create campaigns and track engagement across channels." offers={promotions} kind="promotions" onCreate={() => setPromotionOpen(true)} onToggle={(id) => toggleOffer('promotions', id)} /> : null}
                      {activePage === 'bonuses' ? <BonusesPage offers={bonuses} onCreate={() => setBonusTypeChooserOpen(true)} onToggle={(id) => toggleOffer('bonuses', id)} onNotify={notify} /> : null}
                      {activePage === 'games' ? <GamesPage games={games.map((game) => ({ id: game.id, title: game.title, provider: game.provider, category: game.category, rtp: game.rtp, players: game.players, status: (game.active ? 'Active' : 'Paused') as GameRow['status'] }))} onToggle={toggleGame} /> : null}
                      {activePage === 'transactions' ? <TransactionsPage query={searchQuery} onQueryChange={setSearchQuery} users={users} onNotify={notify} onSelectPlayer={setSelectedUser} /> : null}
                      {activePage === 'reports' ? <ReportsPage /> : null}
                      {activePage === 'settings' ? <SettingsPage /> : null}

            {workspace === 'cms' && activePage === 'cms-banners' ? <CmsBannersPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-promotions' ? <CmsPromotionsPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-pages' ? <CmsPagesPage onNotify={notify} /> : null}
             {workspace === 'cms' && activePage === 'cms-skin-games' ? <CmsSkinGamesPage games={games} onSaveGame={(updatedGame) => setGames((current) => current.map((game) => game.id === updatedGame.id ? updatedGame : game))} onMoveGame={(draggedId, targetId) => setGames((current) => { const from = current.findIndex((game) => game.id === draggedId); if (from < 0) return current; const next = [...current]; const [moved] = next.splice(from, 1); if (!moved) return current; const to = next.findIndex((game) => game.id === targetId); if (to < 0) return current; next.splice(to, 0, moved); return next })} onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-categories' ? <CmsCategoriesPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-providers' ? <CmsProvidersPage onNotify={notify} /> : null}
            {workspace === 'cms' && activePage === 'cms-customization' ? <CmsCustomizationPage onNotify={notify} /> : null}

          </>}
          <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-[10px] text-slate-400 sm:flex-row"><span>© 2026 Bclick Admin · UI prototype</span><span className="flex items-center gap-3"><button type="button" className="hover:text-slate-600" onClick={() => notify('Admin documentation has not been added yet.')}>Documentation</button><button type="button" className="hover:text-slate-600" onClick={() => notify('Support is not connected in this prototype.')}>Contact support</button><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Demo data</span></span></footer>
        </main>
      </div>

      <OfferFormModal open={promotionOpen} onOpenChange={setPromotionOpen} kind="promotion" onSubmit={(event) => handleOfferSubmit('promotion', event)} />
      <BonusTypeChooserModal open={bonusTypeChooserOpen} onOpenChange={setBonusTypeChooserOpen} onChoose={(type) => { setBonusWizardType(type); setBonusWizardOpen(true) }} />
      <BonusWizardModal open={bonusWizardOpen} onOpenChange={setBonusWizardOpen} bonusType={bonusWizardType} onCreate={handleBonusWizardCreate} />
      <UserFormModal open={userOpen} onOpenChange={setUserOpen} onSubmit={handleUserSubmit} />

      {toast ? <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{toast}</div> : null}
    </div>
  )
}
