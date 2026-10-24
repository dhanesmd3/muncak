// Random device id, created once. Not sent anywhere in phase 1.
// Never log it (docs/07-privasi.md).
import { KEYS, readJson, writeJson } from './storage';

interface Device {
  id: string;
  createdAt: number;
}

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ensureDevice(now: number): void {
  const saved = readJson<Device>(KEYS.device);
  if (saved && typeof saved.id === 'string') return;
  writeJson(KEYS.device, { id: randomId(), createdAt: now } satisfies Device);
}
