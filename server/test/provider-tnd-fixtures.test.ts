import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

type BigBangVector = {
  request_headers: { 'Content-Type': string; 'X-Body-Signature': string };
  request_body: {
    username: string;
    amount: number;
    game: string;
    game_category: string;
    transaction_id: string;
    signature: string;
    [key: string]: unknown;
  };
  raw_body_signed: string;
};

type WinHouseVector = {
  username: string;
  amount: number;
  action: string;
  ticket_id: string;
  transaction_id: string;
  signature: string;
  [key: string]: unknown;
};

type ProviderFixture = {
  dummy_secret: string;
  bigbang_casino: {
    user_data_reply_expected: { username: string; balance: string; currency: string };
    '1_bet_debit': BigBangVector;
    '1_bet_debit_reply_expected': { status: string; balance: string };
    '2_win_credit': BigBangVector;
    '2_win_credit_reply_expected': { status: string; balance: string };
    '3_refuse_bet_reply': { http_status: number; body: { error: string } };
    rounding: string;
  };
  winhouse_sportsbook: {
    '1_bet_debit': WinHouseVector;
    '1_bet_debit_reply_expected': { balance: string };
    '2_win_credit': WinHouseVector;
    '2_win_credit_reply_expected': { balance: string };
    '3_stake_with_3_decimals': {
      request_stake: number;
      result: { Error: boolean; Message: string };
      note: string;
    };
    rounding: string;
  };
};

const fixturePath = fileURLToPath(new URL('./fixtures/tnd-wallet-provider-vectors.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as ProviderFixture;

function hmacSha256(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function decimalStringToMinorUnits(value: string | number): bigint {
  const text = String(value);
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text);
  assert.ok(match, `Expected a decimal with at most two fractional digits, received ${text}`);
  const sign = match[1] === '-' ? -1n : 1n;
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'));
  return sign * (BigInt(match[2]!) * 100n + fraction);
}

function verifyBigBangVector(vector: BigBangVector): void {
  const body = vector.request_body;
  const callbackMessage = [
    body.username,
    String(body.amount),
    body.game,
    body.game_category,
    body.transaction_id,
  ].join('');

  assert.equal(body.signature, hmacSha256(fixture.dummy_secret, callbackMessage));
  assert.equal(vector.raw_body_signed, JSON.stringify(body));
  assert.equal(
    vector.request_headers['X-Body-Signature'],
    hmacSha256(fixture.dummy_secret, vector.raw_body_signed),
  );
}

function verifyWinHouseVector(vector: WinHouseVector): void {
  const callbackMessage = [
    vector.username,
    String(vector.amount),
    vector.action,
    vector.ticket_id,
    vector.transaction_id,
  ].join('');

  assert.equal(vector.signature, hmacSha256(fixture.dummy_secret, callbackMessage));
}

test('support-issued BigBang TND bet and win vectors verify body and raw-body HMAC signatures', () => {
  const bigbang = fixture.bigbang_casino;
  verifyBigBangVector(bigbang['1_bet_debit']);
  verifyBigBangVector(bigbang['2_win_credit']);

  assert.equal(bigbang.user_data_reply_expected.currency, 'TND');
  const initial = decimalStringToMinorUnits(bigbang.user_data_reply_expected.balance);
  const bet = decimalStringToMinorUnits(bigbang['1_bet_debit'].request_body.amount);
  const win = decimalStringToMinorUnits(bigbang['2_win_credit'].request_body.amount);
  const afterBet = initial + bet;
  const afterWin = afterBet + win;

  assert.equal(afterBet, decimalStringToMinorUnits(bigbang['1_bet_debit_reply_expected'].balance));
  assert.equal(afterWin, decimalStringToMinorUnits(bigbang['2_win_credit_reply_expected'].balance));
  assert.equal(bigbang['1_bet_debit_reply_expected'].status, 'ok');
  assert.equal(bigbang['2_win_credit_reply_expected'].status, 'ok');
  assert.equal(bigbang['3_refuse_bet_reply'].http_status, 400);
  assert.equal(bigbang['3_refuse_bet_reply'].body.error, 'insufficient balance');
});

test('support-issued WinHouse TND bet and win vectors verify callback HMAC signatures', () => {
  const winhouse = fixture.winhouse_sportsbook;
  verifyWinHouseVector(winhouse['1_bet_debit']);
  verifyWinHouseVector(winhouse['2_win_credit']);

  const initial = decimalStringToMinorUnits('1250.00');
  const bet = decimalStringToMinorUnits(winhouse['1_bet_debit'].amount);
  const win = decimalStringToMinorUnits(winhouse['2_win_credit'].amount);
  const afterBet = initial + bet;
  const afterWin = afterBet + win;

  assert.equal(afterBet, decimalStringToMinorUnits(winhouse['1_bet_debit_reply_expected'].balance));
  assert.equal(afterWin, decimalStringToMinorUnits(winhouse['2_win_credit_reply_expected'].balance));
  assert.equal(winhouse['3_stake_with_3_decimals'].request_stake, 12.345);
  assert.equal(winhouse['3_stake_with_3_decimals'].result.Error, true);
  assert.equal(winhouse['3_stake_with_3_decimals'].result.Message, 'invalid_stake_precision');
  assert.match(winhouse['3_stake_with_3_decimals'].note, /nothing is debited/i);
});
