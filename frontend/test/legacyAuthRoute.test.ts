import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveLegacyAuthRoute } from '../lib/legacyAuthRoute'

test('legacy auth routes wait until the player session has been checked', () => {
  assert.deepEqual(
    resolveLegacyAuthRoute({ mode: 'login', isLoading: true, authenticated: true }),
    { type: 'wait' },
  )
})

test('an authenticated player is redirected away from the login URL', () => {
  assert.deepEqual(
    resolveLegacyAuthRoute({ mode: 'login', isLoading: false, authenticated: true }),
    { type: 'redirect', to: '/' },
  )
})

test('an unauthenticated player is sent to the login modal and keeps a safe requested path', () => {
  assert.deepEqual(
    resolveLegacyAuthRoute({
      mode: 'login',
      isLoading: false,
      authenticated: false,
      returnTo: '/sports/my-bets?from=menu',
    }),
    { type: 'open-modal', mode: 'login', returnTo: '/sports/my-bets?from=menu' },
  )
})

test('auth routes reject external redirects and loops through legacy auth URLs', () => {
  for (const returnTo of ['//example.com', '/\\\\example.com', '/login', '/register?tab=signup']) {
    assert.deepEqual(
      resolveLegacyAuthRoute({ mode: 'signup', isLoading: false, authenticated: false, returnTo }),
      { type: 'open-modal', mode: 'signup', returnTo: null },
    )
  }
})
