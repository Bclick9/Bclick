import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('casino lobby remains an all-games home while custom display shelves are optional', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.match(source, /fetchCasinoGames/);
  assert.match(source, /displayCategories\.map/);
  assert.doesNotMatch(source, /Curated game collections are temporarily unavailable/);
  assert.doesNotMatch(source, /function\s+TrendingGames\s*\(/);
  assert.doesNotMatch(source, /SectionRow title="Available Games"/);
});

test('curated categories appear immediately after Lobby and filter the catalogue grid by saved membership', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.match(source, /visibleDisplayCategories = displayCategories\\.filter/);
  assert.match(source, /<CategoryStrip active=\\{category\\} categories=\\{catalogCategories\\} displayCategories=\\{displayCategories\\} \\/>/);
  assert.match(source, /displayCategory: searchTerm \\? undefined : selectedDisplayCategory\\?\\.slug/);
  assert.match(source, /selectedDisplayCategory = displayCategories\\.find\\(\\(item\\) => item\\.slug === category\\)/);
  assert.match(source, /selectedCategory = searchTerm \\|\\| isLobby \\|\\| selectedDisplayCategory \\? undefined : category/);
});

test('Crash, Live Casino and Slot Games remain routes but are hidden from the category strip', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.match(source, /gameTypeSlugs = new Set\(\['crash-games', 'live-casino', 'slot-games'\]\)/);
  assert.match(source, /const known = isLobby \|\| availableCategory/);
});

test('casino storefront does not reintroduce hard-coded game cards or category membership', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s+\{[^}]*\bGAMES\b[^}]*\}\s+from\s+['"][^'"]*data\/catalog['"]/);
  assert.doesNotMatch(source, /GAMES\.filter\s*\(/);
  assert.doesNotMatch(source, /function\s+GameGrid\s*\(/);
  assert.doesNotMatch(source, /function\s+HalloweenBanner\s*\(/);
  assert.match(source, /fetchCasinoCategories/);
  assert.match(source, /fetchCasinoGames/);
});
