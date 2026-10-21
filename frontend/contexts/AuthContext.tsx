import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type PlayerGender = 'female' | 'male' | 'other' | 'prefer_not_to_say'

export interface Player {
  /** Internal UUID. Use playerNumber for the public account ID shown in the UI. */
  id: string
  playerNumber: string
  email: string
  displayName: string
  firstName: string | null
  lastName: string | null
  gender: PlayerGender | null
  countryCode: string
  city: string | null
  address: string | null
  phoneNumber: string | null
  postalCode: string | null
  settlementCurrency: 'TND' | 'EUR' | 'USD'
  preferredDisplayCurrency?: 'TND' | 'EUR' | 'USD' | null
  language: string
  status: string
  verificationStatus: string
}

export type AuthApiStatus = 'checking' | 'online' | 'offline' | 'identity-disabled'

export interface PlayerProfileUpdate {
  displayName?: string
  language?: string
  firstName?: string | null
  lastName?: string | null
  gender?: PlayerGender | null
  countryCode?: string
  city?: string | null
  address?: string | null
  phoneNumber?: string | null
  postalCode?: string | null
}

export interface RegisterInput {
  email: string
  password: string
  countryCode: string
  settlementCurrency: 'TND' | 'EUR' | 'USD'
  dateOfBirth: string
  acceptTerms: true
  acceptAgeConfirmation: true
  preferredLanguage: string
  phoneNumber?: string
  preferredDisplayCurrency?: 'TND' | 'EUR' | 'USD'
}

interface ApiEnvelope {
  data?: { player?: Player }
  error?: { code?: string; message?: string }
  message?: string
}

