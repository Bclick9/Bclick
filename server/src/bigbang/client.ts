import { BigBangApiError, type BigBangCatalogSnapshot, type BigBangGame, type BigBangGameType, type BigBangMode } from './types.js';

const BIGBANG_BASE_URL = 'https://api.bigbangcasino.bet/api/v1/';
const PAGE_LIMIT = 5_000;
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
const GAME_TYPES = new Set<BigBangGameType>(['slot','live','crash']);
const MODES = new Set<BigBangMode>(['standard','premium']);

export interface BigBangClientOptions {
  readonly apiKey: string;
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
  /** Injectable for deterministic pagination tests; production defaults to the vendor maximum. */
  readonly pageLimit?: number;
}

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(object: RawObject, field: string, maxLength: number): string {
  const value = object[field];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new BigBangApiError('BIGBANG_SCHEMA_INVALID', 'BigBang catalogue response failed schema validation');
  }
  return value.trim();
}

function requiredBoolean(object: RawObject, field: string): boolean {
  if (typeof object[field] !== 'boolean') {
    throw new BigBangApiError('BIGBANG_SCHEMA_INVALID', 'BigBang catalogue response failed schema validation');
  }
  return object[field] as boolean;
}

function safeThumbnail(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const isBigBangHost = url.hostname === 'bigbangcasino.bet' || url.hostname.endsWith('.bigbangcasino.bet');
    if (url.protocol !== 'https:' || !isBigBangHost || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseGame(value: unknown): BigBangGame {
  if (!isObject(value) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0) {
    throw new BigBangApiError('BIGBANG_SCHEMA_INVALID', 'BigBang catalogue response failed schema validation');
  }
  const name = requiredString(value, 'name', 240);
  const title = requiredString(value, 'title', 240);
  const provider = requiredString(value, 'provider', 160);
  const category = requiredString(value, 'category', 160);
  const categoryTitle = typeof value.category_title === 'string' && value.category_title.trim()
    ? value.category_title.trim().slice(0, 160)
    : category;
  const modeValue = value.mode;
  if (typeof modeValue !== 'string' || !MODES.has(modeValue as BigBangMode)) {
    throw new BigBangApiError('BIGBANG_SCHEMA_INVALID', 'BigBang catalogue response failed schema validation');
  }
  if (typeof value.game_type !== 'string' || !GAME_TYPES.has(value.game_type as BigBangGameType)) {
    throw new BigBangApiError('BIGBANG_SCHEMA_INVALID', 'BigBang catalogue response failed schema validation');
  }
  const isPremium = requiredBoolean(value, 'is_premium');
  const isDemo = requiredBoolean(value, 'is_demo');
  if (modeValue !== 'standard' || isPremium) {
    throw new BigBangApiError('BIGBANG_SANDBOX_TIER_VIOLATION', 'Sandbox catalogue included a non-standard game');
  }
  return {
    id: Number(value.id),
    name,
    title,
    provider,
    category,
    categoryTitle,
    thumbnail: safeThumbnail(value.thumbnail),
    mode: modeValue as BigBangMode,
    isPremium,
    gameType: value.game_type as BigBangGameType,
    isDemo,
  };
}

function parseEnvelope(value: unknown, expectedOffset: number, expectedLimit: number): { games: BigBangGame[]; total: number; limit: number } {
  if (!isObject(value) || value.success !== true || !Array.isArray(value.data) || !isObject(value.pagination)) {
    throw new BigBangApiError('BIGBANG_ENVELOPE_INVALID', 'BigBang returned an unexpected catalogue response');
  }
  const total = value.pagination.total;
  const limit = value.pagination.limit;
  const offset = value.pagination.offset;
  if (!Number.isSafeInteger(total) || Number(total) < 0
    || !Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > PAGE_LIMIT
    || !Number.isSafeInteger(offset) || Number(offset) !== expectedOffset
    || Number(limit) !== expectedLimit
    || value.data.length > Number(limit)) {
    throw new BigBangApiError('BIGBANG_PAGINATION_INVALID', 'BigBang catalogue pagination metadata is inconsistent');
  }
  return {
    games: value.data.map(parseGame),
    total: Number(total),
    limit: Number(limit),
  };
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new BigBangApiError('BIGBANG_RESPONSE_TOO_LARGE', 'BigBang catalogue response exceeded the size limit');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > maxBytes) {
      throw new BigBangApiError('BIGBANG_RESPONSE_TOO_LARGE', 'BigBang catalogue response exceeded the size limit');
    }
    return body;
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BigBangApiError('BIGBANG_RESPONSE_TOO_LARGE', 'BigBang catalogue response exceeded the size limit');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BigBangApiClient {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxPages: number;
  private readonly pageLimit: number;

  constructor(options: BigBangClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey.startsWith('ek_test_') || apiKey.length < 12) {
      throw new Error('Phase 6 catalogue sync requires a BigBang sandbox key prefixed ek_test_.');
    }
    this.apiKey = apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxPages = options.maxPages ?? 100;
    this.pageLimit = options.pageLimit ?? PAGE_LIMIT;
    if (!Number.isInteger(this.pageLimit) || this.pageLimit < 1 || this.pageLimit > PAGE_LIMIT) {
      throw new Error('BigBang pageLimit must be between 1 and 5000');
    }
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1_000 || this.timeoutMs > 60_000) {
      throw new Error('BigBang request timeout must be between 1000 and 60000 milliseconds');
    }
    if (!Number.isInteger(this.maxPages) || this.maxPages < 1 || this.maxPages > 100) {
      throw new Error('BigBang maxPages must be between 1 and 100');
    }
  }

  private readonly apiKey: string;

  private async fetchPage(offset: number): Promise<{ games: BigBangGame[]; total: number; limit: number }> {
    const url = new URL('games', BIGBANG_BASE_URL);
    url.searchParams.set('type', 'standard');
    url.searchParams.set('limit', String(this.pageLimit));
    url.searchParams.set('offset', String(offset));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'X-API-Key': this.apiKey },
          redirect: 'error',
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt < 2) {
            const retryAfterSeconds = Number(response.headers.get('retry-after') ?? '0');
            const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
              ? Math.min(retryAfterSeconds * 1000, 2_000)
              : 200 * (attempt + 1);
            await delay(waitMs);
            continue;
          }
          throw new BigBangApiError(
            'BIGBANG_HTTP_' + response.status,
            'BigBang catalogue request failed with HTTP ' + response.status,
            retryable,
          );
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('json')) {
          throw new BigBangApiError('BIGBANG_CONTENT_TYPE_INVALID', 'BigBang returned a non-JSON catalogue response');
        }
        const text = await readBoundedBody(response, MAX_RESPONSE_BYTES);
        let payload: unknown;
        try {
          payload = JSON.parse(text) as unknown;
        } catch {
          throw new BigBangApiError('BIGBANG_JSON_INVALID', 'BigBang returned malformed JSON');
        }
        return parseEnvelope(payload, offset, this.pageLimit);
      } catch (error) {
        if (error instanceof BigBangApiError) {
          if (error.retryable && attempt < 2) {
            await delay(200 * (attempt + 1));
            continue;
          }
          throw error;
        }
        if (attempt < 2) {
          await delay(200 * (attempt + 1));
          continue;
        }
        throw new BigBangApiError('BIGBANG_NETWORK_ERROR', 'BigBang catalogue request failed after bounded retries');
      }
    }
    throw new BigBangApiError('BIGBANG_NETWORK_ERROR', 'BigBang catalogue request failed after bounded retries');
  }

  async listAllStandardGames(): Promise<BigBangCatalogSnapshot> {
    const games: BigBangGame[] = [];
    const ids = new Set<number>();
    let offset = 0;
    let expectedTotal: number | null = null;

    for (let page = 0; page < this.maxPages; page += 1) {
      const result = await this.fetchPage(offset);
      if (expectedTotal === null) expectedTotal = result.total;
      if (result.total !== expectedTotal) {
        throw new BigBangApiError('BIGBANG_CATALOG_CHANGED', 'BigBang catalogue total changed during pagination; the sync was not published');
      }
      for (const game of result.games) {
        if (ids.has(game.id)) {
          throw new BigBangApiError('BIGBANG_DUPLICATE_GAME_ID', 'BigBang returned a duplicate game identifier across catalogue pages');
        }
        ids.add(game.id);
        games.push(game);
      }
      if (games.length === expectedTotal) {
        return { games, totalReported: expectedTotal };
      }
      if (result.games.length === 0 || games.length > expectedTotal) {
        throw new BigBangApiError('BIGBANG_PAGINATION_INCOMPLETE', 'BigBang catalogue pagination ended before all reported games were received');
      }
      offset += result.games.length;
    }
    throw new BigBangApiError('BIGBANG_PAGE_LIMIT_EXCEEDED', 'BigBang catalogue exceeded the configured page limit');
  }
}
