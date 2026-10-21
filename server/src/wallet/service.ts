import type { SqlExecutor } from '../identity/repository.js';

interface DbRow extends Record<string, unknown> {}
export class WalletFault extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'WalletFault';
  }
}

export interface WalletStatementOptions {
  readonly currency: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly from?: string;
  readonly to?: string;
}

interface StatementCursor {
  readonly postedAt: string;
  readonly id: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_CURRENCIES = new Set(['TND', 'EUR', 'USD']);

export function formatMinorAmount(minorValue: string | bigint, decimalPlaces: number): string {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
    throw new WalletFault(500, 'CURRENCY_CONFIGURATION_INVALID', 'Currency precision is not configured safely');
  }
  const minor = typeof minorValue === 'bigint' ? minorValue : BigInt(minorValue);
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(decimalPlaces);
  const whole = absolute / scale;
  const fraction = absolute % scale;
  const sign = negative ? '-' : '';
  if (decimalPlaces === 0) return sign + whole.toString();
  return sign + whole.toString() + '.' + fraction.toString().padStart(decimalPlaces, '0');
}

function parseCursor(cursor: string | undefined): StatementCursor | null {
  if (cursor === undefined) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(decoded).toString('base64url') !== cursor) {
      throw new Error('Non-canonical cursor');
    }
    const value: unknown = JSON.parse(decoded);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid cursor shape');
    const record = value as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'id,postedAt') throw new Error('Invalid cursor fields');
    if (typeof record.id !== 'string' || !UUID_PATTERN.test(record.id)) throw new Error('Invalid cursor ID');
    if (typeof record.postedAt !== 'string') throw new Error('Invalid cursor timestamp');
    const date = new Date(record.postedAt);
    const microsecondUtc = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}Z$/.test(record.postedAt);
    const millisecondTimestamp = record.postedAt.replace(/(\\.\\d{3})\\d{3}Z$/, '$1Z');
    if (!microsecondUtc || !Number.isFinite(date.getTime()) || date.toISOString() !== millisecondTimestamp) {
      throw new Error('Invalid cursor timestamp');
    }
    return { postedAt: record.postedAt, id: record.id };
  } catch {
    throw new WalletFault(400, 'VALIDATION_ERROR', 'Statement cursor is invalid');
  }
}

function encodeCursor(value: StatementCursor): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function parseBoundary(value: string | undefined, label: string): string | null {
  if (value === undefined) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new WalletFault(400, 'VALIDATION_ERROR', label + ' must be a valid date-time');
  }
  // Keep the caller's offset and fractional-second precision for PostgreSQL.
  return value;
}

export class WalletReadService {
  constructor(private readonly database: SqlExecutor) {}

  private assertPlayerCurrency(settlementCurrency: unknown, requestedCurrency: string): void {
    if (!SUPPORTED_CURRENCIES.has(requestedCurrency) || settlementCurrency !== requestedCurrency) {
      // Do not disclose whether another currency account exists or whether another
      // player owns a wallet in that currency.
      throw new WalletFault(404, 'NOT_FOUND', 'Wallet not found');
    }
  }

