// localStorage wrapper. Every access is guarded: when storage is unavailable (private mode,
// quota full, blocked) the game keeps running from memory (docs/05-teknis.md §8).
import { DAILY_RETENTION_DAYS } from '../game/constants';
import { daysBetween, isValidDate } from '../game/date';

export const PREFIX = 'muncak:';
export const KEYS = {
  device: 'muncak:v1:device',
  settings: 'muncak:v1:settings',
  stats: 'muncak:v1:stats',
  expedition: 'muncak:v1:expedition',
  packs: 'muncak:v1:packs',
  groups: 'muncak:v1:groups',
  daily: (date: string) => `muncak:v1:daily:${date}`,
} as const;
const DAILY_PREFIX = 'muncak:v1:daily:';

const memory = new Map<string, string>();
let persistent = probe();

function probe(): boolean {
  try {
    const k = `${PREFIX}probe`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** False when progress cannot be saved (shows "Progres tidak tersimpan"). */
export function isPersistent(): boolean {
  return persistent;
}

export function readJson<T = unknown>(key: string): T | null {
  let raw: string | null = memory.get(key) ?? null;
  try {
    if (persistent) raw = localStorage.getItem(key);
  } catch {
    persistent = false;
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    if (persistent) localStorage.setItem(key, raw);
  } catch {
    persistent = false;
  }
}

function storedKeys(): string[] {
  const keys = new Set(memory.keys());
  try {
    if (persistent) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== null) keys.add(k);
      }
    }
  } catch {
    persistent = false;
  }
  return [...keys];
}

function remove(key: string): void {
  memory.delete(key);
  try {
    if (persistent) localStorage.removeItem(key);
  } catch {
    persistent = false;
  }
}

/** Drop daily progress older than DAILY_RETENTION_DAYS (run when the app opens). */
export function pruneDaily(today: string): void {
  for (const k of storedKeys()) {
    if (!k.startsWith(DAILY_PREFIX)) continue;
    const date = k.slice(DAILY_PREFIX.length);
    if (!isValidDate(date) || daysBetween(date, today) > DAILY_RETENTION_DAYS) remove(k);
  }
}

/** "Hapus data saya": remove every muncak:* key. */
export function clearAll(): void {
  for (const k of storedKeys()) if (k.startsWith(PREFIX)) remove(k);
}
