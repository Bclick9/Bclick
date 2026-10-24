import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

export type WalletCurrencyCode = 'TND' | 'EUR' | 'USD';
export type WalletAccountKind =
  | 'player-available'
  | 'held'
  | 'bonus-restricted'
  | 'provider-clearing'
  | 'payment-clearing'
  | 'fx-clearing'
  | 'operator-bonus-clearing'
  | 'operator-equity';

export type WalletMovementType =
  | 'opening_balance'
  | 'wallet_adjustment'
  | 'internal_transfer'
  | 'deposit_confirmed'
  | 'deposit_refund'
  | 'withdrawal_hold'
  | 'withdrawal_settled'
  | 'withdrawal_released'
  | 'withdrawal_refund'
  | 'bet_debit'
  | 'bet_stake'
  | 'win_credit'
  | 'bet_refund'
  | 'bet_rollback'
  | 'provider_debit'
  | 'provider_credit'
  | 'provider_refund'
  | 'provider_rollback'
  | 'bonus_grant'
  | 'bonus_wagering_release'
  | 'bonus_expiry'
  | 'bonus_cancel'
  | 'bonus_forfeit'
  | 'bonus_win_credit'
  | 'fx_conversion';

export type WalletAuditActorType = 'player' | 'admin' | 'system';

export interface WalletPostingEntryInput {
  readonly walletAccountId: string;
  readonly currencyCode: WalletCurrencyCode;
  readonly amountMinor: bigint | string;
  readonly entrySequence: number;
}

export interface WalletPostingRequest {
  readonly movementType: WalletMovementType;
  readonly idempotencyScope: string;
  readonly idempotencyKey: string;
  readonly entries: readonly WalletPostingEntryInput[];
  readonly actorType: WalletAuditActorType;
  readonly actorId?: string | null;
  readonly requestId?: string;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly reference?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly reversalOfId?: string;
}

export interface WalletPostingEntry {
  readonly walletAccountId: string;
  readonly currencyCode: WalletCurrencyCode;
  readonly amountMinor: string;
  readonly entrySequence: number;
}

export interface WalletPostingResult {
  readonly journalId: string;
  readonly movementType: WalletMovementType;
  readonly reference: string | null;
  readonly postedAt: string;
  readonly entries: readonly WalletPostingEntry[];
  /** True when this call returned a previously committed journal for the same request digest. */
  readonly duplicate: boolean;
}

export interface WalletOperationContext {
  readonly idempotencyScope: string;
  readonly idempotencyKey: string;
  readonly actorType: WalletAuditActorType;
  readonly actorId?: string | null;
  readonly requestId?: string;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly reference?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface PlayerWalletOperation extends WalletOperationContext {
  readonly playerId: string;
  readonly currencyCode: WalletCurrencyCode;
  readonly amountMinor: bigint | string;
}

export interface SettleWalletOperation extends PlayerWalletOperation {
  /** Existing system payment-clearing account; this operation performs no external payment call. */
  readonly clearingAccountId: string;
}

export interface ReverseWalletOperation extends WalletOperationContext {
  readonly originalJournalId: string;
}

export class WalletPostingFault extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WalletPostingFault';
  }
}

