export const CURRENCY_EXPONENTS = {
  TND: 3,
  EUR: 2,
  USD: 2,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS;

const DECIMAL_PATTERN = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?$/;

export function currencyExponent(currency: CurrencyCode): number {
  const exponent = CURRENCY_EXPONENTS[currency];
  if (exponent === undefined) {
    throw new Error('Unsupported currency');
  }
  return exponent;
}

/**
 * Converts an exact decimal string to integer minor units.
 * The parser intentionally rejects Number inputs, exponent notation, rounding,
 * and fractional precision beyond the configured currency exponent.
 */
export function parseDecimalToMinorUnits(
  value: string,
  currency: CurrencyCode,
): bigint {
  if (typeof value !== 'string') {
    throw new TypeError('Money values must be supplied as decimal strings');
  }

  const exponent = currencyExponent(currency);
  const match = DECIMAL_PATTERN.exec(value);
  if (!match) {
    throw new Error('Amount must be a plain decimal string');
  }

  const sign = match[1];
  const whole = match[2];
  const fraction = match[3] ?? '';
  if (sign === undefined || whole === undefined) {
    throw new Error('Amount must be a plain decimal string');
  }
  if (fraction.length > exponent) {
    throw new Error(`Amount has more than ${exponent} fractional digits for ${currency}`);
  }

  const scale = 10n ** BigInt(exponent);
  const fractionalMinor = fraction.length > 0
    ? BigInt(fraction.padEnd(exponent, '0'))
    : 0n;
  const magnitude = BigInt(whole) * scale + fractionalMinor;

  return sign === '-' ? -magnitude : magnitude;
}

/**
 * Formats integer minor units as a canonical decimal string with the complete
 * currency scale. This is serialization, not localized display formatting.
 */
export function formatMinorUnits(
  amountMinor: bigint,
  currency: CurrencyCode,
): string {
  const exponent = currencyExponent(currency);
  const negative = amountMinor < 0n;
  const magnitude = negative ? -amountMinor : amountMinor;

  if (exponent === 0) return `${negative ? '-' : ''}${magnitude.toString()}`;

  const padded = magnitude.toString().padStart(exponent + 1, '0');
  const split = padded.length - exponent;
  const whole = padded.slice(0, split);
  const fraction = padded.slice(split);

  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function addMinorUnits(left: bigint, right: bigint): bigint {
  return left + right;
}

export function compareMinorUnits(left: bigint, right: bigint): -1 | 0 | 1 {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
