import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('casino storefront does not reintroduce hard-coded game cards or category membership', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s+\{[^}]*\bGAMES\b[^}]*\}\s+from\s+['"][^'"]*data\/catalog['"]/);
  assert.doesNotMatch(source, /GAMES\.filter\s*\(/);
  assert.doesNotMatch(source, /function\s+GameGrid\s*\(/);
  assert.doesNotMatch(source, /function\s+HalloweenBanner\s*\(/);
  assert.match(source, /fetchCasinoCategories/);
  assert.match(source, /fetchCasinoGames/);
});
