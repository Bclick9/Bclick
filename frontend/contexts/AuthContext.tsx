import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface Player {
  id: string
  email: string
  displayName: string
  countryCode: string
  settlementCurrency: 'TND' | 'EUR' | 'USD'
  preferredDisplayCurrency?: 'TND' | 'EUR' | 'USD' | null
  language: string
  status: string
  verificationStatus: string
}

export type AuthApiStatus = 'checking' | 'online' | 'offline' | 'identity-disabled'

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
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_URL = '/api/v1/auth'

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
    player, isLoading, apiStatus, login, register, logout,
  }), [player, isLoading, apiStatus])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
