export type LegacyAuthMode = 'login' | 'signup'

export type LegacyAuthRouteDecision =
  | { type: 'wait' }
  | { type: 'redirect'; to: string }
  | { type: 'open-modal'; mode: LegacyAuthMode; returnTo: string | null }

function safeReturnPath(value: unknown): string | null {
  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || /[\u0000-\u001f]/.test(value)
    || /^\/(?:login|register|signup)(?:[/?#]|$)/.test(value)
  ) {
    return null
  }
  return value
}

/** Decide how legacy standalone auth URLs should behave while auth is session-verified. */
export function resolveLegacyAuthRoute(input: {
  mode: LegacyAuthMode
  isLoading: boolean
  authenticated: boolean
  returnTo?: unknown
}): LegacyAuthRouteDecision {
  if (input.isLoading) return { type: 'wait' }

  const returnTo = safeReturnPath(input.returnTo)
  if (input.authenticated) {
    return { type: 'redirect', to: returnTo ?? '/' }
  }

  return { type: 'open-modal', mode: input.mode, returnTo }
}
