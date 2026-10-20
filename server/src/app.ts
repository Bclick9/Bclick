import { randomUUID } from 'node:crypto';

import Fastify from 'fastify';

export interface DatabaseProbe {
  query(sql: string): Promise<unknown>;
}

export interface BuildAppOptions {
  database: DatabaseProbe | null;
  logLevel?: string;
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
    genReqId(request) {
      return requestIdFromHeader(request.headers['x-request-id']);
    },
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);

    const pathname = request.url.split('?', 1)[0] || '/';
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

  return app;
}