interface AuthContextValue {
  player: Player | null
  isLoading: boolean
  apiStatus: AuthApiStatus
  login: (email: string, password: string) => Promise<Player>
  register: (input: RegisterInput) => Promise<Player>
  refreshPlayerProfile: () => Promise<Player>
  updatePlayerProfile: (input: PlayerProfileUpdate) => Promise<Player>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_URL = '/api/v1/auth'
const PLAYER_PROFILE_URL = '/api/v1/player/profile'

async function readEnvelope(response: Response): Promise<ApiEnvelope | null> {
  return response.json().catch(() => null) as Promise<ApiEnvelope | null>
}

function responseMessage(payload: ApiEnvelope | null, status: number): string {
  return payload?.error?.message ?? payload?.message ?? 'The API request failed (' + status + ').'
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = name + '='
  const item = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : null
}

function connectionError(): Error {
  return new Error('Cannot reach the local Bclick API. Start it with "pnpm api:dev" and make sure it is listening on port 3000.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiStatus, setApiStatus] = useState<AuthApiStatus>('checking')

  useEffect(() => {
    let cancelled = false

    const loadSession = async () => {
      try {
        const health = await fetch('/api/v1/health/live', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!health.ok) throw connectionError()

        const response = await fetch(AUTH_URL + '/session', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })

        if (response.status === 404) {
          if (!cancelled) {
            setPlayer(null)
            setApiStatus('identity-disabled')
          }
          return
        }
        if (response.status === 401) {
          if (!cancelled) {
            setPlayer(null)
            setApiStatus('online')
          }
          return
        }
        if (!response.ok) {
          const payload = await readEnvelope(response)
          throw new Error(responseMessage(payload, response.status))
        }

        const payload = await readEnvelope(response)
        if (!payload?.data?.player) throw new Error('The API returned an invalid session response.')
        if (!cancelled) {
          setPlayer(payload.data.player)
          setApiStatus('online')
        }
      } catch {
        if (!cancelled) {
          setPlayer(null)
          setApiStatus('offline')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadSession()
    return () => { cancelled = true }
  }, [])

  const requestPlayer = async (path: '/login' | '/register', body: Record<string, unknown>): Promise<Player> => {
    let response: Response
    try {
      response = await fetch(AUTH_URL + path, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      setApiStatus('offline')
      throw connectionError()
    }

    const payload = await readEnvelope(response)
    if (response.status === 404) {
      setApiStatus('identity-disabled')
      throw new Error('The API is reachable, but Identity routes are not enabled. Set BCLICK_IDENTITY_ENABLED=true and restart the API.')
    }
    setApiStatus('online')
    if (!response.ok) throw new Error(responseMessage(payload, response.status))
    if (!payload?.data?.player) throw new Error('The API did not return a player session.')
    setPlayer(payload.data.player)
    return payload.data.player
  }

  const login = (email: string, password: string) => requestPlayer('/login', {
    email: email.trim(),
    password,
  })

  const register = (input: RegisterInput) => requestPlayer('/register', {
    email: input.email.trim(),
    password: input.password,
    countryCode: input.countryCode,
    settlementCurrency: input.settlementCurrency,
    dateOfBirth: input.dateOfBirth,
    acceptTerms: input.acceptTerms,
    acceptAgeConfirmation: input.acceptAgeConfirmation,
    preferredLanguage: input.preferredLanguage,
    ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
    ...(input.preferredDisplayCurrency ? { preferredDisplayCurrency: input.preferredDisplayCurrency } : {}),
  })

  const refreshPlayerProfile = useCallback(async (): Promise<Player> => {
    let response: Response
    try {
      response = await fetch(PLAYER_PROFILE_URL, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
    } catch {
      setApiStatus('offline')
      throw connectionError()
    }

    const payload = await readEnvelope(response)
    if (response.status === 401) {
      setPlayer(null)
      setApiStatus('online')
      throw new Error('Your player session is missing or expired. Please log in again.')
    }
    if (response.status === 404) {
      setApiStatus('identity-disabled')
      throw new Error('The player profile API is not available in this environment.')
    }
    setApiStatus('online')
    if (!response.ok) throw new Error(responseMessage(payload, response.status))
    if (!payload?.data?.player) throw new Error('The API did not return a player profile.')
    setPlayer(payload.data.player)
    return payload.data.player
  }, [])

  const updatePlayerProfile = useCallback(async (input: PlayerProfileUpdate): Promise<Player> => {
    const updates: Record<string, string | null> = {}
    if (typeof input.displayName === 'string') updates.displayName = input.displayName.trim()
    if (typeof input.language === 'string') updates.language = input.language.trim()
    if ('firstName' in input) updates.firstName = input.firstName?.trim() || null
    if ('lastName' in input) updates.lastName = input.lastName?.trim() || null
    if ('gender' in input) updates.gender = input.gender ?? null
    if (typeof input.countryCode === 'string') updates.countryCode = input.countryCode.trim().toUpperCase()
    if ('city' in input) updates.city = input.city?.trim() || null
    if ('address' in input) updates.address = input.address?.trim() || null
    if ('phoneNumber' in input) updates.phoneNumber = input.phoneNumber?.trim() || null
    if ('postalCode' in input) updates.postalCode = input.postalCode?.trim() || null
    if (Object.keys(updates).length === 0) {
      throw new Error('Change a profile field before saving.')
    }

    if (updates.displayName !== undefined && (updates.displayName === null || updates.displayName.length < 1 || updates.displayName.length > 80)) {
      throw new Error('Display name must contain between 1 and 80 characters.')
    }
    if (updates.language !== undefined && (updates.language === null || updates.language.length < 2 || updates.language.length > 12)) {
      throw new Error('Language must contain between 2 and 12 characters.')
    }
    if (typeof updates.countryCode === 'string' && !/^[A-Z]{2}$/.test(updates.countryCode)) {
      throw new Error('Choose a valid country.')
    }
    if (typeof updates.phoneNumber === 'string' && !/^\+[1-9][0-9]{1,14}$/.test(updates.phoneNumber)) {
      throw new Error('Use international phone format, for example +21612345678.')
    }

    const csrfToken = readCookie('__Host-bclick_player_csrf')
    if (!csrfToken) {
      throw new Error('The player CSRF cookie is missing. Refresh the page or log in again, then retry.')
    }

    let response: Response
    try {
      response = await fetch(PLAYER_PROFILE_URL, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(updates),
      })
    } catch {
      setApiStatus('offline')
      throw connectionError()
    }

    const payload = await readEnvelope(response)
    if (response.status === 401) {
      setPlayer(null)
      setApiStatus('online')
      throw new Error('Your player session is missing or expired. Please log in again.')
    }
    if (response.status === 404) {
      setApiStatus('identity-disabled')
      throw new Error('The player profile API is not available in this environment.')
    }
    setApiStatus('online')
    if (!response.ok) throw new Error(responseMessage(payload, response.status))
    if (!payload?.data?.player) throw new Error('The API did not return the updated player profile.')
    setPlayer(payload.data.player)
    return payload.data.player
  }, [])

  const logout = async () => {
    const csrfToken = readCookie('__Host-bclick_player_csrf')
    if (!csrfToken) throw new Error('The player CSRF cookie is missing. Refresh the page and try again.')

    let response: Response
    try {
      response = await fetch(AUTH_URL + '/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      })
    } catch {
      setApiStatus('offline')
      throw connectionError()
    }

    if (response.status === 404) {
      setApiStatus('identity-disabled')
      throw new Error('The API Identity routes are not enabled.')
    }
    if (!response.ok) {
      const payload = await readEnvelope(response)
      throw new Error(responseMessage(payload, response.status))
    }
    setPlayer(null)
    setApiStatus('online')
  }

  const value = useMemo<AuthContextValue>(() => ({
    player, isLoading, apiStatus, login, register, refreshPlayerProfile, updatePlayerProfile, logout,
  }), [player, isLoading, apiStatus, refreshPlayerProfile, updatePlayerProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
