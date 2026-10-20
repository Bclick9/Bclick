import type { PaymentRequest } from '../lib/paymentRequests'

export const DEMO_DEPOSIT_REQUESTS: PaymentRequest[] = [
  { id: 'DEP-20481', playerId: 'BC-020481', playerName: 'Amine Ben Salem', email: 'amine.bensalem@example.com', method: 'Bank transfer', amount: 250, currency: 'TND', requestedAt: '20 Oct 2026, 09:42', status: 'Pending', reference: 'BNK-9F42A1' },
  { id: 'DEP-20480', playerId: 'BC-020480', playerName: 'Maya Trabelsi', email: 'maya.trabelsi@example.com', method: 'USDT TRC20', amount: 85, currency: 'USD', requestedAt: '20 Oct 2026, 09:18', status: 'Under review', reference: 'TX-7B91C3', network: 'TRC20', destination: 'T••••••••••••••••4K9', riskFlag: 'Confirm blockchain confirmations' },
  { id: 'DEP-20479', playerId: 'BC-020479', playerName: 'Youssef Mansour', email: 'y.mansour@example.com', method: 'Visa •••• 4821', amount: 60, currency: 'EUR', requestedAt: '20 Oct 2026, 08:57', status: 'Completed', reference: 'PSP-884102' },
  { id: 'DEP-20478', playerId: 'BC-020478', playerName: 'Sarah Gharbi', email: 'sarah.gharbi@example.com', method: 'E-wallet', amount: 120, currency: 'TND', requestedAt: '19 Oct 2026, 22:11', status: 'Pending', reference: 'EW-004819' },
  { id: 'DEP-20477', playerId: 'BC-020477', playerName: 'Karim Haddad', email: 'karim.haddad@example.com', method: 'USDT ERC20', amount: 150, currency: 'USD', requestedAt: '19 Oct 2026, 20:45', status: 'Rejected', reference: 'TX-1A03FF', network: 'ERC20', decisionNote: 'Reference mismatch in this demo record.', reviewedBy: 'Admin Demo' },
  { id: 'DEP-20476', playerId: 'BC-020476', playerName: 'Ines Jaziri', email: 'ines.jaziri@example.com', method: 'Bank transfer', amount: 400, currency: 'TND', requestedAt: '19 Oct 2026, 19:06', status: 'Pending', reference: 'BNK-3C21D0' },
]

export const DEMO_WITHDRAWAL_REQUESTS: PaymentRequest[] = [
  { id: 'WDR-10482', playerId: 'BC-020478', playerName: 'Sarah Gharbi', email: 'sarah.gharbi@example.com', method: 'Bank transfer', amount: 180, currency: 'TND', requestedAt: '20 Oct 2026, 09:36', status: 'Pending', reference: 'WD-7C92B1', riskFlag: 'Verify beneficiary and KYC status' },
  { id: 'WDR-10481', playerId: 'BC-020481', playerName: 'Amine Ben Salem', email: 'amine.bensalem@example.com', method: 'USDT TRC20', amount: 95, currency: 'USD', requestedAt: '20 Oct 2026, 09:05', status: 'Under review', reference: 'WD-2F14CA', network: 'TRC20', destination: 'T••••••••••••••••8P3' },
  { id: 'WDR-10480', playerId: 'BC-020480', playerName: 'Maya Trabelsi', email: 'maya.trabelsi@example.com', method: 'Visa •••• 4821', amount: 45, currency: 'EUR', requestedAt: '20 Oct 2026, 08:50', status: 'Approved', reference: 'WD-PSP-88410' },
  { id: 'WDR-10479', playerId: 'BC-020479', playerName: 'Youssef Mansour', email: 'y.mansour@example.com', method: 'E-wallet', amount: 75, currency: 'TND', requestedAt: '19 Oct 2026, 21:38', status: 'Completed', reference: 'WD-EW-6012', reviewedBy: 'Admin Demo' },
  { id: 'WDR-10478', playerId: 'BC-020477', playerName: 'Karim Haddad', email: 'karim.haddad@example.com', method: 'Bank transfer', amount: 320, currency: 'TND', requestedAt: '19 Oct 2026, 17:12', status: 'Rejected', reference: 'WD-BNK-1087', decisionNote: 'Beneficiary details require correction in this demo record.', reviewedBy: 'Admin Demo' },
  { id: 'WDR-10477', playerId: 'BC-020476', playerName: 'Ines Jaziri', email: 'ines.jaziri@example.com', method: 'USDT ERC20', amount: 140, currency: 'USD', requestedAt: '19 Oct 2026, 16:40', status: 'Pending', reference: 'WD-4E16B9', network: 'ERC20' },
]
