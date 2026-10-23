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
  titleOverride: string | null;
  orderPosition: string | number;
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
  displayCategoryIds: string[];
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

type FailureContext = {
  readonly operation?: string;
  readonly stage?: string;
};

function unexpected(
  request: FastifyRequest,
  reply: FastifyReply,
  cause?: unknown,
  context?: FailureContext,
) {
  const failure = cause && typeof cause === 'object' ? cause as Record<string, unknown> : {};
  const rawCode = typeof failure.code === 'string' ? failure.code : undefined;
  const sqlState = rawCode && /^[A-Z0-9]{5}$/.test(rawCode) ? rawCode : undefined;
  // Filesystem failures are common in image upload deployments (permissions, full disk,
  // read-only volume, or a bad upload path). Keep the code but do not log the raw path/message.
  const filesystemCode = rawCode && /^(EACCES|EPERM|EIO|ENOSPC|EROFS|ENOENT|ENOTDIR|EEXIST|EMFILE|EBUSY|EINVAL)$/.test(rawCode)
    ? rawCode
    : undefined;
  const diagnosticCode = sqlState ?? filesystemCode;
  const sqlMessage = sqlState && typeof failure.message === 'string'
    ? failure.message.slice(0, 240)
    : undefined;
  const failureName = typeof failure.name === 'string' ? failure.name.slice(0, 80) : undefined;

  // Preserve request-correlated, stage-aware server diagnostics without exposing internals to the browser.
  request.log.error({
    requestId: request.id,
    ...(context?.operation ? { operation: context.operation } : {}),
    ...(context?.stage ? { stage: context.stage } : {}),
    failure: {
      code: diagnosticCode ?? 'UNKNOWN',
      ...(failureName ? { name: failureName } : {}),
      ...(sqlMessage ? { message: sqlMessage } : {}),
    },
  }, 'Skin Games admin request failed');

  if (sqlState && ['3F000', '42P01', '42703'].includes(sqlState)) {
    return sendError(
      reply,
      request,
      503,
      'SKIN_GAMES_SCHEMA_NOT_READY',
      'Skin Games database schema is not ready. Confirm local Migration 012 completed successfully, then restart the local stack. Do not roll back or manually rerun migrations.',
    );
  }

  return sendError(reply,request,500,'INTERNAL_ERROR','The Skin Games request could not be completed');
}

