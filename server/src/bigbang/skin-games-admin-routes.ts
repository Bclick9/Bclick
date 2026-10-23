import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';

import { requireAdmin } from '../identity/routes.js';
import type { IdentityConfig } from '../identity/config.js';
import type { AuthSession, IdentityService } from '../identity/service.js';
import type { SqlExecutor } from '../identity/repository.js';

const PERMISSION = 'casino.provider-settings.manage';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;
type Tier = 'standard' | 'premium';

interface Options {
  readonly service: IdentityService;
  readonly config: IdentityConfig;
  readonly uploadDirectory: string;
}

interface GameRow extends QueryResultRow {
  id: string;
  slug: string;
  title: string;
  providerCode: string;
  providerName: string;
  sourceMode: Tier;
  externalGameId: string;
  isPremium: boolean;
  sourceAvailable: boolean;
  catalogAvailable: boolean;
  enabled: boolean;
  providerEnabled: boolean;
  providerTierEnabled: boolean;
  sourceImageUrl: string | null;
  customImageKey: string | null;
  descriptionOverride: string | null;
  displayOrder: string | number;
  categories: string[];
  updatedAt: string | Date;
  updatedBy: string | null;
}

function sendError(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}

async function authorizedAdmin(
  database: SqlExecutor,
  request: FastifyRequest,
  reply: FastifyReply,
  options: Options,
  unsafe: boolean,
): Promise<AuthSession | null> {
  const session = await requireAdmin(request,reply,options.service,options.config,unsafe);
  if (!session) return null;
  if (session.permissions?.includes(PERMISSION)) return session;

  await database.query(`
    INSERT INTO public.audit_events
      (id,action,actor_type,actor_id,subject_type,outcome,request_id,metadata,created_at)
    VALUES ($1,'casino.provider-settings.access-denied','admin',$2,'permission','denied',$3,$4::jsonb,now())
  `, [randomUUID(),session.principalId,request.id,JSON.stringify({ requiredPermission: PERMISSION })])
    .catch(() => undefined);
  sendError(reply,request,403,'FORBIDDEN','The administrator lacks the required provider-settings permission');
  return null;
}

function unexpected(request: FastifyRequest, reply: FastifyReply, message = 'The Skin Games request could not be completed') {
  request.log.error({ requestId: request.id }, 'Skin Games admin request failed');
  return sendError(reply,request,500,'INTERNAL_ERROR',message);
}

function imageInfo(bytes: Buffer): { extension: 'png' | 'jpg' | 'webp'; contentType: string; width: number; height: number } | null {
  let extension: 'png' | 'jpg' | 'webp' | null = null;
  let width = 0;
  let height = 0;

  if (bytes.length >= 24
      && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      && bytes.toString('ascii', 12, 16) === 'IHDR') {
    extension = 'png';
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (bytes.length >= 30
      && bytes.toString('ascii', 0, 4) === 'RIFF'
      && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = bytes.toString('ascii', 12, 16);
    extension = 'webp';
    if (chunk === 'VP8X' && bytes.length >= 30) {
      width = 1 + bytes.readUIntLE(24, 3);
      height = 1 + bytes.readUIntLE(27, 3);
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[21]!;
      const b2 = bytes[22]!;
      const b3 = bytes[23]!;
      const b4 = bytes[24]!;
      width = 1 + (((b2 & 0x3f) << 8) | b1);
      height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    } else if (chunk === 'VP8 ' && bytes.length >= 30
      && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      width = bytes.readUInt16LE(26) & 0x3fff;
      height = bytes.readUInt16LE(28) & 0x3fff;
    } else {
      return null;
    }
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    extension = 'jpg';
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset]!;
      offset += 1;
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
      const isStartOfFrame = [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker);
      if (isStartOfFrame) {
        if (segmentLength < 7) return null;
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += segmentLength;
    }
  }

  if (!extension || !Number.isInteger(width) || !Number.isInteger(height)
      || width < 64 || height < 64 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION
      || width * height > MAX_IMAGE_PIXELS) return null;
  return { extension, contentType: extension === 'jpg' ? 'image/jpeg' : 'image/' + extension, width, height };
}

