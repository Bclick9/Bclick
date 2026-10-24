import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';
import type { SqlExecutor } from '../identity/repository.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CASINO_DISPLAY_TYPES = ['casino','live-casino','crash-games'] as const;
type CasinoDisplayType = typeof CASINO_DISPLAY_TYPES[number];
const DISPLAY_TYPE_TO_GAME_TYPE: Record<CasinoDisplayType, 'slot' | 'live' | 'crash'> = {
  casino: 'slot',
  'live-casino': 'live',
  'crash-games': 'crash',
};

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

interface SyncMetaRow extends QueryResultRow {
  latest_status: string | null;
  fetched_at: string | null;
}

interface QueryOptions {
  readonly category?: string;
  readonly displayCategory?: string;
  readonly type?: CasinoDisplayType;
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
  const displayCategory = typeof query.displayCategory === 'string' ? query.displayCategory.trim() : undefined;
  const type = typeof query.type === 'string' && (CASINO_DISPLAY_TYPES as readonly string[]).includes(query.type) ? query.type as CasinoDisplayType : undefined;
  const provider = typeof query.provider === 'string' ? query.provider.trim() : undefined;
  const search = typeof query.query === 'string' ? query.query.trim() : undefined;
  const mode = query.mode === 'demo' || query.mode === 'real' ? query.mode : undefined;

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger(page) || page < 1
    || (category !== undefined && (category.length < 1 || category.length > 80))
    || (displayCategory !== undefined && (displayCategory.length < 1 || displayCategory.length > 80))
    || (query.type !== undefined && !type)
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
    ...(displayCategory ? { displayCategory } : {}),
    ...(type ? { type } : {}),
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
  if (options.type) {
    conditions.push(`g.game_type='${DISPLAY_TYPE_TO_GAME_TYPE[options.type]}'`);
  }
  if (options.displayCategory) {
    const p = add(options.displayCategory);
    conditions.push(`EXISTS (SELECT 1 FROM public.casino_game_display_categories dgc JOIN public.casino_display_categories dc ON dc.id=dgc.category_id WHERE dgc.game_id=g.id AND dc.slug=${p} AND dc.visible=true AND ((dc.category_type='casino' AND g.game_type='slot') OR (dc.category_type='live-casino' AND g.game_type='live') OR (dc.category_type='crash-games' AND g.game_type='crash')))`);
  }
  if (options.provider) {
    // Provider is an identity filter, not free-text search. Resolve only the stored
    // Bclick provider code or exact display name so similar names never bleed across rows.
    const p = add(options.provider);
    conditions.push(`(p.code = ${p} OR lower(p.name) = lower(${p}))`);
  }
  if (options.query) {
    const p = add('%' + options.query.replace(/[\\%_]/g, '\\$&') + '%');
    conditions.push(`(g.title ILIKE ${p} ESCAPE E'\\\\' OR COALESCE((SELECT NULLIF(pres_search.title_override,'') FROM public.casino_game_presentation pres_search WHERE pres_search.game_id=g.id),g.title) ILIKE ${p} ESCAPE E'\\\\' OR p.name ILIKE ${p} ESCAPE E'\\\\')`);
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
    SELECT g.id::text AS id,g.game_slug AS slug,COALESCE(NULLIF(pres.title_override,''),g.title) AS title,
           p.code AS provider_code,p.name AS provider_name,
           COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,COALESCE(pres.description_override,'') AS description,g.available,g.demo_available,g.real_available,
           COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
      FROM public.casino_games g
      JOIN public.casino_providers p ON p.id=g.provider_id
      JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
      LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
      LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
     WHERE ${filter.sql}
     GROUP BY g.id,g.game_slug,g.title,p.code,p.name,g.image_url,pres.custom_image_key,pres.description_override,pres.title_override,pres.display_order,g.available,g.demo_available,g.real_available
     ORDER BY COALESCE(pres.display_order,0),lower(g.title),g.id
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
  readonly type?: CasinoDisplayType;
}

function readCatalogPage(request: FastifyRequest, reply: any, cursorMaxLength = 512): CatalogPageOptions | null {
  const query = request.query as Record<string, unknown>;
  const pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  const page = query.page === undefined ? 1 : Number(query.page);
  const type = typeof query.type === 'string' && (CASINO_DISPLAY_TYPES as readonly string[]).includes(query.type) ? query.type as CasinoDisplayType : undefined;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger(page) || page < 1
    || (query.type !== undefined && !type)) {
    errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Catalogue pagination parameters are invalid');
    return null;
  }
  let offset = (page - 1) * pageSize;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || query.cursor.length > cursorMaxLength) {
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
  return { pageSize, offset, ...(type ? { type } : {}) };
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
      cursor: { type: 'string', maxLength: 512 },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  };
  const categoryPaginationSchema = {
    ...paginationSchema,
    properties: { ...paginationSchema.properties, cursor: { type: 'string', maxLength: 2048 }, type: { type: 'string', enum: [...CASINO_DISPLAY_TYPES] } },
  };

  // These read-only endpoints query only the local normalized catalogue. They never contact BigBang.
  app.get('/api/v1/casino/categories', { schema: { querystring: categoryPaginationSchema } }, async (request, reply) => {
    const options = readCatalogPage(request, reply, 2048);
    if (!options) return;
    // Availability is an operator kill switch. Do not retain responses past a mutation.
    reply.header('Cache-Control', 'no-store');
    const typeClause = options.type ? ` AND g.game_type='${DISPLAY_TYPE_TO_GAME_TYPE[options.type]}'` : '';
    const count = await database.query<{ total: string }>(`
      SELECT count(DISTINCT gc.category_slug)::text AS total
        FROM public.casino_game_categories gc
        JOIN public.casino_games g ON g.id=gc.game_id
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)${typeClause}
    `);
    const total = Number(count.rows[0]?.total ?? 0);
    const result = await database.query<{ slug: string }>(`
      SELECT DISTINCT gc.category_slug AS slug
        FROM public.casino_game_categories gc
        JOIN public.casino_games g ON g.id=gc.game_id
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
       WHERE g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)${typeClause}
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

  // Operator-managed storefront collections (e.g. Trending Games) are distinct
  // from provider-owned source categories returned by /casino/categories.
  app.get('/api/v1/casino/display-categories', {
    schema: { querystring: {
      type: 'object', additionalProperties: false,
      properties: { type: { type: 'string', enum: [...CASINO_DISPLAY_TYPES] } },
    } },
  }, async (request,reply) => {
    const query = request.query as { type?: CasinoDisplayType };
    const displayType = query.type;
    reply.header('Cache-Control','no-store');
    const result = await database.query<QueryResultRow & {
      id:string;slug:string;name:string;description:string;icon:string;type:CasinoDisplayType;customIconKey:string|null;displayOrder:number|string;games:unknown;
    }>(`
      WITH public_games AS (
        SELECT g.id AS id,g.game_slug AS slug,
               COALESCE(NULLIF(pres.title_override,''),g.title) AS title,
               p.code AS provider_code,p.name AS provider_name,
               COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,
               COALESCE(pres.description_override,'') AS description,
               COALESCE(array_agg(DISTINCT source_categories.category_slug)
                 FILTER (WHERE source_categories.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories,
               g.game_type,g.demo_available,g.real_available,COALESCE(pres.display_order,0) AS display_order
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
          JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.casino_game_categories source_categories ON source_categories.game_id=g.id
         WHERE g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         GROUP BY g.id,g.game_slug,g.title,pres.title_override,p.code,p.name,pres.custom_image_key,g.image_url,
                  pres.description_override,pres.display_order,g.game_type,g.demo_available,g.real_available
      ), ranked_games AS (
        SELECT cgm.category_id,pg.*,
               row_number() OVER (
                 PARTITION BY cgm.category_id
                 ORDER BY pg.display_order,lower(pg.title),pg.id
               ) AS category_rank
          FROM public.casino_game_display_categories cgm
          JOIN public.casino_display_categories c ON c.id=cgm.category_id AND c.visible=true
          JOIN public_games pg ON pg.id=cgm.game_id
            AND ((c.category_type='casino' AND pg.game_type='slot')
              OR (c.category_type='live-casino' AND pg.game_type='live')
              OR (c.category_type='crash-games' AND pg.game_type='crash'))
      ), grouped_games AS (
        SELECT category_id,
               json_agg(json_build_object(
                 'id',id,'slug',slug,'title',title,
                 'provider',json_build_object('code',provider_code,'name',provider_name),
                 'categories',categories,'imageUrl',image_url,'description',description,'available',true,
                 'modes',json_build_object('demo',demo_available,'real',real_available)
               ) ORDER BY category_rank) AS games
          FROM ranked_games
         WHERE category_rank <= 24
         GROUP BY category_id
      )
      SELECT c.id::text AS id,c.slug,c.name,c.description,c.icon,c.category_type AS type,c.custom_icon_key AS "customIconKey",
             c.display_order AS "displayOrder",gg.games
        FROM public.casino_display_categories c
        JOIN grouped_games gg ON gg.category_id=c.id
       WHERE c.visible=true AND ($1::text IS NULL OR c.category_type=$1)
       ORDER BY c.display_order,c.created_at,c.id
    `,[displayType ?? null]);
    return {
      data: result.rows.map((row) => ({
        id:row.id,slug:row.slug,name:row.name,description:row.description,icon:row.icon,type:row.type,
        iconUrl:row.customIconKey ? '/api/v1/assets/'+row.customIconKey : null,
        displayOrder:Number(row.displayOrder),games:row.games,
      })),
      requestId:request.id,
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
      displayCategory: { type: 'string', minLength: 1, maxLength: 80 },
      type: { type: 'string', enum: [...CASINO_DISPLAY_TYPES] },
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

    // Resolve canonical slugs only. Retired legacy storefront aliases are not
    // a source of game identity; stale URLs fail closed instead of retargeting.
    const filter = await database.query<GameRow>(`
      SELECT g.id::text AS id,g.game_slug AS slug,COALESCE(NULLIF(pres.title_override,''),g.title) AS title,
             p.code AS provider_code,p.name AS provider_name,
             COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,COALESCE(pres.description_override,'') AS description,g.available,g.demo_available,g.real_available,
             COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
        FROM public.casino_games g
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
        LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
        LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
       WHERE g.game_slug=$1 AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       GROUP BY g.id,g.game_slug,g.title,pres.title_override,p.code,p.name,g.image_url,pres.custom_image_key,pres.description_override,g.available,g.demo_available,g.real_available
       LIMIT 1
    `, [slug]);
    const row = filter.rows[0];
    if (!row) return errorResponse(reply, request, 404, 'NOT_FOUND', 'Game not found');
    reply.header('Cache-Control', 'no-store');
    return { data: mapGame(row), requestId: request.id };
  });

  app.get('/api/v1/casino/games/:gameId', async (request, reply) => {
    const id = (request.params as { gameId: string }).gameId;
    if (!UUID_PATTERN.test(id)) return errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Game ID is invalid');
    const filter = await database.query<GameRow>(`
      SELECT g.id::text AS id,g.game_slug AS slug,COALESCE(NULLIF(pres.title_override,''),g.title) AS title,
             p.code AS provider_code,p.name AS provider_name,
             COALESCE('/api/v1/assets/' || pres.custom_image_key,g.image_url) AS image_url,
             COALESCE(pres.description_override,'') AS description,g.available,g.demo_available,g.real_available,
             COALESCE(array_agg(DISTINCT gc.category_slug ORDER BY gc.category_slug) FILTER (WHERE gc.category_slug IS NOT NULL),ARRAY[]::text[]) AS categories
        FROM public.casino_games g
        JOIN public.casino_providers p ON p.id=g.provider_id
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard' AND s.available=true
        LEFT JOIN public.casino_game_categories gc ON gc.game_id=g.id
        LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
       WHERE g.id=$1 AND g.available=true AND g.bclick_enabled=true AND p.bclick_enabled=true
         AND EXISTS (SELECT 1 FROM public.casino_provider_tier_settings pt WHERE pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode AND pt.enabled=true)
       GROUP BY g.id,g.game_slug,g.title,pres.title_override,p.code,p.name,g.image_url,pres.custom_image_key,pres.description_override,g.available,g.demo_available,g.real_available
       LIMIT 1
    `, [id]);
    const row = filter.rows[0];
    if (!row) return errorResponse(reply, request, 404, 'NOT_FOUND', 'Game not found');
    reply.header('Cache-Control', 'no-store');
    return { data: mapGame(row), requestId: request.id };
  });
}
