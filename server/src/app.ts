import { randomUUID } from 'node:crypto';
import path from 'node:path';

import Fastify from 'fastify';
import type { FastifyError } from 'fastify';

import { registerIdentityRoutes } from './identity/routes.js';
import type { IdentityConfig } from './identity/config.js';
import { IdentityService } from './identity/service.js';
import type { SqlExecutor } from './identity/repository.js';
import { registerCasinoCatalogRoutes } from './bigbang/routes.js';
import { registerBigBangAdminRoutes } from './bigbang/admin-routes.js';
import { registerSkinGamesAdminRoutes } from './bigbang/skin-games-admin-routes.js';
import { registerSandboxDemoLaunchRoute } from './bigbang/demo-launch.js';
import type { BigBangApiClient } from './bigbang/client.js';

export interface DatabaseProbe {
  query(sql: string): Promise<unknown>;
}

export interface BuildAppOptions {
  database: DatabaseProbe | null;
  logLevel?: string;
  identity?: IdentityService | null;
  identityConfig?: IdentityConfig | null;
  /** Enables the local-database-only casino catalogue routes when the schema is installed. */
  catalogDatabase?: SqlExecutor | null;
  /** Enables the local BigBang Sandbox demo-only launch route; never accepts live keys. */
  sandboxDemoClient?: BigBangApiClient | null;
  /** Persistent local/VPS asset volume. Override with BCLICK_UPLOAD_DIR in shared deployments. */
  uploadDirectory?: string;
}

const healthResponseSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['ok', 'not_ready'] },
  },
  additionalProperties: false,
};

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function requestIdFromHeader(header: unknown): string {
  if (typeof header === 'string' && requestIdPattern.test(header)) {
    return header;
  }
  return randomUUID();
}

export function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    ajv: {
      // Do not silently strip undeclared input properties: additionalProperties:false
      // must reject contract violations so they reach the safe VALIDATION_ERROR handler.
      customOptions: { removeAdditional: false },
    },
    logger: {
      level: options.logLevel ?? 'info',
      serializers: {
        req(request: { method: string; url: string; hostname: string; ip: string }) {
          // Never put query strings (which may carry provider tokens) in logs.
          const path = request.url.split('?', 1)[0] || '/';
          return {
            method: request.method,
            url: path,
            host: request.hostname,
            remoteAddress: request.ip,
          };
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.headers["x-callback-token"]',
        ],
        censor: '[REDACTED]',
      },
    },
    routerOptions: {
      // Align the router limit with the longest explicitly supported path parameter
      // (casino game slug: 120) while keeping a strict upper bound.
      maxParamLength: 120,
      onMaxParamLength(_path, request, response) {
        // This callback runs before Fastify decorates the request/reply objects.
        // Never echo the overlong path segment to the client or logs.
        const requestId = requestIdFromHeader(request.headers['x-request-id']);
        response.statusCode = 414;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('X-Request-Id', requestId);
        response.end(JSON.stringify({
          error: { code: 'URI_TOO_LONG', message: 'Request parameter is too long' },
          requestId,
        }));
      },
    },
    genReqId(request) {
      return requestIdFromHeader(request.headers['x-request-id']);
    },
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);

    const pathname = request.url.split('?', 1)[0] || '/';
    const isPrivateReadOrLogin =
      (request.method === 'POST' && pathname === '/api/v1/auth/login')
      || (request.method === 'GET' && (
        pathname === '/api/v1/auth/session'
        || pathname === '/api/v1/admin/session'
        || /^\\/api\\/v1\\/wallets\\/[^/]+\\/(?:balance|statement)$/.test(pathname)
      ));

    // Set this before route/schema validation so authenticated/session/financial
    // success and error responses are consistently non-cacheable.
    if (isPrivateReadOrLogin) reply.header('Cache-Control', 'no-store');

    const isHealthPath =
      pathname === '/api/v1/health/live' || pathname === '/api/v1/health/ready';

    // Run before content-type parsing so an unknown method consistently receives 405.
    if (isHealthPath && request.method !== 'GET' && request.method !== 'HEAD') {
      reply.header('Allow', 'GET, HEAD');
      return reply.code(405).send({
        statusCode: 405,
        error: 'Method Not Allowed',
        message: 'Method not allowed',
      });
    }
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const isRequestValidationError = Boolean(error.validation);
    const statusCode = isRequestValidationError
      ? 400
      : typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;
    const code = isRequestValidationError
      ? 'VALIDATION_ERROR'
      : statusCode >= 500
        ? 'INTERNAL_ERROR'
        : 'REQUEST_REJECTED';
    const message = isRequestValidationError
      ? 'Request validation failed'
      : statusCode >= 500
        ? 'The request could not be completed'
        : 'Request could not be processed';

    // Never return framework validation details or untrusted input values to clients.
    if (statusCode >= 500) {
      request.log.error({ requestId: request.id, code: error.code }, 'Unhandled request error');
    } else {
      request.log.debug({ requestId: request.id, code }, 'Request rejected');
    }

    return reply.code(statusCode).send({
      error: { code, message },
      requestId: request.id,
    });
  });

  app.get(
    '/api/v1/health/live',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({ status: 'ok' }),
  );

  app.get(
    '/api/v1/health/ready',
    {
      schema: {
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        if (!options.database) {
          throw new Error('Database probe is not configured');
        }
        await options.database.query('SELECT 1');
        return { status: 'ok' };
      } catch {
        // Only a safe state is returned; database diagnostics never go to clients.
        app.log.warn({ requestId: request.id }, 'Readiness check failed');
        reply.code(503);
        return { status: 'not_ready' };
      }
    },
  );

  app.setNotFoundHandler(async (request, reply) => {
    const pathname = request.url.split('?', 1)[0] || '/';
    const isHealthPath =
      pathname === '/api/v1/health/live' || pathname === '/api/v1/health/ready';

    if (isHealthPath && request.method !== 'GET' && request.method !== 'HEAD') {
      reply.header('Allow', 'GET, HEAD');
      return reply.code(405).send({
        statusCode: 405,
        error: 'Method Not Allowed',
        message: 'Method not allowed',
      });
    }

    return reply.code(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Route not found',
    });
  });

  if (options.identity && options.identityConfig) {
    registerIdentityRoutes(app, options.identity, options.identityConfig);
  }
  if (options.catalogDatabase) {
    registerCasinoCatalogRoutes(app, options.catalogDatabase);
    if (options.identity && options.identityConfig) {
      registerBigBangAdminRoutes(app, options.catalogDatabase, { service: options.identity, config: options.identityConfig });
      registerSkinGamesAdminRoutes(app, options.catalogDatabase, {
        service: options.identity,
        config: options.identityConfig,
        uploadDirectory: path.resolve(options.uploadDirectory ?? process.env.BCLICK_UPLOAD_DIR ?? path.resolve(process.cwd(), '.local/uploads')),
      });
    }
    if (options.sandboxDemoClient && options.identityConfig) {
      registerSandboxDemoLaunchRoute(app, options.catalogDatabase, options.sandboxDemoClient, options.identityConfig.playerOrigins);
    }
  }

  return app;
}