function requestImageType(request: FastifyRequest): string {
  const value = request.headers['content-type'];
  return (typeof value === 'string' ? value : '').split(';',1)[0]!.trim().toLowerCase();
}

export function registerSkinGamesAdminRoutes(
  app: FastifyInstance,
  database: SqlExecutor,
  options: Options,
): void {
  app.addContentTypeParser(/^image\/(?:png|jpeg|webp)$/i, {
    parseAs: 'buffer',
    bodyLimit: MAX_IMAGE_BYTES,
  }, (_request, body, done) => done(null, body));

  const listSchema = {
    type: 'object', additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      query: { type: 'string', maxLength: 120 },
      providerCode: { type: 'string', minLength: 1, maxLength: 120 },
      category: { type: 'string', minLength: 1, maxLength: 80 },
      sourceMode: { type: 'string', enum: ['standard','premium'] },
    },
  };

  app.get('/api/v1/admin/casino/skin-games', { schema: { querystring: listSchema } }, async (request, reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,false);
      if (!session) return;
      const query = request.query as { page?: number; pageSize?: number; query?: string; providerCode?: string; category?: string; sourceMode?: Tier };
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const values: unknown[] = [];
      const conditions = ["s.source_code='bigbang'"];
      const add = (value: unknown) => { values.push(value); return '$' + values.length; };
      if (query.providerCode) conditions.push('p.code=' + add(query.providerCode));
      if (query.sourceMode) conditions.push('s.source_mode=' + add(query.sourceMode));
      if (query.category) conditions.push(`EXISTS (SELECT 1 FROM public.casino_game_categories gc WHERE gc.game_id=g.id AND gc.category_slug=${add(query.category)})`);
      if (query.query?.trim()) {
        const pattern = add('%' + query.query.trim().replace(/[\\%_]/g,'\\$&') + '%');
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\' OR s.external_game_id::text ILIKE ${pattern})`);
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
      const pageValues = [...values,pageSize,(page-1)*pageSize];
      const rows = await database.query<GameRow>(`
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               p.code AS "providerCode",p.name AS "providerName",
               s.source_mode AS "sourceMode",s.external_game_id::text AS "externalGameId",
               s.is_premium AS "isPremium",s.available AS "sourceAvailable",
               g.available AS "catalogAvailable",g.bclick_enabled AS enabled,
               p.bclick_enabled AS "providerEnabled",
               COALESCE(pt.enabled,false) AS "providerTierEnabled",
               g.image_url AS "sourceImageUrl",pres.custom_image_key AS "customImageKey",
               pres.description_override AS "descriptionOverride",
               COALESCE(pres.display_order,0)::bigint AS "displayOrder",
               ARRAY(SELECT gc.category_slug FROM public.casino_game_categories gc WHERE gc.game_id=g.id ORDER BY gc.category_slug) AS categories,
               GREATEST(g.availability_updated_at,COALESCE(pres.updated_at,'-infinity'::timestamptz),COALESCE(pres.order_updated_at,'-infinity'::timestamptz)) AS "updatedAt",
               COALESCE(pres_editor.display_name,order_editor.display_name,availability_editor.display_name) AS "updatedBy"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code='bigbang' AND pt.source_mode=s.source_mode
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.admin_users pres_editor ON pres_editor.id=pres.updated_by
          LEFT JOIN public.admin_users order_editor ON order_editor.id=pres.order_updated_by
          LEFT JOIN public.admin_users availability_editor ON availability_editor.id=g.availability_updated_by
         WHERE ${where}
         ORDER BY s.source_mode,COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
         LIMIT ${values.length+1} OFFSET ${values.length+2}
      `,pageValues);
      const settings = await database.query<{ selected_mode: string }>("SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang'");
      const premiumAvailable = settings.rows[0]?.selected_mode === 'premium'; // migration 011 currently permits Standard only; stays false until a reviewed tier migration.
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          provider: { code: row.providerCode, name: row.providerName },
          sourceMode: row.sourceMode,
          externalGameId: row.externalGameId,
          isPremium: row.isPremium,
          sourceAvailable: row.sourceAvailable,
          catalogAvailable: row.catalogAvailable,
          enabled: row.enabled,
          providerEnabled: row.providerEnabled,
          providerTierEnabled: row.providerTierEnabled,
          effectiveAvailable: row.sourceAvailable && row.catalogAvailable && row.enabled && row.providerEnabled && row.providerTierEnabled
            && (row.sourceMode === 'standard' || premiumAvailable),
          sourceImageUrl: row.sourceImageUrl,
          customImageUrl: row.customImageKey ? '/api/v1/assets/' + row.customImageKey : null,
          imageUrl: row.customImageKey ? '/api/v1/assets/' + row.customImageKey : row.sourceImageUrl,
          description: row.descriptionOverride ?? '',
          hasCustomDescription: row.descriptionOverride !== null,
          displayOrder: Number(row.displayOrder),
          categories: row.categories ?? [],
          updatedAt: new Date(row.updatedAt).toISOString(),
          updatedBy: row.updatedBy,
        })),
        page: { page, pageSize, total, nextPage: page * pageSize < total ? page + 1 : null },
        integration: {
          selectedTier: settings.rows[0]?.selected_mode ?? 'standard',
          premiumAvailable,
          premiumReason: premiumAvailable ? null : 'Premium is not available in the current Standard Sandbox integration.',
        },
        requestId: request.id,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && typeof (error as {statusCode: unknown}).statusCode === 'number') {
        return sendError(reply,request,400,'VALIDATION_ERROR','Skin Games query parameters are invalid');
      }
      return unexpected(request,reply);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/reorder', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['gameId','targetGameId','position'],
        properties: {
          gameId: { type: 'string', pattern: UUID.source },
          targetGameId: { type: 'string', pattern: UUID.source },
          position: { type: 'string', enum: ['before','after'] },
        },
      },
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const { gameId,targetGameId,position } = request.body as { gameId: string; targetGameId: string; position: 'before'|'after' };
      if (!UUID.test(gameId) || !UUID.test(targetGameId) || gameId === targetGameId) {
        return sendError(reply,request,400,'VALIDATION_ERROR','The dragged and target game IDs must be different canonical UUIDs');
      }
      const auditId = randomUUID();
      const result = await database.query<QueryResultRow & { mode: Tier; displayOrder: number }>(`
        WITH lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtext('bclick.skin-games.display-order'))
        ), target AS MATERIALIZED (
          SELECT moved.id AS moved_id,ms.source_mode AS mode,target.id AS target_id
            FROM public.casino_games moved
            JOIN public.casino_game_sources ms ON ms.game_id=moved.id AND ms.source_code='bigbang'
            JOIN public.casino_games target ON target.id=$2
            JOIN public.casino_game_sources ts ON ts.game_id=target.id AND ts.source_code='bigbang' AND ts.source_mode=ms.source_mode
            CROSS JOIN lock
           WHERE moved.id=$1
        ), ranked_without_moved AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS old_order,
                 row_number() OVER (ORDER BY COALESCE(pres.display_order,0),lower(g.title),g.id) AS rank
            FROM public.casino_games g
            JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            JOIN target t ON t.mode=s.source_mode
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id<>$1
        ), target_rank AS (
          SELECT rank FROM ranked_without_moved WHERE id=$2
        ), sortable AS (
          SELECT id,old_order::numeric AS sort_key FROM ranked_without_moved
          UNION ALL
          SELECT $1::uuid,
                 (SELECT rank::numeric FROM target_rank) + CASE WHEN $3='before' THEN -0.5 ELSE 0.5 END
           WHERE EXISTS (SELECT 1 FROM target_rank)
        ), numbered AS (
          SELECT id,(row_number() OVER (ORDER BY sort_key,id)*100)::bigint AS display_order
            FROM sortable
        ), saved AS (
          INSERT INTO public.casino_game_presentation(game_id,display_order,order_updated_by,order_updated_at)
          SELECT id,display_order,$4,now() FROM numbered
          ON CONFLICT (game_id) DO UPDATE SET
            display_order=EXCLUDED.display_order,order_updated_by=EXCLUDED.order_updated_by,order_updated_at=now()
          RETURNING game_id,display_order
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $5,'casino.skin-games.reordered','admin',$4,'casino_game_order',t.moved_id,'success',$6,
                 jsonb_build_object('gameId',t.moved_id,'targetGameId',t.target_id,'position',$3,'sourceMode',t.mode),now()
            FROM target t
          RETURNING id
        )
        SELECT t.mode AS mode,saved.display_order AS "displayOrder"
          FROM target t JOIN saved ON saved.game_id=t.moved_id CROSS JOIN audited
      `,[gameId,targetGameId,position,session.principalId,auditId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Both games must exist in the same BigBang source tier');
      return reply.code(200).send({data:{gameId,targetGameId,position,sourceMode:row.mode,displayOrder:Number(row.displayOrder)},requestId:request.id});
    } catch {
      return unexpected(request,reply);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } },
      body: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: {
          enabled: { type: 'boolean' },
          description: { type: 'string', maxLength: 2000 },
          clearCustomImage: { type: 'boolean' },
        },
      },
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      const body=request.body as {enabled?:boolean;description?:string;clearCustomImage?:boolean};
      const changeEnabled=typeof body.enabled==='boolean';
      const changeDescription=typeof body.description==='string';
      const clearCustomImage=body.clearCustomImage===true;
      if(!changeEnabled&&!changeDescription&&!clearCustomImage) return sendError(reply,request,400,'VALIDATION_ERROR','At least one supported field must change');
      const source=await database.query<{source_mode:string;enabled:boolean}>(`
        SELECT s.source_mode,g.bclick_enabled AS enabled
          FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
         WHERE g.id=$1
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(changeEnabled && sourceRow.source_mode==='premium') {
        return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game availability is read-only until the Premium integration gate is approved and implemented');
      }

      const actionId=randomUUID();
      const result=await database.query<QueryResultRow & { id:string; slug:string; enabled:boolean; updatedAt:string|Date }>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,g.game_slug,g.bclick_enabled,s.source_mode
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
           WHERE g.id=$1
        ), game_change AS (
          UPDATE public.casino_games g
             SET bclick_enabled=CASE WHEN $2::boolean IS NULL THEN g.bclick_enabled ELSE $2 END,
                 availability_updated_by=CASE WHEN $2::boolean IS NULL THEN g.availability_updated_by ELSE $6 END,
                 availability_updated_at=CASE WHEN $2::boolean IS NULL THEN g.availability_updated_at ELSE now() END,
                 updated_at=now()
            FROM target t
           WHERE g.id=t.id AND $2::boolean IS NOT NULL
          RETURNING g.id,g.bclick_enabled AS enabled,g.availability_updated_at AS "updatedAt"
        ), presentation_change AS (
          INSERT INTO public.casino_game_presentation
            (game_id,description_override,custom_image_key,display_order,updated_by,updated_at,order_updated_by,order_updated_at)
          SELECT t.id,CASE WHEN $3::boolean THEN NULLIF($4::text,'') ELSE NULL END,NULL,
                 COALESCE((SELECT display_order FROM public.casino_game_presentation WHERE game_id=t.id),0),
                 $6,now(),$6,now()
            FROM target t
           WHERE $3::boolean OR $5::boolean
          ON CONFLICT (game_id) DO UPDATE SET
            description_override=CASE WHEN $3::boolean THEN NULLIF($4::text,'') ELSE public.casino_game_presentation.description_override END,
            custom_image_key=CASE WHEN $5::boolean THEN NULL ELSE public.casino_game_presentation.custom_image_key END,
            updated_by=$6,updated_at=now()
          RETURNING game_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $7,'casino.skin-game.updated','admin',$6,'casino_game',t.id,'success',$8,
                 jsonb_build_object('slug',t.game_slug,'sourceMode',t.source_mode,
                   'enabledChanged',$2::boolean IS NOT NULL,'enabled',COALESCE($2::boolean,t.bclick_enabled),
                   'descriptionChanged',$3::boolean,'customImageCleared',$5::boolean),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS id,t.game_slug AS slug,
               COALESCE(gc.enabled,t.bclick_enabled) AS enabled,
               COALESCE(gc."updatedAt",now()) AS "updatedAt"
          FROM target t LEFT JOIN game_change gc ON gc.id=t.id CROSS JOIN audited
      `,[gameId,changeEnabled?body.enabled:null,changeDescription,body.description??'',clearCustomImage,session.principalId,actionId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:{id:row.id,slug:row.slug,enabled:row.enabled,updatedAt:new Date(row.updatedAt).toISOString()},requestId:request.id});
    } catch {
      return unexpected(request,reply);
    }
  });

  app.post('/api/v1/admin/casino/skin-games/:gameId/image', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } } },
  }, async (request,reply) => {
    let filePath: string | null = null;
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      if(!Buffer.isBuffer(request.body) || request.body.length<16 || request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Image must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info || requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }
      const exists=await database.query<{source_mode:string}>(`
        SELECT s.source_mode FROM public.casino_games g
        JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
        WHERE g.id=$1
      `,[gameId]);
      if(!exists.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(exists.rows[0].source_mode==='premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium presentation edits are locked until Premium integration is approved');

      const fileName=randomUUID()+'.'+info.extension;
      const relativeKey='casino-games/'+gameId.toLowerCase()+'/'+fileName;
      filePath=path.resolve(options.uploadDirectory,'casino-games',gameId.toLowerCase(),fileName);
      await mkdir(path.dirname(filePath),{recursive:true});
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});
      const auditId=randomUUID();
      const saved=await database.query<{game_id:string;custom_image_key:string}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS display_order
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id=$1
        ), changed AS (
          INSERT INTO public.casino_game_presentation(game_id,custom_image_key,display_order,updated_by,updated_at,order_updated_by,order_updated_at)
          SELECT id,$2,display_order,$3,now(),$3,now() FROM target
          ON CONFLICT (game_id) DO UPDATE SET custom_image_key=EXCLUDED.custom_image_key,updated_by=$3,updated_at=now()
          RETURNING game_id,custom_image_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.image-updated','admin',$3,'casino_game',changed.game_id,'success',$5,
                 jsonb_build_object('contentType',$6,'bytes',$7,'imageKey',changed.custom_image_key),now()
            FROM changed
          RETURNING id
        )
        SELECT changed.game_id::text AS game_id,changed.custom_image_key FROM changed CROSS JOIN audited
      `,[gameId,relativeKey,session.principalId,auditId,request.id,info.contentType,request.body.length]);
      if(!saved.rows[0]) {
        await unlink(filePath).catch(()=>undefined);
        filePath=null;
        return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      }
      return reply.code(201).send({data:{gameId:saved.rows[0].game_id,customImageUrl:'/api/v1/assets/'+saved.rows[0].custom_image_key,contentType:info.contentType},requestId:request.id});
    } catch {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,'The image upload could not be persisted');
    }
  });

  app.get('/api/v1/assets/casino-games/:gameId/:fileName', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId','fileName'], properties: {
        gameId: { type: 'string', pattern: UUID.source },
        fileName: { type: 'string', pattern: FILE_NAME.source },
      } },
    },
  }, async (request,reply) => {
    try {
      const {gameId,fileName}=request.params as {gameId:string;fileName:string};
      if(!UUID.test(gameId)||!FILE_NAME.test(fileName)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const safeRoot=path.resolve(options.uploadDirectory,'casino-games');
      const filePath=path.resolve(safeRoot,gameId.toLowerCase(),fileName.toLowerCase());
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const bytes=await readFile(filePath);
      const info=imageInfo(bytes);
      if(!info) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      reply.header('Cache-Control','public, max-age=31536000, immutable');
      reply.header('X-Content-Type-Options','nosniff');
      reply.header('Content-Security-Policy',"default-src 'none'; sandbox");
      reply.type(info.contentType);
      return reply.send(bytes);
    } catch (error) {
      if(error && typeof error==='object' && 'code' in error && (error as {code:unknown}).code==='ENOENT') {
        return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      }
      return unexpected(request,reply,'The image could not be read from persistent storage');
    }
  });
}
