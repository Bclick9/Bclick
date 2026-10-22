import { randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import type { SqlExecutor } from '../identity/repository.js';
import { BigBangApiClient } from './client.js';
import { BigBangApiError, type BigBangGame } from './types.js';

export interface CatalogTransactionRepository extends SqlExecutor {
  transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
}

export interface CatalogSyncResult {
  readonly syncRunId: string;
  readonly receivedCount: number;
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly totalReported: number;
}

interface ExistingGameRow extends QueryResultRow {
  external_game_id: string;
  game_id: string;
  game_slug: string;
}

interface ProviderRow extends QueryResultRow {
  id: string;
  code: string;
}

export class CatalogSyncFault extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'CatalogSyncFault';
  }
}

export function slugify(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.slice(0, 120).replace(/-+$/g, '') || 'game';
}

function categoryFor(game: BigBangGame): string {
  if (game.gameType === 'slot') return 'slot-games';
  if (game.gameType === 'live') return 'live-casino';
  return 'crash-games';
}

function uniqueSlug(game: BigBangGame, used: Set<string>): string {
  const base = slugify(game.title + '-' + game.provider);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const suffix = '-bb-' + game.id;
  const candidate = slugify(base.slice(0, 120 - suffix.length) + suffix);
  if (used.has(candidate)) {
    throw new CatalogSyncFault('BIGBANG_SLUG_COLLISION', 'Catalogue contains multiple games that cannot be assigned a unique public slug');
  }
  used.add(candidate);
  return candidate;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    result.push(items.slice(offset, offset + size));
  }
  return result;
}

function valuesSql(rows: number, columns: number): string {
  let parameter = 1;
  return Array.from({ length: rows }, () => '(' + Array.from({ length: columns }, () => '$' + parameter++).join(',') + ')').join(',');
}

function safeErrorCode(error: unknown): string {
  if (error instanceof BigBangApiError || error instanceof CatalogSyncFault) return error.code;
  return 'CATALOG_SYNC_FAILED';
}

export class BigBangCatalogService {
  constructor(
    private readonly repository: CatalogTransactionRepository,
    private readonly client: BigBangApiClient,
  ) {}

