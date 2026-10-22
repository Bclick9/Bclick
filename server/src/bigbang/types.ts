export type BigBangGameType = 'slot' | 'live' | 'crash';
export type BigBangMode = 'standard' | 'premium';

export interface BigBangGame {
  readonly id: number;
  readonly name: string;
  readonly title: string;
  readonly provider: string;
  readonly category: string;
  readonly categoryTitle: string;
  readonly thumbnail: string | null;
  readonly mode: BigBangMode;
  readonly isPremium: boolean;
  readonly gameType: BigBangGameType;
  readonly isDemo: boolean;
}

export interface BigBangCatalogSnapshot {
  readonly games: readonly BigBangGame[];
  readonly totalReported: number;
}

export class BigBangApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'BigBangApiError';
  }
}
