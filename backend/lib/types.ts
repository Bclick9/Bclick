export type WorkspaceMode = 'backoffice' | 'cms'
export type PageKey = 'overview' | 'users' | 'bonuses' | 'transactions' | 'reports' | 'settings' | 'cms-banners' | 'cms-promotions' | 'cms-pages' | 'cms-skin-games' | 'cms-categories' | 'cms-providers'
export type Status = 'Active' | 'Paused' | 'Scheduled' | 'Suspended' | 'Completed' | 'Pending' | 'Failed'
export type UserRow = { id: string; name: string; email: string; country: string; joined: string; balance: string; status: 'Active' | 'Suspended'; tier: 'VIP' | 'Gold' | 'Standard' }
export type BonusWizardForm = {
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

export type Offer = {
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
