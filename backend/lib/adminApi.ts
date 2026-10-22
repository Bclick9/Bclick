export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

type ErrorEnvelope = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

export async function requestAdminApi<T>(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetcher(path, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (response.status === 204) {
    if (!response.ok) {
      throw new AdminApiError(response.status, 'REQUEST_FAILED', 'The request could not be completed.');
    }
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = payload as ErrorEnvelope | null;
    const code = typeof envelope?.error?.code === 'string' ? envelope.error.code : 'REQUEST_FAILED';
    const message = typeof envelope?.error?.message === 'string'
      ? envelope.error.message
      : 'The request could not be completed (HTTP ' + response.status + ').';
    throw new AdminApiError(response.status, code, message);
  }

  return payload as T;
}

export function readCookie(name: string, cookieHeader?: string): string | null {
  const source = cookieHeader ?? (typeof document === 'undefined' ? '' : document.cookie);
  const prefix = name + '=';
  for (const part of source.split(';')) {
    const item = part.trim();
    if (!item.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(item.slice(prefix.length));
    } catch {
      return item.slice(prefix.length);
    }
  }
  return null;
}

export function getAdminCsrfHeaders(cookieName = '__Host-bclick_admin_csrf'): Record<string, string> {
  const token = readCookie(cookieName);
  if (!token) {
    throw new Error('The administrator CSRF cookie is unavailable. Reload the page and sign in again before retrying.');
  }
  return { 'X-CSRF-Token': token };
}
