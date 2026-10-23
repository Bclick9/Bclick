import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';
import type { SqlExecutor } from '../identity/repository.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface GameRow extends QueryResultRow {
  id: string;
  slug: string;
  title: string;
  provider_code: string;
  provider_name: string;
  image_url: string | null;
  description: string;
  available: boolean;
  categories: string[];
  demo_available: boolean;
  real_available: boolean;
}

interface LegacyAliasRow extends QueryResultRow {
  resolution_status: 'pending' | 'resolved' | 'unmatched' | 'ambiguous';
  game_id: string | null;
}

interface SyncMetaRow extends QueryResultRow {
  latest_status: string | null;
  fetched_at: string | null;
}

interface QueryOptions {
  readonly category?: string;
  readonly provider?: string;
  readonly query?: string;
  readonly mode?: 'demo' | 'real';
  readonly pageSize: number;
  readonly offset: number;
}

function errorResponse(reply: Parameters<FastifyInstance['get']>[1] extends never ? never : any, request: FastifyRequest, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}

function parseCursor(cursor: string | undefined): number | null {
  if (cursor === undefined) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!decoded || !/^\d+$/.test(decoded) || Buffer.from(decoded).toString('base64url') !== cursor) return null;
    const offset = Number(decoded);
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : null;
  } catch {
    return null;
  }
}

function readOptions(request: FastifyRequest, reply: any): QueryOptions | null {
  const query = request.query as Record<string, unknown>;
  const pageSize = query.pageSize === undefined ? 24 : Number(query.pageSize);
  const page = query.page === undefined ? 1 : Number(query.page);
  const category = typeof query.category === 'string' ? query.category.trim() : undefined;
  const provider = typeof query.provider === 'string' ? query.provider.trim() : undefined;
  const search = typeof query.query === 'string' ? query.query.trim() : undefined;
  const mode = query.mode === 'demo' || query.mode === 'real' ? query.mode : undefined;

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger(page) || page < 1
    || (category !== undefined && (category.length < 1 || category.length > 80))
    || (provider !== undefined && (provider.length < 1 || provider.length > 80))
    || (search !== undefined && search.length > 100)) {
    errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue query parameters are invalid');
    return null;
  }
  let offset = (page - 1) * pageSize;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || query.cursor.length > 512) {
      errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue cursor is invalid');
      return null;
    }
    const decoded = parseCursor(query.cursor);
    if (decoded === null) {
      errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue cursor is invalid');
      return null;
    }
    offset = decoded;
  }
  if (!Number.isSafeInteger(offset)) {
    errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue page offset is invalid');
    return null;
  }
  return {
    ...(category ? { category } : {}),
    ...(provider ? { provider } : {}),
    ...(search ? { query: search } : {}),
    ...(mode ? { mode } : {}),
    pageSize,
    offset,
  };
}

async function getSyncMeta(db: SqlExecutor): Promise<{ stale: boolean; fetchedAt: string | null }> {
  const result = await db.query<SyncMetaRow>(`
    SELECT
      (SELECT status FROM public.casino_catalog_sync_runs
        WHERE source_code='bigbang' ORDER BY started_at DESC,id DESC LIMIT 1) AS latest_status,
      (SELECT max(completed_at) FROM public.casino_catalog_sync_runs
        WHERE source_code='bigbang' AND status='succeeded') AS fetched_at
  `);
  const row = result.rows[0];
  return {
    stale: !row || row.latest_status !== 'succeeded',
    fetchedAt: row?.fetched_at ? new Date(row.fetched_at).toISOString() : null,
  };
}

