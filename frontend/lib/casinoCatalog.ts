export interface CasinoCatalogGame {
  id: string;
  slug: string;
  title: string;
  provider: { code: string; name: string };
  categories: string[];
  imageUrl: string | null;
  available: boolean;
  modes: { demo: boolean; real: boolean };
}

export interface CasinoCatalogPage {
  data: CasinoCatalogGame[];
  page: {
    page: number;
    pageSize: number;
    total: number;
    nextCursor: string | null;
  };
  meta: {
    resolvedLocale: string;
    stale: boolean;
    fetchedAt: string | null;
  };
}

export interface CasinoDemoLaunch {
  gameUrl: string;
  gameName: string;
}

export interface CasinoCatalogQuery {
  category?: string;
  provider?: string;
  query?: string;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null) as Promise<unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCasinoCatalogGame(value: unknown): value is CasinoCatalogGame {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.slug !== 'string'
    || typeof value.title !== 'string' || !isObject(value.provider)
    || typeof value.provider.code !== 'string' || typeof value.provider.name !== 'string'
    || !Array.isArray(value.categories) || !value.categories.every((item) => typeof item === 'string')
    || !(typeof value.imageUrl === 'string' || value.imageUrl === null)
    || typeof value.available !== 'boolean' || !isObject(value.modes)
    || typeof value.modes.demo !== 'boolean' || typeof value.modes.real !== 'boolean') {
    return false;
  }
  return true;
}

export async function fetchCasinoGames(options: CasinoCatalogQuery = {}): Promise<CasinoCatalogPage> {
  const params = new URLSearchParams();
  params.set('pageSize', String(options.pageSize ?? 48));
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.category) params.set('category', options.category);
  if (options.provider) params.set('provider', options.provider);
  if (options.query) params.set('query', options.query);

  const response = await fetch('/api/v1/casino/games?' + params.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const message = isObject(payload) && isObject(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : 'The casino catalogue could not be loaded.';
    throw new Error(message);
  }
  if (!isObject(payload) || !Array.isArray(payload.data)
    || !payload.data.every(isCasinoCatalogGame) || !isObject(payload.page)
    || !Number.isSafeInteger(payload.page.total) || typeof payload.page.nextCursor !== 'string' && payload.page.nextCursor !== null
    || !isObject(payload.meta) || typeof payload.meta.stale !== 'boolean') {
    throw new Error('The casino API returned an invalid catalogue response.');
  }

  return payload as unknown as CasinoCatalogPage;
}

export async function fetchCasinoGameBySlug(slug: string, signal?: AbortSignal): Promise<CasinoCatalogGame> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Game slug is invalid.');
  }
  const response = await fetch('/api/v1/casino/games/by-slug/' + encodeURIComponent(slug), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const message = isObject(payload) && isObject(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Game details could not be loaded.';
    throw new Error(message);
  }
  if (!isObject(payload) || !isCasinoCatalogGame(payload.data)) {
    throw new Error('The casino API returned invalid game details.');
  }
  return payload.data;
}

export async function launchCasinoSandboxDemo(gameId: string, language = 'en'): Promise<CasinoDemoLaunch> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(gameId)) {
    throw new Error('The selected game has no valid catalogue identity.');
  }

  const response = await fetch('/api/v1/casino/games/' + encodeURIComponent(gameId) + '/demo-launch', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ language }),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const message = isObject(payload) && isObject(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Demo launch is temporarily unavailable.';
    throw new Error(message);
  }
  if (!isObject(payload) || !isObject(payload.data) || payload.data.demo !== true
    || typeof payload.data.gameUrl !== 'string' || typeof payload.data.gameName !== 'string') {
    throw new Error('The casino API returned an invalid demo launch response.');
  }

  const launchUrl = new URL(payload.data.gameUrl);
  if (launchUrl.protocol !== 'https:'
    || !(launchUrl.hostname === 'bigbangcasino.bet' || launchUrl.hostname.endsWith('.bigbangcasino.bet'))
    || launchUrl.username || launchUrl.password) {
    throw new Error('The provider returned an untrusted demo URL.');
  }

  return { gameUrl: launchUrl.toString(), gameName: payload.data.gameName };
}

export function getCatalogErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The casino catalogue is temporarily unavailable.';
}


export interface CasinoCatalogProvider {
  code: string;
  name: string;
}

export interface CasinoCatalogProviderPage {
  data: CasinoCatalogProvider[];
  page: {
    page: number;
    pageSize: number;
    total: number;
    nextCursor: string | null;
  };
  meta: {
    resolvedLocale: string;
    stale: boolean;
    fetchedAt: string | null;
  };
}

export async function fetchCasinoProviders(signal?: AbortSignal): Promise<CasinoCatalogProviderPage> {
  const pageSize = 100;
  let cursor: string | null = null;
  let pageNumber = 1;
  let total = 0;
  let firstPage: CasinoCatalogProviderPage | null = null;
  const providers: CasinoCatalogProvider[] = [];
  const seenCursors = new Set<string>();
  const seenCodes = new Set<string>();

  // The endpoint is keyset/offset-cursor paginated. Follow every page so the
  // directory never silently treats a partial provider list as complete.
  while (pageNumber <= 100) {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (cursor) params.set('cursor', cursor);
    const response = await fetch('/api/v1/casino/providers?' + params.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const message = isObject(payload) && isObject(payload.error) && typeof payload.error.message === 'string'
        ? payload.error.message
        : 'The casino providers could not be loaded.';
      throw new Error(message);
    }
    if (!isObject(payload) || !Array.isArray(payload.data)
      || !payload.data.every((provider) => isObject(provider)
        && typeof provider.code === 'string' && provider.code.length > 0
        && typeof provider.name === 'string' && provider.name.length > 0)
      || !isObject(payload.page) || !Number.isSafeInteger(payload.page.total)
      || typeof payload.page.nextCursor !== 'string' && payload.page.nextCursor !== null
      || !isObject(payload.meta) || typeof payload.meta.stale !== 'boolean') {
      throw new Error('The casino API returned an invalid providers response.');
    }

    const current = payload as unknown as CasinoCatalogProviderPage;
    if (pageNumber === 1) {
      firstPage = current;
      total = current.page.total;
      if (total < current.data.length) {
        throw new Error('The casino API returned an inconsistent provider count.');
      }
    } else if (current.page.total !== total) {
      throw new Error('The provider list changed while it was being paged. Refresh and retry.');
    }

    for (const provider of current.data) {
      if (seenCodes.has(provider.code)) {
        throw new Error('The casino API returned a duplicate provider across pages.');
      }
      seenCodes.add(provider.code);
      providers.push(provider);
    }

    cursor = current.page.nextCursor;
    if (cursor === null) {
      if (providers.length !== total) {
        throw new Error('The provider list is incomplete. Refresh and retry.');
      }
      return {
        data: providers,
        page: { ...firstPage!.page, nextCursor: null },
        meta: {
          ...firstPage!.meta,
          stale: firstPage!.meta.stale || current.meta.stale,
          fetchedAt: current.meta.fetchedAt ?? firstPage!.meta.fetchedAt,
        },
      };
    }
    if (seenCursors.has(cursor)) {
      throw new Error('The casino API returned a repeated provider-page cursor.');
    }
    seenCursors.add(cursor);
    pageNumber += 1;
  }

  throw new Error('The provider list exceeded the safe pagination limit.');
}
