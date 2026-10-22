import type { CasinoCatalogGame, CasinoDemoLaunch } from './casinoCatalog';
import { fetchCasinoGameBySlug, launchCasinoSandboxDemo } from './casinoCatalog';

export interface SandboxDemoResult {
  game: CasinoCatalogGame;
  gameUrl: string;
}

export interface SandboxDemoDependencies {
  resolveBySlug: (slug: string) => Promise<CasinoCatalogGame>;
  launchDemo: (gameId: string, language: string) => Promise<CasinoDemoLaunch>;
}

const defaultDependencies: SandboxDemoDependencies = {
  resolveBySlug: fetchCasinoGameBySlug,
  launchDemo: launchCasinoSandboxDemo,
};

/**
 * Resolve and launch a legacy storefront route using the persisted canonical
 * slug/alias contract only. Never infer identity from the display title or
 * provider label: unresolved aliases (404) and ambiguous aliases (409) must
 * fail before the demo-launch endpoint is called.
 */
export async function launchSandboxDemoForSlug(
  slug: string,
  dependencies: SandboxDemoDependencies = defaultDependencies,
): Promise<SandboxDemoResult> {
  const game = await dependencies.resolveBySlug(slug);
  const launch = await dependencies.launchDemo(game.id, 'en');
  return { game, gameUrl: launch.gameUrl };
}
