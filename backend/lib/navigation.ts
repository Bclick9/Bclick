import { ArrowDownToLine, ArrowUpFromLine, BadgePercent, CreditCard, FileText, Gamepad2, Gift, Image, Layers, LayoutDashboard, Settings, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import type { PageKey, WorkspaceMode } from './types'

export const NAV_GROUPS: { title: string; items: { page: PageKey; label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'WORKSPACE', items: [
    { page: 'overview', label: 'Overview', icon: LayoutDashboard },
    { page: 'users', label: 'Players', icon: Users, count: '2.4k' },
    { page: 'bonuses', label: 'Bonuses', icon: Gift },
  ] },
  { title: 'OPERATIONS', items: [
    { page: 'transactions', label: 'Transactions', icon: CreditCard },
    { page: 'deposits', label: 'Deposits', icon: ArrowDownToLine, count: '4' },
    { page: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, count: '3' },
    { page: 'reports', label: 'Reports & analytics', icon: TrendingUp },
  ] },
  { title: 'SYSTEM', items: [
    { page: 'settings', label: 'Settings', icon: Settings },
  ] },
]

export const CMS_NAV_GROUPS: { title: string; items: { page: PageKey; label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'CMS', items: [
    { page: 'cms-banners', label: 'Banners', icon: Image },
    { page: 'cms-promotions', label: 'Promotions', icon: BadgePercent },
    { page: 'cms-pages', label: 'Pages', icon: FileText },
    { page: 'cms-skin-games', label: 'Skin Games', icon: Gamepad2 },
    { page: 'cms-categories', label: 'Categories', icon: Layers },
    { page: 'cms-providers', label: 'Providers', icon: Users },
  ] },
]

export const PAGE_INFO: Record<PageKey, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Here’s what’s happening across your platform today.' },
  users: { title: 'Players', description: 'Manage player records, account status, verification, and profile activity.' },
  bonuses: { title: 'Bonuses', description: 'Manage bonus offers, wagering requirements, and eligibility.' },
  transactions: { title: 'Transactions', description: 'Browse demo deposits, withdrawals, and wallet activity.' },
  deposits: { title: 'Deposits', description: 'Review incoming payment requests and confirm verified deposits.' },
  withdrawals: { title: 'Withdrawals', description: 'Review, approve, and track player payout requests.' },
  reports: { title: 'Reports & analytics', description: 'Explore platform performance and engagement trends.' },
  settings: { title: 'Settings', description: 'Preview workspace preferences and admin controls.' },
  'cms-banners': { title: 'Banners', description: 'Manage promotional artwork, hero placements, and casino visuals.' },
  'cms-promotions': { title: 'Promotions', description: 'Manage CMS promotion content, placements, and player-facing campaign cards.' },
  'cms-pages': { title: 'Pages', description: 'Edit the player-facing information pages and their publication status.' },
  'cms-skin-games': { title: 'Skin Games', description: 'Manage the game tile skins and visual presentation shown in the casino.' },
  'cms-categories': { title: 'Categories', description: 'Organize casino categories, visibility, and display order.' },
  'cms-providers': { title: 'Providers', description: 'Manage provider visibility and how providers appear in the casino.' },
}


export const PAGE_PATHS: Record<PageKey, string> = {
  overview: '/backoffice/overview',
  users: '/backoffice/players',
  bonuses: '/backoffice/bonuses',
  transactions: '/backoffice/transactions',
  deposits: '/backoffice/deposits',
  withdrawals: '/backoffice/withdrawals',
  reports: '/backoffice/reports',
  settings: '/backoffice/settings',
  'cms-banners': '/cms/banners',
  'cms-promotions': '/cms/promotions',
  'cms-pages': '/cms/pages',
  'cms-skin-games': '/cms/skin-games',
  'cms-categories': '/cms/categories',
  'cms-providers': '/cms/providers',
}
export function pageFromPath(pathname: string): PageKey {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return (Object.keys(PAGE_PATHS) as PageKey[]).find((key) => PAGE_PATHS[key] === normalized) || 'overview'
}
export function workspaceForPage(page: PageKey): WorkspaceMode {
  return page.startsWith('cms-') ? 'cms' : 'backoffice'
}
