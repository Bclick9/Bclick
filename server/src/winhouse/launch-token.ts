import { createHmac } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60_000;
const MAX_TTL_MS = 10 * 60_000;
const TOKEN_FIELD_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export interface CreateWinHouseLaunchTokenInput {
  /** Bclick's stable, opaque external player identifier; never an email address. */
  readonly playerId: string;
  /** The currently authenticated Bclick player-session ID, used to bind provider calls to that login. */
  readonly sessionId: string;
  /** Server-only WinHouse wallet API key. Never serialize or log this value. */
  readonly walletApiKey: string;
  /** Injectable for deterministic tests; production callers should omit it. */
  readonly nowEpochMs?: number;
  /** Defaults to five minutes; the current WinHouse contract caps this at ten minutes. */
  readonly ttlMs?: number;
}

export interface WinHouseLaunchToken {
  readonly launch: string;
  readonly expiresAtEpochMs: number;
  readonly expiresAt: string;
}

/**
 * Build a WinHouse Model B launch token.
 *
 * Current public contract:
 *   launch = player_id.expiry.session.signature
 *   signature = HMAC-SHA256(player_id + "|" + expiry + "|" + session, wallet_api_key).hex
 *
 * This function only signs the supplied identities. Its caller must first resolve an
 * active, authenticated Bclick player session and must keep walletApiKey server-side.
 * It deliberately does not expose an HTTP route or enable the provider wallet.
 */
export function createWinHouseLaunchToken(input: CreateWinHouseLaunchTokenInput): WinHouseLaunchToken {
  const { playerId, sessionId, walletApiKey } = input;

  if (typeof playerId !== 'string' || !TOKEN_FIELD_PATTERN.test(playerId) || playerId.includes('.')) {
    throw new Error('WinHouse player ID must be a stable token-safe identifier');
  }
  if (typeof sessionId !== 'string' || !TOKEN_FIELD_PATTERN.test(sessionId) || sessionId.includes('.')) {
    throw new Error('WinHouse session ID must be a non-empty token-safe identifier');
  }
  if (typeof walletApiKey !== 'string' || walletApiKey.length === 0 || /[\r\n\0]/.test(walletApiKey)) {
    throw new Error('WINHOUSE_WALLET_API_KEY is required as a server-side secret');
  }

  const nowEpochMs = input.nowEpochMs ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0) {
    throw new Error('WinHouse token creation time must be a non-negative epoch-millisecond integer');
  }
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TTL_MS) {
    throw new Error('WinHouse token TTL must be between 1 ms and 10 minutes');
  }

  const expiresAtEpochMs = nowEpochMs + ttlMs;
  if (!Number.isSafeInteger(expiresAtEpochMs)) {
    throw new Error('WinHouse token expiry is outside the safe integer range');
  }
  const signingPayload = `${playerId}|${expiresAtEpochMs}|${sessionId}`;
  const signature = createHmac('sha256', walletApiKey).update(signingPayload, 'utf8').digest('hex');

  return {
    launch: `${playerId}.${expiresAtEpochMs}.${sessionId}.${signature}`,
    expiresAtEpochMs,
    expiresAt: new Date(expiresAtEpochMs).toISOString(),
  };
}
