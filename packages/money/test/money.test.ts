import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addMinorUnits,
  compareMinorUnits,
  formatMinorUnits,
  parseDecimalToMinorUnits,
} from '../src/index.ts';

test('parses and formats the currency precision defined by the platform contract', () => {
  assert.equal(parseDecimalToMinorUnits('12.34', 'TND'), 1234n);
  assert.equal(parseDecimalToMinorUnits('12.34', 'EUR'), 1234n);
  assert.equal(parseDecimalToMinorUnits('12.34', 'USD'), 1234n);

  assert.equal(formatMinorUnits(1234n, 'TND'), '12.34');
  assert.equal(formatMinorUnits(1234n, 'EUR'), '12.34');
  assert.equal(formatMinorUnits(-1n, 'TND'), '-0.01');
});

test('rejects extra precision rather than rounding or truncating', () => {
  assert.throws(
    () => parseDecimalToMinorUnits('1.001', 'TND'),
    /more than 2 fractional digits/,
  );
  assert.throws(
    () => parseDecimalToMinorUnits('1.001', 'EUR'),
    /more than 2 fractional digits/,
  );
});

test('rejects binary-number-style and ambiguous string formats', () => {
  for (const value of ['1e3', '+1.00', ' 1.00', '01.00', '1.', '', 'NaN']) {
    assert.throws(() => parseDecimalToMinorUnits(value, 'EUR'), undefined, value);
  }
  assert.throws(
    () => parseDecimalToMinorUnits(1.25 as unknown as string, 'EUR'),
    /decimal strings/,
  );
});

test('uses bigint-safe arithmetic and comparisons', () => {
  const large = 9_007_199_254_740_993n;
  assert.equal(addMinorUnits(large, 10n), 9_007_199_254_741_003n);
  assert.equal(compareMinorUnits(1n, 2n), -1);
  assert.equal(compareMinorUnits(2n, 2n), 0);
  assert.equal(compareMinorUnits(3n, 2n), 1);
});