function whereClause(options: QueryOptions): { sql: string; values: unknown[] } {
  const conditions = ['g.available=true', 'g.bclick_enabled=true', 'p.bclick_enabled=true', 's.source_code=\'bigbang\'', 's.source_mode=\'standard\'', 's.available=true', "EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)"];
  const values: unknown[] = [];
  const add = (value: unknown) => { values.push(value); return '$' + values.length; };
  if (options.category) {
    const p = add(options.category);
    conditions.push(`EXISTS (SELECT 1 FROM public.casino_game_categories gc WHERE gc.game_id=g.id AND gc.category_slug=${p})`);
  }
  if (options.provider) {
    // Provider is an identity filter, not free-text search. Resolve only the stored
    // Bclick provider code or exact display name so similar names never bleed across rows.
    const p = add(options.provider);
    conditions.push(`(p.code = ${p} OR lower(p.name) = lower(${p}))`);
  }
  if (options.query) {
    const p = add('%' + options.query.replace(/[\\%_]/g, '\\$&') + '%');
    conditions.push(`(g.title ILIKE ${p} ESCAPE E'\\\\' OR p.name ILIKE ${p} ESCAPE E'\\\\')`);
  }
  if (options.mode === 'demo') conditions.push('g.demo_available=true');
  if (options.mode === 'real') conditions.push('g.real_available=true');
  return { sql: conditions.join(' AND '), values };
}

async function readGames(db: SqlExecutor, options: QueryOptions): Promise<{ data: GameRow[]; total: number }> {
  const filter = whereClause(options);
  const count = await db.query<{ total: string }>(`
    SELECT count(DISTINCT g.id)::text AS total
      FROM public.casino_games g
      JOIN public.casino_providers p ON p.id=g.provider_id
      JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard'
     WHERE ${filter.sql}
  `, filter.values);
  const total = Number(count.rows[0]?.total ?? 0);
  const result = await db.query<GameRow>(`
    SELECT g.id::text AS id,g.game_slug AS slug,g.title,
           p.code AS provider_code,p.name AS provider_name,
           COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,COALESCE(pres.description_override,'') AS description,g.available,g.demo_available,g.real_available,
           COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
      FROM public.casino_games g
      JOIN public.casino_providers p ON p.id=g.provider_id
      JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
      LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
      LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
     WHERE ${filter.sql}
     GROUP BY g.id,g.game_slug,g.title,p.code,p.name,g.image_url,pres.custom_image_key,pres.description_override,g.available,g.demo_available,g.real_available
     ORDER BY lower(g.title),g.id
     LIMIT ${'$'}${filter.values.length + 1} OFFSET ${'$'}${filter.values.length + 2}
  `, [...filter.values,options.pageSize,options.offset]);
  return { data: result.rows, total };
}

function mapGame(row: GameRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    provider: { code: row.provider_code, name: row.provider_name },
    categories: row.categories ?? [],
    imageUrl: row.image_url,
    description: row.description ?? '',
    available: row.available,
    // Catalogue-only increment intentionally enables neither mode until Phase 7 launch policy is approved.
    modes: { demo: row.demo_available, real: row.real_available },
  };
}

interface CatalogPageOptions {
  readonly pageSize: number;
  readonly offset: number;
}

function readCatalogPage(request: FastifyRequest, reply: any): CatalogPageOptions | null {
  const query = request.query as Record<string, unknown>;
  const pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger(page) || page < 1) {
    errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue pagination parameters are invalid');
    return null;
  }
  let offset = (page - 1) * pageSize;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || query.cursor.length > 2048) {
      errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue cursor is invalid');
      return null;
    }
    const decoded = parseCursor(query.cursor);
    if (decoded === null) {
      errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue cursor is invalid');
      return null;
    }
    offset = decoded;
  }
  if (!Number.isSafeInteger(offset)) {
    errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue page offset is invalid');
    return null;
  }
  return { pageSize, offset };
}

function listPage<T>(rows: readonly T[], total: number, options: CatalogPageOptions) {
  const nextOffset = options.offset + rows.length;
  return {
    page: Math.floor(options.offset / options.pageSize) + 1,
    pageSize: options.pageSize,
    total,
    nextCursor: nextOffset < total ? Buffer.from(String(nextOffset)).toString('base64url') : null,
  };
}

