import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';

import type { IdentityConfig } from '../identity/config.js';
import { requireAdmin } from '../identity/routes.js';
import type { AuthSession, IdentityService } from '../identity/service.js';
import type { SqlExecutor } from '../identity/repository.js';

const PROVIDER_PERMISSION = 'casino.provider-settings.manage';
const PROVIDER_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ProviderRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  updatedAt: string;
  totalGames: number;
  sourceAvailableGames: number;
  enabledGames: number;
}

interface GameControlRow extends QueryResultRow {
  id: string;
  slug: string;
  title: string;
  providerCode: string;
  providerName: string;
  sourceAvailable: boolean;
  gameAvailable: boolean;
  enabled: boolean;
  providerEnabled: boolean;
  updatedAt: string;
}

interface AdminSessionOptions {
  readonly service: IdentityService;
  readonly config: IdentityConfig;
}

function sendError(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}

async function auditDenied(
  database: SqlExecutor,
  session: AuthSession,
  request: FastifyRequest,
): Promise<void> {
  await database.query(`
    INSERT INTO public.audit_events
      (id,action,actor_type,actor_id,subject_type,outcome,request_id,metadata,created_at)
    VALUES ($1,'casino.provider-settings.access-denied','admin',$2,'permission','denied',$3,$4::jsonb,now())
  `, [randomUUID(),session.principalId,request.id,JSON.stringify({ requiredPermission: PROVIDER_PERMISSION })]);
}

async function authorizedAdmin(
  database: SqlExecutor,
  request: FastifyRequest,
  reply: FastifyReply,
  options: AdminSessionOptions,
  unsafe: boolean,
): Promise<AuthSession | null> {
  const session = await requireAdmin(request,reply,options.service,options.config,unsafe);
  if (!session) return null;
  if (session.permissions?.includes(PROVIDER_PERMISSION)) return session;

  // Authorization denial is recorded without allowing audit failures to bypass the denial.
  try {
    await auditDenied(database,session,request);
  } catch {
    request.log.error({ requestId: request.id }, 'Provider settings denial audit could not be recorded');
  }
  sendError(reply,request,403,'FORBIDDEN','The administrator lacks the required provider-settings permission');
  return null;
}

function errorFromUnexpected(request: FastifyRequest, reply: FastifyReply): FastifyReply {
  request.log.error({ requestId: request.id }, 'Casino provider-control request failed');
  return sendError(reply,request,500,'INTERNAL_ERROR','The provider settings request could not be completed');
}

