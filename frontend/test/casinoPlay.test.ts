import assert from 'node:assert/strict';
import test from 'node:test';

import type { CasinoCatalogGame, CasinoDemoLaunch } from '../lib/casinoCatalog';
import { launchSandboxDemoForSlug, type SandboxDemoDependencies } from '../lib/casinoPlay';

const CANONICAL_GAME_ID = 'ba8cf5c4-a3d6-4c17-bb99-15e51efc2c61';
const game: CasinoCatalogGame = {
  id: CANONICAL_GAME_ID,
  slug: 'aviator-spribe',
  title: 'Aviator',
  provider: { code: 'spribe', name: 'Spribe' },
  categories: ['crash-games'],
  imageUrl: null,
  available: true,
  modes: { demo: true, real: false },
};
const demoLaunch: CasinoDemoLaunch = {
  gameUrl: 'https://demo.bigbangcasino.bet/game/aviator',
  gameName: 'Aviator',
};

test('legacy route resolves through the persisted slug contract and launches only the returned canonical UUID', async () => {
  const lookups: string[] = [];
  const launches: Array<{ gameId: string; language: string }> = [];
  const dependencies: SandboxDemoDependencies = {
    resolveBySlug: async (slug) => {
      lookups.push(slug);
      return game;
    },
    launchDemo: async (gameId, language) => {
      launches.push({ gameId, language });
      return demoLaunch;
    },
  };

  const result = await launchSandboxDemoForSlug('aviator', dependencies);

  assert.deepEqual(lookups, ['aviator']);
  assert.deepEqual(launches, [{ gameId: CANONICAL_GAME_ID, language: 'en' }]);
  assert.equal(result.game.id, CANONICAL_GAME_ID);
  assert.equal(result.gameUrl, demoLaunch.gameUrl);
});

for (const failure of [
  { slug: 'crazy-time', status: 404, reason: 'unmatched legacy alias' },
  { slug: 'ambiguous-legacy-alias', status: 409, reason: 'ambiguous legacy alias' },
]) {
  test(`does not launch a substitute for a ${failure.reason} (${failure.status})`, async () => {
    let launchCalled = false;
    const dependencies: SandboxDemoDependencies = {
      resolveBySlug: async (slug) => {
        assert.equal(slug, failure.slug);
        throw new Error(`HTTP ${failure.status}`);
      },
      launchDemo: async () => {
        launchCalled = true;
        return demoLaunch;
      },
    };

    await assert.rejects(
      launchSandboxDemoForSlug(failure.slug, dependencies),
      new RegExp(String(failure.status)),
    );
    assert.equal(launchCalled, false, 'demo launch must not run when canonical slug resolution fails');
  });
}
