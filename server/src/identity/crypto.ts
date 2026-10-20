import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';

export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}

export function opaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function tokenHash(token: string, keyHex?: string): string {
  if (keyHex) return createHmac('sha256', Buffer.from(keyHex, 'hex')).update(token, 'utf8').digest('hex');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function deriveScrypt(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  // Local Phase 4 implementation only. Production startup is blocked until the
  // agreed Argon2id provider is pinned and wired through the workspace lockfile.
  const salt = randomBytes(16);
  const key = await deriveScrypt(password, salt, 64);
  return 'scrypt$16384$8$1$' + salt.toString('base64url') + '$' + key.toString('base64url');
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '16384' || parts[2] !== '8' || parts[3] !== '1') {
    const derived = await deriveScrypt(password, Buffer.alloc(16), 64);
    return timingSafeEqual(derived, Buffer.alloc(64)) && false;
  }
  try {
    const salt = Buffer.from(parts[4]!, 'base64url');
    const expected = Buffer.from(parts[5]!, 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = await deriveScrypt(password, salt, 64);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) throw new Error('TOTP encryption key must be 32 bytes');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(encoded: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const parts = encoded.split('.');
  if (key.length !== 32 || parts.length !== 3) throw new Error('Encrypted TOTP secret is malformed');
  const iv = Buffer.from(parts[0]!, 'base64url');
  const tag = Buffer.from(parts[1]!, 'base64url');
  const data = Buffer.from(parts[2]!, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid Base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function totpCode(secret: string, at = Date.now()): string {
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(at / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24)
    | ((digest[offset + 1]! & 0xff) << 16)
    | ((digest[offset + 2]! & 0xff) << 8)
    | (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret: string, candidate: string, at = Date.now()): boolean {
  if (!/^[0-9]{6}$/.test(candidate)) return false;
  let matched = false;
  for (const offset of [-30_000, 0, 30_000]) {
    const expected = Buffer.from(totpCode(secret, at + offset));
    const actual = Buffer.from(candidate);
    matched = (expected.length === actual.length && timingSafeEqual(expected, actual)) || matched;
  }
  return matched;
}

export function recoveryCode(): string {
  const hex = randomBytes(16).toString('hex').toUpperCase();
  return hex.slice(0, 8) + '-' + hex.slice(8, 16) + '-' + hex.slice(16, 24) + '-' + hex.slice(24);
}

export type CsrfContext = 'player' | 'admin' | 'enrollment';

export function createCsrfToken(context: CsrfContext, bindingId: string, version: number, secret: string): string {
  const nonce = opaqueToken(24);
  const payload = context + '|' + bindingId + '|' + version + '|' + nonce;
  const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(payload).digest('base64url');
  return 'v1.' + nonce + '.' + signature;
}

export function verifyCsrfToken(token: string, context: CsrfContext, bindingId: string, version: number, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || parts[1]!.length < 20 || parts[2]!.length !== 43) return false;
  const expected = createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(context + '|' + bindingId + '|' + version + '|' + parts[1])
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(parts[2]!, 'base64url');
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function allowExactOrigin(origin: string | undefined, allowlist: readonly string[]): boolean {
  if (!origin || origin === 'null' || origin.includes('*')) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && (parsed.protocol === 'http:' || parsed.protocol === 'https:') && allowlist.includes(origin);
  } catch {
    return false;
  }
}

export function buildCookie(name: string, value: string, options: {
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax';
} = {}): string {
  const parts = [name + '=' + value, 'Path=/', 'Secure', 'SameSite=' + (options.sameSite ?? 'Strict')];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.maxAge !== undefined) parts.push('Max-Age=' + String(Math.max(0, Math.floor(options.maxAge))));
  return parts.join('; ');
}
