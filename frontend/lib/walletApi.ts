export type WalletCurrency = 'TND' | 'EUR' | 'USD';

export interface WalletBalance {
  currency: WalletCurrency;
  balance: string;
  available: string;
  held: string;
  bonusRestrictedBalance: string | null;
  asOf: string;
}

export interface WalletStatementRow {
  id: string;
  type: string;
  amount: string;
  currency: WalletCurrency;
  createdAt: string;
  status: 'posted';
  reference: string;
  description: string;
}

export interface WalletStatementPage {
  data: WalletStatementRow[];
  page: {
    nextCursor: string | null;
    pageSize: number;
  };
  requestId: string;
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
  requestId?: string;
}

async function readWalletEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Wallet request failed (' + response.status + ').');
  }
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error('The Bclick API returned an invalid wallet response.');
  }
  return payload;
}

/** Same-origin, cookie-authenticated reads only. No wallet mutation is exposed here. */
export async function fetchWalletBalance(
  currency: WalletCurrency,
  signal: AbortSignal,
): Promise<WalletBalance> {
  const response = await fetch('/api/v1/wallets/' + encodeURIComponent(currency) + '/balance', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  const envelope = await readWalletEnvelope<WalletBalance>(response);
  if (!envelope.data) throw new Error('The Bclick API returned no wallet balance.');
  return envelope.data;
}

export async function fetchWalletStatementPage(
  currency: WalletCurrency,
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
): Promise<WalletStatementPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(
    '/api/v1/wallets/' + encodeURIComponent(currency) + '/statement?' + params.toString(),
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  const payload = await response.json().catch(() => null) as (ApiEnvelope<WalletStatementRow[]> & {
    page?: { nextCursor?: string | null; pageSize?: number };
  }) | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Wallet request failed (' + response.status + ').');
  }
  if (!payload || !Array.isArray(payload.data) || !payload.page) {
    throw new Error('The Bclick API returned an invalid wallet statement.');
  }
  return {
    data: payload.data,
    page: {
      nextCursor: typeof payload.page.nextCursor === 'string' ? payload.page.nextCursor : null,
      pageSize: typeof payload.page.pageSize === 'number' ? payload.page.pageSize : limit,
    },
    requestId: payload.requestId ?? '',
  };
}