  async sync(): Promise<CatalogSyncResult> {
    const runResult = await this.repository.query<{ id: string }>(`
      INSERT INTO public.casino_catalog_sync_runs(source_code,status)
      VALUES ('bigbang','running')
      RETURNING id
    `);
    const syncRunId = runResult.rows[0]?.id;
    if (!syncRunId) throw new CatalogSyncFault('SYNC_RUN_CREATE_FAILED', 'Could not record the catalogue sync run');

    try {
      // Fetch and validate the entire provider snapshot before opening the publish transaction.
      // A partial or malformed response never modifies the currently visible catalogue.
      const snapshot = await this.client.listAllStandardGames();
      if (!Number.isSafeInteger(snapshot.totalReported) || snapshot.totalReported < 0 || snapshot.games.length !== snapshot.totalReported) {
        throw new CatalogSyncFault('BIGBANG_SNAPSHOT_INCONSISTENT', 'The complete BigBang snapshot count does not match its reported total');
      }
      const counts = await this.repository.transaction(async (tx) => {
        await tx.query("SELECT pg_advisory_xact_lock(hashtext('bclick.bigbang.catalog-sync'))");

        const existingRows = await tx.query<ExistingGameRow>(`
          SELECT s.external_game_id::text AS external_game_id,
                 s.game_id::text AS game_id,
                 g.game_slug
            FROM public.casino_game_sources s
            JOIN public.casino_games g ON g.id=s.game_id
           WHERE s.source_code='bigbang'
        `);
        const existingByExternalId = new Map(existingRows.rows.map((row) => [Number(row.external_game_id), row]));
        if (snapshot.games.length === 0 && existingRows.rows.length > 0) {
          throw new CatalogSyncFault('BIGBANG_EMPTY_CATALOG_REJECTED', 'A zero-game response cannot replace a previously published non-empty catalogue');
        }

        const slugRows = await tx.query<{ game_slug: string }>('SELECT game_slug FROM public.casino_games');
        const usedSlugs = new Set(slugRows.rows.map((row) => row.game_slug));
        // BigBang documents that unfiltered catalogue responses can be shuffled. Sort by provider ID
        // before assigning first-time slug collision winners so a fresh sync is reproducible.
        const gamesInCanonicalOrder = [...snapshot.games].sort((left, right) => left.id - right.id);
        const providers = new Map<string, { name: string; id?: string }>();
        for (const game of gamesInCanonicalOrder) {
          const code = slugify(game.provider);
          const existingProvider = providers.get(code);
          if (existingProvider && existingProvider.name !== game.provider) {
            throw new CatalogSyncFault('BIGBANG_PROVIDER_CODE_COLLISION', 'Distinct provider names normalize to the same local provider code');
          }
          providers.set(code, { name: game.provider });
        }

        for (const [code, provider] of providers) {
          const result = await tx.query<ProviderRow>(`
            INSERT INTO public.casino_providers(code,name)
            VALUES ($1,$2)
            ON CONFLICT (code) DO UPDATE
              SET name=EXCLUDED.name,updated_at=now()
            RETURNING id::text AS id,code
          `, [code, provider.name]);
          const providerRow = result.rows[0];
          if (!providerRow) throw new CatalogSyncFault('BIGBANG_PROVIDER_PERSIST_FAILED', 'Could not persist a catalogue provider');
          providers.set(code, { name: provider.name, id: providerRow.id });
        }

        const prepared = gamesInCanonicalOrder.map((game) => {
          const code = slugify(game.provider);
          const provider = providers.get(code);
          if (!provider?.id) throw new CatalogSyncFault('BIGBANG_PROVIDER_MAPPING_FAILED', 'A catalogue provider mapping is missing');
          const existing = existingByExternalId.get(game.id);
          const id = existing?.game_id ?? randomUUID();
          const slug = existing?.game_slug ?? uniqueSlug(game, usedSlugs);
          return {
            game,
            id,
            slug,
            providerId: provider.id,
            category: categoryFor(game),
            wasExisting: Boolean(existing),
          };
        });

        for (const batch of chunks(prepared, 250)) {
          const params: unknown[] = [];
          for (const row of batch) {
            params.push(row.id,row.slug,row.game.title,row.providerId,row.game.thumbnail,row.game.gameType,true,false,false);
          }
          await tx.query(`
            INSERT INTO public.casino_games
              (id,game_slug,title,provider_id,image_url,game_type,available,demo_available,real_available)
            VALUES ${valuesSql(batch.length,9)}
            ON CONFLICT (id) DO UPDATE SET
              title=EXCLUDED.title,
              provider_id=EXCLUDED.provider_id,
              image_url=EXCLUDED.image_url,
              game_type=EXCLUDED.game_type,
              available=true,
              demo_available=false,
              real_available=false,
              updated_at=now()
          `, params);
        }

        for (const batch of chunks(prepared, 250)) {
          const params: unknown[] = [];
          for (const row of batch) {
            const game = row.game;
            params.push(
              row.id,'bigbang',game.id,game.name,game.provider,game.category,
              game.categoryTitle,game.mode,game.isPremium,game.isDemo,game.gameType,
            );
          }
          await tx.query(`
            INSERT INTO public.casino_game_sources
              (game_id,source_code,external_game_id,launch_name,source_provider_name,
               source_category,source_category_title,source_mode,is_premium,source_is_demo,game_type)
            VALUES ${valuesSql(batch.length,11)}
            ON CONFLICT (source_code,external_game_id) DO UPDATE SET
              game_id=EXCLUDED.game_id,
              launch_name=EXCLUDED.launch_name,
              source_provider_name=EXCLUDED.source_provider_name,
              source_category=EXCLUDED.source_category,
              source_category_title=EXCLUDED.source_category_title,
              source_mode=EXCLUDED.source_mode,
              is_premium=EXCLUDED.is_premium,
              source_is_demo=EXCLUDED.source_is_demo,
              game_type=EXCLUDED.game_type,
              available=true,
              last_synced_at=now(),
              updated_at=now()
          `, params);
        }

        const ids = gamesInCanonicalOrder.map((game) => game.id);
        await tx.query(`
          UPDATE public.casino_game_sources
             SET available=false,updated_at=now()
           WHERE source_code='bigbang'
             AND NOT (external_game_id = ANY($1::bigint[]))
        `, [ids]);

        await tx.query(`
          UPDATE public.casino_games g
             SET available=EXISTS (
               SELECT 1 FROM public.casino_game_sources s
                WHERE s.game_id=g.id AND s.available=true
             ), updated_at=now()
           WHERE EXISTS (
             SELECT 1 FROM public.casino_game_sources s
              WHERE s.game_id=g.id AND s.source_code='bigbang'
           )
        `);

        await tx.query(`
          DELETE FROM public.casino_game_categories
           WHERE game_id IN (SELECT game_id FROM public.casino_game_sources WHERE source_code='bigbang')
        `);
        for (const batch of chunks(prepared, 500)) {
          const params: unknown[] = [];
          for (const row of batch) params.push(row.id,row.category);
          if (batch.length > 0) {
            await tx.query(`
              INSERT INTO public.casino_game_categories(game_id,category_slug)
              VALUES ${valuesSql(batch.length,2)}
              ON CONFLICT (game_id,category_slug) DO NOTHING
            `, params);
          }
        }

        const createdCount = prepared.filter((row) => !row.wasExisting).length;
        const updatedCount = prepared.length - createdCount;
        await tx.query(`
          UPDATE public.casino_catalog_sync_runs
             SET status='succeeded',completed_at=now(),total_reported=$2,
                 received_count=$3,created_count=$4,updated_count=$5,error_code=NULL
           WHERE id=$1
        `, [syncRunId,snapshot.totalReported,snapshot.games.length,createdCount,updatedCount]);
        return { createdCount, updatedCount };
      });

      return {
        syncRunId,
        receivedCount: snapshot.games.length,
        createdCount: counts.createdCount,
        updatedCount: counts.updatedCount,
        totalReported: snapshot.totalReported,
      };
    } catch (error) {
      await this.repository.query(`
        UPDATE public.casino_catalog_sync_runs
           SET status='failed',completed_at=now(),error_code=$2
         WHERE id=$1 AND status='running'
      `, [syncRunId,safeErrorCode(error)]).catch(() => undefined);
      if (error instanceof BigBangApiError || error instanceof CatalogSyncFault) throw error;
      throw new CatalogSyncFault('CATALOG_SYNC_FAILED', 'Catalogue sync failed; the last published catalogue was preserved');
    }
  }
}
