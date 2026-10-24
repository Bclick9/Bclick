import type { FastifyInstance } from 'fastify';

/**
 * These are deliberately non-operational placeholders. The environment feature flag
 * rejects requests earlier while closed; even if a local operator sets it true, no
 * payment intent, ledger posting, provider call, or withdrawal hold is created.
 */
export function registerWalletPaymentRoutes(app: FastifyInstance): void {
  const notReady = async (request: { id: string }, reply: {
    header(name: string, value: string): unknown;
    code(statusCode: number): { send(payload: unknown): unknown };
  }) => {
    reply.header('Cache-Control', 'no-store');
    return reply.code(503).send({
      error: {
        code: 'WALLET_API_NOT_READY',
        message: 'Wallet payment operations are unavailable until the payment service and release gates are accepted',
      },
      requestId: request.id,
    });
  };

  // Intentionally no request-body schema here: while closed, the onRequest guard
  // must return 503 before parsing/validation. With the local flag true, these
  // placeholders still return 503 and must never mutate financial state.
  app.post('/api/v1/payments/deposits', notReady);
  app.post('/api/v1/payments/withdrawals', notReady);
}
