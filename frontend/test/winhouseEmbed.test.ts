import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const sportsSource = await readFile(
  fileURLToPath(new URL('../pages/Sports.tsx', import.meta.url)),
  'utf8',
)
const bottomNavSource = await readFile(
  fileURLToPath(new URL('../components/BottomNav.tsx', import.meta.url)),
  'utf8',
)

test('WinHouse loader hides only the documented header controls and overlays its bottom nav', () => {
  assert.match(sportsSource, /script\.dataset\.hide = 'favorites,clock,settings'/)
  assert.match(sportsSource, /script\.dataset\.bottomGap = '0'/)
  assert.match(bottomNavSource, /fixed bottom-0 inset-x-0 z-50/)
})

test('Bclick does not rely on undocumented data-hide values for the full provider subbar', () => {
  assert.doesNotMatch(sportsSource, /script\.dataset\.hide\s*=\s*['"][^'"]*(?:subbar|mainnav|bottom-nav)/i)
})
