import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('Lobby is the all-games home and curated categories are not rendered as duplicate game rails', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.match(source, /fetchCasinoGames/);
  assert.ok(source.includes('visibleDisplayCategories = displayCategories.filter'));
  assert.ok(source.includes('CatalogGameGrid games={catalogGames}'));
  assert.equal(source.includes('function CatalogGameRail('), false);
  assert.equal(source.includes('displayCategories.map((displayCategory) =>'), false);
  assert.match(source, /All Games/);
});

test('curated categories appear in the shared strip and filter the main grid by saved membership', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  const client = await readFile(new URL('../lib/casinoCatalog.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('<CategoryStrip active={category} categories={catalogCategories} displayCategories={displayCategories} type={type} basePath={routeBase} />'));
  assert.ok(source.includes('displayCategory: searchTerm ? undefined : selectedDisplayCategory?.slug'));
  assert.ok(source.includes('selectedDisplayCategory = displayCategories.find((item) => item.slug === category)'));
  assert.ok(source.includes('selectedCategory = searchTerm || isLobby || selectedDisplayCategory ? undefined : category'));
  assert.ok(client.includes("if (options.type) params.set('type', options.type)"));
});

test('type routes are shared while source category slugs reserved for page types are excluded from the strip', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("reservedTypeSlugs = new Set(['crash-games', 'live-casino', 'slot-games'])"));
  assert.ok(source.includes("type === 'live-casino' ? 'All Live Casino Games' : 'All Crash Games'"));
  assert.ok(source.includes("type,\n      category: selectedCategory"));
});

test('casino catalogue storefront does not reintroduce hard-coded game cards or category membership', async () => {
  const source = await readFile(new URL('../pages/Casino.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s+\{[^}]*\bGAMES\b[^}]*\}\s+from\s+['"][^'"]*data\/catalog['"]/);
  assert.doesNotMatch(source, /GAMES\.filter\s*\(/);
  assert.doesNotMatch(source, /function\s+GameGrid\s*\(/);
  assert.doesNotMatch(source, /function\s+HalloweenBanner\s*\(/);
  assert.match(source, /fetchCasinoCategories/);
  assert.match(source, /fetchCasinoGames/);
});

test('Casino, Live Casino and Crash Games share one type-scoped storefront; legacy slot-games redirects home', async () => {
  const routes = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
  const client = await readFile(new URL('../lib/casinoCatalog.ts', import.meta.url), 'utf8');
  assert.ok(routes.includes('<Route path="casino/slot-games" element={<Navigate to="/casino/lobby" replace />} />'));
  assert.ok(routes.includes('<Route path="live-casino" element={<CasinoCategory type="live-casino" routeBase="/live-casino" />} />'));
  assert.ok(routes.includes('<Route path="crash-games" element={<CasinoCategory type="crash-games" routeBase="/crash-games" />} />'));
  assert.ok(client.includes("if (options.type) params.set('type', options.type)"));
  assert.ok(client.includes("if (type) params.set('type', type)"));
});