  async getBalance(playerId: string, settlementCurrency: unknown, currency: string): Promise<Record<string, unknown>> {
    this.assertPlayerCurrency(settlementCurrency, currency);
    const result = await this.database.query<DbRow>(`
      SELECT c.code AS currency,
             c.decimal_places,
             count(wa.id) FILTER (WHERE wa.account_kind='player-available')::int AS available_accounts,
             count(wa.id) FILTER (WHERE wa.account_kind='held')::int AS held_accounts,
             COALESCE(sum(ab.balance_minor) FILTER (WHERE wa.account_kind='player-available'),0)::text AS available_minor,
             COALESCE(sum(ab.balance_minor) FILTER (WHERE wa.account_kind='held'),0)::text AS held_minor,
             COALESCE(max(ab.updated_at),now()) AS as_of
        FROM public.currencies c
        LEFT JOIN public.wallet_accounts wa
          ON wa.currency_code=c.code
         AND wa.player_id=$1
         AND wa.account_kind IN ('player-available','held')
        LEFT JOIN public.account_balances ab ON ab.wallet_account_id=wa.id
       WHERE c.code=$2
       GROUP BY c.code,c.decimal_places
    `, [playerId, currency]);
    const row = result.rows[0];
    if (!row || Number(row.available_accounts) !== 1 || Number(row.held_accounts) !== 1) {
      throw new WalletFault(404, 'NOT_FOUND', 'Wallet not found');
    }
    const places = Number(row.decimal_places);
    const availableMinor = BigInt(String(row.available_minor));
    const heldMinor = BigInt(String(row.held_minor));
    const totalMinor = availableMinor + heldMinor;
    return {
      currency: String(row.currency),
      balance: formatMinorAmount(totalMinor, places),
      available: formatMinorAmount(availableMinor, places),
      held: formatMinorAmount(heldMinor, places),
      bonusRestrictedBalance: null,
      asOf: new Date(String(row.as_of)).toISOString(),
    };
  }

  async getStatement(
    playerId: string,
    settlementCurrency: unknown,
    options: WalletStatementOptions,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    this.assertPlayerCurrency(settlementCurrency, options.currency);
    const from = parseBoundary(options.from, 'from');
    const to = parseBoundary(options.to, 'to');
    if (from && to && Date.parse(from) >= Date.parse(to)) {
      throw new WalletFault(400, 'VALIDATION_ERROR', 'from must be earlier than the exclusive to boundary');
    }
    const cursor = parseCursor(options.cursor);
    const result = await this.database.query<DbRow>(`
      WITH movements AS (
        SELECT jt.id,
               jt.movement_type,
               COALESCE(jt.reference,jt.source_id,jt.id::text) AS reference,
               jt.posted_at,
               c.code AS currency,
               c.decimal_places,
               sum(le.amount_minor)::text AS amount_minor
          FROM public.journal_transactions jt
          JOIN public.ledger_entries le ON le.journal_id=jt.id
          JOIN public.wallet_accounts wa ON wa.id=le.wallet_account_id
          JOIN public.currencies c ON c.code=le.currency_code
         WHERE wa.player_id=$1
           AND wa.currency_code=$2
           AND wa.account_kind IN ('player-available','held')
           AND ($3::timestamptz IS NULL OR jt.posted_at >= $3::timestamptz)
           AND ($4::timestamptz IS NULL OR jt.posted_at < $4::timestamptz)
         GROUP BY jt.id,jt.movement_type,jt.reference,jt.source_id,jt.posted_at,c.code,c.decimal_places
        HAVING sum(le.amount_minor) <> 0
      )
      SELECT id,movement_type,reference,posted_at,
             to_char(posted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_posted_at,
             currency,decimal_places,amount_minor
        FROM movements
       WHERE ($5::timestamptz IS NULL OR (posted_at,id) < ($5::timestamptz,$6::uuid))
       ORDER BY posted_at DESC,id DESC
       LIMIT $7
    `, [
      playerId,
      options.currency,
      from,
      to,
      cursor?.postedAt ?? null,
      cursor?.id ?? null,
      options.limit + 1,
    ]);

    const hasMore = result.rows.length > options.limit;
    const selected = result.rows.slice(0, options.limit);
    const data = selected.map((row) => ({
      id: String(row.id),
      type: String(row.movement_type),
      amount: formatMinorAmount(String(row.amount_minor), Number(row.decimal_places)),
      currency: String(row.currency),
      createdAt: new Date(String(row.posted_at)).toISOString(),
      status: 'posted',
      reference: String(row.reference),
      description: String(row.movement_type).replaceAll('_', ' '),
    }));
    const last = selected[selected.length - 1];
    const nextCursor = hasMore && last
      ? encodeCursor({ postedAt: String(last.cursor_posted_at), id: String(last.id) })
      : null;
    return {
      data,
      page: { nextCursor, pageSize: options.limit },
      requestId,
    };
  }
}