const CURRENCIES = new Set<WalletCurrencyCode>(['TND', 'EUR', 'USD']);
const MOVEMENT_TYPES = new Set<WalletMovementType>([
  'opening_balance', 'wallet_adjustment', 'internal_transfer',
  'deposit_confirmed', 'deposit_refund',
  'withdrawal_hold', 'withdrawal_settled', 'withdrawal_released', 'withdrawal_refund',
  'bet_debit', 'bet_stake', 'win_credit', 'bet_refund', 'bet_rollback',
  'provider_debit', 'provider_credit', 'provider_refund', 'provider_rollback',
  'bonus_grant', 'bonus_wagering_release', 'bonus_expiry', 'bonus_cancel', 'bonus_forfeit', 'bonus_win_credit',
  'fx_conversion',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const MAX_BIGINT = 9_223_372_036_854_775_807n;
const MIN_BIGINT = -9_223_372_036_854_775_808n;
const MAX_METADATA_BYTES = 16 * 1024;
const SENSITIVE_METADATA_KEY = /secret|token|signature|password|credential|authorization|cookie|session|api[-_]?key/i;

interface NormalizedEntry {
  walletAccountId: string;
  currencyCode: WalletCurrencyCode;
  amountMinor: string;
  amount: bigint;
  entrySequence: number;
}

interface NormalizedRequest {
  movementType: WalletMovementType;
  idempotencyScope: string;
  idempotencyKey: string;
  requestDigest: string;
  entries: NormalizedEntry[];
  actorType: WalletAuditActorType;
  actorId: string | null;
  requestId: string;
  sourceType: string | null;
  sourceId: string | null;
  reference: string | null;
  metadata: Record<string, unknown>;
  reversalOfId: string | null;
}

interface ExistingJournalRow extends QueryResultRow {
  id: string;
  request_digest: string;
}

interface JournalRow extends QueryResultRow {
  id: string;
  movement_type: WalletMovementType;
  reference: string | null;
  posted_at: string | Date;
}

interface EntryRow extends QueryResultRow {
  wallet_account_id: string;
  currency_code: WalletCurrencyCode;
  amount_minor: string;
  entry_sequence: number;
}

interface AccountRow extends QueryResultRow {
  id: string;
  currency_code: WalletCurrencyCode;
  account_kind: WalletAccountKind;
  status: string;
}

function fail(status: number, code: string, message: string): never {
  throw new WalletPostingFault(status, code, message);
}

function requiredLabel(value: string, field: string, maxLength: number): string {
  if (typeof value !== 'string') fail(400, 'VALIDATION_ERROR', field + ' is invalid');
  const normalized = value.trim();
  if (
    normalized.length < 1
    || normalized.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    fail(400, 'VALIDATION_ERROR', field + ' is invalid');
  }
  return normalized;
}

function optionalLabel(value: string | undefined, field: string, maxLength: number): string | null {
  if (value === undefined) return null;
  return requiredLabel(value, field, maxLength);
}

function requireUuid(value: string, field: string): string {
  const normalized = requiredLabel(value, field, 64).toLowerCase();
  if (!UUID_PATTERN.test(normalized)) fail(400, 'VALIDATION_ERROR', field + ' is invalid');
  return normalized;
}

function parseMinorAmount(value: bigint | string): bigint {
  let parsed: bigint;
  try {
    if (typeof value === 'bigint') {
      parsed = value;
    } else if (typeof value === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value)) {
      parsed = BigInt(value);
    } else {
      fail(400, 'INVALID_MINOR_AMOUNT', 'Money must be provided as an integer minor-unit amount');
    }
  } catch (error) {
    if (error instanceof WalletPostingFault) throw error;
    return fail(400, 'INVALID_MINOR_AMOUNT', 'Money must be provided as an integer minor-unit amount');
  }
  if (parsed < MIN_BIGINT || parsed > MAX_BIGINT) {
    fail(400, 'INVALID_MINOR_AMOUNT', 'Minor-unit amount is outside the supported range');
  }
  if (parsed === 0n) fail(400, 'INVALID_MINOR_AMOUNT', 'Ledger entry amounts must not be zero');
  return parsed;
}

function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value) ?? 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(400, 'INVALID_METADATA', 'Metadata contains a non-finite number');
    return JSON.stringify(value) ?? 'null';
  }
  if (typeof value !== 'object') {
    fail(400, 'INVALID_METADATA', 'Metadata must contain only JSON values');
  }
  const objectValue = value as object;
  if (seen.has(objectValue)) fail(400, 'INVALID_METADATA', 'Metadata must not contain cycles');
  seen.add(objectValue);
  let result: string;
  if (Array.isArray(value)) {
    result = '[' + value.map((item) => canonicalJson(item, seen)).join(',') + ']';
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail(400, 'INVALID_METADATA', 'Metadata must contain plain JSON objects');
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    for (const key of keys) {
      if (record[key] === undefined) fail(400, 'INVALID_METADATA', 'Metadata must not contain undefined values');
    }
    result = '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalJson(record[key], seen)).join(',') + '}';
  }
  seen.delete(objectValue);
  return result;
}

function assertSafeMetadata(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertSafeMetadata(item);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_METADATA_KEY.test(key)) {
      fail(400, 'INVALID_METADATA', 'Metadata must not contain secret-bearing fields');
    }
    assertSafeMetadata(nestedValue);
  }
}

