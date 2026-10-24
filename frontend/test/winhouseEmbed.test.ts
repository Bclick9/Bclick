import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getWinHouseBottomGap,
  type WinHouseNavigationMeasurement,
} from '../lib/winhouseEmbed'

function navigation(options: {
  height?: number
  ariaHidden?: string | null
  hasLayout?: boolean
  hidden?: boolean
} = {}): WinHouseNavigationMeasurement {
  const height = options.height ?? 56
  return {
    hidden: options.hidden ?? false,
    getAttribute(name) {
      return name === 'aria-hidden' ? options.ariaHidden ?? null : null
    },
    getClientRects() {
      return { length: options.hasLayout === false ? 0 : 1 }
    },
    getBoundingClientRect() {
      return { height }
    },
  }
}

test('WinHouse bottom gap uses the actual rendered navigation height, rounded up', () => {
  assert.equal(getWinHouseBottomGap(navigation({ height: 78.2 })), 79)
})

test('WinHouse bottom gap is zero when the custom nav is absent or hidden', () => {
  assert.equal(getWinHouseBottomGap(null), 0)
  assert.equal(getWinHouseBottomGap(navigation({ hidden: true })), 0)
  assert.equal(getWinHouseBottomGap(navigation({ ariaHidden: 'true' })), 0)
  assert.equal(getWinHouseBottomGap(navigation({ hasLayout: false })), 0)
})

test('WinHouse bottom gap fails closed for invalid or non-positive measurements', () => {
  assert.equal(getWinHouseBottomGap(navigation({ height: Number.NaN })), 0)
  assert.equal(getWinHouseBottomGap(navigation({ height: -1 })), 0)
  assert.equal(getWinHouseBottomGap(navigation({ height: 0 })), 0)
})
