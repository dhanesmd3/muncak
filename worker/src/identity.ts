// Identity without login (docs/05-teknis.md §10.1). The raw device id is never stored or
// logged: member_id = HMAC(DEVICE_SECRET, deviceId), device_hash = HMAC(daily salt, deviceId).
import type { D1Database } from './env';
import { HttpError } from './http';

export const DEVICE_HEADER = 'x-muncak-device';
const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** The device id from the request header, or null when absent/invalid. */
export function deviceIdOf(request: Request): string | null {
  const id = request.headers.get(DEVICE_HEADER);
  return id && DEVICE_ID.test(id) ? id : null;
}

export function requireDevice(request: Request): string {
  const id = deviceIdOf(request);
  if (!id) throw new HttpError(400, 'device_required');
  return id;
}

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}

export function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

export function memberId(secret: string, deviceId: string): Promise<string> {
  if (!secret) throw new HttpError(500, 'not_configured');
  return hmac(secret, deviceId);
}

/** The salt for a play date, created on first use. Concurrent creators agree on one row. */
export async function saltFor(db: D1Database, date: string): Promise<string> {
  await db
    .prepare('INSERT OR IGNORE INTO daily_salts (play_date, salt) VALUES (?, ?)')
    .bind(date, randomHex(32))
    .run();
  const row = await db
    .prepare('SELECT salt FROM daily_salts WHERE play_date = ?')
    .bind(date)
    .first<{ salt: string }>();
  if (!row) throw new HttpError(500, 'salt_missing');
  return row.salt;
}

export async function deviceHash(db: D1Database, date: string, deviceId: string): Promise<string> {
  return hmac(await saltFor(db, date), deviceId);
}

/** Count one request of `kind` for this device today; 429 past `max`. */
export async function rateLimit(
  db: D1Database,
  hash: string,
  date: string,
  kind: string,
  max: number,
): Promise<void> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (device_hash, play_date, kind, count) VALUES (?, ?, ?, 1)
       ON CONFLICT (device_hash, play_date, kind) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(hash, date, kind)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > max) throw new HttpError(429, 'rate_limited');
}

/** Constant-time string comparison for the admin token. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