export function registerBigBangAdminRoutes(
  app: FastifyInstance,
  database: SqlExecutor,
  identity: AdminSessionOptions,
): void {
  app.get('/api/v1/admin/bigbang/settings', {
    schema: { querystring: { type: 'object', additionalProperties: false } },
  }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,identity,false);
      if (!session) return;
      const result = await database.query<{
        source_code: string; selected_mode: string; updated_at: string | Date | null;
        latest_status: string | null; last_succeeded_at: string | Date | null;
      }>(`
        SELECT i.source_code,i.selected_mode,i.updated_at,
          (SELECT status FROM public.casino_catalog_sync_runs
            WHERE source_code='bigbang' ORDER BY started_at DESC,id DESC LIMIT 1) AS latest_status,
          (SELECT max(completed_at) FROM public.casino_catalog_sync_runs
            WHERE source_code='bigbang' AND status='succeeded') AS last_succeeded_at
        FROM public.casino_integration_settings i
        WHERE i.source_code='bigbang'
      `);
      const row = result.rows[0];
      if (!row) return sendError(reply,request,503,'INTEGRATION_SETTINGS_MISSING','BigBang integration settings are not initialized');
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: {
          sourceCode: row.source_code,
          selectedTier: row.selected_mode,
          supportedTiers: ['standard'],
          premiumAvailable: false,
          premiumReason: 'The current adapter accepts a Standard Sandbox key only; Premium import is not implemented.',
          sync: {
            latestStatus: row.latest_status,
            lastSucceededAt: row.last_succeeded_at ? new Date(row.last_succeeded_at).toISOString() : null,
          },
        },
        requestId: request.id,
      });
    } catch {
      return errorFromUnexpected(request,reply);
    }
  });

  app.get('/api/v1/admin/bigbang/providers', {
    schema: { querystring: { type: 'object', additionalProperties: false } },
  }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,identity,false);
      if (!session) return;
      const result = await database.query<ProviderRow>(`
        SELECT p.id::text AS id,p.code,p.name,p.bclick_enabled AS enabled,
               p.availability_updated_at AS "updatedAt",
               count(DISTINCT g.id)::int AS "totalGames",
               count(DISTINCT g.id) FILTER (WHERE s.available=true AND g.available=true)::int AS "sourceAvailableGames",
               count(DISTINCT g.id) FILTER (WHERE s.available=true AND g.available=true AND g.bclick_enabled=true)::int AS "enabledGames"
          FROM public.casino_providers p
          JOIN public.casino_games g ON g.provider_id=p.id
          JOIN public.casino_game_sources s
            ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard'
         GROUP BY p.id,p.code,p.name,p.bclick_enabled,p.availability_updated_at
         ORDER BY lower(p.name),p.code
      `);
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: result.rows.map((row) => ({
          id: row.id, code: row.code, name: row.name, enabled: row.enabled,
          updatedAt: new Date(row.updatedAt).toISOString(),
          totalGames: row.totalGames, sourceAvailableGames: row.sourceAvailableGames,
          enabledGames: row.enabledGames,
        })),
        requestId: request.id,
      });
    } catch {
      return errorFromUnexpected(request,reply);
    }
  });

  app.patch('/api/v1/admin/bigbang/providers/:providerCode', {
    schema: {
      params: {
        type: 'object', additionalProperties: false, required: ['providerCode'],
        properties: { providerCode: { type: 'string', minLength: 1, maxLength: 120, pattern: PROVIDER_CODE_PATTERN.source } },
      },
      body: {
        type: 'object', additionalProperties: false, required: ['enabled'],
        properties: { enabled: { type: 'boolean' } },
      },
    },
  }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,identity,true);
      if (!session) return;
      const { providerCode } = request.params as { providerCode: string };
      if (!PROVIDER_CODE_PATTERN.test(providerCode)) return sendError(reply,request,400,'VALIDATION_ERROR','Provider code is invalid');
      const { enabled } = request.body as { enabled: boolean };
      const auditId = randomUUID();
      const action = enabled ? 'casino.provider.enabled' : 'casino.provider.disabled';
      const result = await database.query<ProviderRow & QueryResultRow>(`
        WITH changed AS (
          UPDATE public.casino_providers
             SET bclick_enabled=$2,availability_updated_by=$3,availability_updated_at=now()
           WHERE code=$1
           RETURNING id::text AS id,code,name,bclick_enabled AS enabled,availability_updated_at AS "updatedAt"
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,$5,'admin',$3,'casino_provider',changed.id::uuid,'success',$6,
                 jsonb_build_object('providerCode',changed.code,'enabled',changed.enabled),now()
            FROM changed
          RETURNING id
        )
        SELECT changed.id,changed.code,changed.name,changed.enabled,changed."updatedAt"
          FROM changed CROSS JOIN audited
      `,[providerCode,enabled,session.principalId,auditId,action,request.id]);
      const row = result.rows[0];
      if (!row) return sendError(reply,request,404,'NOT_FOUND','BigBang provider not found');
      return reply.code(200).send({
        data: {
          id: row.id, code: row.code, name: row.name, enabled: row.enabled,
          updatedAt: new Date(row.updatedAt).toISOString(),
        },
        requestId: request.id,
      });
    } catch {
      return errorFromUnexpected(request,reply);
    }
  });

  app.get('/api/v1/admin/bigbang/games', {
    schema: {
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          providerCode: { type: 'string', minLength: 1, maxLength: 120, pattern: PROVIDER_CODE_PATTERN.source },
          query: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,identity,false);
      if (!session) return;
      const query = request.query as { page?: number; pageSize?: number; providerCode?: string; query?: string };
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;
      const values: unknown[] = [];
      const conditions = ["s.source_code='bigbang'","s.source_mode='standard'"];
      const add = (value: unknown) => { values.push(value); return '$' + values.length; };
      if (query.providerCode) conditions.push('p.code=' + add(query.providerCode));
      if (query.query?.trim()) {
        const pattern = add('%' + query.query.trim().replace(/[\\%_]/g,'\\$&') + '%');
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\')`);
      }
      const where = conditions.join(' AND ');
      const count = await database.query<{ total: string }>(`
        SELECT count(DISTINCT g.id)::text AS total
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id
         WHERE ${where}
      `,values);
      const total = Number(count.rows[0]?.total ?? 0);
      values.push(pageSize,(page-1)*pageSize);
      const rows = await database.query<GameControlRow>(`
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               p.code AS "providerCode",p.name AS "providerName",
               bool_or(s.available) AS "sourceAvailable",
               g.available AS "gameAvailable",g.bclick_enabled AS enabled,
               p.bclick_enabled AS "providerEnabled",
               g.availability_updated_at AS "updatedAt"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id
         WHERE ${where}
         GROUP BY g.id,p.code,p.name,g.game_slug,g.title,g.available,g.bclick_enabled,
                  p.bclick_enabled,g.availability_updated_at
         ORDER BY lower(g.title),g.id
         LIMIT $${values.length-1} OFFSET $${values.length}
      `,values);
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id, slug: row.slug, title: row.title,
          provider: { code: row.providerCode, name: row.providerName },
          sourceAvailable: row.sourceAvailable, sourceAvailableInBclick: row.gameAvailable,
          enabled: row.enabled, providerEnabled: row.providerEnabled,
          updatedAt: new Date(row.updatedAt).toISOString(),
        })),
        page: { page, pageSize, total, nextPage: page * pageSize < total ? page + 1 : null },
        requestId: request.id,
      });
    } catch {
      return errorFromUnexpected(request,reply);
    }
  });

  app.patch('/api/v1/admin/bigbang/games/:gameId', {
    schema: {
      params: {
        type: 'object', additionalProperties: false, required: ['gameId'],
        properties: { gameId: { type: 'string', pattern: UUID_PATTERN.source } },
      },
      body: {
        type: 'object', additionalProperties: false, required: ['enabled'],
        properties: { enabled: { type: 'boolean' } },
      },
    },
  }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,identity,true);
      if (!session) return;
      const { gameId } = request.params as { gameId: string };
      if (!UUID_PATTERN.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID is invalid');
      const { enabled } = request.body as { enabled: boolean };
      const auditId = randomUUID();
      const action = enabled ? 'casino.game.enabled' : 'casino.game.disabled';
      const result = await database.query<QueryResultRow & {
        id:string; slug:string; title:string; enabled:boolean; updatedAt:string|Date;
      }>(`
        WITH changed AS (
          UPDATE public.casino_games g
             SET bclick_enabled=$2,availability_updated_by=$3,availability_updated_at=now()
           WHERE g.id=$1
             AND EXISTS (
               SELECT 1 FROM public.casino_game_sources s
                WHERE s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard'
             )
           RETURNING g.id::text AS id,g.game_slug AS slug,g.title,g.bclick_enabled AS enabled,
                     g.availability_updated_at AS "updatedAt"
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,$5,'admin',$3,'casino_game',changed.id::uuid,'success',$6,
                 jsonb_build_object('gameId',changed.id,'slug',changed.slug,'enabled',changed.enabled),now()
            FROM changed
          RETURNING id
        )
        SELECT changed.id,changed.slug,changed.title,changed.enabled,changed."updatedAt"
          FROM changed CROSS JOIN audited
      `,[gameId,enabled,session.principalId,auditId,action,request.id]);
      const row = result.rows[0];
      if (!row) return sendError(reply,request,404,'NOT_FOUND','Standard Sandbox catalogue game not found');
      return reply.code(200).send({
        data: { id: row.id, slug: row.slug, title: row.title, enabled: row.enabled, updatedAt: new Date(row.updatedAt).toISOString() },
        requestId: request.id,
      });
    } catch {
      return errorFromUnexpected(request,reply);
    }
  });
}