function categoryPresentation(slug: string): { title: string; icon: string | null } {
  const known: Record<string, { title: string; icon: string }> = {
    'slot-games': { title: 'Slots', icon: 'cherry' },
    'live-casino': { title: 'Live Casino', icon: 'spade' },
    'crash-games': { title: 'Crash Games', icon: 'rocket' },
  };
  const match = known[slug];
  if (match) return match;
  return {
    title: slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    icon: null,
  };
}

export function registerCasinoCatalogRoutes(app: FastifyInstance, database: SqlExecutor): void {
  const paginationSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      cursor: { type: 'string', maxLength: 2048 },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  };

  // These read-only endpoints query only the local normalized catalogue. They never contact BigBang.
  app.get('/api/v1/casino/categories', { schema: { querystring: paginationSchema } }, async (request, reply) => {
    const options = readCatalogPage(request, reply);
    if (!options) return;
    // Availability is an operator kill switch. Do not retain responses past a mutation.
    reply.header('Cache-Control', 'no-store');
    const count = await database.query<{ total: string }>(`
      SELECT count(DISTINCT gc.category_slug)::text AS total
        FROM public.casino_game_categories gc
        JOIN public.casino_games g ON g.id=gc.game_id
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
    `);
    const total = Number(count.rows[0]?.total ?? 0);
    const result = await database.query<{ slug: string }>(`
      SELECT DISTINCT gc.category_slug AS slug
        FROM public.casino_game_categories gc
        JOIN public.casino_games g ON g.id=gc.game_id
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       ORDER BY gc.category_slug
       LIMIT $1 OFFSET $2
    `, [options.pageSize, options.offset]);
    const meta = await getSyncMeta(database);
    return {
      data: result.rows.map((row) => ({ slug: row.slug, ...categoryPresentation(row.slug) })),
      page: listPage(result.rows, total, options),
      meta: { resolvedLocale: 'en', stale: meta.stale, fetchedAt: meta.fetchedAt },
      requestId: request.id,
    };
  });

  app.get('/api/v1/casino/providers', { schema: { querystring: paginationSchema } }, async (request, reply) => {
    const options = readCatalogPage(request, reply);
    if (!options) return;
    reply.header('Cache-Control', 'no-store');
    const count = await database.query<{ total: string }>(`
      SELECT count(DISTINCT p.id)::text AS total
        FROM public.casino_providers p
        JOIN public.casino_games g ON g.provider_id=p.id AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
    `);
    const total = Number(count.rows[0]?.total ?? 0);
    const result = await database.query<{ code: string; name: string }>(`
      SELECT DISTINCT p.code,p.name
        FROM public.casino_providers p
        JOIN public.casino_games g ON g.provider_id=p.id AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       ORDER BY p.name,p.code
       LIMIT $1 OFFSET $2
    `, [options.pageSize, options.offset]);
    const meta = await getSyncMeta(database);
    return {
      data: result.rows,
      page: listPage(result.rows, total, options),
      meta: { resolvedLocale: 'en', stale: meta.stale, fetchedAt: meta.fetchedAt },
      requestId: request.id,
    };
  });

  const querySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      category: { type: 'string', minLength: 1, maxLength: 80 },
      provider: { type: 'string', minLength: 1, maxLength: 80 },
      query: { type: 'string', maxLength: 100 },
      mode: { type: 'string', enum: ['demo','real'] },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
      cursor: { type: 'string', maxLength: 512 },
      page: { type: 'integer', minimum: 1, default: 1 },
    },
  };

  app.get('/api/v1/casino/games', { schema: { querystring: querySchema } }, async (request, reply) => {
    const options = readOptions(request, reply);
    if (!options) return;
    reply.header('Cache-Control', 'no-store');
    const result = await readGames(database, options);
    const meta = await getSyncMeta(database);
    const nextOffset = options.offset + result.data.length;
    const nextCursor = nextOffset < result.total ? Buffer.from(String(nextOffset)).toString('base64url') : null;
    reply.header('Cache-Control', 'no-store');
    return {
      data: result.data.map(mapGame),
      page: { page: Math.floor(options.offset / options.pageSize) + 1, pageSize: options.pageSize, total: result.total, nextCursor },
      meta: { resolvedLocale: 'en', stale: meta.stale, fetchedAt: meta.fetchedAt },
      requestId: request.id,
    };
  });

  app.get('/api/v1/casino/games/by-slug/:slug', async (request, reply) => {
    const slug = (request.params as { slug: string }).slug;
    if (!SLUG_PATTERN.test(slug) || slug.length > 120) {
      return errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Game slug is invalid');
    }

    // A known legacy slug takes precedence over canonical-slug lookup. Unresolved
    // legacy routes never fall through to a different game that happens to reuse
    // the same text slug.
    const aliasResult = await database.query<LegacyAliasRow>(`
      SELECT resolution_status,game_id::text AS game_id
        FROM public.casino_game_legacy_slug_aliases
       WHERE alias_slug=$1
    `, [slug]);
    const alias = aliasResult.rows[0];
    if (alias?.resolution_status === 'ambiguous') {
      return errorResponse(reply, request, 409, 'LEGACY_SLUG_AMBIGUOUS', 'This legacy game URL matches more than one catalogue game');
    }
    if (alias && alias.resolution_status !== 'resolved') {
      return errorResponse(reply, request, 404, 'NOT_FOUND', 'Game not found');
    }
    if (alias?.resolution_status === 'resolved' && !alias.game_id) {
      return errorResponse(reply, request, 409, 'LEGACY_SLUG_MAPPING_INVALID', 'This legacy game URL needs catalogue reconciliation');
    }

    const lookupValue = alias ? alias.game_id : slug;
    if (typeof lookupValue !== 'string') {
      return errorResponse(reply, request, 409, 'LEGACY_SLUG_MAPPING_INVALID', 'This legacy game URL needs catalogue reconciliation');
    }
    const lookupPredicate = alias ? 'g.id=$1' : 'g.game_slug=$1';
    const filter = await database.query<GameRow>(`
      SELECT g.id::text AS id,g.game_slug AS slug,g.title,
             p.code AS provider_code,p.name AS provider_name,
             COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,COALESCE(pres.description_override,'') AS description,g.available,g.demo_available,g.real_available,
             COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
        FROM public.casino_games g
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
        LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
        LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
       WHERE ${lookupPredicate} AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       GROUP BY g.id,g.game_slug,g.title,p.code,p.name,g.image_url,pres.custom_image_key,pres.description_override,g.available,g.demo_available,g.real_available
       LIMIT 1
    `, [lookupValue]);
    const row = filter.rows[0];
    if (!row) return errorResponse(reply, request, 404, 'NOT_FOUND', 'Game not found');
    reply.header('Cache-Control', 'no-store');
    return { data: mapGame(row), requestId: request.id };
  });

  app.get('/api/v1/casino/games/:gameId', async (request, reply) => {
    const id = (request.params as { gameId: string }).gameId;
    if (!UUID_PATTERN.test(id)) return errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Game ID is invalid');
    const filter = await database.query<GameRow>(`
      SELECT g.id::text AS id,g.game_slug AS slug,g.title,
             p.code AS provider_code,p.name AS provider_name,
             g.image_url,g.available,g.demo_available,g.real_available,
             COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
        FROM public.casino_games g
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
        LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
       WHERE g.id=$1 AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       GROUP BY g.id,g.game_slug,g.title,p.code,p.name,g.image_url,g.available,g.demo_available,g.real_available
       LIMIT 1
    `, [id]);
    const row = filter.rows[0];
    if (!row) return errorResponse(reply, request, 404, 'NOT_FOUND', 'Game not found');
    reply.header('Cache-Control', 'no-store');
    return { data: mapGame(row), requestId: request.id };
  });
}
