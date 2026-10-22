import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';

import type { SqlExecutor } from '../identity/repository.js';
import { BigBangApiClient } from './client.js';
import { BigBangApiError } from './types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_LAUNCHES = 10;

interface LaunchSourceRow extends QueryResultRow {
  external_game_id: string;
  source_mode: string;
  is_premium: boolean;
  source_available: boolean;
  game_available: boolean;
}

interface RateBucket {
  windowStartedAt: number;
  count: number;
}

function errorResponse(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  code: string,
  message: string,
) {
  return reply.code(status).send({ error: { code, message }, requestId: request.id });
}

function allowedOrigin(request: FastifyRequest, allowedOrigins: readonly string[]): boolean {
  const origin = request.headers.origin;
  return typeof origin === 'string' && allowedOrigins.includes(origin);
}

function makeRateLimiter() {
  const buckets = new Map<string, RateBucket>();
  return (ip: string, now = Date.now()): boolean => {
    let bucket = buckets.get(ip);
    if (!bucket || now - bucket.windowStartedAt >= RATE_WINDOW_MS) {
      bucket = { windowStartedAt: now, count: 0 };
      buckets.set(ip, bucket);
    }
    if (bucket.count >= RATE_MAX_LAUNCHES) return false;
    bucket.count += 1;
    // Bound memory if this local sandbox route receives a large number of unique IPs.
    if (buckets.size > 2_000) {
      for (const [key, value] of buckets) {
        if (now - value.windowStartedAt >= RATE_WINDOW_MS) buckets.delete(key);
      }
      if (buckets.size > 2_000) buckets.clear();
    }
    return true;
  };
}

/**
 * Local/Sandbox-only game launch. No player token, real mode, or wallet operation is exposed.
 * The provider game URL is issued server-side; the API key never leaves the server.
 */
export function registerSandboxDemoLaunchRoute(
  app: FastifyInstance,
  database: SqlExecutor,
  client: BigBangApiClient,
  allowedOrigins: readonly string[],
): void {
  const isWithinRateLimit = makeRateLimiter();

  app.post('/api/v1/casino/games/:gameId/demo-launch', {
    schema: {
      params: {
        type: 'object',
        additionalProperties: false,
        required: ['gameId'],
        properties: { gameId: { type: 'string', pattern: UUID_PATTERN.source } },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          language: { type: 'string', pattern: '^[a-z]{2}$', minLength: 2, maxLength: 2, default: 'en' },
        },
      },
    },
  }, async (request, reply) => {
    if (!allowedOrigin(request, allowedOrigins)) {
      return errorResponse(reply, request, 403, 'ORIGIN_INVALID', 'Request Origin is not allowed');
    }

    const { gameId } = request.params as { gameId: string };
    if (!UUID_PATTERN.test(gameId)) {
      return errorResponse(reply, request, 400, 'VALIDATION_ERROR', 'Game ID is invalid');
    }
    if (!isWithinRateLimit(request.ip)) {
      return errorResponse(reply, request, 429, 'DEMO_LAUNCH_RATE_LIMITED', 'Too many demo launches. Please wait and try again.');
    }

    let source: LaunchSourceRow | undefined;
    try {
      const result = await database.query<LaunchSourceRow>(`
        SELECT s.external_game_id::text AS external_game_id,
               s.source_mode,
               s.is_premium,
               s.available AS source_available,
               g.available AS game_available
          FROM public.casino_games g
          JOIN public.casino_game_sources s
            ON s.game_id=g.id AND s.source_code='bigbang' AND s.source_mode='standard'
         WHERE g.id=$1
         LIMIT 1
      `, [gameId]);
      source = result.rows[0];
    } catch {
      return errorResponse(reply, request, 503, 'CATALOGUE_UNAVAILABLE', 'The casino catalogue is temporarily unavailable.');
    }

    if (!source || !source.game_available || !source.source_available) {
      return errorResponse(reply, request, 404, 'GAME_NOT_AVAILABLE', 'This game is not currently available.');
    }
    if (source.source_mode !== 'standard' || source.is_premium) {
      return errorResponse(reply, request, 403, 'SANDBOX_GAME_NOT_ALLOWED', 'This game is not available in Sandbox demo mode.');
    }

    const providerGameId = Number(source.external_game_id);
    if (!Number.isSafeInteger(providerGameId) || providerGameId <= 0) {
      return errorResponse(reply, request, 503, 'CATALOGUE_SOURCE_INVALID', 'The game source is not configured correctly.');
    }

    const body = (request.body && typeof request.body === 'object' ? request.body : {}) as { language?: unknown };
    const language = typeof body.language === 'string' && /^[a-z]{2}$/.test(body.language) ? body.language : 'en';

    try {
      const launched = await client.launchDemoGame(providerGameId, language);
      reply.header('Cache-Control', 'no-store');
      return reply.code(200).send({
        data: {
          gameUrl: launched.gameUrl,
          gameName: launched.gameName,
          demo: true,
        },
        requestId: request.id,
      });
    } catch (error) {
      if (error instanceof BigBangApiError) {
        request.log.warn({ requestId: request.id, providerErrorCode: error.code }, 'BigBang Sandbox demo launch failed');
      } else {
        request.log.warn({ requestId: request.id }, 'BigBang Sandbox demo launch failed');
      }
      return errorResponse(reply, request, 502, 'DEMO_LAUNCH_UNAVAILABLE', 'Demo launch is temporarily unavailable. Please try again.');
    }
  });
}