function imageInfo(bytes: Buffer): { extension: 'png' | 'jpg' | 'webp'; contentType: string; width: number; height: number } | null {
  let extension: 'png' | 'jpg' | 'webp' | null = null;
  let width = 0;
  let height = 0;

  if (bytes.length >= 45
      && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    extension = 'png';
    // Walk the complete PNG chunk stream. A valid IHDR signature alone is not enough:
    // require bounded chunks, image data, and a terminal IEND before accepting the upload.
    let offset = 8;
    let sawHeader = false;
    let sawImageData = false;
    let sawEnd = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      if (length > MAX_IMAGE_BYTES || offset + 12 + length > bytes.length) return null;
      const type = bytes.toString('ascii',offset+4,offset+8);
      if (!sawHeader) {
        if (type !== 'IHDR' || length !== 13) return null;
        width = bytes.readUInt32BE(offset+8);
        height = bytes.readUInt32BE(offset+12);
        sawHeader = true;
      } else if (type === 'IHDR') {
        return null;
      }
      if (type === 'IDAT') sawImageData = true;
      offset += length + 12;
      if (type === 'IEND') {
        if (length !== 0) return null;
        sawEnd = true;
        break;
      }
    }
    if (!sawHeader || !sawImageData || !sawEnd || offset !== bytes.length) return null;
  } else if (bytes.length >= 30
      && bytes.toString('ascii', 0, 4) === 'RIFF'
      && bytes.toString('ascii', 8, 12) === 'WEBP'
      && bytes.readUInt32LE(4) + 8 === bytes.length) {
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
  } else if (bytes.length >= 20 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length-2] === 0xff && bytes[bytes.length-1] === 0xd9) {
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

  const displayCategoryIcons = ['layers','gamepad','sparkles','trending','clock','users','money','gift','trophy','zap'] as const;

  app.get('/api/v1/admin/casino/display-categories', async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,false);
      if (!session) return;
      const result = await database.query<QueryResultRow & {
        id:string; slug:string; name:string; description:string; icon:string; iconUrl:string|null; visible:boolean;
        displayOrder:number|string; items:number|string; createdAt:string|Date; updatedAt:string|Date; customIconKey:string|null;
      }>(`
        SELECT c.id::text AS id,c.slug,c.name,c.description,c.icon,c.visible,
               c.custom_icon_key AS "customIconKey",
               CASE WHEN c.custom_icon_key IS NULL THEN NULL ELSE '/api/v1/assets/' || c.custom_icon_key END AS "iconUrl",
               c.display_order AS "displayOrder",count(m.game_id)::integer AS items,
               c.created_at AS "createdAt",c.updated_at AS "updatedAt"
          FROM public.casino_display_categories c
          LEFT JOIN public.casino_game_display_categories m ON m.category_id=c.id
         GROUP BY c.id
         ORDER BY c.display_order,c.created_at,c.id
      `);
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: result.rows.map((row) => ({
          id:row.id,slug:row.slug,name:row.name,description:row.description,icon:row.icon,iconUrl:row.iconUrl,visible:row.visible,
          displayOrder:Number(row.displayOrder),items:Number(row.items),
          createdAt:new Date(row.createdAt).toISOString(),updatedAt:new Date(row.updatedAt).toISOString(),
        })),
        requestId:request.id,
      });
    } catch (error) {
      return unexpected(request,reply,error,{operation:'display_categories_list'});
    }
  });

  app.post('/api/v1/admin/casino/display-categories', {
    schema: { body: {
      type:'object',additionalProperties:false,required:['name'],
      properties:{
        name:{type:'string',minLength:1,maxLength:80},
        description:{type:'string',maxLength:500},
        icon:{type:'string',enum:[...displayCategoryIcons]},
        visible:{type:'boolean'},
      },
    } },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const body = request.body as {name:string;description?:string;icon?:typeof displayCategoryIcons[number];visible?:boolean};
      const name = body.name.trim();
      const slug = name.normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/g,'');
      if (!name || !slug) return sendError(reply,request,422,'DISPLAY_CATEGORY_NAME_INVALID','Enter a category name containing letters or numbers');
      if (name.length > 80) return sendError(reply,request,422,'DISPLAY_CATEGORY_NAME_INVALID','Category name must be 80 characters or fewer');
      const id = randomUUID();
      const auditId = randomUUID();
      const result = await database.query<QueryResultRow & {
        id:string;slug:string;name:string;description:string;icon:string;visible:boolean;displayOrder:number|string;items:number;
      }>(`
        WITH next_order AS MATERIALIZED (
          SELECT COALESCE(max(display_order),0)+100 AS value FROM public.casino_display_categories
        ), created AS (
          INSERT INTO public.casino_display_categories
            (id,slug,name,description,icon,visible,display_order,created_by,updated_by,created_at,updated_at)
          SELECT $1::uuid,$2,$3,$4,$5,$6,next_order.value,$7,$7,now(),now()
            FROM next_order
          ON CONFLICT (slug) DO NOTHING
          RETURNING id,slug,name,description,icon,visible,display_order AS "displayOrder",created_at AS "createdAt",updated_at AS "updatedAt"
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $8,'casino.display-category.created','admin',$7,'casino_display_category',created.id,'success',$9,
                 jsonb_build_object('slug',created.slug,'name',created.name,'icon',created.icon,'visible',created.visible),now()
            FROM created
          RETURNING id
        )
        SELECT created.id::text AS id,created.slug,created.name,created.description,created.icon,created.visible,
               created."displayOrder",created."createdAt",created."updatedAt",0::integer AS items FROM created CROSS JOIN audited
      `,[id,slug,name,body.description?.trim() ?? '',body.icon ?? 'sparkles',body.visible ?? true,session.principalId,auditId,request.id]);
      const row = result.rows[0];
      if (!row) return sendError(reply,request,409,'DISPLAY_CATEGORY_EXISTS','A display category with this name/slug already exists');
      return reply.code(201).send({
        data:{id:row.id,slug:row.slug,name:row.name,description:row.description,icon:row.icon,visible:row.visible,displayOrder:Number(row.displayOrder),items:0},
        requestId:request.id,
      });
    } catch (error) {
      return unexpected(request,reply,error,{operation:'display_category_create'});
    }
  });

  app.post('/api/v1/admin/casino/display-categories/:categoryId/icon', {
    schema:{params:{type:'object',additionalProperties:false,required:['categoryId'],properties:{categoryId:{type:'string',pattern:UUID.source}}}},
  }, async (request,reply) => {
    let filePath:string|null=null;
    let failureStage='authorize_admin';
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {categoryId}=request.params as {categoryId:string};
      failureStage='validate_icon';
      if(!UUID.test(categoryId)) return sendError(reply,request,400,'VALIDATION_ERROR','Category ID must be a UUID');
      if(!Buffer.isBuffer(request.body)||request.body.length<16||request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Category icon must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info||requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }

      failureStage='lookup_category';
      const existing=await database.query<{id:string;custom_icon_key:string|null}>(
        'SELECT id::text AS id,custom_icon_key FROM public.casino_display_categories WHERE id=$1::uuid',[categoryId]);
      const category=existing.rows[0];
      if(!category) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');

      const fileName=randomUUID()+'.'+info.extension;
      const relativeKey='casino-display-categories/'+categoryId.toLowerCase()+'/'+fileName;
      const safeRoot=path.resolve(options.uploadDirectory,'casino-display-categories');
      filePath=path.resolve(safeRoot,categoryId.toLowerCase(),fileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,400,'VALIDATION_ERROR','Invalid category icon path');

      failureStage='create_upload_directory';
      await mkdir(path.dirname(filePath),{recursive:true});
      failureStage='write_icon_file';
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});

      const auditId=randomUUID();
      failureStage='persist_icon_and_audit';
      const saved=await database.query<{id:string;custom_icon_key:string}>(`
        WITH changed AS (
          UPDATE public.casino_display_categories
             SET custom_icon_key=$2,updated_by=$3,updated_at=now()
           WHERE id=$1::uuid
          RETURNING id,custom_icon_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.display-category.icon-updated','admin',$3,'casino_display_category',changed.id,'success',$5,
                 jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'iconKey',changed.custom_icon_key),now()
            FROM changed
          RETURNING id
        )
        SELECT changed.id::text AS id,changed.custom_icon_key FROM changed CROSS JOIN audited
      `,[categoryId,relativeKey,session.principalId,auditId,request.id,info.contentType,request.body.length]);
      if(!saved.rows[0]) {
        await unlink(filePath).catch(()=>undefined);
        filePath=null;
        return sendError(reply,request,404,'NOT_FOUND','Display category was not found');
      }
      filePath=null;
      if(category.custom_icon_key && category.custom_icon_key!==saved.rows[0].custom_icon_key) {
        const prefix='casino-display-categories/'+categoryId.toLowerCase()+'/';
        if(category.custom_icon_key.startsWith(prefix)) {
          const oldName=category.custom_icon_key.slice(prefix.length);
          if(FILE_NAME.test(oldName)) {
            const oldPath=path.resolve(safeRoot,categoryId.toLowerCase(),oldName);
            if(oldPath.startsWith(safeRoot+path.sep)) await unlink(oldPath).catch(()=>undefined);
          }
        }
      }
      return reply.code(201).send({
        data:{categoryId:saved.rows[0].id,iconUrl:'/api/v1/assets/'+saved.rows[0].custom_icon_key,contentType:info.contentType},
        requestId:request.id,
      });
    } catch(error) {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,error,{operation:'display_category_icon_upload',stage:failureStage});
    }
  });

  app.get('/api/v1/assets/casino-display-categories/:categoryId/:fileName', {
    schema:{params:{type:'object',additionalProperties:false,required:['categoryId','fileName'],properties:{
      categoryId:{type:'string',pattern:UUID.source},
      fileName:{type:'string',pattern:FILE_NAME.source},
    }}},
  }, async (request,reply) => {
    try {
      const {categoryId,fileName}=request.params as {categoryId:string;fileName:string};
      if(!UUID.test(categoryId)||!FILE_NAME.test(fileName)) return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      const safeRoot=path.resolve(options.uploadDirectory,'casino-display-categories');
      const normalizedId=categoryId.toLowerCase();
      const normalizedFileName=fileName.toLowerCase();
      const iconKey='casino-display-categories/'+normalizedId+'/'+normalizedFileName;
      const active=await database.query<{id:string}>(`
        SELECT id::text AS id FROM public.casino_display_categories WHERE id=$1::uuid AND custom_icon_key=$2
      `,[normalizedId,iconKey]);
      if(!active.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      const filePath=path.resolve(safeRoot,normalizedId,normalizedFileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      const metadata=await stat(filePath);
      if(!metadata.isFile()||metadata.size<16||metadata.size>MAX_IMAGE_BYTES) return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      const bytes=await readFile(filePath);
      const info=imageInfo(bytes);
      if(!info) return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      reply.header('Cache-Control','public, max-age=31536000, immutable');
      reply.header('X-Content-Type-Options','nosniff');
      reply.header('Content-Security-Policy',"default-src 'none'; sandbox");
      reply.type(info.contentType);
      return reply.send(bytes);
    } catch(error) {
      if(error&&typeof error==='object'&&'code' in error&&(error as {code:unknown}).code==='ENOENT') {
        return sendError(reply,request,404,'NOT_FOUND','Category icon was not found');
      }
      return unexpected(request,reply,'The category icon could not be read from persistent storage');
    }
  });

  app.patch('/api/v1/admin/casino/display-categories/:categoryId', {
    schema: {
      params:{type:'object',additionalProperties:false,required:['categoryId'],properties:{categoryId:{type:'string',pattern:UUID.source}}},
      body:{
        type:'object',additionalProperties:false,minProperties:1,
        properties:{
          name:{type:'string',minLength:1,maxLength:80},
          description:{type:'string',maxLength:500},
          icon:{type:'string',enum:[...displayCategoryIcons]},
          visible:{type:'boolean'},
          displayOrder:{type:'integer',minimum:0,maximum:100000000},
        },
      },
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {categoryId} = request.params as {categoryId:string};
      if (!UUID.test(categoryId)) return sendError(reply,request,400,'VALIDATION_ERROR','Category ID must be a UUID');
      const body = request.body as {name?:string;description?:string;icon?:typeof displayCategoryIcons[number];visible?:boolean;displayOrder?:number};
      const nameChanged = typeof body.name === 'string';
      const name = body.name?.trim() ?? '';
      if (nameChanged && !name) return sendError(reply,request,422,'DISPLAY_CATEGORY_NAME_INVALID','Category name cannot be blank');
      const descriptionChanged = typeof body.description === 'string';
      const iconChanged = typeof body.icon === 'string';
      const visibleChanged = typeof body.visible === 'boolean';
      const orderChanged = Number.isInteger(body.displayOrder);
      const auditId = randomUUID();
      const result = await database.query<QueryResultRow & {
        id:string;slug:string;name:string;description:string;icon:string;visible:boolean;displayOrder:number|string;items:number;
      }>(`
        WITH target AS MATERIALIZED (
          SELECT id FROM public.casino_display_categories WHERE id=$1::uuid
        ), changed AS (
          UPDATE public.casino_display_categories c
             SET name=CASE WHEN $2::boolean THEN $3::text ELSE c.name END,
                 description=CASE WHEN $4::boolean THEN $5::text ELSE c.description END,
                 icon=CASE WHEN $6::boolean THEN $7::text ELSE c.icon END,
                 visible=CASE WHEN $8::boolean THEN $9::boolean ELSE c.visible END,
                 display_order=CASE WHEN $10::boolean THEN $11::bigint ELSE c.display_order END,
                 updated_by=$12,updated_at=now()
            FROM target t
           WHERE c.id=t.id
          RETURNING c.id,c.slug,c.name,c.description,c.icon,c.visible,c.display_order AS "displayOrder"
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $13,'casino.display-category.updated','admin',$12,'casino_display_category',changed.id,'success',$14,
                 jsonb_build_object('nameChanged',$2::boolean,'descriptionChanged',$4::boolean,'iconChanged',$6::boolean,
                   'visibilityChanged',$8::boolean,'displayOrderChanged',$10::boolean),now()
            FROM changed
          RETURNING id
        )
        SELECT changed.id::text AS id,changed.slug,changed.name,changed.description,changed.icon,changed.visible,changed."displayOrder",
               (SELECT count(*)::integer FROM public.casino_game_display_categories m WHERE m.category_id=changed.id) AS items
          FROM changed CROSS JOIN audited
      `,[categoryId,nameChanged,name,descriptionChanged,body.description ?? '',iconChanged,body.icon ?? '',visibleChanged,body.visible ?? false,orderChanged,body.displayOrder ?? 0,session.principalId,auditId,request.id]);
      const row = result.rows[0];
      if (!row) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');
      return reply.code(200).send({data:{...row,displayOrder:Number(row.displayOrder),items:Number(row.items)},requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error,{operation:'display_category_update'});
    }
  });

  app.delete('/api/v1/admin/casino/display-categories/:categoryId', {
    schema:{params:{type:'object',additionalProperties:false,required:['categoryId'],properties:{categoryId:{type:'string',pattern:UUID.source}}}},
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {categoryId} = request.params as {categoryId:string};
      if (!UUID.test(categoryId)) return sendError(reply,request,400,'VALIDATION_ERROR','Category ID must be a UUID');
      const auditId = randomUUID();
      const result = await database.query<{id:string}>(`
        WITH target AS MATERIALIZED (
          SELECT id,slug,name FROM public.casino_display_categories WHERE id=$1::uuid
        ), deleted AS (
          DELETE FROM public.casino_display_categories c USING target t
           WHERE c.id=t.id RETURNING c.id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $2,'casino.display-category.deleted','admin',$3,'casino_display_category',deleted.id,'success',$4,
                 jsonb_build_object('slug',target.slug,'name',target.name),now()
            FROM deleted JOIN target ON target.id=deleted.id
          RETURNING id
        )
        SELECT deleted.id::text AS id FROM deleted CROSS JOIN audited
      `,[categoryId,auditId,session.principalId,request.id]);
      if (!result.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');
      return reply.code(204).send();
    } catch (error) {
      return unexpected(request,reply,error,{operation:'display_category_delete'});
    }
  });

  const categoryGamesParams = {
    type:'object',additionalProperties:false,
    properties:{
      page:{type:'integer',minimum:1,default:1},
      pageSize:{type:'integer',minimum:1,maximum:100,default:50},
      query:{type:'string',maxLength:120},
    },
  };

  app.get('/api/v1/admin/casino/display-categories/:categoryId/games', {
    schema:{
      params:{type:'object',additionalProperties:false,required:['categoryId'],properties:{categoryId:{type:'string',pattern:UUID.source}}},
      querystring:categoryGamesParams,
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,false);
      if(!session) return;
      const {categoryId}=request.params as {categoryId:string};
      if(!UUID.test(categoryId)) return sendError(reply,request,400,'VALIDATION_ERROR','Category ID must be a UUID');
      const query=request.query as {page?:number;pageSize?:number;query?:string};
      const page=query.page??1;
      const pageSize=query.pageSize??50;
      const category=await database.query<{id:string} & QueryResultRow>(
        'SELECT id::text AS id FROM public.casino_display_categories WHERE id=$1::uuid',[categoryId]);
      if(!category.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');

      const assigned=await database.query<{ids:string[]} & QueryResultRow>(
        'SELECT COALESCE(array_agg(game_id::text ORDER BY game_id),ARRAY[]::text[]) AS ids FROM public.casino_game_display_categories WHERE category_id=$1::uuid',
        [categoryId]);

      const conditions=["s.source_code='bigbang'","s.source_mode='standard'"];
      const values:unknown[]=[];
      if(query.query?.trim()){
        const searchValue='%'+query.query.trim().replace(/[\\%_]/g,'\\  app.patch('/api/v1/admin/casino/skin-games/:gameId/display-categories', {
')+'%';
        values.push(searchValue);
        const parameter='    schema:{
      params:{type:'object',additionalProperties:false,required:['gameId'],properties:{gameId:{type:'string',pattern:UUID.source}}},
      body:{type:'object',additionalProperties:false,required:['categoryIds'],properties:{categoryIds:{type:'array',maxItems:100,uniqueItems:true,items:{type:'string',pattern:UUID.source}}}},
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {gameId} = request.params as {gameId:string};
      if (!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      const {categoryIds} = request.body as {categoryIds:string[]};
      const target = await database.query<{source_mode:string}>(
        "SELECT source_mode FROM public.casino_game_sources WHERE game_id=$1 AND source_code='bigbang'",[gameId]);
      if (!target.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if (target.rows[0].source_mode === 'premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game category assignment is locked until Premium integration is approved');
      const available = await database.query<{count:number|string}>(
        'SELECT count(*)::integer AS count FROM public.casino_display_categories WHERE id=ANY($1::uuid[])',[categoryIds]);
      if (Number(available.rows[0]?.count ?? 0) !== categoryIds.length) {
        return sendError(reply,request,422,'DISPLAY_CATEGORY_NOT_FOUND','One or more selected display categories no longer exist. Refresh and retry.');
      }
      const auditId = randomUUID();
      const saved = await database.query<{gameId:string;categoryIds:string[]}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,s.source_mode FROM public.casino_games g
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          WHERE g.id=$1::uuid
        ), removed AS (
          DELETE FROM public.casino_game_display_categories m USING target t
           WHERE m.game_id=t.id AND NOT (m.category_id=ANY($2::uuid[]))
          RETURNING m.category_id
        ), added AS (
          INSERT INTO public.casino_game_display_categories(category_id,game_id,assigned_by,assigned_at)
          SELECT selected.category_id,t.id,$3,now()
            FROM target t CROSS JOIN unnest($2::uuid[]) AS selected(category_id)
          ON CONFLICT (category_id,game_id) DO NOTHING
          RETURNING category_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.display-categories-updated','admin',$3,'casino_game',t.id,'success',$5,
                 jsonb_build_object('categoryIds',to_jsonb($2::uuid[]),'sourceMode',t.source_mode),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS "gameId",
               ARRAY(SELECT m.category_id::text FROM public.casino_game_display_categories m WHERE m.game_id=t.id ORDER BY m.category_id) AS "categoryIds"
          FROM target t CROSS JOIN audited
      `,[gameId,categoryIds,session.principalId,auditId,request.id]);
      if (!saved.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:saved.rows[0],requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error,{operation:'skin_game_display_category_assignment'});
    }
  });

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
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR COALESCE((SELECT NULLIF(pres_search.title_override,'' ) FROM public.casino_game_presentation pres_search WHERE pres_search.game_id=g.id),g.title) ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\' OR s.external_game_id::text ILIKE ${pattern})`);
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
        WITH tier_order AS MATERIALIZED (
          SELECT g_order.id,
                 row_number() OVER (
                   PARTITION BY s_order.source_mode
                   ORDER BY COALESCE(pres_order.display_order,0),lower(g_order.title),p_order.code,g_order.id
                 )::integer AS order_position,
                 count(*) OVER (PARTITION BY s_order.source_mode)::integer AS tier_total
            FROM public.casino_games g_order
            JOIN public.casino_providers p_order ON p_order.id=g_order.provider_id
            JOIN public.casino_game_sources s_order ON s_order.game_id=g_order.id AND s_order.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres_order ON pres_order.game_id=g_order.id
        )
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               pres.title_override AS "titleOverride",
               tier_order.order_position AS "orderPosition",
               tier_order.tier_total AS "tierTotal",
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
               ARRAY(SELECT dgc.category_id::text FROM public.casino_game_display_categories dgc WHERE dgc.game_id=g.id ORDER BY dgc.category_id) AS "displayCategoryIds",
               GREATEST(g.availability_updated_at,COALESCE(pres.updated_at,'-infinity'::timestamptz),COALESCE(pres.order_updated_at,'-infinity'::timestamptz)) AS "updatedAt",
               COALESCE(pres_editor.display_name,order_editor.display_name,availability_editor.display_name) AS "updatedBy"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          JOIN tier_order ON tier_order.id=g.id
          LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code='bigbang' AND pt.source_mode=s.source_mode
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.admin_users pres_editor ON pres_editor.id=pres.updated_by
          LEFT JOIN public.admin_users order_editor ON order_editor.id=pres.order_updated_by
          LEFT JOIN public.admin_users availability_editor ON availability_editor.id=g.availability_updated_by
         WHERE ${where}
         ORDER BY s.source_mode,COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
         LIMIT $${values.length+1} OFFSET $${values.length+2}
      `,pageValues);
      const settings = await database.query<{ selected_mode: string }>("SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang'");
      const premiumAvailable = settings.rows[0]?.selected_mode === 'premium'; // migration 011 currently permits Standard only; stays false until a reviewed tier migration.
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.titleOverride?.trim() || row.title,
          sourceTitle: row.title,
          titleOverride: row.titleOverride,
          orderPosition: Number(row.orderPosition),
          tierTotal: Number(row.tierTotal),
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
          displayCategoryIds: row.displayCategoryIds ?? [],
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
      return unexpected(request,reply,error);
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
          SELECT id,rank::numeric AS sort_key FROM ranked_without_moved
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
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId/order-position', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } },
      body: {
        type: 'object', additionalProperties: false, required: ['orderPosition'],
        properties: { orderPosition: { type: 'integer', minimum: 1, maximum: 100000 } },
      },
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      const {orderPosition}=request.body as {orderPosition:number};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');

      const source=await database.query<{source_mode:Tier;tier_total:number}>(`
        SELECT s.source_mode,
               (SELECT count(*)::int FROM public.casino_game_sources all_sources
                 WHERE all_sources.source_code='bigbang' AND all_sources.source_mode=s.source_mode) AS tier_total
          FROM public.casino_game_sources s
         WHERE s.game_id=$1 AND s.source_code='bigbang'
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium ordering is locked until the Premium integration gate is approved');
      if(!Number.isInteger(orderPosition) || orderPosition<1 || orderPosition>Number(sourceRow.tier_total)) {
        return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','Order position must be between 1 and the number of games in the Standard tier ('+Number(sourceRow.tier_total)+')');
      }

      const auditId=randomUUID();
      const result=await database.query<QueryResultRow & {oldPosition:number;orderPosition:number;displayOrder:number}>(`
        WITH lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtext('bclick.skin-games.display-order'))
        ), tier_games AS MATERIALIZED (
          SELECT g.id,
                 row_number() OVER (
                   ORDER BY COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
                 )::integer AS old_position
            FROM public.casino_games g
            JOIN public.casino_providers p ON p.id=g.provider_id
            JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode=$3
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
            CROSS JOIN lock
        ), target AS MATERIALIZED (
          SELECT id,old_position FROM tier_games WHERE id=$1
        ), reordered AS (
          SELECT ordered_game.id,
                 CASE
                   WHEN ordered_game.id=$1 THEN $2::integer
                   WHEN ordered_game.old_position < target.old_position AND ordered_game.old_position >= $2 THEN ordered_game.old_position+1
                   WHEN ordered_game.old_position > target.old_position AND ordered_game.old_position <= $2 THEN ordered_game.old_position-1
                   ELSE ordered_game.old_position
                 END AS new_position
            FROM tier_games ordered_game CROSS JOIN target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
        ), saved AS (
          INSERT INTO public.casino_game_presentation
            (game_id,display_order,order_updated_by,order_updated_at)
          SELECT id,(new_position*100)::bigint,$4,now() FROM reordered
          ON CONFLICT (game_id) DO UPDATE SET
            display_order=EXCLUDED.display_order,
            order_updated_by=EXCLUDED.order_updated_by,
            order_updated_at=now()
          RETURNING game_id,display_order
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $5,'casino.skin-games.position-changed','admin',$4,'casino_game_order',target.id,'success',$6,
                 jsonb_build_object('sourceMode',$3,'oldPosition',target.old_position,'newPosition',$2),now()
            FROM target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
          RETURNING id
        )
        SELECT target.old_position AS "oldPosition",
               $2::integer AS "orderPosition",
               saved.display_order AS "displayOrder"
          FROM target JOIN saved ON saved.game_id=target.id CROSS JOIN audited
      `,[gameId,orderPosition,sourceRow.source_mode,session.principalId,auditId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','The Standard tier changed while reordering. Refresh and retry with a valid position.');
      return reply.code(200).send({
        data:{gameId,oldPosition:Number(row.oldPosition),orderPosition:Number(row.orderPosition),displayOrder:Number(row.displayOrder)},
        requestId:request.id,
      });
    } catch(error) {
      return unexpected(request,reply,error);
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
          displayTitle: { type: 'string', maxLength: 120 },
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
      const body=request.body as {enabled?:boolean;description?:string;displayTitle?:string;clearCustomImage?:boolean};
      const changeEnabled=typeof body.enabled==='boolean';
      const changeDescription=typeof body.description==='string';
      const changeDisplayTitle=typeof body.displayTitle==='string';
      const clearCustomImage=body.clearCustomImage===true;
      if(!changeEnabled&&!changeDescription&&!changeDisplayTitle&&!clearCustomImage) return sendError(reply,request,400,'VALIDATION_ERROR','At least one supported field must change');
      const source=await database.query<{
        source_mode:string; enabled:boolean; source_available:boolean; catalog_available:boolean;
        provider_enabled:boolean; provider_tier_enabled:boolean;
      }>(`
        SELECT s.source_mode,g.bclick_enabled AS enabled,s.available AS source_available,
               g.available AS catalog_available,p.bclick_enabled AS provider_enabled,
               COALESCE(pt.enabled,false) AS provider_tier_enabled
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          LEFT JOIN public.casino_provider_tier_settings pt
            ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode
         WHERE g.id=$1
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium' && (changeEnabled || changeDescription || changeDisplayTitle || clearCustomImage)) {
        return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game availability and presentation are read-only until the Premium integration gate is approved and implemented');
      }
      if(body.enabled===true && (!sourceRow.source_available || !sourceRow.catalog_available || !sourceRow.provider_enabled || !sourceRow.provider_tier_enabled)) {
        return sendError(reply,request,409,'GAME_NOT_EFFECTIVELY_AVAILABLE','The source game, provider and source tier must all be available before enabling a game');
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
            (game_id,description_override,title_override,custom_image_key,display_order,updated_by,updated_at)
          SELECT t.id,
                 CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE NULL END,
                 CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE NULL END,
                 NULL,
                 COALESCE((SELECT display_order FROM public.casino_game_presentation WHERE game_id=t.id),0),
                 $6,now()
            FROM target t
           WHERE $3::boolean OR $5::boolean OR $9::boolean
          ON CONFLICT (game_id) DO UPDATE SET
            description_override=CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE public.casino_game_presentation.description_override END,
            title_override=CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE public.casino_game_presentation.title_override END,
            custom_image_key=CASE WHEN $5::boolean THEN NULL ELSE public.casino_game_presentation.custom_image_key END,
            updated_by=$6,updated_at=now()
          RETURNING game_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $7,'casino.skin-game.updated','admin',$6,'casino_game',t.id,'success',$8,
                 jsonb_build_object('slug',t.game_slug,'sourceMode',t.source_mode,
                   'enabledChanged',$2::boolean IS NOT NULL,'enabled',COALESCE($2::boolean,t.bclick_enabled),
                   'descriptionChanged',$3::boolean,'displayTitleChanged',$9::boolean,
                   'customImageCleared',$5::boolean),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS id,t.game_slug AS slug,
               COALESCE(gc.enabled,t.bclick_enabled) AS enabled,
               COALESCE(gc."updatedAt",now()) AS "updatedAt"
          FROM target t LEFT JOIN game_change gc ON gc.id=t.id CROSS JOIN audited
      `,[gameId,changeEnabled?body.enabled:null,changeDescription,body.description??'',clearCustomImage,session.principalId,actionId,request.id,changeDisplayTitle,body.displayTitle??'']);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:{id:row.id,slug:row.slug,enabled:row.enabled,updatedAt:new Date(row.updatedAt).toISOString()},requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.post('/api/v1/admin/casino/skin-games/:gameId/image', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } } },
  }, async (request,reply) => {
    let filePath: string | null = null;
    let failureStage = 'authorize_admin';
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      failureStage = 'validate_image';
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      if(!Buffer.isBuffer(request.body) || request.body.length<16 || request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Image must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info || requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }
      failureStage = 'lookup_game';
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
      failureStage = 'create_upload_directory';
      await mkdir(path.dirname(filePath),{recursive:true});
      failureStage = 'write_image_file';
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});
      const auditId=randomUUID();
      failureStage = 'persist_image_metadata_and_audit';
      const saved=await database.query<{game_id:string;custom_image_key:string}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS display_order
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id=$1
        ), changed AS (
          INSERT INTO public.casino_game_presentation(game_id,custom_image_key,display_order,updated_by,updated_at)
          SELECT id,$2,display_order,$3,now() FROM target
          ON CONFLICT (game_id) DO UPDATE SET custom_image_key=EXCLUDED.custom_image_key,updated_by=$3,updated_at=now()
          RETURNING game_id,custom_image_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.image-updated','admin',$3,'casino_game',changed.game_id,'success',$5,
                 jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'imageKey',changed.custom_image_key),now()
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
    } catch (error) {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,error,{ operation:'skin_game_image_upload',stage:failureStage });
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
      const normalizedGameId=gameId.toLowerCase();
      const normalizedFileName=fileName.toLowerCase();
      const imageKey='casino-games/'+normalizedGameId+'/'+normalizedFileName;
      const active=await database.query<{ game_id:string }>(`
        SELECT game_id::text AS game_id FROM public.casino_game_presentation
         WHERE game_id=$1 AND custom_image_key=$2
      `,[normalizedGameId,imageKey]);
      if(!active.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const filePath=path.resolve(safeRoot,normalizedGameId,normalizedFileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const metadata=await stat(filePath);
      if(!metadata.isFile() || metadata.size<16 || metadata.size>MAX_IMAGE_BYTES) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
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
+values.length;
        conditions.push('('+
          'COALESCE(NULLIF(pres.title_override,\\'\\'),g.title) ILIKE '+parameter+' ESCAPE E\\'\\\\\\\\\\' '+
          'OR g.game_slug ILIKE '+parameter+' ESCAPE E\\'\\\\\\\\\\' '+
          'OR p.name ILIKE '+parameter+' ESCAPE E\\'\\\\\\\\\\' '+
          'OR p.code ILIKE '+parameter+' ESCAPE E\\'\\\\\\\\\\' '+
          'OR s.external_game_id::text ILIKE '+parameter+')');
      }
      const where=conditions.join(' AND ');
      const count=await database.query<{total:number|string} & QueryResultRow>(
        'SELECT count(DISTINCT g.id)::integer AS total '+
        'FROM public.casino_games g JOIN public.casino_providers p ON p.id=g.provider_id '+
        'JOIN public.casino_game_sources s ON s.game_id=g.id '+
        'LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id '+
        'WHERE '+where,
        values);
      const total=Number(count.rows[0]?.total??0);
      const pageValues=[...values,pageSize,(page-1)*pageSize];
      const rows=await database.query<{
        id:string;slug:string;title:string;provider:string;imageUrl:string|null;available:boolean;
      } & QueryResultRow>(
        'SELECT g.id::text AS id,g.game_slug AS slug,'+
        'COALESCE(NULLIF(pres.title_override,\\'\\'),g.title) AS title,p.name AS provider,'+
        'COALESCE(\\'/api/v1/assets/\\' || pres.custom_image_key,g.image_url) AS "imageUrl",'+
        '(g.available AND g.bclick_enabled AND p.bclick_enabled AND s.available AND COALESCE(pt.enabled,false)) AS available '+
        'FROM public.casino_games g JOIN public.casino_providers p ON p.id=g.provider_id '+
        'JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code=\\'bigbang\\' AND s.source_mode=\\'standard\\' '+
        'LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode '+
        'LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id '+
        'WHERE '+where+' ORDER BY COALESCE(pres.display_order,0),lower(COALESCE(NULLIF(pres.title_override,\\'\\'),g.title)),p.code,g.id '+
        'LIMIT     schema:{
      params:{type:'object',additionalProperties:false,required:['gameId'],properties:{gameId:{type:'string',pattern:UUID.source}}},
      body:{type:'object',additionalProperties:false,required:['categoryIds'],properties:{categoryIds:{type:'array',maxItems:100,uniqueItems:true,items:{type:'string',pattern:UUID.source}}}},
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {gameId} = request.params as {gameId:string};
      if (!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      const {categoryIds} = request.body as {categoryIds:string[]};
      const target = await database.query<{source_mode:string}>(
        "SELECT source_mode FROM public.casino_game_sources WHERE game_id=$1 AND source_code='bigbang'",[gameId]);
      if (!target.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if (target.rows[0].source_mode === 'premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game category assignment is locked until Premium integration is approved');
      const available = await database.query<{count:number|string}>(
        'SELECT count(*)::integer AS count FROM public.casino_display_categories WHERE id=ANY($1::uuid[])',[categoryIds]);
      if (Number(available.rows[0]?.count ?? 0) !== categoryIds.length) {
        return sendError(reply,request,422,'DISPLAY_CATEGORY_NOT_FOUND','One or more selected display categories no longer exist. Refresh and retry.');
      }
      const auditId = randomUUID();
      const saved = await database.query<{gameId:string;categoryIds:string[]}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,s.source_mode FROM public.casino_games g
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          WHERE g.id=$1::uuid
        ), removed AS (
          DELETE FROM public.casino_game_display_categories m USING target t
           WHERE m.game_id=t.id AND NOT (m.category_id=ANY($2::uuid[]))
          RETURNING m.category_id
        ), added AS (
          INSERT INTO public.casino_game_display_categories(category_id,game_id,assigned_by,assigned_at)
          SELECT selected.category_id,t.id,$3,now()
            FROM target t CROSS JOIN unnest($2::uuid[]) AS selected(category_id)
          ON CONFLICT (category_id,game_id) DO NOTHING
          RETURNING category_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.display-categories-updated','admin',$3,'casino_game',t.id,'success',$5,
                 jsonb_build_object('categoryIds',to_jsonb($2::uuid[]),'sourceMode',t.source_mode),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS "gameId",
               ARRAY(SELECT m.category_id::text FROM public.casino_game_display_categories m WHERE m.game_id=t.id ORDER BY m.category_id) AS "categoryIds"
          FROM target t CROSS JOIN audited
      `,[gameId,categoryIds,session.principalId,auditId,request.id]);
      if (!saved.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:saved.rows[0],requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error,{operation:'skin_game_display_category_assignment'});
    }
  });

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
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR COALESCE((SELECT NULLIF(pres_search.title_override,'' ) FROM public.casino_game_presentation pres_search WHERE pres_search.game_id=g.id),g.title) ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\' OR s.external_game_id::text ILIKE ${pattern})`);
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
        WITH tier_order AS MATERIALIZED (
          SELECT g_order.id,
                 row_number() OVER (
                   PARTITION BY s_order.source_mode
                   ORDER BY COALESCE(pres_order.display_order,0),lower(g_order.title),p_order.code,g_order.id
                 )::integer AS order_position,
                 count(*) OVER (PARTITION BY s_order.source_mode)::integer AS tier_total
            FROM public.casino_games g_order
            JOIN public.casino_providers p_order ON p_order.id=g_order.provider_id
            JOIN public.casino_game_sources s_order ON s_order.game_id=g_order.id AND s_order.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres_order ON pres_order.game_id=g_order.id
        )
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               pres.title_override AS "titleOverride",
               tier_order.order_position AS "orderPosition",
               tier_order.tier_total AS "tierTotal",
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
               ARRAY(SELECT dgc.category_id::text FROM public.casino_game_display_categories dgc WHERE dgc.game_id=g.id ORDER BY dgc.category_id) AS "displayCategoryIds",
               GREATEST(g.availability_updated_at,COALESCE(pres.updated_at,'-infinity'::timestamptz),COALESCE(pres.order_updated_at,'-infinity'::timestamptz)) AS "updatedAt",
               COALESCE(pres_editor.display_name,order_editor.display_name,availability_editor.display_name) AS "updatedBy"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          JOIN tier_order ON tier_order.id=g.id
          LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code='bigbang' AND pt.source_mode=s.source_mode
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.admin_users pres_editor ON pres_editor.id=pres.updated_by
          LEFT JOIN public.admin_users order_editor ON order_editor.id=pres.order_updated_by
          LEFT JOIN public.admin_users availability_editor ON availability_editor.id=g.availability_updated_by
         WHERE ${where}
         ORDER BY s.source_mode,COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
         LIMIT $${values.length+1} OFFSET $${values.length+2}
      `,pageValues);
      const settings = await database.query<{ selected_mode: string }>("SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang'");
      const premiumAvailable = settings.rows[0]?.selected_mode === 'premium'; // migration 011 currently permits Standard only; stays false until a reviewed tier migration.
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.titleOverride?.trim() || row.title,
          sourceTitle: row.title,
          titleOverride: row.titleOverride,
          orderPosition: Number(row.orderPosition),
          tierTotal: Number(row.tierTotal),
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
          displayCategoryIds: row.displayCategoryIds ?? [],
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
      return unexpected(request,reply,error);
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
          SELECT id,rank::numeric AS sort_key FROM ranked_without_moved
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
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId/order-position', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } },
      body: {
        type: 'object', additionalProperties: false, required: ['orderPosition'],
        properties: { orderPosition: { type: 'integer', minimum: 1, maximum: 100000 } },
      },
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      const {orderPosition}=request.body as {orderPosition:number};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');

      const source=await database.query<{source_mode:Tier;tier_total:number}>(`
        SELECT s.source_mode,
               (SELECT count(*)::int FROM public.casino_game_sources all_sources
                 WHERE all_sources.source_code='bigbang' AND all_sources.source_mode=s.source_mode) AS tier_total
          FROM public.casino_game_sources s
         WHERE s.game_id=$1 AND s.source_code='bigbang'
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium ordering is locked until the Premium integration gate is approved');
      if(!Number.isInteger(orderPosition) || orderPosition<1 || orderPosition>Number(sourceRow.tier_total)) {
        return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','Order position must be between 1 and the number of games in the Standard tier ('+Number(sourceRow.tier_total)+')');
      }

      const auditId=randomUUID();
      const result=await database.query<QueryResultRow & {oldPosition:number;orderPosition:number;displayOrder:number}>(`
        WITH lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtext('bclick.skin-games.display-order'))
        ), tier_games AS MATERIALIZED (
          SELECT g.id,
                 row_number() OVER (
                   ORDER BY COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
                 )::integer AS old_position
            FROM public.casino_games g
            JOIN public.casino_providers p ON p.id=g.provider_id
            JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode=$3
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
            CROSS JOIN lock
        ), target AS MATERIALIZED (
          SELECT id,old_position FROM tier_games WHERE id=$1
        ), reordered AS (
          SELECT ordered_game.id,
                 CASE
                   WHEN ordered_game.id=$1 THEN $2::integer
                   WHEN ordered_game.old_position < target.old_position AND ordered_game.old_position >= $2 THEN ordered_game.old_position+1
                   WHEN ordered_game.old_position > target.old_position AND ordered_game.old_position <= $2 THEN ordered_game.old_position-1
                   ELSE ordered_game.old_position
                 END AS new_position
            FROM tier_games ordered_game CROSS JOIN target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
        ), saved AS (
          INSERT INTO public.casino_game_presentation
            (game_id,display_order,order_updated_by,order_updated_at)
          SELECT id,(new_position*100)::bigint,$4,now() FROM reordered
          ON CONFLICT (game_id) DO UPDATE SET
            display_order=EXCLUDED.display_order,
            order_updated_by=EXCLUDED.order_updated_by,
            order_updated_at=now()
          RETURNING game_id,display_order
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $5,'casino.skin-games.position-changed','admin',$4,'casino_game_order',target.id,'success',$6,
                 jsonb_build_object('sourceMode',$3,'oldPosition',target.old_position,'newPosition',$2),now()
            FROM target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
          RETURNING id
        )
        SELECT target.old_position AS "oldPosition",
               $2::integer AS "orderPosition",
               saved.display_order AS "displayOrder"
          FROM target JOIN saved ON saved.game_id=target.id CROSS JOIN audited
      `,[gameId,orderPosition,sourceRow.source_mode,session.principalId,auditId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','The Standard tier changed while reordering. Refresh and retry with a valid position.');
      return reply.code(200).send({
        data:{gameId,oldPosition:Number(row.oldPosition),orderPosition:Number(row.orderPosition),displayOrder:Number(row.displayOrder)},
        requestId:request.id,
      });
    } catch(error) {
      return unexpected(request,reply,error);
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
          displayTitle: { type: 'string', maxLength: 120 },
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
      const body=request.body as {enabled?:boolean;description?:string;displayTitle?:string;clearCustomImage?:boolean};
      const changeEnabled=typeof body.enabled==='boolean';
      const changeDescription=typeof body.description==='string';
      const changeDisplayTitle=typeof body.displayTitle==='string';
      const clearCustomImage=body.clearCustomImage===true;
      if(!changeEnabled&&!changeDescription&&!changeDisplayTitle&&!clearCustomImage) return sendError(reply,request,400,'VALIDATION_ERROR','At least one supported field must change');
      const source=await database.query<{
        source_mode:string; enabled:boolean; source_available:boolean; catalog_available:boolean;
        provider_enabled:boolean; provider_tier_enabled:boolean;
      }>(`
        SELECT s.source_mode,g.bclick_enabled AS enabled,s.available AS source_available,
               g.available AS catalog_available,p.bclick_enabled AS provider_enabled,
               COALESCE(pt.enabled,false) AS provider_tier_enabled
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          LEFT JOIN public.casino_provider_tier_settings pt
            ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode
         WHERE g.id=$1
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium' && (changeEnabled || changeDescription || changeDisplayTitle || clearCustomImage)) {
        return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game availability and presentation are read-only until the Premium integration gate is approved and implemented');
      }
      if(body.enabled===true && (!sourceRow.source_available || !sourceRow.catalog_available || !sourceRow.provider_enabled || !sourceRow.provider_tier_enabled)) {
        return sendError(reply,request,409,'GAME_NOT_EFFECTIVELY_AVAILABLE','The source game, provider and source tier must all be available before enabling a game');
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
            (game_id,description_override,title_override,custom_image_key,display_order,updated_by,updated_at)
          SELECT t.id,
                 CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE NULL END,
                 CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE NULL END,
                 NULL,
                 COALESCE((SELECT display_order FROM public.casino_game_presentation WHERE game_id=t.id),0),
                 $6,now()
            FROM target t
           WHERE $3::boolean OR $5::boolean OR $9::boolean
          ON CONFLICT (game_id) DO UPDATE SET
            description_override=CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE public.casino_game_presentation.description_override END,
            title_override=CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE public.casino_game_presentation.title_override END,
            custom_image_key=CASE WHEN $5::boolean THEN NULL ELSE public.casino_game_presentation.custom_image_key END,
            updated_by=$6,updated_at=now()
          RETURNING game_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $7,'casino.skin-game.updated','admin',$6,'casino_game',t.id,'success',$8,
                 jsonb_build_object('slug',t.game_slug,'sourceMode',t.source_mode,
                   'enabledChanged',$2::boolean IS NOT NULL,'enabled',COALESCE($2::boolean,t.bclick_enabled),
                   'descriptionChanged',$3::boolean,'displayTitleChanged',$9::boolean,
                   'customImageCleared',$5::boolean),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS id,t.game_slug AS slug,
               COALESCE(gc.enabled,t.bclick_enabled) AS enabled,
               COALESCE(gc."updatedAt",now()) AS "updatedAt"
          FROM target t LEFT JOIN game_change gc ON gc.id=t.id CROSS JOIN audited
      `,[gameId,changeEnabled?body.enabled:null,changeDescription,body.description??'',clearCustomImage,session.principalId,actionId,request.id,changeDisplayTitle,body.displayTitle??'']);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:{id:row.id,slug:row.slug,enabled:row.enabled,updatedAt:new Date(row.updatedAt).toISOString()},requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.post('/api/v1/admin/casino/skin-games/:gameId/image', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } } },
  }, async (request,reply) => {
    let filePath: string | null = null;
    let failureStage = 'authorize_admin';
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      failureStage = 'validate_image';
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      if(!Buffer.isBuffer(request.body) || request.body.length<16 || request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Image must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info || requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }
      failureStage = 'lookup_game';
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
      failureStage = 'create_upload_directory';
      await mkdir(path.dirname(filePath),{recursive:true});
      failureStage = 'write_image_file';
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});
      const auditId=randomUUID();
      failureStage = 'persist_image_metadata_and_audit';
      const saved=await database.query<{game_id:string;custom_image_key:string}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS display_order
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id=$1
        ), changed AS (
          INSERT INTO public.casino_game_presentation(game_id,custom_image_key,display_order,updated_by,updated_at)
          SELECT id,$2,display_order,$3,now() FROM target
          ON CONFLICT (game_id) DO UPDATE SET custom_image_key=EXCLUDED.custom_image_key,updated_by=$3,updated_at=now()
          RETURNING game_id,custom_image_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.image-updated','admin',$3,'casino_game',changed.game_id,'success',$5,
                 jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'imageKey',changed.custom_image_key),now()
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
    } catch (error) {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,error,{ operation:'skin_game_image_upload',stage:failureStage });
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
      const normalizedGameId=gameId.toLowerCase();
      const normalizedFileName=fileName.toLowerCase();
      const imageKey='casino-games/'+normalizedGameId+'/'+normalizedFileName;
      const active=await database.query<{ game_id:string }>(`
        SELECT game_id::text AS game_id FROM public.casino_game_presentation
         WHERE game_id=$1 AND custom_image_key=$2
      `,[normalizedGameId,imageKey]);
      if(!active.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const filePath=path.resolve(safeRoot,normalizedGameId,normalizedFileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const metadata=await stat(filePath);
      if(!metadata.isFile() || metadata.size<16 || metadata.size>MAX_IMAGE_BYTES) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
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
+(pageValues.length-1)+' OFFSET     schema:{
      params:{type:'object',additionalProperties:false,required:['gameId'],properties:{gameId:{type:'string',pattern:UUID.source}}},
      body:{type:'object',additionalProperties:false,required:['categoryIds'],properties:{categoryIds:{type:'array',maxItems:100,uniqueItems:true,items:{type:'string',pattern:UUID.source}}}},
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {gameId} = request.params as {gameId:string};
      if (!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      const {categoryIds} = request.body as {categoryIds:string[]};
      const target = await database.query<{source_mode:string}>(
        "SELECT source_mode FROM public.casino_game_sources WHERE game_id=$1 AND source_code='bigbang'",[gameId]);
      if (!target.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if (target.rows[0].source_mode === 'premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game category assignment is locked until Premium integration is approved');
      const available = await database.query<{count:number|string}>(
        'SELECT count(*)::integer AS count FROM public.casino_display_categories WHERE id=ANY($1::uuid[])',[categoryIds]);
      if (Number(available.rows[0]?.count ?? 0) !== categoryIds.length) {
        return sendError(reply,request,422,'DISPLAY_CATEGORY_NOT_FOUND','One or more selected display categories no longer exist. Refresh and retry.');
      }
      const auditId = randomUUID();
      const saved = await database.query<{gameId:string;categoryIds:string[]}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,s.source_mode FROM public.casino_games g
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          WHERE g.id=$1::uuid
        ), removed AS (
          DELETE FROM public.casino_game_display_categories m USING target t
           WHERE m.game_id=t.id AND NOT (m.category_id=ANY($2::uuid[]))
          RETURNING m.category_id
        ), added AS (
          INSERT INTO public.casino_game_display_categories(category_id,game_id,assigned_by,assigned_at)
          SELECT selected.category_id,t.id,$3,now()
            FROM target t CROSS JOIN unnest($2::uuid[]) AS selected(category_id)
          ON CONFLICT (category_id,game_id) DO NOTHING
          RETURNING category_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.display-categories-updated','admin',$3,'casino_game',t.id,'success',$5,
                 jsonb_build_object('categoryIds',to_jsonb($2::uuid[]),'sourceMode',t.source_mode),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS "gameId",
               ARRAY(SELECT m.category_id::text FROM public.casino_game_display_categories m WHERE m.game_id=t.id ORDER BY m.category_id) AS "categoryIds"
          FROM target t CROSS JOIN audited
      `,[gameId,categoryIds,session.principalId,auditId,request.id]);
      if (!saved.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:saved.rows[0],requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error,{operation:'skin_game_display_category_assignment'});
    }
  });

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
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR COALESCE((SELECT NULLIF(pres_search.title_override,'' ) FROM public.casino_game_presentation pres_search WHERE pres_search.game_id=g.id),g.title) ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\' OR s.external_game_id::text ILIKE ${pattern})`);
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
        WITH tier_order AS MATERIALIZED (
          SELECT g_order.id,
                 row_number() OVER (
                   PARTITION BY s_order.source_mode
                   ORDER BY COALESCE(pres_order.display_order,0),lower(g_order.title),p_order.code,g_order.id
                 )::integer AS order_position,
                 count(*) OVER (PARTITION BY s_order.source_mode)::integer AS tier_total
            FROM public.casino_games g_order
            JOIN public.casino_providers p_order ON p_order.id=g_order.provider_id
            JOIN public.casino_game_sources s_order ON s_order.game_id=g_order.id AND s_order.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres_order ON pres_order.game_id=g_order.id
        )
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               pres.title_override AS "titleOverride",
               tier_order.order_position AS "orderPosition",
               tier_order.tier_total AS "tierTotal",
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
               ARRAY(SELECT dgc.category_id::text FROM public.casino_game_display_categories dgc WHERE dgc.game_id=g.id ORDER BY dgc.category_id) AS "displayCategoryIds",
               GREATEST(g.availability_updated_at,COALESCE(pres.updated_at,'-infinity'::timestamptz),COALESCE(pres.order_updated_at,'-infinity'::timestamptz)) AS "updatedAt",
               COALESCE(pres_editor.display_name,order_editor.display_name,availability_editor.display_name) AS "updatedBy"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          JOIN tier_order ON tier_order.id=g.id
          LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code='bigbang' AND pt.source_mode=s.source_mode
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.admin_users pres_editor ON pres_editor.id=pres.updated_by
          LEFT JOIN public.admin_users order_editor ON order_editor.id=pres.order_updated_by
          LEFT JOIN public.admin_users availability_editor ON availability_editor.id=g.availability_updated_by
         WHERE ${where}
         ORDER BY s.source_mode,COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
         LIMIT $${values.length+1} OFFSET $${values.length+2}
      `,pageValues);
      const settings = await database.query<{ selected_mode: string }>("SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang'");
      const premiumAvailable = settings.rows[0]?.selected_mode === 'premium'; // migration 011 currently permits Standard only; stays false until a reviewed tier migration.
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.titleOverride?.trim() || row.title,
          sourceTitle: row.title,
          titleOverride: row.titleOverride,
          orderPosition: Number(row.orderPosition),
          tierTotal: Number(row.tierTotal),
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
          displayCategoryIds: row.displayCategoryIds ?? [],
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
      return unexpected(request,reply,error);
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
          SELECT id,rank::numeric AS sort_key FROM ranked_without_moved
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
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId/order-position', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } },
      body: {
        type: 'object', additionalProperties: false, required: ['orderPosition'],
        properties: { orderPosition: { type: 'integer', minimum: 1, maximum: 100000 } },
      },
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      const {orderPosition}=request.body as {orderPosition:number};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');

      const source=await database.query<{source_mode:Tier;tier_total:number}>(`
        SELECT s.source_mode,
               (SELECT count(*)::int FROM public.casino_game_sources all_sources
                 WHERE all_sources.source_code='bigbang' AND all_sources.source_mode=s.source_mode) AS tier_total
          FROM public.casino_game_sources s
         WHERE s.game_id=$1 AND s.source_code='bigbang'
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium ordering is locked until the Premium integration gate is approved');
      if(!Number.isInteger(orderPosition) || orderPosition<1 || orderPosition>Number(sourceRow.tier_total)) {
        return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','Order position must be between 1 and the number of games in the Standard tier ('+Number(sourceRow.tier_total)+')');
      }

      const auditId=randomUUID();
      const result=await database.query<QueryResultRow & {oldPosition:number;orderPosition:number;displayOrder:number}>(`
        WITH lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtext('bclick.skin-games.display-order'))
        ), tier_games AS MATERIALIZED (
          SELECT g.id,
                 row_number() OVER (
                   ORDER BY COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
                 )::integer AS old_position
            FROM public.casino_games g
            JOIN public.casino_providers p ON p.id=g.provider_id
            JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode=$3
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
            CROSS JOIN lock
        ), target AS MATERIALIZED (
          SELECT id,old_position FROM tier_games WHERE id=$1
        ), reordered AS (
          SELECT ordered_game.id,
                 CASE
                   WHEN ordered_game.id=$1 THEN $2::integer
                   WHEN ordered_game.old_position < target.old_position AND ordered_game.old_position >= $2 THEN ordered_game.old_position+1
                   WHEN ordered_game.old_position > target.old_position AND ordered_game.old_position <= $2 THEN ordered_game.old_position-1
                   ELSE ordered_game.old_position
                 END AS new_position
            FROM tier_games ordered_game CROSS JOIN target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
        ), saved AS (
          INSERT INTO public.casino_game_presentation
            (game_id,display_order,order_updated_by,order_updated_at)
          SELECT id,(new_position*100)::bigint,$4,now() FROM reordered
          ON CONFLICT (game_id) DO UPDATE SET
            display_order=EXCLUDED.display_order,
            order_updated_by=EXCLUDED.order_updated_by,
            order_updated_at=now()
          RETURNING game_id,display_order
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $5,'casino.skin-games.position-changed','admin',$4,'casino_game_order',target.id,'success',$6,
                 jsonb_build_object('sourceMode',$3,'oldPosition',target.old_position,'newPosition',$2),now()
            FROM target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
          RETURNING id
        )
        SELECT target.old_position AS "oldPosition",
               $2::integer AS "orderPosition",
               saved.display_order AS "displayOrder"
          FROM target JOIN saved ON saved.game_id=target.id CROSS JOIN audited
      `,[gameId,orderPosition,sourceRow.source_mode,session.principalId,auditId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','The Standard tier changed while reordering. Refresh and retry with a valid position.');
      return reply.code(200).send({
        data:{gameId,oldPosition:Number(row.oldPosition),orderPosition:Number(row.orderPosition),displayOrder:Number(row.displayOrder)},
        requestId:request.id,
      });
    } catch(error) {
      return unexpected(request,reply,error);
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
          displayTitle: { type: 'string', maxLength: 120 },
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
      const body=request.body as {enabled?:boolean;description?:string;displayTitle?:string;clearCustomImage?:boolean};
      const changeEnabled=typeof body.enabled==='boolean';
      const changeDescription=typeof body.description==='string';
      const changeDisplayTitle=typeof body.displayTitle==='string';
      const clearCustomImage=body.clearCustomImage===true;
      if(!changeEnabled&&!changeDescription&&!changeDisplayTitle&&!clearCustomImage) return sendError(reply,request,400,'VALIDATION_ERROR','At least one supported field must change');
      const source=await database.query<{
        source_mode:string; enabled:boolean; source_available:boolean; catalog_available:boolean;
        provider_enabled:boolean; provider_tier_enabled:boolean;
      }>(`
        SELECT s.source_mode,g.bclick_enabled AS enabled,s.available AS source_available,
               g.available AS catalog_available,p.bclick_enabled AS provider_enabled,
               COALESCE(pt.enabled,false) AS provider_tier_enabled
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          LEFT JOIN public.casino_provider_tier_settings pt
            ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode
         WHERE g.id=$1
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium' && (changeEnabled || changeDescription || changeDisplayTitle || clearCustomImage)) {
        return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game availability and presentation are read-only until the Premium integration gate is approved and implemented');
      }
      if(body.enabled===true && (!sourceRow.source_available || !sourceRow.catalog_available || !sourceRow.provider_enabled || !sourceRow.provider_tier_enabled)) {
        return sendError(reply,request,409,'GAME_NOT_EFFECTIVELY_AVAILABLE','The source game, provider and source tier must all be available before enabling a game');
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
            (game_id,description_override,title_override,custom_image_key,display_order,updated_by,updated_at)
          SELECT t.id,
                 CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE NULL END,
                 CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE NULL END,
                 NULL,
                 COALESCE((SELECT display_order FROM public.casino_game_presentation WHERE game_id=t.id),0),
                 $6,now()
            FROM target t
           WHERE $3::boolean OR $5::boolean OR $9::boolean
          ON CONFLICT (game_id) DO UPDATE SET
            description_override=CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE public.casino_game_presentation.description_override END,
            title_override=CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE public.casino_game_presentation.title_override END,
            custom_image_key=CASE WHEN $5::boolean THEN NULL ELSE public.casino_game_presentation.custom_image_key END,
            updated_by=$6,updated_at=now()
          RETURNING game_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $7,'casino.skin-game.updated','admin',$6,'casino_game',t.id,'success',$8,
                 jsonb_build_object('slug',t.game_slug,'sourceMode',t.source_mode,
                   'enabledChanged',$2::boolean IS NOT NULL,'enabled',COALESCE($2::boolean,t.bclick_enabled),
                   'descriptionChanged',$3::boolean,'displayTitleChanged',$9::boolean,
                   'customImageCleared',$5::boolean),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS id,t.game_slug AS slug,
               COALESCE(gc.enabled,t.bclick_enabled) AS enabled,
               COALESCE(gc."updatedAt",now()) AS "updatedAt"
          FROM target t LEFT JOIN game_change gc ON gc.id=t.id CROSS JOIN audited
      `,[gameId,changeEnabled?body.enabled:null,changeDescription,body.description??'',clearCustomImage,session.principalId,actionId,request.id,changeDisplayTitle,body.displayTitle??'']);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:{id:row.id,slug:row.slug,enabled:row.enabled,updatedAt:new Date(row.updatedAt).toISOString()},requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.post('/api/v1/admin/casino/skin-games/:gameId/image', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } } },
  }, async (request,reply) => {
    let filePath: string | null = null;
    let failureStage = 'authorize_admin';
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      failureStage = 'validate_image';
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      if(!Buffer.isBuffer(request.body) || request.body.length<16 || request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Image must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info || requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }
      failureStage = 'lookup_game';
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
      failureStage = 'create_upload_directory';
      await mkdir(path.dirname(filePath),{recursive:true});
      failureStage = 'write_image_file';
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});
      const auditId=randomUUID();
      failureStage = 'persist_image_metadata_and_audit';
      const saved=await database.query<{game_id:string;custom_image_key:string}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS display_order
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id=$1
        ), changed AS (
          INSERT INTO public.casino_game_presentation(game_id,custom_image_key,display_order,updated_by,updated_at)
          SELECT id,$2,display_order,$3,now() FROM target
          ON CONFLICT (game_id) DO UPDATE SET custom_image_key=EXCLUDED.custom_image_key,updated_by=$3,updated_at=now()
          RETURNING game_id,custom_image_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.image-updated','admin',$3,'casino_game',changed.game_id,'success',$5,
                 jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'imageKey',changed.custom_image_key),now()
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
    } catch (error) {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,error,{ operation:'skin_game_image_upload',stage:failureStage });
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
      const normalizedGameId=gameId.toLowerCase();
      const normalizedFileName=fileName.toLowerCase();
      const imageKey='casino-games/'+normalizedGameId+'/'+normalizedFileName;
      const active=await database.query<{ game_id:string }>(`
        SELECT game_id::text AS game_id FROM public.casino_game_presentation
         WHERE game_id=$1 AND custom_image_key=$2
      `,[normalizedGameId,imageKey]);
      if(!active.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const filePath=path.resolve(safeRoot,normalizedGameId,normalizedFileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const metadata=await stat(filePath);
      if(!metadata.isFile() || metadata.size<16 || metadata.size>MAX_IMAGE_BYTES) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
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
+pageValues.length,
        pageValues);
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data:rows.rows,
        selectedGameIds:assigned.rows[0]?.ids??[],
        page:{page,pageSize,total,nextPage:page*pageSize<total?page+1:null},
        requestId:request.id,
      });
    } catch(error) {
      if(error&&typeof error==='object'&&'statusCode' in error&&typeof (error as {statusCode:unknown}).statusCode==='number') {
        return sendError(reply,request,400,'VALIDATION_ERROR','Category game query parameters are invalid');
      }
      return unexpected(request,reply,error,{operation:'display_category_games_list'});
    }
  });

  app.put('/api/v1/admin/casino/display-categories/:categoryId/games', {
    schema:{
      params:{type:'object',additionalProperties:false,required:['categoryId'],properties:{categoryId:{type:'string',pattern:UUID.source}}},
      body:{type:'object',additionalProperties:false,required:['gameIds'],properties:{gameIds:{type:'array',maxItems:5000,uniqueItems:true,items:{type:'string',pattern:UUID.source}}}},
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {categoryId}=request.params as {categoryId:string};
      if(!UUID.test(categoryId)) return sendError(reply,request,400,'VALIDATION_ERROR','Category ID must be a UUID');
      const {gameIds}=request.body as {gameIds:string[]};
      const category=await database.query<{id:string} & QueryResultRow>(
        'SELECT id::text AS id FROM public.casino_display_categories WHERE id=$1::uuid',[categoryId]);
      if(!category.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');

      const validGames=await database.query<{count:number|string} & QueryResultRow>(
        'SELECT count(DISTINCT game_id)::integer AS count FROM public.casino_game_sources '+
        'WHERE source_code=\\'bigbang\\' AND source_mode=\\'standard\\' AND game_id=ANY($1::uuid[])',
        [gameIds]);
      if(Number(validGames.rows[0]?.count??0)!==gameIds.length) {
        return sendError(reply,request,422,'DISPLAY_CATEGORY_GAME_INVALID','Every selected game must be a canonical Standard game. Premium assignments remain locked.');
      }

      const auditId=randomUUID();
      const saved=await database.query<{categoryId:string;gameIds:string[]} & QueryResultRow>(
        'WITH target AS MATERIALIZED (SELECT id FROM public.casino_display_categories WHERE id=$1::uuid), '+
        'removed AS (DELETE FROM public.casino_game_display_categories m USING target t '+
        'WHERE m.category_id=t.id AND NOT (m.game_id=ANY($2::uuid[])) RETURNING m.game_id), '+
        'added AS (INSERT INTO public.casino_game_display_categories(category_id,game_id,assigned_by,assigned_at) '+
        'SELECT t.id,selected.game_id,$3,now() FROM target t CROSS JOIN unnest($2::uuid[]) AS selected(game_id) '+
        'ON CONFLICT (category_id,game_id) DO NOTHING RETURNING game_id), '+
        'audited AS (INSERT INTO public.audit_events '+
        '(id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at) '+
        'SELECT $4,\\'casino.display-category.games-updated\\',\\'admin\\',$3,\\'casino_display_category\\',t.id,\\'success\\',$5,'+
        'jsonb_build_object(\\'gameCount\\',cardinality($2::uuid[])),now() FROM target t RETURNING id) '+
        'SELECT t.id::text AS "categoryId",ARRAY(SELECT m.game_id::text FROM public.casino_game_display_categories m '+
        'WHERE m.category_id=t.id ORDER BY m.game_id) AS "gameIds" FROM target t CROSS JOIN audited',
        [categoryId,gameIds,session.principalId,auditId,request.id]);
      if(!saved.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Display category was not found');
      return reply.code(200).send({data:saved.rows[0],requestId:request.id});
    } catch(error) {
      if(error&&typeof error==='object'&&'statusCode' in error&&typeof (error as {statusCode:unknown}).statusCode==='number') {
        return sendError(reply,request,400,'VALIDATION_ERROR','Category game selection is invalid');
      }
      return unexpected(request,reply,error,{operation:'display_category_games_update'});
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId/display-categories', {
    schema:{
      params:{type:'object',additionalProperties:false,required:['gameId'],properties:{gameId:{type:'string',pattern:UUID.source}}},
      body:{type:'object',additionalProperties:false,required:['categoryIds'],properties:{categoryIds:{type:'array',maxItems:100,uniqueItems:true,items:{type:'string',pattern:UUID.source}}}},
    },
  }, async (request,reply) => {
    try {
      const session = await authorizedAdmin(database,request,reply,options,true);
      if (!session) return;
      const {gameId} = request.params as {gameId:string};
      if (!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      const {categoryIds} = request.body as {categoryIds:string[]};
      const target = await database.query<{source_mode:string}>(
        "SELECT source_mode FROM public.casino_game_sources WHERE game_id=$1 AND source_code='bigbang'",[gameId]);
      if (!target.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if (target.rows[0].source_mode === 'premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game category assignment is locked until Premium integration is approved');
      const available = await database.query<{count:number|string}>(
        'SELECT count(*)::integer AS count FROM public.casino_display_categories WHERE id=ANY($1::uuid[])',[categoryIds]);
      if (Number(available.rows[0]?.count ?? 0) !== categoryIds.length) {
        return sendError(reply,request,422,'DISPLAY_CATEGORY_NOT_FOUND','One or more selected display categories no longer exist. Refresh and retry.');
      }
      const auditId = randomUUID();
      const saved = await database.query<{gameId:string;categoryIds:string[]}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,s.source_mode FROM public.casino_games g
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          WHERE g.id=$1::uuid
        ), removed AS (
          DELETE FROM public.casino_game_display_categories m USING target t
           WHERE m.game_id=t.id AND NOT (m.category_id=ANY($2::uuid[]))
          RETURNING m.category_id
        ), added AS (
          INSERT INTO public.casino_game_display_categories(category_id,game_id,assigned_by,assigned_at)
          SELECT selected.category_id,t.id,$3,now()
            FROM target t CROSS JOIN unnest($2::uuid[]) AS selected(category_id)
          ON CONFLICT (category_id,game_id) DO NOTHING
          RETURNING category_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.display-categories-updated','admin',$3,'casino_game',t.id,'success',$5,
                 jsonb_build_object('categoryIds',to_jsonb($2::uuid[]),'sourceMode',t.source_mode),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS "gameId",
               ARRAY(SELECT m.category_id::text FROM public.casino_game_display_categories m WHERE m.game_id=t.id ORDER BY m.category_id) AS "categoryIds"
          FROM target t CROSS JOIN audited
      `,[gameId,categoryIds,session.principalId,auditId,request.id]);
      if (!saved.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:saved.rows[0],requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error,{operation:'skin_game_display_category_assignment'});
    }
  });

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
        conditions.push(`(g.title ILIKE ${pattern} ESCAPE E'\\\\' OR COALESCE((SELECT NULLIF(pres_search.title_override,'' ) FROM public.casino_game_presentation pres_search WHERE pres_search.game_id=g.id),g.title) ILIKE ${pattern} ESCAPE E'\\\\' OR p.name ILIKE ${pattern} ESCAPE E'\\\\' OR s.external_game_id::text ILIKE ${pattern})`);
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
        WITH tier_order AS MATERIALIZED (
          SELECT g_order.id,
                 row_number() OVER (
                   PARTITION BY s_order.source_mode
                   ORDER BY COALESCE(pres_order.display_order,0),lower(g_order.title),p_order.code,g_order.id
                 )::integer AS order_position,
                 count(*) OVER (PARTITION BY s_order.source_mode)::integer AS tier_total
            FROM public.casino_games g_order
            JOIN public.casino_providers p_order ON p_order.id=g_order.provider_id
            JOIN public.casino_game_sources s_order ON s_order.game_id=g_order.id AND s_order.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres_order ON pres_order.game_id=g_order.id
        )
        SELECT g.id::text AS id,g.game_slug AS slug,g.title,
               pres.title_override AS "titleOverride",
               tier_order.order_position AS "orderPosition",
               tier_order.tier_total AS "tierTotal",
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
               ARRAY(SELECT dgc.category_id::text FROM public.casino_game_display_categories dgc WHERE dgc.game_id=g.id ORDER BY dgc.category_id) AS "displayCategoryIds",
               GREATEST(g.availability_updated_at,COALESCE(pres.updated_at,'-infinity'::timestamptz),COALESCE(pres.order_updated_at,'-infinity'::timestamptz)) AS "updatedAt",
               COALESCE(pres_editor.display_name,order_editor.display_name,availability_editor.display_name) AS "updatedBy"
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          JOIN tier_order ON tier_order.id=g.id
          LEFT JOIN public.casino_provider_tier_settings pt ON pt.provider_id=p.id AND pt.source_code='bigbang' AND pt.source_mode=s.source_mode
          LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
          LEFT JOIN public.admin_users pres_editor ON pres_editor.id=pres.updated_by
          LEFT JOIN public.admin_users order_editor ON order_editor.id=pres.order_updated_by
          LEFT JOIN public.admin_users availability_editor ON availability_editor.id=g.availability_updated_by
         WHERE ${where}
         ORDER BY s.source_mode,COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
         LIMIT $${values.length+1} OFFSET $${values.length+2}
      `,pageValues);
      const settings = await database.query<{ selected_mode: string }>("SELECT selected_mode FROM public.casino_integration_settings WHERE source_code='bigbang'");
      const premiumAvailable = settings.rows[0]?.selected_mode === 'premium'; // migration 011 currently permits Standard only; stays false until a reviewed tier migration.
      reply.header('Cache-Control','no-store');
      return reply.code(200).send({
        data: rows.rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.titleOverride?.trim() || row.title,
          sourceTitle: row.title,
          titleOverride: row.titleOverride,
          orderPosition: Number(row.orderPosition),
          tierTotal: Number(row.tierTotal),
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
          displayCategoryIds: row.displayCategoryIds ?? [],
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
      return unexpected(request,reply,error);
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
          SELECT id,rank::numeric AS sort_key FROM ranked_without_moved
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
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.patch('/api/v1/admin/casino/skin-games/:gameId/order-position', {
    schema: {
      params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } },
      body: {
        type: 'object', additionalProperties: false, required: ['orderPosition'],
        properties: { orderPosition: { type: 'integer', minimum: 1, maximum: 100000 } },
      },
    },
  }, async (request,reply) => {
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      const {orderPosition}=request.body as {orderPosition:number};
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');

      const source=await database.query<{source_mode:Tier;tier_total:number}>(`
        SELECT s.source_mode,
               (SELECT count(*)::int FROM public.casino_game_sources all_sources
                 WHERE all_sources.source_code='bigbang' AND all_sources.source_mode=s.source_mode) AS tier_total
          FROM public.casino_game_sources s
         WHERE s.game_id=$1 AND s.source_code='bigbang'
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium') return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium ordering is locked until the Premium integration gate is approved');
      if(!Number.isInteger(orderPosition) || orderPosition<1 || orderPosition>Number(sourceRow.tier_total)) {
        return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','Order position must be between 1 and the number of games in the Standard tier ('+Number(sourceRow.tier_total)+')');
      }

      const auditId=randomUUID();
      const result=await database.query<QueryResultRow & {oldPosition:number;orderPosition:number;displayOrder:number}>(`
        WITH lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtext('bclick.skin-games.display-order'))
        ), tier_games AS MATERIALIZED (
          SELECT g.id,
                 row_number() OVER (
                   ORDER BY COALESCE(pres.display_order,0),lower(g.title),p.code,g.id
                 )::integer AS old_position
            FROM public.casino_games g
            JOIN public.casino_providers p ON p.id=g.provider_id
            JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode=$3
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
            CROSS JOIN lock
        ), target AS MATERIALIZED (
          SELECT id,old_position FROM tier_games WHERE id=$1
        ), reordered AS (
          SELECT ordered_game.id,
                 CASE
                   WHEN ordered_game.id=$1 THEN $2::integer
                   WHEN ordered_game.old_position < target.old_position AND ordered_game.old_position >= $2 THEN ordered_game.old_position+1
                   WHEN ordered_game.old_position > target.old_position AND ordered_game.old_position <= $2 THEN ordered_game.old_position-1
                   ELSE ordered_game.old_position
                 END AS new_position
            FROM tier_games ordered_game CROSS JOIN target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
        ), saved AS (
          INSERT INTO public.casino_game_presentation
            (game_id,display_order,order_updated_by,order_updated_at)
          SELECT id,(new_position*100)::bigint,$4,now() FROM reordered
          ON CONFLICT (game_id) DO UPDATE SET
            display_order=EXCLUDED.display_order,
            order_updated_by=EXCLUDED.order_updated_by,
            order_updated_at=now()
          RETURNING game_id,display_order
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $5,'casino.skin-games.position-changed','admin',$4,'casino_game_order',target.id,'success',$6,
                 jsonb_build_object('sourceMode',$3,'oldPosition',target.old_position,'newPosition',$2),now()
            FROM target
           WHERE $2 BETWEEN 1 AND (SELECT count(*)::integer FROM tier_games)
          RETURNING id
        )
        SELECT target.old_position AS "oldPosition",
               $2::integer AS "orderPosition",
               saved.display_order AS "displayOrder"
          FROM target JOIN saved ON saved.game_id=target.id CROSS JOIN audited
      `,[gameId,orderPosition,sourceRow.source_mode,session.principalId,auditId,request.id]);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,422,'ORDER_POSITION_OUT_OF_RANGE','The Standard tier changed while reordering. Refresh and retry with a valid position.');
      return reply.code(200).send({
        data:{gameId,oldPosition:Number(row.oldPosition),orderPosition:Number(row.orderPosition),displayOrder:Number(row.displayOrder)},
        requestId:request.id,
      });
    } catch(error) {
      return unexpected(request,reply,error);
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
          displayTitle: { type: 'string', maxLength: 120 },
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
      const body=request.body as {enabled?:boolean;description?:string;displayTitle?:string;clearCustomImage?:boolean};
      const changeEnabled=typeof body.enabled==='boolean';
      const changeDescription=typeof body.description==='string';
      const changeDisplayTitle=typeof body.displayTitle==='string';
      const clearCustomImage=body.clearCustomImage===true;
      if(!changeEnabled&&!changeDescription&&!changeDisplayTitle&&!clearCustomImage) return sendError(reply,request,400,'VALIDATION_ERROR','At least one supported field must change');
      const source=await database.query<{
        source_mode:string; enabled:boolean; source_available:boolean; catalog_available:boolean;
        provider_enabled:boolean; provider_tier_enabled:boolean;
      }>(`
        SELECT s.source_mode,g.bclick_enabled AS enabled,s.available AS source_available,
               g.available AS catalog_available,p.bclick_enabled AS provider_enabled,
               COALESCE(pt.enabled,false) AS provider_tier_enabled
          FROM public.casino_games g
          JOIN public.casino_providers p ON p.id=g.provider_id
          JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
          LEFT JOIN public.casino_provider_tier_settings pt
            ON pt.provider_id=p.id AND pt.source_code=s.source_code AND pt.source_mode=s.source_mode
         WHERE g.id=$1
      `,[gameId]);
      const sourceRow=source.rows[0];
      if(!sourceRow) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      if(sourceRow.source_mode==='premium' && (changeEnabled || changeDescription || changeDisplayTitle || clearCustomImage)) {
        return sendError(reply,request,409,'PREMIUM_NOT_AVAILABLE','Premium game availability and presentation are read-only until the Premium integration gate is approved and implemented');
      }
      if(body.enabled===true && (!sourceRow.source_available || !sourceRow.catalog_available || !sourceRow.provider_enabled || !sourceRow.provider_tier_enabled)) {
        return sendError(reply,request,409,'GAME_NOT_EFFECTIVELY_AVAILABLE','The source game, provider and source tier must all be available before enabling a game');
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
            (game_id,description_override,title_override,custom_image_key,display_order,updated_by,updated_at)
          SELECT t.id,
                 CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE NULL END,
                 CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE NULL END,
                 NULL,
                 COALESCE((SELECT display_order FROM public.casino_game_presentation WHERE game_id=t.id),0),
                 $6,now()
            FROM target t
           WHERE $3::boolean OR $5::boolean OR $9::boolean
          ON CONFLICT (game_id) DO UPDATE SET
            description_override=CASE WHEN $3::boolean THEN NULLIF(btrim($4::text),'') ELSE public.casino_game_presentation.description_override END,
            title_override=CASE WHEN $9::boolean THEN NULLIF(btrim($10::text),'') ELSE public.casino_game_presentation.title_override END,
            custom_image_key=CASE WHEN $5::boolean THEN NULL ELSE public.casino_game_presentation.custom_image_key END,
            updated_by=$6,updated_at=now()
          RETURNING game_id
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $7,'casino.skin-game.updated','admin',$6,'casino_game',t.id,'success',$8,
                 jsonb_build_object('slug',t.game_slug,'sourceMode',t.source_mode,
                   'enabledChanged',$2::boolean IS NOT NULL,'enabled',COALESCE($2::boolean,t.bclick_enabled),
                   'descriptionChanged',$3::boolean,'displayTitleChanged',$9::boolean,
                   'customImageCleared',$5::boolean),now()
            FROM target t
          RETURNING id
        )
        SELECT t.id::text AS id,t.game_slug AS slug,
               COALESCE(gc.enabled,t.bclick_enabled) AS enabled,
               COALESCE(gc."updatedAt",now()) AS "updatedAt"
          FROM target t LEFT JOIN game_change gc ON gc.id=t.id CROSS JOIN audited
      `,[gameId,changeEnabled?body.enabled:null,changeDescription,body.description??'',clearCustomImage,session.principalId,actionId,request.id,changeDisplayTitle,body.displayTitle??'']);
      const row=result.rows[0];
      if(!row) return sendError(reply,request,404,'NOT_FOUND','Canonical catalogue game UUID was not found');
      return reply.code(200).send({data:{id:row.id,slug:row.slug,enabled:row.enabled,updatedAt:new Date(row.updatedAt).toISOString()},requestId:request.id});
    } catch (error) {
      return unexpected(request,reply,error);
    }
  });

  app.post('/api/v1/admin/casino/skin-games/:gameId/image', {
    schema: { params: { type: 'object', additionalProperties: false, required: ['gameId'], properties: { gameId: { type: 'string', pattern: UUID.source } } } },
  }, async (request,reply) => {
    let filePath: string | null = null;
    let failureStage = 'authorize_admin';
    try {
      const session=await authorizedAdmin(database,request,reply,options,true);
      if(!session) return;
      const {gameId}=request.params as {gameId:string};
      failureStage = 'validate_image';
      if(!UUID.test(gameId)) return sendError(reply,request,400,'VALIDATION_ERROR','Game ID must be a canonical UUID');
      if(!Buffer.isBuffer(request.body) || request.body.length<16 || request.body.length>MAX_IMAGE_BYTES) {
        return sendError(reply,request,413,'IMAGE_SIZE_INVALID','Image must be a supported image no larger than 5 MiB');
      }
      const info=imageInfo(request.body);
      if(!info || requestImageType(request)!==info.contentType) {
        return sendError(reply,request,415,'IMAGE_TYPE_INVALID','Upload a valid PNG, JPEG or WebP image whose bytes match its Content-Type');
      }
      failureStage = 'lookup_game';
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
      failureStage = 'create_upload_directory';
      await mkdir(path.dirname(filePath),{recursive:true});
      failureStage = 'write_image_file';
      await writeFile(filePath,request.body,{flag:'wx',mode:0o640});
      const auditId=randomUUID();
      failureStage = 'persist_image_metadata_and_audit';
      const saved=await database.query<{game_id:string;custom_image_key:string}>(`
        WITH target AS MATERIALIZED (
          SELECT g.id,COALESCE(pres.display_order,0) AS display_order
            FROM public.casino_games g JOIN public.casino_game_sources s ON s.game_id=g.id AND s.source_code='bigbang'
            LEFT JOIN public.casino_game_presentation pres ON pres.game_id=g.id
           WHERE g.id=$1
        ), changed AS (
          INSERT INTO public.casino_game_presentation(game_id,custom_image_key,display_order,updated_by,updated_at)
          SELECT id,$2,display_order,$3,now() FROM target
          ON CONFLICT (game_id) DO UPDATE SET custom_image_key=EXCLUDED.custom_image_key,updated_by=$3,updated_at=now()
          RETURNING game_id,custom_image_key
        ), audited AS (
          INSERT INTO public.audit_events
            (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at)
          SELECT $4,'casino.skin-game.image-updated','admin',$3,'casino_game',changed.game_id,'success',$5,
                 jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'imageKey',changed.custom_image_key),now()
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
    } catch (error) {
      if(filePath) await unlink(filePath).catch(()=>undefined);
      return unexpected(request,reply,error,{ operation:'skin_game_image_upload',stage:failureStage });
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
      const normalizedGameId=gameId.toLowerCase();
      const normalizedFileName=fileName.toLowerCase();
      const imageKey='casino-games/'+normalizedGameId+'/'+normalizedFileName;
      const active=await database.query<{ game_id:string }>(`
        SELECT game_id::text AS game_id FROM public.casino_game_presentation
         WHERE game_id=$1 AND custom_image_key=$2
      `,[normalizedGameId,imageKey]);
      if(!active.rows[0]) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const filePath=path.resolve(safeRoot,normalizedGameId,normalizedFileName);
      if(!filePath.startsWith(safeRoot+path.sep)) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
      const metadata=await stat(filePath);
      if(!metadata.isFile() || metadata.size<16 || metadata.size>MAX_IMAGE_BYTES) return sendError(reply,request,404,'NOT_FOUND','Image was not found');
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