function normalizeRequest(request: WalletPostingRequest): NormalizedRequest {
  if (!MOVEMENT_TYPES.has(request.movementType)) {
    fail(400, 'INVALID_MOVEMENT_TYPE', 'Movement type is not supported by the wallet ledger');
  }
  const idempotencyScope = requiredLabel(request.idempotencyScope, 'idempotency scope', 128);
  const idempotencyKey = requiredLabel(request.idempotencyKey, 'idempotency key', 128);
  if (!['player', 'admin', 'system'].includes(request.actorType)) {
    fail(400, 'INVALID_AUDIT_ACTOR', 'Audit actor type is invalid');
  }
  const actorId = request.actorId == null ? null : requireUuid(request.actorId, 'actor ID');
  if (request.actorType !== 'system' && actorId === null) {
    fail(400, 'INVALID_AUDIT_ACTOR', 'Player and admin postings require an actor ID');
  }
  const requestId = request.requestId === undefined ? randomUUID() : requiredLabel(request.requestId, 'request ID', 128);
  if (!REQUEST_ID_PATTERN.test(requestId)) fail(400, 'VALIDATION_ERROR', 'Request ID is invalid');
  const sourceType = optionalLabel(request.sourceType, 'source type', 64);
  const sourceId = optionalLabel(request.sourceId, 'source ID', 255);
  const reference = optionalLabel(request.reference, 'reference', 255);
  const reversalOfId = request.reversalOfId === undefined ? null : requireUuid(request.reversalOfId, 'reversal journal ID');

  if (!Array.isArray(request.entries) || request.entries.length < 2 || request.entries.length > 200) {
    fail(400, 'INVALID_JOURNAL', 'A journal must contain between 2 and 200 entries');
  }
  const sequences = new Set<number>();
  const currencyTotals = new Map<WalletCurrencyCode, bigint>();
  const entries = request.entries.map((entry): NormalizedEntry => {
    const walletAccountId = requireUuid(entry.walletAccountId, 'wallet account ID');
    if (!CURRENCIES.has(entry.currencyCode)) {
      fail(400, 'INVALID_CURRENCY', 'Currency is not enabled for wallet posting');
    }
    if (!Number.isSafeInteger(entry.entrySequence) || entry.entrySequence < 1) {
      fail(400, 'INVALID_ENTRY_SEQUENCE', 'Ledger entry sequence must be a positive safe integer');
    }
    if (sequences.has(entry.entrySequence)) {
      fail(400, 'INVALID_ENTRY_SEQUENCE', 'Ledger entry sequences must be unique within a journal');
    }
    sequences.add(entry.entrySequence);
    const amount = parseMinorAmount(entry.amountMinor);
    currencyTotals.set(entry.currencyCode, (currencyTotals.get(entry.currencyCode) ?? 0n) + amount);
    return {
      walletAccountId,
      currencyCode: entry.currencyCode,
      amountMinor: amount.toString(),
      amount,
      entrySequence: entry.entrySequence,
    };
  }).sort((left, right) => left.entrySequence - right.entrySequence);

  for (const [currency, total] of currencyTotals) {
    if (total !== 0n) {
      fail(400, 'UNBALANCED_JOURNAL', 'Journal entries must balance independently for every currency');
    }
    if (!CURRENCIES.has(currency)) {
      fail(400, 'INVALID_CURRENCY', 'Currency is not enabled for wallet posting');
    }
  }

  const rawMetadata = request.metadata ?? {};
  if (rawMetadata === null || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    fail(400, 'INVALID_METADATA', 'Journal metadata must be a JSON object');
  }
  const canonicalMetadata = canonicalJson(rawMetadata);
  if (Buffer.byteLength(canonicalMetadata, 'utf8') > MAX_METADATA_BYTES) {
    fail(400, 'INVALID_METADATA', 'Journal metadata exceeds the 16 KiB limit');
  }
  const metadata = JSON.parse(canonicalMetadata) as Record<string, unknown>;
  assertSafeMetadata(metadata);
  const canonicalPayload = {
    movementType: request.movementType,
    sourceType,
    sourceId,
    reference,
    reversalOfId,
    actorType: request.actorType,
    actorId,
    metadata,
    entries: entries.map((entry) => ({
      walletAccountId: entry.walletAccountId,
      currencyCode: entry.currencyCode,
      amountMinor: entry.amountMinor,
      entrySequence: entry.entrySequence,
    })),
  };
  const requestDigest = createHash('sha256').update(canonicalJson(canonicalPayload)).digest('hex');

  return {
    movementType: request.movementType,
    idempotencyScope,
    idempotencyKey,
    requestDigest,
    entries,
    actorType: request.actorType,
    actorId,
    requestId,
    sourceType,
    sourceId,
    reference,
    metadata,
    reversalOfId,
  };
}

