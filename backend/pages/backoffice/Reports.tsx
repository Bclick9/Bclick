import { Fragment, useState } from 'react'
import { Activity, ArrowRight, ChevronRight, CreditCard, Download, FileText, Filter, Gamepad2, Globe, Search, Settings, Users, Wallet, CircleDollarSign, Play, Trophy, RotateCcw, Layers, LayoutGrid, GripVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import { cn } from '../../lib/utils'
import { SectionHeading } from '../../components/DashboardUI'

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

export function ReportsPage() {
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
