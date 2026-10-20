import type { Offer, UserRow } from '../lib/types'

export const INITIAL_USERS: UserRow[] = [
  { id: 'BC-020481', name: 'Amine Ben Salem', email: 'amine.bensalem@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€245.80', status: 'Active', tier: 'VIP' },
  { id: 'BC-020480', name: 'Maya Trabelsi', email: 'maya.trabelsi@example.com', country: 'Tunisia', joined: 'Oct 17, 2026', balance: '€82.10', status: 'Active', tier: 'Gold' },
  { id: 'BC-020479', name: 'Youssef Mansour', email: 'y.mansour@example.com', country: 'France', joined: 'Oct 16, 2026', balance: '€0.00', status: 'Active', tier: 'Standard' },
  { id: 'BC-020478', name: 'Sarah Gharbi', email: 'sarah.gharbi@example.com', country: 'Tunisia', joined: 'Oct 16, 2026', balance: '€1,250.00', status: 'Active', tier: 'VIP' },
  { id: 'BC-020477', name: 'Karim Haddad', email: 'karim.haddad@example.com', country: 'Italy', joined: 'Oct 15, 2026', balance: '€31.45', status: 'Suspended', tier: 'Standard' },
  { id: 'BC-020476', name: 'Ines Jaziri', email: 'ines.jaziri@example.com', country: 'Tunisia', joined: 'Oct 15, 2026', balance: '€416.25', status: 'Active', tier: 'Gold' },
  { id: 'BC-020475', name: 'Adam Kallel', email: 'adam.kallel@example.com', country: 'Germany', joined: 'Oct 14, 2026', balance: '€96.30', status: 'Active', tier: 'Standard' },
]

export const INITIAL_BONUSES: Offer[] = []