function databaseError(error: unknown): WalletPostingFault {
  if (error instanceof WalletPostingFault) return error;
  const record = (error !== null && typeof error === 'object') ? error as { message?: unknown; code?: unknown } : {};
  const message = typeof record.message === 'string' ? record.message : '';
  if (message.includes('WALLET_OVERDRAFT')) {
    return new WalletPostingFault(422, 'INSUFFICIENT_FUNDS', 'Wallet balance is insufficient');
  }
  if (
    message.includes('WALLET_JOURNAL_UNBALANCED')
    || message.includes('WALLET_JOURNAL_CLOSED')
    || message.includes('WALLET_PROJECTION_MISSING')
  ) {
    return new WalletPostingFault(500, 'LEDGER_INVARIANT_VIOLATION', 'Wallet ledger invariant rejected the posting');
  }
  if (record.code === '23503' || record.code === '22P02') {
    return new WalletPostingFault(404, 'WALLET_ACCOUNT_NOT_FOUND', 'Wallet account was not found');
  }
  return new WalletPostingFault(500, 'POSTING_FAILED', 'Wallet posting could not be completed');
}

async function existingByKey(
  client: PoolClient,
  idempotencyScope: string,
  idempotencyKey: string,
): Promise<ExistingJournalRow | null> {
  const result = await client.query<ExistingJournalRow>(
    'SELECT id,request_digest FROM public.journal_transactions WHERE idempotency_scope=$1 AND idempotency_key=$2',
    [idempotencyScope, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function assertDigestMatches(existing: ExistingJournalRow, requestDigest: string): void {
  if (existing.request_digest !== requestDigest) {
    fail(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was already used for a different request');
  }
}

async function loadJournalResult(
  client: PoolClient,
  journalId: string,
  duplicate: boolean,
): Promise<WalletPostingResult> {
  const journalResult = await client.query<JournalRow>(
    'SELECT id,movement_type,reference,posted_at FROM public.journal_transactions WHERE id=$1',
    [journalId],
  );
  const journal = journalResult.rows[0];
  if (!journal) fail(500, 'JOURNAL_NOT_FOUND', 'Posted journal could not be read back');
  const entriesResult = await client.query<EntryRow>(
    'SELECT wallet_account_id,currency_code,amount_minor::text AS amount_minor,entry_sequence FROM public.ledger_entries WHERE journal_id=$1 ORDER BY entry_sequence',
    [journalId],
  );
  return {
    journalId: journal.id,
    movementType: journal.movement_type,
    reference: journal.reference,
    postedAt: new Date(String(journal.posted_at)).toISOString(),
    entries: entriesResult.rows.map((entry) => ({
      walletAccountId: entry.wallet_account_id,
      currencyCode: entry.currency_code,
      amountMinor: entry.amount_minor,
      entrySequence: Number(entry.entry_sequence),
    })),
    duplicate,
  };
}

async function writeAudit(
  client: PoolClient,
  request: NormalizedRequest,
  journalId: string,
  action: 'wallet.journal.posted' | 'wallet.journal.replayed',
): Promise<void> {
  const currencies = [...new Set(request.entries.map((entry) => entry.currencyCode))].sort();
  await client.query(
    'INSERT INTO public.audit_events (id,action,actor_type,actor_id,subject_type,subject_id,outcome,request_id,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())',
    [
      randomUUID(),
      action,
      request.actorType,
      request.actorId,
      'wallet_journal',
      journalId,
      'success',
      request.requestId,
      JSON.stringify({
        movementType: request.movementType,
        idempotencyScope: request.idempotencyScope,
        requestDigest: request.requestDigest,
        entryCount: request.entries.length,
        currencies,
        reference: request.reference,
        reversalOfId: request.reversalOfId,
      }),
    ],
  );
}

const REVERSAL_MOVEMENT_TYPE: Partial<Record<WalletMovementType, WalletMovementType>> = {
  opening_balance: 'wallet_adjustment',
  wallet_adjustment: 'wallet_adjustment',
  internal_transfer: 'internal_transfer',
  deposit_confirmed: 'deposit_refund',
  deposit_refund: 'deposit_confirmed',
  withdrawal_hold: 'withdrawal_released',
  withdrawal_released: 'withdrawal_hold',
  withdrawal_settled: 'withdrawal_refund',
  withdrawal_refund: 'withdrawal_settled',
  bet_debit: 'bet_rollback',
  bet_stake: 'bet_rollback',
  bet_refund: 'bet_rollback',
  provider_debit: 'provider_rollback',
  provider_credit: 'provider_rollback',
  provider_refund: 'provider_rollback',
};

async function validateReversal(
  client: PoolClient,
  request: NormalizedRequest,
  originalJournalId: string,
): Promise<void> {
  const originalResult = await client.query<JournalRow>(
    'SELECT id,movement_type,reference,posted_at FROM public.journal_transactions WHERE id=$1',
    [originalJournalId],
  );
  const original = originalResult.rows[0];
  if (!original) fail(404, 'REVERSAL_ORIGINAL_NOT_FOUND', 'Journal to reverse was not found');
  const expectedMovementType = REVERSAL_MOVEMENT_TYPE[original.movement_type];
  if (expectedMovementType === undefined || request.movementType !== expectedMovementType) {
    fail(409, 'REVERSAL_TYPE_INVALID', 'The requested movement type is not the approved reversal type');
  }
  const originalEntriesResult = await client.query<EntryRow>(
    'SELECT wallet_account_id,currency_code,amount_minor::text AS amount_minor,entry_sequence FROM public.ledger_entries WHERE journal_id=$1 ORDER BY entry_sequence',
    [originalJournalId],
  );
  const originalEntries = originalEntriesResult.rows;
  if (originalEntries.length !== request.entries.length) {
    fail(409, 'REVERSAL_ENTRIES_MISMATCH', 'Reversal entries must exactly negate the original journal');
  }
  const expected = new Map(originalEntries.map((entry) => [
    Number(entry.entry_sequence),
    {
      walletAccountId: entry.wallet_account_id.toLowerCase(),
      currencyCode: entry.currency_code,
      amount: -BigInt(entry.amount_minor),
    },
  ]));
  for (const entry of request.entries) {
    const counterpart = expected.get(entry.entrySequence);
    if (
      !counterpart
      || counterpart.walletAccountId !== entry.walletAccountId
      || counterpart.currencyCode !== entry.currencyCode
      || counterpart.amount !== entry.amount
    ) {
      fail(409, 'REVERSAL_ENTRIES_MISMATCH', 'Reversal entries must exactly negate the original journal');
    }
  }
}

export class WalletPostingService {
  /**
   * SQL-only posting boundary. It intentionally accepts no HTTP/provider/payment
   * client, callback, or arbitrary transaction hook that could perform external
   * work while the PostgreSQL transaction is open.
   */
  constructor(private readonly pool: Pool) {}

  async post(request: WalletPostingRequest): Promise<WalletPostingResult> {
    const normalized = normalizeRequest(request);
    const client = await this.pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      let existing = await existingByKey(client, normalized.idempotencyScope, normalized.idempotencyKey);
      if (existing) {
        assertDigestMatches(existing, normalized.requestDigest);
        await writeAudit(client, normalized, existing.id, 'wallet.journal.replayed');
        const result = await loadJournalResult(client, existing.id, true);
        await client.query('COMMIT');
        committed = true;
        return result;
      }

      if (normalized.reversalOfId) {
        // Lock before inserting the referencing journal. This serializes competing
        // reversal attempts without taking a foreign-key lock first and deadlocking.
        const originalLock = await client.query(
          'SELECT id FROM public.journal_transactions WHERE id=$1 FOR UPDATE',
          [normalized.reversalOfId],
        );
        if (originalLock.rowCount !== 1) {
          fail(404, 'REVERSAL_ORIGINAL_NOT_FOUND', 'Journal to reverse was not found');
        }

        // A same-key attempt may have committed while this request waited for the
        // original-journal lock; prefer idempotent replay over a duplicate-reversal error.
        existing = await existingByKey(client, normalized.idempotencyScope, normalized.idempotencyKey);
        if (existing) {
          assertDigestMatches(existing, normalized.requestDigest);
          await writeAudit(client, normalized, existing.id, 'wallet.journal.replayed');
          const result = await loadJournalResult(client, existing.id, true);
          await client.query('COMMIT');
          committed = true;
          return result;
        }

        const alreadyReversed = await client.query(
          'SELECT id FROM public.journal_transactions WHERE reversal_of_id=$1 LIMIT 1',
          [normalized.reversalOfId],
        );
        if (alreadyReversed.rowCount) {
          fail(409, 'REVERSAL_ALREADY_POSTED', 'This journal already has a reversal');
        }
        await validateReversal(client, normalized, normalized.reversalOfId);
      }

      const inserted = await client.query<{ id: string }>(
        'INSERT INTO public.journal_transactions (movement_type,source_type,source_id,reference,idempotency_scope,idempotency_key,request_digest,reversal_of_id,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT (idempotency_scope,idempotency_key) DO NOTHING RETURNING id',
        [
          normalized.movementType,
          normalized.sourceType,
          normalized.sourceId,
          normalized.reference,
          normalized.idempotencyScope,
          normalized.idempotencyKey,
          normalized.requestDigest,
          normalized.reversalOfId,
          JSON.stringify(normalized.metadata),
        ],
      );
      const insertedJournal = inserted.rows[0];
      if (!insertedJournal) {
        existing = await existingByKey(client, normalized.idempotencyScope, normalized.idempotencyKey);
        if (!existing) fail(500, 'IDEMPOTENCY_LOOKUP_FAILED', 'Could not resolve idempotency key');
        assertDigestMatches(existing, normalized.requestDigest);
        await writeAudit(client, normalized, existing.id, 'wallet.journal.replayed');
        const result = await loadJournalResult(client, existing.id, true);
        await client.query('COMMIT');
        committed = true;
        return result;
      }

      const accountIds = [...new Set(normalized.entries.map((entry) => entry.walletAccountId))].sort();
      const accountsResult = await client.query<AccountRow>(
        'SELECT id,currency_code,account_kind,status FROM public.wallet_accounts WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',
        [accountIds],
      );
      const accounts = new Map(accountsResult.rows.map((account) => [account.id.toLowerCase(), account]));
      for (const entry of normalized.entries) {
        const account = accounts.get(entry.walletAccountId);
        if (!account) fail(404, 'WALLET_ACCOUNT_NOT_FOUND', 'Wallet account was not found');
        if (account.currency_code !== entry.currencyCode) {
          fail(409, 'ACCOUNT_CURRENCY_MISMATCH', 'Ledger entry currency does not match its wallet account');
        }
        if (account.status !== 'active') {
          fail(409, 'WALLET_ACCOUNT_NOT_ACTIVE', 'Wallet account is not active for posting');
        }
      }

      for (const entry of normalized.entries) {
        await client.query(
          'INSERT INTO public.ledger_entries (journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence) VALUES ($1,$2,$3,$4,$5)',
          [
            insertedJournal.id,
            entry.walletAccountId,
            entry.currencyCode,
            entry.amountMinor,
            entry.entrySequence,
          ],
        );
      }
      await writeAudit(client, normalized, insertedJournal.id, 'wallet.journal.posted');
      const result = await loadJournalResult(client, insertedJournal.id, false);
      await client.query('COMMIT');
      committed = true;
      return result;
    } catch (error) {
      if (!committed) await client.query('ROLLBACK').catch(() => undefined);
      throw databaseError(error);
    } finally {
      client.release();
    }
  }

  async reserve(request: PlayerWalletOperation): Promise<WalletPostingResult> {
    const amount = parsePositiveAmount(request.amountMinor);
    const accounts = await this.playerCashAccounts(request.playerId, request.currencyCode);
    return this.post({
      ...request,
      movementType: 'withdrawal_hold',
      entries: [
        { walletAccountId: accounts.available, currencyCode: request.currencyCode, amountMinor: -amount, entrySequence: 1 },
        { walletAccountId: accounts.held, currencyCode: request.currencyCode, amountMinor: amount, entrySequence: 2 },
      ],
      sourceType: request.sourceType ?? 'wallet-reservation',
    });
  }

  async release(request: PlayerWalletOperation): Promise<WalletPostingResult> {
    const amount = parsePositiveAmount(request.amountMinor);
    const accounts = await this.playerCashAccounts(request.playerId, request.currencyCode);
    return this.post({
      ...request,
      movementType: 'withdrawal_released',
      entries: [
        { walletAccountId: accounts.held, currencyCode: request.currencyCode, amountMinor: -amount, entrySequence: 1 },
        { walletAccountId: accounts.available, currencyCode: request.currencyCode, amountMinor: amount, entrySequence: 2 },
      ],
      sourceType: request.sourceType ?? 'wallet-release',
    });
  }

  async settle(request: SettleWalletOperation): Promise<WalletPostingResult> {
    const amount = parsePositiveAmount(request.amountMinor);
    const accounts = await this.playerCashAccounts(request.playerId, request.currencyCode);
    const clearingId = requireUuid(request.clearingAccountId, 'clearing account ID');
    const clearing = await this.pool.query<AccountRow>(
      'SELECT id,currency_code,account_kind,status FROM public.wallet_accounts WHERE id=$1',
      [clearingId],
    );
    const account = clearing.rows[0];
    if (!account || account.account_kind !== 'payment-clearing' || account.currency_code !== request.currencyCode) {
      fail(409, 'INVALID_SETTLEMENT_ACCOUNT', 'Settlement requires a payment-clearing account in the same currency');
    }
    return this.post({
      ...request,
      movementType: 'withdrawal_settled',
      entries: [
        { walletAccountId: accounts.held, currencyCode: request.currencyCode, amountMinor: -amount, entrySequence: 1 },
        { walletAccountId: clearingId, currencyCode: request.currencyCode, amountMinor: amount, entrySequence: 2 },
      ],
      sourceType: request.sourceType ?? 'wallet-settlement',
    });
  }

  async reverse(request: ReverseWalletOperation): Promise<WalletPostingResult> {
    const originalJournalId = requireUuid(request.originalJournalId, 'original journal ID');
    const originalResult = await this.pool.query<JournalRow>(
      'SELECT id,movement_type,reference,posted_at FROM public.journal_transactions WHERE id=$1',
      [originalJournalId],
    );
    const original = originalResult.rows[0];
    if (!original) fail(404, 'REVERSAL_ORIGINAL_NOT_FOUND', 'Journal to reverse was not found');
    const movementType = REVERSAL_MOVEMENT_TYPE[original.movement_type];
    if (!movementType) fail(409, 'REVERSAL_NOT_SUPPORTED', 'This movement type has no approved automatic reversal type');

    const originalEntries = await this.pool.query<EntryRow>(
      'SELECT wallet_account_id,currency_code,amount_minor::text AS amount_minor,entry_sequence FROM public.ledger_entries WHERE journal_id=$1 ORDER BY entry_sequence',
      [originalJournalId],
    );
    const metadata = {
      ...(request.metadata ?? {}),
      reversedJournalId: originalJournalId,
    };
    return this.post({
      ...request,
      movementType,
      reversalOfId: originalJournalId,
      sourceType: request.sourceType ?? 'wallet-reversal',
      sourceId: request.sourceId ?? originalJournalId,
      reference: request.reference ?? ('reverse-' + originalJournalId),
      metadata,
      entries: originalEntries.rows.map((entry) => ({
        walletAccountId: entry.wallet_account_id,
        currencyCode: entry.currency_code,
        amountMinor: (-BigInt(entry.amount_minor)).toString(),
        entrySequence: Number(entry.entry_sequence),
      })),
    });
  }

  private async playerCashAccounts(
    playerIdInput: string,
    currencyCode: WalletCurrencyCode,
  ): Promise<{ available: string; held: string }> {
    const playerId = requireUuid(playerIdInput, 'player ID');
    if (!CURRENCIES.has(currencyCode)) fail(400, 'INVALID_CURRENCY', 'Currency is not enabled for wallet posting');
    const result = await this.pool.query<AccountRow>(
      'SELECT id,currency_code,account_kind,status FROM public.wallet_accounts WHERE player_id=$1 AND currency_code=$2 AND account_kind IN (\'player-available\',\'held\') ORDER BY account_kind',
      [playerId, currencyCode],
    );
    const available = result.rows.filter((row) => row.account_kind === 'player-available');
    const held = result.rows.filter((row) => row.account_kind === 'held');
    if (available.length !== 1 || held.length !== 1) {
      fail(404, 'WALLET_NOT_FOUND', 'Wallet account was not found');
    }
    return { available: available[0]!.id, held: held[0]!.id };
  }
}

function parsePositiveAmount(value: bigint | string): bigint {
  const amount = parseMinorAmount(value);
  if (amount <= 0n) fail(400, 'INVALID_MINOR_AMOUNT', 'Wallet operation amount must be positive');
  return amount;
}
